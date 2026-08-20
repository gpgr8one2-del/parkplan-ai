/**
 * ParkPlan AI — Location Detection Utilities
 *
 * Uses browser GPS coordinates and ParkPlan's own attraction/area anchors
 * to estimate the nearest useful park zone.
 *
 * V2 improvement:
 * Do not let one slightly closer anchor make the whole app pick the wrong land.
 * Theme park GPS can drift, especially near land borders, buildings, trees,
 * crowds, and covered queues.
 *
 * Instead:
 * - calculate nearest anchors
 * - group nearby anchors by land
 * - use cluster strength to pick a land
 * - lower confidence when lands are close or GPS is border-messy
 */

import { getLocationZonesForPark } from "../parkLocationAnchors";
import { LOCATION_STABILITY_THRESHOLDS } from "./locationStability";

const HIGH_CONFIDENCE_METERS = 90;
const MEDIUM_CONFIDENCE_METERS = 180;
const LOW_CONFIDENCE_METERS = 260;
const CLUSTER_ANCHOR_COUNT = 5;
const LAND_CLUSTER_RADIUS_METERS = 220;
const CLOSEST_ANCHOR_SAFEGUARD_METERS = 45;
const CLUSTER_STEAL_LEAD_REQUIRED = 95;

// Uncertainty-radius thresholds come from locationStability.js, which owns the
// trust policy and documents the measured anchor separations behind them.
// Deliberately not re-declared here: two copies of 40/90 would drift.
const { TRUSTED_ACCURACY_METERS, MAX_ACCURACY_METERS } = LOCATION_STABILITY_THRESHOLDS;

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadiusMeters = 6371000;
  const toRad = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function buildAnchorCandidates({ parkId, lat, lng }) {
  const zones = getLocationZonesForPark(parkId);
  const candidates = [];

  Object.entries(zones).forEach(([landKey, zone]) => {
    const anchors = zone.anchors || [];

    anchors.forEach((anchor) => {
      const distanceMeters = getDistanceMeters(
        Number(lat),
        Number(lng),
        Number(anchor.lat),
        Number(anchor.lng)
      );

      candidates.push({
        parkId,
        landKey,
        landLabel: zone.label,
        anchorId: anchor.id,
        anchorName: anchor.name,
        anchorType: anchor.type,
        distanceMeters,
      });
    });
  });

  return candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function getLandClusterScores(candidates) {
  const nearbyAnchors = candidates
    .slice(0, CLUSTER_ANCHOR_COUNT)
    .filter((candidate) => candidate.distanceMeters <= LAND_CLUSTER_RADIUS_METERS);

  const scores = new Map();

  nearbyAnchors.forEach((candidate, index) => {
    const existing = scores.get(candidate.landKey) || {
      landKey: candidate.landKey,
      landLabel: candidate.landLabel,
      score: 0,
      count: 0,
      closestDistanceMeters: candidate.distanceMeters,
      closestAnchor: candidate,
      anchors: [],
    };

    // Stronger score for closer anchors, slight boost for being higher in the list.
    const distanceScore = Math.max(0, LAND_CLUSTER_RADIUS_METERS - candidate.distanceMeters);
    const rankBonus = Math.max(0, CLUSTER_ANCHOR_COUNT - index) * 8;

    existing.score += distanceScore + rankBonus;
    existing.count += 1;
    existing.closestDistanceMeters = Math.min(
      existing.closestDistanceMeters,
      candidate.distanceMeters
    );

    if (candidate.distanceMeters <= existing.closestAnchor.distanceMeters) {
      existing.closestAnchor = candidate;
    }

    existing.anchors.push(candidate);

    scores.set(candidate.landKey, existing);
  });

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

function getClusterDecisionWithClosestAnchorSafeguard({ bestAnchor, clusterScores }) {
  const winningCluster = clusterScores[0];
  const runnerUpCluster = clusterScores[1];

  if (!bestAnchor || !winningCluster) {
    return { clusterScores, winningCluster, runnerUpCluster };
  }

  const closestAnchorCluster = clusterScores.find(
    (cluster) => cluster.landKey === bestAnchor.landKey
  );

  if (
    !closestAnchorCluster ||
    winningCluster.landKey === bestAnchor.landKey ||
    bestAnchor.distanceMeters > CLOSEST_ANCHOR_SAFEGUARD_METERS
  ) {
    return { clusterScores, winningCluster, runnerUpCluster };
  }

  const stealLead = winningCluster.score - closestAnchorCluster.score;

  if (stealLead >= CLUSTER_STEAL_LEAD_REQUIRED) {
    return { clusterScores, winningCluster, runnerUpCluster };
  }

  const adjustedClusterScores = [
    closestAnchorCluster,
    ...clusterScores.filter((cluster) => cluster.landKey !== closestAnchorCluster.landKey),
  ];

  return {
    clusterScores: adjustedClusterScores,
    winningCluster: adjustedClusterScores[0],
    runnerUpCluster: adjustedClusterScores[1],
  };
}

// coords.accuracy is an uncertainty RADIUS, not a correction to apply to the
// coordinates. It cannot tell us where the guest really is, only how much the
// reported point may be wrong by — so it is used to cap how much the geometry
// below is allowed to claim, and never to move the position.
//
// Field test: a fix displaced ~80 m still reported "high" confidence, because
// it landed squarely among a neighbouring land's anchors and the geometry had
// no way to know the fix was poor. Radius thresholds come from the measured
// Hollywood anchor separations and are documented in locationStability.js.
function capConfidenceByAccuracy(confidence, accuracyMeters) {
  const accuracy = Number(accuracyMeters);

  // Callers that do not supply accuracy — including the existing fieldwork
  // tests and any pure geometry question — keep the previous behaviour exactly.
  if (!Number.isFinite(accuracy)) return confidence;

  if (accuracy > MAX_ACCURACY_METERS) return "low";

  // Between trusted and unusable the reading is real but imprecise: it can
  // still refresh where it agrees with what we already believe, but it has not
  // earned the right to be called a confident fix.
  if (accuracy > TRUSTED_ACCURACY_METERS && confidence === "high") return "medium";

  return confidence;
}

function getConfidence({ bestAnchor, winningCluster, runnerUpCluster }) {
  if (!bestAnchor || !winningCluster) return "low";

  const distance = bestAnchor.distanceMeters;
  const clusterLead = runnerUpCluster
    ? winningCluster.score - runnerUpCluster.score
    : winningCluster.score;

  const sameLandAsClosest = winningCluster.landKey === bestAnchor.landKey;
  const borderMessy =
    runnerUpCluster &&
    clusterLead < 55 &&
    Math.abs(
      winningCluster.closestDistanceMeters - runnerUpCluster.closestDistanceMeters
    ) < 60;

  if (distance <= HIGH_CONFIDENCE_METERS && sameLandAsClosest && !borderMessy) {
    return "high";
  }

  if (distance <= MEDIUM_CONFIDENCE_METERS && !borderMessy) {
    return "medium";
  }

  if (distance <= LOW_CONFIDENCE_METERS && winningCluster.count >= 2 && !borderMessy) {
    return "medium";
  }

  return "low";
}

export function detectNearestLocationZone({ parkId, lat, lng, accuracyMeters }) {
  if (lat == null || lng == null) return null;

  const candidates = buildAnchorCandidates({ parkId, lat, lng });

  if (!candidates.length) return null;

  const bestAnchor = candidates[0];
  const rawClusterScores = getLandClusterScores(candidates);
  const { clusterScores, winningCluster, runnerUpCluster } =
    getClusterDecisionWithClosestAnchorSafeguard({
      bestAnchor,
      clusterScores: rawClusterScores,
    });

  if (!winningCluster) return null;

  const geometryConfidence = getConfidence({
    bestAnchor,
    winningCluster,
    runnerUpCluster,
  });

  const confidence = capConfidenceByAccuracy(geometryConfidence, accuracyMeters);

  const bestLandAnchor =
    winningCluster.closestAnchor ||
    candidates.find((candidate) => candidate.landKey === winningCluster.landKey) ||
    bestAnchor;

  const nearbyAnchors = candidates.slice(0, CLUSTER_ANCHOR_COUNT).map((candidate) => ({
    parkId: candidate.parkId,
    landKey: candidate.landKey,
    landLabel: candidate.landLabel,
    anchorId: candidate.anchorId,
    anchorName: candidate.anchorName,
    anchorType: candidate.anchorType,
    distanceMeters: Math.round(candidate.distanceMeters),
  }));

  const isBorderArea =
    runnerUpCluster &&
    runnerUpCluster.score > 0 &&
    winningCluster.score - runnerUpCluster.score < 75;

  const roundedDistance = Math.round(bestLandAnchor.distanceMeters);

  return {
    ...bestLandAnchor,
    landKey: winningCluster.landKey,
    landLabel: winningCluster.landLabel,
    anchorId: bestLandAnchor.anchorId,
    anchorName: bestLandAnchor.anchorName,
    anchorType: bestLandAnchor.anchorType,
    distanceMeters: roundedDistance,
    confidence,
    geometryConfidence,
    accuracyMeters: Number.isFinite(Number(accuracyMeters))
      ? Math.round(Number(accuracyMeters))
      : null,
    nearbyAnchors,
    clusterScores: clusterScores.map((cluster) => ({
      landKey: cluster.landKey,
      landLabel: cluster.landLabel,
      score: Math.round(cluster.score),
      count: cluster.count,
      closestDistanceMeters: Math.round(cluster.closestDistanceMeters),
      closestAnchorName: cluster.closestAnchor?.anchorName || "",
    })),
    isBorderArea,
    message:
      confidence === "low"
        ? `Closest match is around ${winningCluster.landLabel}, near ${bestLandAnchor.anchorName}, but GPS confidence is low. Pick the closest area manually if this looks wrong.`
        : isBorderArea && confidence !== "high"
        ? `Looks like you’re near ${winningCluster.landLabel}, close to ${bestLandAnchor.anchorName}. This is near a land border, so double-check if that looks off.`
        : `Looks like you’re near ${winningCluster.landLabel}. Closest anchor: ${bestLandAnchor.anchorName}.`,
  };
}

export function getCurrentPosition(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 30000,
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  });
}
