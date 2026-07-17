import { PARK_LOCATION_ANCHORS } from "../parkLocationAnchors";
import { getDistanceMeters } from "./locationDetection";

/**
 * Park-level arrival detection for park-hopper days.
 *
 * Thresholds are justified by the repository's own anchor geometry
 * (measured 2026-07-16):
 * - 25–49 trusted anchors per park; nearest-anchor distance inside a park is
 *   far below 400m, so MAX_INSIDE_DISTANCE_METERS = 400 marks "inside".
 * - The closest two parks (Epcot ↔ Hollywood Studios) are 1120m apart at
 *   their nearest anchors; every other pair is ≥ 2139m. A point within 400m
 *   of one park is therefore ≥ 720m from any other park, giving a worst-case
 *   legitimate margin of 320m — so MIN_COMPETING_MARGIN_METERS = 300 accepts
 *   every real in-park position and the ambiguity check is a pure safety net.
 * - MAX_ACCURACY_METERS = 75 keeps GPS noise an order of magnitude below the
 *   separation between parks.
 *
 * Detection is evidence only. This module never changes the active park.
 */
export const PARK_ARRIVAL_THRESHOLDS = {
  MAX_ACCURACY_METERS: 75,
  MAX_SAMPLE_AGE_MS: 60 * 1000,
  MAX_INSIDE_DISTANCE_METERS: 400,
  MIN_COMPETING_MARGIN_METERS: 300,
  REQUIRED_CONSECUTIVE_SAMPLES: 3,
  MIN_SAMPLE_SPACING_MS: 15 * 1000,
  EVIDENCE_WINDOW_MS: 5 * 60 * 1000,
  DEPARTURE_DISTANCE_METERS: 700,
  REQUIRED_DEPARTURE_SAMPLES: 2,
};

let defaultAnchorSetsCache = null;

function buildAnchorSets(anchorsByPark) {
  const sets = {};

  Object.entries(anchorsByPark || {}).forEach(([parkId, zones]) => {
    const points = [];

    Object.values(zones || {}).forEach((zone) => {
      (zone.anchors || []).forEach((anchor) => {
        const lat = Number(anchor.lat);
        const lng = Number(anchor.lng);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          points.push({ lat, lng });
        }
      });
    });

    if (points.length) sets[parkId] = points;
  });

  return sets;
}

function getDefaultAnchorSets() {
  if (!defaultAnchorSetsCache) {
    defaultAnchorSetsCache = buildAnchorSets(PARK_LOCATION_ANCHORS);
  }

  return defaultAnchorSetsCache;
}

export function classifyDetectedPark({ lat, lng } = {}, anchorSetsOverride = null) {
  const numericLat = Number(lat);
  const numericLng = Number(lng);

  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return null;

  const anchorSets = anchorSetsOverride
    ? buildAnchorSets(anchorSetsOverride)
    : getDefaultAnchorSets();

  const distances = {};

  Object.entries(anchorSets).forEach(([parkId, points]) => {
    let nearest = Infinity;

    points.forEach((point) => {
      const distance = getDistanceMeters(numericLat, numericLng, point.lat, point.lng);
      if (distance < nearest) nearest = distance;
    });

    if (Number.isFinite(nearest)) distances[parkId] = Math.round(nearest);
  });

  const ranked = Object.entries(distances).sort((a, b) => a[1] - b[1]);

  if (!ranked.length) return null;

  const [bestParkId, bestDistance] = ranked[0];
  const runnerUp = ranked[1] || null;
  const outsideTrustedGeometry =
    bestDistance > PARK_ARRIVAL_THRESHOLDS.MAX_INSIDE_DISTANCE_METERS;
  const marginMeters = runnerUp ? runnerUp[1] - bestDistance : Infinity;
  const ambiguous =
    !outsideTrustedGeometry &&
    Number.isFinite(marginMeters) &&
    marginMeters < PARK_ARRIVAL_THRESHOLDS.MIN_COMPETING_MARGIN_METERS;

  return {
    parkId: bestParkId,
    nearestDistanceMeters: bestDistance,
    competingParkId: runnerUp ? runnerUp[0] : null,
    competingDistanceMeters: runnerUp ? runnerUp[1] : null,
    marginMeters: Number.isFinite(marginMeters) ? marginMeters : null,
    outsideTrustedGeometry,
    ambiguous,
    distances,
  };
}

