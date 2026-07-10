const DEFAULT_MAX_WAIT_AGE_MS = 15 * 60 * 1000;

const BLOCKING_MODES = {
  NEEDS_SETUP: "needs_setup",
  NEEDS_LOCATION: "needs_location",
  STALE_DATA: "stale_data",
  NO_CANDIDATES: "no_candidates",
  BLOCKED: "blocked",
};

const READY_MODE = "ready";

function compactList(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function getNestedValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;

  for (const key of keys) {
    if (hasValue(source[key])) return source[key];
  }

  return undefined;
}

function getBooleanValue(source, keys) {
  const value = getNestedValue(source, keys);

  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "complete", "ready"].includes(normalized)) return true;
    if (["false", "no", "incomplete", "missing"].includes(normalized)) return false;
  }

  return undefined;
}

function hasFamilyBasics(profile = {}) {
  const partySize = Number(
    getNestedValue(profile, ["partySize", "groupSize", "travelPartySize", "guests"])
  );

  const adults = Number(getNestedValue(profile, ["adults", "adultCount"]));
  const kids = Number(getNestedValue(profile, ["kids", "children", "childCount"]));

  const hasPartyCount = partySize > 0 || adults > 0 || kids > 0;
  const hasHeightContext = hasValue(
    getNestedValue(profile, [
      "shortestHeight",
      "shortestRiderHeight",
      "height",
      "heightRange",
      "heightRanges",
      "riderHeights",
    ])
  );

  const hasPaceOrPreference = hasValue(
    getNestedValue(profile, ["pace", "pacePreference", "touringPace", "sensoryNeeds", "avoids"])
  );

  return hasPartyCount || hasHeightContext || hasPaceOrPreference;
}

function hasProfileReadySignal(input = {}) {
  const explicitProfileReady = getBooleanValue(input, [
    "profileComplete",
    "isProfileComplete",
    "familyProfileComplete",
    "profileReady",
  ]);

  if (explicitProfileReady !== undefined) return explicitProfileReady;

  const profile = input.profile || input.familyProfile || input.userProfile || {};
  const profileReady = getBooleanValue(profile, [
    "complete",
    "isComplete",
    "profileComplete",
    "ready",
    "isReady",
  ]);

  if (profileReady !== undefined) return profileReady;

  return hasFamilyBasics(profile);
}

function getActivePark(input = {}) {
  return getNestedValue(input, [
    "activePark",
    "currentPark",
    "selectedPark",
    "plannedPark",
    "parkId",
  ]);
}

function getCurrentArea(input = {}) {
  return getNestedValue(input, [
    "currentArea",
    "selectedArea",
    "currentLand",
    "land",
    "area",
  ]);
}

function hasUsableLocation(input = {}) {
  const location = input.location || input.geoLocation || input.gps || {};
  const confidence = getNestedValue(input, ["locationConfidence"]) ||
    getNestedValue(location, ["confidence", "accuracyLabel"]);

  const currentArea = getCurrentArea(input);
  const hasCoordinates = hasValue(location.latitude) && hasValue(location.longitude);

  if (currentArea) return true;
  if (hasCoordinates && confidence !== "low") return true;

  return false;
}

function getWaitAgeMs(input = {}) {
  const explicitAge = getNestedValue(input, [
    "waitAgeMs",
    "waitsAgeMs",
    "ageMs",
    "waitDataAgeMs",
  ]);

  if (Number.isFinite(Number(explicitAge))) return Number(explicitAge);

  const fetchedAt = getNestedValue(input, ["waitFetchedAt", "waitsFetchedAt", "fetchedAt"]);
  if (!fetchedAt) return undefined;

  const fetchedTime = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedTime)) return undefined;

  return Date.now() - fetchedTime;
}

function hasWaitRows(input = {}) {
  const waitSources = [
    input.waits,
    input.waitTimes,
    input.rideWaits,
    input.rides,
    input.attractions,
  ];

  return waitSources.some((source) => {
    if (Array.isArray(source)) return source.length > 0;
    if (source && typeof source === "object") return Object.keys(source).length > 0;
    return false;
  });
}

function hasUsableWaitData(input = {}) {
  if (input.waitDataUsable === false || input.waitsUsable === false) return false;
  if (input.waitDataFresh === false || input.waitsFresh === false) return false;

  const ageMs = getWaitAgeMs(input);
  const maxAgeMs = Number(input.maxWaitAgeMs || DEFAULT_MAX_WAIT_AGE_MS);

  if (Number.isFinite(ageMs) && ageMs > maxAgeMs) return false;

  return hasWaitRows(input);
}

