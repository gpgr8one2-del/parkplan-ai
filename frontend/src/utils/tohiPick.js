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


const TOHI_PICK_SLOT_DEFINITIONS = [
  { key: "bestMove", label: "Best Move", aliases: ["bestMove", "best"] },
  { key: "backup", label: "Smart Backup", aliases: ["backup", "smartBackup"] },
  { key: "worthTheWalk", label: "Worth the Walk", aliases: ["worthTheWalk"] },
  { key: "planAhead", label: "Plan Ahead", aliases: ["planAhead"] },
  { key: "waitOnThis", label: "Wait On This", aliases: ["waitOnThis"] },
];

function getSlotLabel(slotKey) {
  const slot = TOHI_PICK_SLOT_DEFINITIONS.find((definition) => {
    return definition.key === slotKey || definition.aliases.includes(slotKey);
  });

  return slot?.label || "Candidate";
}

function normalizeSlotKey(slotKey) {
  const slot = TOHI_PICK_SLOT_DEFINITIONS.find((definition) => {
    return definition.key === slotKey || definition.aliases.includes(slotKey);
  });

  return slot?.key || slotKey || "candidate";
}

function getRecommendationCandidateEntries(input = {}) {
  const directCandidates = asArray(input.candidates || input.tohiPickCandidates).filter(Boolean);

  if (directCandidates.length > 0) {
    return directCandidates.map((candidate, index) => {
      const slotKey = normalizeSlotKey(candidate.sourceSlot || candidate.slot || `candidate_${index + 1}`);

      return {
        candidate,
        sourceSlot: slotKey,
        sourceLabel: candidate.sourceLabel || candidate.sourceSlotLabel || getSlotLabel(slotKey),
        sourceIndex: index,
      };
    });
  }

  const recommendations = input.recommendations || input.recommendationSlots || {};

  if (Array.isArray(recommendations)) {
    return recommendations.filter(Boolean).map((candidate, index) => {
      const slotKey = normalizeSlotKey(candidate.sourceSlot || candidate.slot || `candidate_${index + 1}`);

      return {
        candidate,
        sourceSlot: slotKey,
        sourceLabel: candidate.sourceLabel || candidate.sourceSlotLabel || getSlotLabel(slotKey),
        sourceIndex: index,
      };
    });
  }

  return TOHI_PICK_SLOT_DEFINITIONS.flatMap((slot, index) => {
    const candidate = slot.aliases.map((alias) => recommendations[alias]).find(Boolean);

    if (!candidate) return [];

    return {
      candidate,
      sourceSlot: slot.key,
      sourceLabel: slot.label,
      sourceIndex: index,
    };
  });
}

function getCandidateId(candidate = {}) {
  return getNestedValue(candidate, ["rideId", "id", "attractionId", "experienceId", "slug"]);
}

function getCandidateName(candidate = {}) {
  return getNestedValue(candidate, ["name", "rideName", "title", "displayName"]) || "Unknown attraction";
}

function getCandidateParkId(candidate = {}, input = {}) {
  return getNestedValue(candidate, ["parkId", "park", "activePark"]) || getActivePark(input) || null;
}

function getCandidateArea(candidate = {}) {
  return getNestedValue(candidate, ["area", "land", "landName", "currentArea", "locationArea"]) || null;
}

function getCandidateWait(candidate = {}) {
  const wait = getNestedValue(candidate, ["waitTime", "postedWait", "wait", "minutes"]);

  if (wait === null || wait === undefined || wait === "") return null;

  const numericWait = Number(wait);
  return Number.isFinite(numericWait) ? numericWait : null;
}

function getCandidateReason(candidate = {}, sourceSlot = "") {
  if (sourceSlot === "planAhead" && candidate.planAheadReason) return candidate.planAheadReason;
  if (sourceSlot === "waitOnThis" && candidate.waitOnThisReason) return candidate.waitOnThisReason;

  return (
    candidate.reason ||
    candidate.recommendationReason ||
    candidate.engineReason ||
    candidate.why ||
    null
  );
}

function getCandidateCaution(candidate = {}) {
  return (
    candidate.caution ||
    candidate.warning ||
    candidate.heightWarning ||
    candidate.weatherCaution ||
    candidate.planAheadCaution ||
    candidate.waitOnThisReason ||
    null
  );
}

function getCandidateStatus(candidate = {}) {
  const rawStatus = getNestedValue(candidate, ["status", "operatingStatus", "availability", "state"]);

  if (!rawStatus) return null;

  return String(rawStatus).trim().toLowerCase();
}

