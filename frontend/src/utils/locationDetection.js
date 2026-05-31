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

const HIGH_CONFIDENCE_METERS = 90;
const MEDIUM_CONFIDENCE_METERS = 180;
const LOW_CONFIDENCE_METERS = 260;
const CLUSTER_ANCHOR_COUNT = 5;
const LAND_CLUSTER_RADIUS_METERS = 220;

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

export function detectNearestLocationZone({ parkId, lat, lng }) {
  if (lat == null || lng == null) return null;

  const candidates = buildAnchorCandidates({ parkId, lat, lng });

  if (!candidates.length) return null;

  const bestAnchor = candidates[0];
  const clusterScores = getLandClusterScores(candidates);
  const winningCluster = clusterScores[0];
  const runnerUpCluster = clusterScores[1];

  if (!winningCluster) return null;

  const confidence = getConfidence({
    bestAnchor,
    winningCluster,
    runnerUpCluster,
  });

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