function hasUsableWeather(input = {}) {
  if (input.weatherUsable === false || input.weatherFresh === false) return false;

  const weather = input.weather || input.weatherState || input.weatherContext;
  if (!weather || typeof weather !== "object") return false;

  if (weather.error || weather.unavailable) return false;

  return Boolean(
    hasValue(weather.weatherMode) ||
      hasValue(weather.summary) ||
      hasValue(weather.provider) ||
      hasValue(weather.rainRisk) ||
      hasValue(weather.stormMode) ||
      hasValue(weather.feelsLikeF) ||
      hasValue(weather.nextPrecipitationWindow) ||
      hasValue(weather.upcomingPrecipitation)
  );
}

function getRecommendationCandidates(input = {}) {
  const directCandidates = asArray(input.candidates || input.tohiPickCandidates);
  if (directCandidates.length > 0) return directCandidates;

  const recommendations = input.recommendations || input.recommendationSlots || {};
  if (Array.isArray(recommendations)) return recommendations.filter(Boolean);

  return [
    recommendations.bestMove,
    recommendations.best,
    recommendations.smartBackup,
    recommendations.backup,
    recommendations.worthTheWalk,
    recommendations.planAhead,
    recommendations.waitOnThis,
  ].filter(Boolean);
}

function getBlockingCandidateReasons(candidates = []) {
  if (!candidates.length) return ["no_candidates"];

  const usableCandidates = candidates.filter((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;

    const status = String(candidate.status || candidate.operatingStatus || "").toLowerCase();
    const closed = candidate.closed === true || status.includes("closed") || status.includes("down");
    const unavailable = candidate.unavailable === true || candidate.available === false;
    const blocked = candidate.blocked === true || candidate.eligible === false;

    return !closed && !unavailable && !blocked;
  });

  return usableCandidates.length ? [] : ["no_usable_candidates"];
}

function chooseMode(reasons = []) {
  if (reasons.includes("profile_incomplete") || reasons.includes("family_constraints_missing")) {
    return BLOCKING_MODES.NEEDS_SETUP;
  }

  if (reasons.includes("active_park_missing") || reasons.includes("location_unclear")) {
    return BLOCKING_MODES.NEEDS_LOCATION;
  }

  if (reasons.includes("wait_data_unusable") || reasons.includes("weather_data_unusable")) {
    return BLOCKING_MODES.STALE_DATA;
  }

  if (reasons.includes("no_candidates") || reasons.includes("no_usable_candidates")) {
    return BLOCKING_MODES.NO_CANDIDATES;
  }

  if (reasons.length > 0) return BLOCKING_MODES.BLOCKED;

  return READY_MODE;
}

export function evaluateTohiPickEligibility(input = {}) {
  const reasons = [];
  const missing = [];
  const warnings = [];

  const profileReady = hasProfileReadySignal(input);
  const profile = input.profile || input.familyProfile || input.userProfile || {};
  const activePark = getActivePark(input);
  const locationRequired = input.locationRequired === true;
  const hasLocation = hasUsableLocation(input);
  const waitsUsable = hasUsableWaitData(input);
  const weatherUsable = hasUsableWeather(input);
  const candidates = getRecommendationCandidates(input);
  const candidateReasons = getBlockingCandidateReasons(candidates);

  if (!profileReady) {
    reasons.push("profile_incomplete");
    missing.push("profile");
  }

  if (!hasFamilyBasics(profile) && !profileReady) {
    reasons.push("family_constraints_missing");
    missing.push("family_constraints");
  }

  if (!activePark) {
    reasons.push("active_park_missing");
    missing.push("active_park");
  }

  if (locationRequired && !hasLocation) {
    reasons.push("location_unclear");
    missing.push("current_area_or_location");
  } else if (!hasLocation) {
    warnings.push("location_not_confirmed");
  }

  if (!waitsUsable) {
    reasons.push("wait_data_unusable");
    missing.push("usable_wait_data");
  }

  if (!weatherUsable) {
    reasons.push("weather_data_unusable");
    missing.push("usable_weather_data");
  }

  reasons.push(...candidateReasons);
  if (candidateReasons.includes("no_candidates")) missing.push("candidate_list");

  if (input.blockingAmbiguity) {
    reasons.push("blocking_ambiguity");
  }

  const normalizedReasons = compactList(reasons);
  const normalizedMissing = compactList(missing);
  const normalizedWarnings = compactList(warnings);
  const mode = chooseMode(normalizedReasons);

  return {
    eligible: normalizedReasons.length === 0,
    mode,
    reasons: normalizedReasons,
    missing: normalizedMissing,
    warnings: normalizedWarnings,
    signals: {
      profileReady,
      activePark: activePark || null,
      currentArea: getCurrentArea(input) || null,
      locationUsable: hasLocation,
      waitsUsable,
      weatherUsable,
      candidateCount: candidates.length,
    },
  };
}

export const TOHI_PICK_HEAT_RULE =
  "Florida heat is baseline context; heat may break ties or protect against poor outdoor walking, but should not override a nearby high-value manageable indoor option.";

export const TOHI_PICK_ELIGIBILITY_MODES = {
  READY: READY_MODE,
  ...BLOCKING_MODES,
};