function isCandidateUnavailable(candidate = {}) {
  const status = getCandidateStatus(candidate);

  if (candidate.closed === true) return true;
  if (candidate.unavailable === true) return true;
  if (candidate.available === false) return true;
  if (candidate.isOpen === false) return true;

  return Boolean(
    status &&
      ["closed", "down", "refurbishment", "refurb", "unavailable", "temporarily closed"].some((word) =>
        status.includes(word)
      )
  );
}

function makeStringSet(values) {
  return new Set(asArray(values).map((value) => String(value)).filter(Boolean));
}

function activityLogHasRide(activityLog = [], candidateId, candidateName, types = []) {
  const typeSet = makeStringSet(types);
  const normalizedName = String(candidateName || "").trim().toLowerCase();

  return asArray(activityLog).some((entry) => {
    const entryType = String(entry?.type || entry?.action || "").trim();
    const entryRideId = String(entry?.rideId || entry?.id || "").trim();
    const entryRideName = String(entry?.rideName || entry?.name || "").trim().toLowerCase();

    if (typeSet.size && !typeSet.has(entryType)) return false;
    if (candidateId && entryRideId && String(candidateId) === entryRideId) return true;
    if (normalizedName && entryRideName && normalizedName === entryRideName) return true;

    return false;
  });
}

function getCandidateActivityState(candidate = {}, input = {}) {
  const candidateId = getCandidateId(candidate);
  const candidateName = getCandidateName(candidate);
  const completedIds = makeStringSet(input.completedRideIds || input.completedIds);
  const skippedIds = makeStringSet(input.skippedRideIds || input.skippedIds);
  const reportedIds = makeStringSet(input.reportedRideIds || input.reportedIds);
  const activityLog = input.activityLog || [];

  const completed =
    candidate.completed === true ||
    completedIds.has(String(candidateId)) ||
    activityLogHasRide(activityLog, candidateId, candidateName, ["completed_ride", "done", "completed"]);

  const skipped =
    candidate.skipped === true ||
    skippedIds.has(String(candidateId)) ||
    activityLogHasRide(activityLog, candidateId, candidateName, ["skipped_ride", "skip", "skipped"]);

  const reported =
    candidate.reported === true ||
    candidate.reportedIssue === true ||
    reportedIds.has(String(candidateId)) ||
    activityLogHasRide(activityLog, candidateId, candidateName, ["reported_ride", "reported_issue", "issue"]);

  return { completed, skipped, reported };
}

function getCandidateMustDoState(candidate = {}, input = {}) {
  const candidateId = getCandidateId(candidate);
  const candidateName = String(getCandidateName(candidate)).trim().toLowerCase();
  const mustDos = asArray(input.mustDos || input.mustDoExperiences || input.mustDoRides);

  const matchedMustDo = mustDos.find((mustDo) => {
    const mustDoId = String(mustDo?.id || mustDo?.rideId || mustDo?.experienceId || "").trim();
    const mustDoName = String(mustDo?.name || mustDo?.rideName || mustDo?.displayName || "").trim().toLowerCase();

    if (candidateId && mustDoId && String(candidateId) === mustDoId) return true;
    if (candidateName && mustDoName && candidateName === mustDoName) return true;

    return false;
  });

  return {
    isMustDo: candidate.isMustDo === true || candidate.mustDo === true || Boolean(matchedMustDo),
    reason: candidate.mustDoReason || matchedMustDo?.reason || null,
  };
}

function getCandidateWeatherState(candidate = {}) {
  return {
    indoor:
      candidate.indoor === true ||
      candidate.isIndoor === true ||
      candidate.covered === true ||
      candidate.weatherProtected === true,
    outdoor: candidate.outdoor === true || candidate.isOutdoor === true,
    weatherSensitive:
      candidate.weatherSensitive === true ||
      candidate.outdoor === true ||
      candidate.isOutdoor === true ||
      candidate.rainSensitive === true,
    caution: candidate.weatherCaution || candidate.weatherReason || null,
  };
}