export function evaluateParkLocationSample(
  { position, now = Date.now(), confirmedActivePark = "", plannedParkIds = [] } = {},
  anchorSetsOverride = null
) {
  const rejected = (rejectionReason, classification = null) => ({
    qualifies: false,
    rejectionReason,
    parkId: null,
    classification,
  });

  if (
    !position ||
    !Number.isFinite(Number(position.lat)) ||
    !Number.isFinite(Number(position.lng))
  ) {
    return rejected("missing_position");
  }

  if (!Array.isArray(plannedParkIds) || plannedParkIds.length < 2) {
    return rejected("not_park_hopper_day");
  }

  const timestamp = Number(position.timestamp);

  if (
    !Number.isFinite(timestamp) ||
    now - timestamp > PARK_ARRIVAL_THRESHOLDS.MAX_SAMPLE_AGE_MS
  ) {
    return rejected("stale");
  }

  const accuracy = Number(position.accuracyMeters);

  if (!Number.isFinite(accuracy) || accuracy > PARK_ARRIVAL_THRESHOLDS.MAX_ACCURACY_METERS) {
    return rejected("inaccurate");
  }

  const classification = classifyDetectedPark(position, anchorSetsOverride);

  if (!classification) return rejected("outside_trusted_geometry");
  if (classification.outsideTrustedGeometry) {
    return rejected("outside_trusted_geometry", classification);
  }
  if (classification.ambiguous) return rejected("ambiguous", classification);
  if (classification.parkId === confirmedActivePark) {
    return rejected("active_park", classification);
  }
  if (!plannedParkIds.includes(classification.parkId)) {
    return rejected("unplanned_park", classification);
  }

  return {
    qualifies: true,
    rejectionReason: null,
    parkId: classification.parkId,
    classification,
  };
}

export function createParkArrivalTracker({ dateString = "", planKey = "" } = {}) {
  return {
    dateString,
    planKey,
    candidateParkId: null,
    qualifyingCount: 0,
    firstQualifyingAt: null,
    lastQualifyingAt: null,
    stable: false,
    suppressedParkId: null,
    departureCount: 0,
    lastDepartureAt: null,
    departedParkId: null,
    lastSample: null,
  };
}

export function resetParkArrivalTracker(options = {}) {
  return createParkArrivalTracker(options);
}

function clearCandidateSequence(tracker) {
  return {
    ...tracker,
    candidateParkId: null,
    qualifyingCount: 0,
    firstQualifyingAt: null,
    lastQualifyingAt: null,
    stable: false,
  };
}