function buildCandidateTags(candidate = {}, input = {}, normalized = {}) {
  const tags = [];
  const currentArea = getCurrentArea(input);
  const candidateArea = normalized.area;
  const wait = normalized.wait;
  const weather = normalized.weather || {};

  if (wait !== null && wait !== undefined) tags.push(`${wait} min`);

  if (
    currentArea &&
    candidateArea &&
    String(currentArea).trim().toLowerCase() === String(candidateArea).trim().toLowerCase()
  ) {
    tags.push("Nearby");
  } else if (Number(candidate.proximityDistance) <= 0.35) {
    tags.push("Nearby");
  }

  if (normalized.mustDo?.isMustDo) tags.push("Must-do");
  if (weather.indoor) tags.push("Indoor");
  if (weather.outdoor && !weather.indoor) tags.push("Outdoor");
  if (weather.weatherSensitive) tags.push("Weather-sensitive");
  if (candidate.heightWarning) tags.push("Height check");
  if (candidate.waitValueStatus?.status === "great_value") tags.push("Great value");
  if (candidate.waitValueStatus?.status === "good_value") tags.push("Good value");

  return compactList(tags);
}

export function buildTohiPickCandidate(entry = {}, input = {}) {
  const candidate = entry.candidate || entry;
  const sourceSlot = normalizeSlotKey(entry.sourceSlot || candidate.sourceSlot || candidate.slot);
  const sourceLabel = entry.sourceLabel || candidate.sourceLabel || getSlotLabel(sourceSlot);
  const rideId = getCandidateId(candidate);
  const name = getCandidateName(candidate);
  const wait = getCandidateWait(candidate);
  const area = getCandidateArea(candidate);
  const activityState = getCandidateActivityState(candidate, input);
  const mustDo = getCandidateMustDoState(candidate, input);
  const weather = getCandidateWeatherState(candidate);
  const unavailable = isCandidateUnavailable(candidate);
  const explicitlyBlocked = candidate.blocked === true || candidate.eligible === false;
  const heightBlocked = candidate.heightEligible === false || candidate.accessEligible === false;

  const exclusionReasons = compactList([
    unavailable ? "unavailable" : null,
    explicitlyBlocked ? "blocked" : null,
    heightBlocked ? "constraint_blocked" : null,
    activityState.completed ? "completed" : null,
    activityState.skipped ? "skipped" : null,
    activityState.reported ? "reported_issue" : null,
  ]);

  const normalized = {
    rideId: rideId || null,
    name,
    parkId: getCandidateParkId(candidate, input),
    area,
    wait,
    sourceSlot,
    sourceLabel,
    sourceIndex: Number.isFinite(Number(entry.sourceIndex)) ? Number(entry.sourceIndex) : null,
    engineReason: getCandidateReason(candidate, sourceSlot),
    engineCaution: getCandidateCaution(candidate),
    status: getCandidateStatus(candidate),
    mustDo,
    weather,
    activityState,
    constraints: {
      heightWarning: candidate.heightWarning || null,
      heightEligible: candidate.heightEligible !== false,
      accessEligible: candidate.accessEligible !== false,
    },
    confidenceHints: {
      fromRecommendationSlot: Boolean(sourceSlot),
      sameArea:
        Boolean(getCurrentArea(input)) &&
        Boolean(area) &&
        String(getCurrentArea(input)).trim().toLowerCase() === String(area).trim().toLowerCase(),
      waitKnown: wait !== null,
      mustDo: mustDo.isMustDo,
      indoorRelief: weather.indoor,
    },
    raw: candidate,
  };

  return {
    ...normalized,
    tags: buildCandidateTags(candidate, input, normalized),
    eligibleForTohiPick: exclusionReasons.length === 0,
    exclusionReasons,
  };
}

export function buildTohiPickCandidates(input = {}) {
  const entries = getRecommendationCandidateEntries(input);
  const seen = new Set();
  const allCandidates = [];

  entries.forEach((entry) => {
    const normalized = buildTohiPickCandidate(entry, input);
    const key = String(normalized.rideId || normalized.name || `${normalized.sourceSlot}-${allCandidates.length}`);

    if (seen.has(key)) return;

    seen.add(key);
    allCandidates.push(normalized);
  });

  const candidates = allCandidates.filter((candidate) => candidate.eligibleForTohiPick);
  const excludedCandidates = allCandidates.filter((candidate) => !candidate.eligibleForTohiPick);

  return {
    candidates,
    excludedCandidates,
    topCandidate: candidates[0] || null,
    sourceCount: entries.length,
    usableCount: candidates.length,
  };
}

export function getTopTohiPickCandidates(input = {}, limit = 3) {
  const result = buildTohiPickCandidates(input);
  const safeLimit = Math.max(1, Number(limit) || 3);

  return result.candidates.slice(0, safeLimit);
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