export function updateParkArrivalTracker(tracker, sampleInput = {}, anchorSetsOverride = null) {
  const current = tracker || createParkArrivalTracker();
  const now = Number.isFinite(Number(sampleInput.now)) ? Number(sampleInput.now) : Date.now();
  const evaluation = evaluateParkLocationSample({ ...sampleInput, now }, anchorSetsOverride);
  const classification = evaluation.classification;

  let next = {
    ...current,
    departedParkId: null,
    lastSample: {
      qualifies: evaluation.qualifies,
      rejectionReason: evaluation.rejectionReason,
      parkId: classification?.parkId || null,
      accuracyMeters: Number.isFinite(Number(sampleInput.position?.accuracyMeters))
        ? Math.round(Number(sampleInput.position.accuracyMeters))
        : null,
      nearestDistanceMeters: classification?.nearestDistanceMeters ?? null,
    },
  };

  // Departure monitoring: a "Not yet" episode ends only after repeated,
  // spaced evidence that the guest is genuinely away from the suppressed park.
  if (next.suppressedParkId && classification) {
    const suppressedDistance = classification.distances?.[next.suppressedParkId];
    const accuracy = Number(sampleInput.position?.accuracyMeters);
    const accuracyUsable =
      Number.isFinite(accuracy) && accuracy <= PARK_ARRIVAL_THRESHOLDS.MAX_ACCURACY_METERS;

    if (Number.isFinite(suppressedDistance) && accuracyUsable) {
      if (suppressedDistance >= PARK_ARRIVAL_THRESHOLDS.DEPARTURE_DISTANCE_METERS) {
        const spaced =
          !next.lastDepartureAt ||
          now - next.lastDepartureAt >= PARK_ARRIVAL_THRESHOLDS.MIN_SAMPLE_SPACING_MS;

        if (spaced) {
          next.departureCount += 1;
          next.lastDepartureAt = now;
        }

        if (next.departureCount >= PARK_ARRIVAL_THRESHOLDS.REQUIRED_DEPARTURE_SAMPLES) {
          next.departedParkId = next.suppressedParkId;
          next.suppressedParkId = null;
          next.departureCount = 0;
          next.lastDepartureAt = null;
        }
      } else if (
        suppressedDistance <= PARK_ARRIVAL_THRESHOLDS.MAX_INSIDE_DISTANCE_METERS
      ) {
        next.departureCount = 0;
        next.lastDepartureAt = null;
      }
    }
  }

  if (evaluation.qualifies) {
    const parkId = evaluation.parkId;

    // A park that was already prompted this episode cannot rebuild evidence
    // until the guest demonstrably leaves and returns.
    if (next.suppressedParkId === parkId) {
      return clearCandidateSequence(next);
    }

    if (next.candidateParkId !== parkId) {
      return {
        ...next,
        candidateParkId: parkId,
        qualifyingCount: 1,
        firstQualifyingAt: now,
        lastQualifyingAt: now,
        stable: false,
      };
    }

    if (
      next.firstQualifyingAt &&
      now - next.firstQualifyingAt > PARK_ARRIVAL_THRESHOLDS.EVIDENCE_WINDOW_MS
    ) {
      return {
        ...next,
        qualifyingCount: 1,
        firstQualifyingAt: now,
        lastQualifyingAt: now,
        stable: false,
      };
    }

    if (
      !next.lastQualifyingAt ||
      now - next.lastQualifyingAt >= PARK_ARRIVAL_THRESHOLDS.MIN_SAMPLE_SPACING_MS
    ) {
      next.qualifyingCount += 1;
      next.lastQualifyingAt = now;
    }

    next.stable =
      next.qualifyingCount >= PARK_ARRIVAL_THRESHOLDS.REQUIRED_CONSECUTIVE_SAMPLES;

    return next;
  }

  // A confident reading placing the guest in a different real park conflicts
  // with the current candidate and resets the sequence. Weak samples (stale,
  // inaccurate, outside, ambiguous) neither count nor reset; the bounded
  // evidence window handles their decay.
  const confidentElsewhere =
    classification &&
    !classification.outsideTrustedGeometry &&
    !classification.ambiguous &&
    (evaluation.rejectionReason === "active_park" ||
      evaluation.rejectionReason === "unplanned_park");

  if (confidentElsewhere && next.candidateParkId) {
    return clearCandidateSequence(next);
  }

  return next;
}

export function hasStableParkArrivalEvidence(tracker) {
  return Boolean(tracker?.stable && tracker.candidateParkId);
}

export function suppressParkArrivalPrompt(tracker, parkId) {
  const base = tracker || createParkArrivalTracker();

  return {
    ...clearCandidateSequence(base),
    suppressedParkId: parkId || base.candidateParkId || null,
    departureCount: 0,
    lastDepartureAt: null,
    departedParkId: null,
  };
}

export function acknowledgeParkArrivalDeparture(tracker) {
  if (!tracker || !tracker.departedParkId) return tracker;

  return { ...tracker, departedParkId: null };
}
