/**
 * ParkPlan AI — Ride Recommendation Engine (V1.1)
 *
 * Surgical cleanup of V1. The following field-tested systems are preserved
 * with identical behavior:
 *   - weather / rain / storm suppression
 *   - heat logic and time-of-day wet ride timing
 *   - GPS nearest-anchor opportunity boosts
 *   - scheduled show handling and Plan Ahead bucket logic
 *   - height filtering and warnings
 *   - family profile modifiers
 *   - per-park strategy rules (Magic Kingdom and Hollywood)
 *   - completed / skipped / report-issue exclusion behavior
 *   - the existing modifier NAMES on each scored ride, so telemetry stays
 *     comparable to V1 field data
 *
 * What changed (and why):
 *   1. familyProfileModifier now has a hard ceiling of FAMILY_CAP_STRONG_WAIT
 *      (+12) even when the wait is "strong". Previously the strong-wait branch
 *      returned the raw modifier uncapped, which let personalization stack to
 *      +20-24 and overpower geography. This was the root cause of Peter Pan
 *      winning from anywhere in the park.
 *
 *   2. New cross-park sum cap: when a ride is NOT in the same land as the
 *      guest AND the GPS closest-anchor boost is not active, the sum of
 *      (waitValueModifier + familyProfileModifier + trendModifier +
 *       nearbyHeadlinerOpportunityModifier) is capped at
 *      CROSS_PARK_POSITIVE_SUM_CAP (+30). Individual modifier values are still
 *      preserved on the ride object; the cap is exposed as a separate
 *      `crossParkSumCapAdjustment` field for telemetry.
 *
 *   3. lowWaitBonus now returns 0 for plan-ahead category rides. Plan-ahead
 *      rides at low waits already get +14 from waitValueModifier; adding the
 *      +5..+12 lowWaitBonus on top was double-counting.
 *
 *   4. nearbyHeadlinerOpportunityModifier's standalone great_value branch
 *      (ride is nearby-enough but not in the same area) dropped from +14 to
 *      +6. Still rewards the signal, stops it from compounding past geography.
 *
 *   5. Null currentLand short-circuit: when the engine has no valid current
 *      land, it no longer pretends it can compute bestMove / backup /
 *      worthTheWalk. Those slots return null, planAhead and waitOnThis still
 *      compute (they don't depend on proximity), and the response includes
 *      `needsLocation: true` so the UI can prompt for location.
 *
 *   6. Best Move fallback quality gate: if the cascade is about to set Best
 *      Move from the cross-park positive pool, the candidate must clear a
 *      Worth-the-Walk-grade bar (score >= FALLBACK_BEST_MOVE_SCORE_FLOOR,
 *      status === great_value, not a low-capacity classic at non-great_value
 *      or a long wait). If nothing qualifies, bestMove is null.
 *
 *   7. Worth the Walk score floor raised from 70 to WORTH_THE_WALK_SCORE_FLOOR
 *      (75). Low-capacity classics still need great_value.
 *
 * New fields on the response envelope:
 *   - `needsLocation` (boolean): true when currentLand is unknown.
 * New fields on each scored ride:
 *   - `crossParkSumCapAdjustment` (number, <= 0): the amount removed by the
 *     cross-park sum cap, or 0 when the cap did not fire.
 *   - `mustDoPriority`, `mustDoModifier`, `mustDoReason`, `shouldProtectLater`:
 *     Commit 35 must-do awareness telemetry. The boost is capped with the
 *     cross-park positive sum and never applies after caps.
 */

import { getRideMeta, getWaitValueStatus, getParkRides } from "./rideMetadata";
import {
  resolveCurrentLand,
  getProximityModifier,
} from "./parkProximity";
import { getParkCloseTime, getParkHoursForDate } from "./parkHours";

const DEFAULT_POPULARITY = 40;
const WALK_BUFFER_MINUTES = 15;
const ORLANDO_TIME_ZONE = "America/New_York";
const ORLANDO_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ORLANDO_TIME_ZONE,
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

// V1.1 caps and gates. Tuning these is the easiest way to adjust the new
// behavior without touching individual modifier functions.
const FAMILY_CAP_WEAK_WAIT = 4;
const FAMILY_CAP_LATE_EVENING = 8;
const FAMILY_CAP_STRONG_WAIT = 12;
const CROSS_PARK_POSITIVE_SUM_CAP = 30;
const FALLBACK_BEST_MOVE_SCORE_FLOOR = 85;
const WORTH_THE_WALK_SCORE_FLOOR = 75;
const STRONG_CLOSEST_ANCHOR_THRESHOLD = 30;

const MUST_DO_MODIFIERS = {
  must_do: 12,
  would_love: 7,
  nice_if_possible: 3,
};

/* -------------------------------------------------------------------------- */
/* Time helpers                                                               */
/* -------------------------------------------------------------------------- */

function getOrlandoTimeParts(date = new Date()) {
  const parts = ORLANDO_TIME_FORMATTER.formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return { hour, minute, totalMinutes: hour * 60 + minute };
}

function isEarlyEntryWindow(parkId, date = new Date()) {
  if (parkId !== "magic_kingdom") return false;

  const parkHours = getParkHoursForDate(parkId, date);
  const openTime = parkHours?.open;

  if (!(openTime instanceof Date) || !Number.isFinite(openTime.getTime())) {
    return false;
  }

  const nowMs = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(nowMs)) return false;

  const earlyEntryStartMs = openTime.getTime() - 30 * 60 * 1000;
  const earlyEntryEndMs = openTime.getTime();

  return nowMs >= earlyEntryStartMs && nowMs < earlyEntryEndMs;
}

function isAllowedDuringEarlyEntry(parkId, meta, date = new Date()) {
  if (!isEarlyEntryWindow(parkId, date)) return true;

  if (parkId === "magic_kingdom") {
    return meta?.land === "fantasyland" || meta?.land === "tomorrowland";
  }

  return true;
}

function getParkOpenStatus(parkId, date = new Date()) {
  const parkHours = getParkHoursForDate(parkId, date);
  const openTime = parkHours?.open;

  if (!(openTime instanceof Date) || !Number.isFinite(openTime.getTime())) {
    return {
      isPreOpen: false,
      isEarlyEntryWindow: false,
      shouldBlockGoNow: false,
      openTime: null,
    };
  }

  const nowMs = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const openMs = openTime.getTime();

  if (!Number.isFinite(nowMs)) {
    return {
      isPreOpen: false,
      isEarlyEntryWindow: false,
      shouldBlockGoNow: false,
      openTime,
    };
  }

  const earlyEntryActive = isEarlyEntryWindow(parkId, date);
  const isPreOpen = nowMs < openMs;

  return {
    isPreOpen,
    isEarlyEntryWindow: earlyEntryActive,
    shouldBlockGoNow: isPreOpen && !earlyEntryActive,
    openTime,
  };
}

/* -------------------------------------------------------------------------- */
/* Weather helpers                                                            */
/* -------------------------------------------------------------------------- */

function getWeatherSummary(weather) {
  return String(weather?.summary || "").toLowerCase();
}

function getEffectiveTempF(weather) {
  return (
    weather?.feelsLikeF ??
    weather?.heatIndexF ??
    weather?.tempF ??
    null
  );
}

function isCurrentlyRaining(weather) {
  const summary = getWeatherSummary(weather);

  return (
    summary.includes("rain") ||
    summary.includes("drizzle") ||
    summary.includes("shower") ||
    summary.includes("showers")
  );
}

function isCurrentlyStorming(weather) {
  const summary = getWeatherSummary(weather);

  if (weather?.currentPrecipitation === false) {
    return false;
  }

  return (
    weather?.stormMode === true ||
    summary.includes("thunderstorm") ||
    summary.includes("storm") ||
    summary.includes("lightning")
  );
}
function isRainActive(weather) {
  return isCurrentlyRaining(weather) || (weather?.rainRisk ?? 0) >= 0.45;
}

function getPrecipitationWindow(weather = {}) {
  const window = weather?.nextPrecipitationWindow;

  if (window && typeof window === "object") {
    return window;
  }

  return weather?.upcomingPrecipitation === true ? {} : null;
}

function isStormyPrecipitationWindow(window = {}) {
  const summary = getWeatherSummary(window);
  const weatherCode = Number(window?.weatherCode);
  const rainRisk = Number(window?.rainRisk);

  return Boolean(
    summary.includes("thunderstorm") ||
      summary.includes("storm") ||
      summary.includes("lightning") ||
      summary.includes("heavy rain") ||
      weatherCode === 8000 ||
      weatherCode === 4201 ||
      (Number.isFinite(rainRisk) && rainRisk >= 0.7)
  );
}

export function getRecommendationWeatherState(weather = {}) {
  const currentlyRaining = isCurrentlyRaining(weather);
  const currentlyStorming = isCurrentlyStorming(weather);
  const activePrecipitation = weather?.currentPrecipitation === true || currentlyRaining;
  const activeStorm = currentlyStorming && activePrecipitation;
  const activeRain = activePrecipitation;
  const precipitationWindow = getPrecipitationWindow(weather);
  const forecastStormWatch =
    !activeStorm && !activeRain && Boolean(precipitationWindow) && isStormyPrecipitationWindow(precipitationWindow);
  const forecastRainWatch =
    !activeStorm && !activeRain && Boolean(precipitationWindow) && !forecastStormWatch;
  const legacyRainActive = isRainActive(weather);

  return {
    activeStorm,
    activeRain,
    forecastStormWatch,
    forecastRainWatch,
    legacyRainActive,
    hasUpcomingPrecipitation: Boolean(precipitationWindow),
    label: activeStorm
      ? "Storm Smart Mode"
      : forecastStormWatch
        ? "Storm Watch"
        : forecastRainWatch
          ? "Rain Watch"
          : activeRain
            ? "Rain Active"
            : "Normal",
  };
}

function isRainSensitiveRide(meta) {
  if (!meta) return false;

  return (
    meta.closesInRain === true ||
    meta.environment === "outdoor" ||
    meta.environment === "mixed"
  );
}

function isRainRecoveryRide(meta) {
  if (!meta) return false;
  if (isRainSensitiveRide(meta)) return false;

  return (
    meta.environment === "indoor" ||
    meta.hasAC === true ||
    meta.tags?.includes("recovery")
  );
}

function getLocalRainRecoveryModifier(meta, weather, currentLand, proximityModifier) {
  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  if (!stormActive && !rainActive) return 0;
  if (!isRainRecoveryRide(meta)) return 0;

  const local = isSameArea(meta, currentLand, proximityModifier);

  if (stormActive) {
    if (local) return 28;
    return 8;
  }

  if (local) return 22;
  return 4;
}


/* -------------------------------------------------------------------------- */
/* Ride name / meta resolution                                                */
/* -------------------------------------------------------------------------- */

function isUnsupportedRecommendationVariant(ride) {
  const name = String(ride?.name || "").toLowerCase();

  return (
    name.includes("single rider") ||
    name.includes("single-rider") ||
    name.includes("lightning lane") ||
    name.includes("virtual queue")
  );
}

function normalizeRideName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMetaForRide(parkId, ride) {
  const direct = getRideMeta(parkId, ride?.id ?? ride?.name);
  if (direct) return direct;

  if (isUnsupportedRecommendationVariant(ride)) return null;

  const rideName = normalizeRideName(ride?.name);
  if (!rideName) return null;

  const parkRides = getParkRides(parkId);

  const exactNameMatch = parkRides.find(([, meta]) => {
    return normalizeRideName(meta.displayName) === rideName;
  });

  if (exactNameMatch) return exactNameMatch[1];

  const looseNameMatch = parkRides.find(([, meta]) => {
    const metaName = normalizeRideName(meta.displayName);
    return metaName.includes(rideName) || rideName.includes(metaName);
  });

  return looseNameMatch?.[1] || null;
}

/* -------------------------------------------------------------------------- */
/* Height filtering                                                           */
/* -------------------------------------------------------------------------- */

function getShortestHeightInches(familyProfile) {
  const directHeight = Number(familyProfile?.shortestHeightInches);

  if (Number.isFinite(directHeight) && directHeight > 0) {
    return directHeight;
  }

  const guests = Array.isArray(familyProfile?.guests) ? familyProfile.guests : [];
  const validHeights = guests
    .map((guest) => Number(guest.heightInches))
    .filter((height) => Number.isFinite(height) && height > 0);

  return validHeights.length ? Math.min(...validHeights) : null;
}

function getHeightEligibilityFailure(meta, familyProfile) {
  if (!meta || !familyProfile) return null;

  const requiredHeight = Number(meta.minHeightInches || 0);
  if (!requiredHeight) return null;

  const shortestHeight = getShortestHeightInches(familyProfile);
  if (shortestHeight == null) return null;

  if (shortestHeight >= requiredHeight) return null;

  const preference = familyProfile.wholeGroupRidesTogether || "warn";

  // TOHI beta trust rule:
  // If the shortest rider cannot ride, do not surface this attraction in
  // normal family recommendation slots. The default setup value is "warn",
  // but "warn" is not safe enough for Best Move / Smart Backup /
  // Worth the Walk / Plan Ahead. Only explicit future rider-switch mode can
  // allow a height-restricted attraction through with a visible warning.
  if (preference === "rider_switch") {
    return null;
  }

  return {
    reason: "heightRestricted",
    requiredHeight,
    shortestHeight,
    mode: "exclude",
  };
}

function getHeightWarning(meta, familyProfile) {
  if (!meta || !familyProfile) return null;

  const requiredHeight = Number(meta.minHeightInches || 0);
  if (!requiredHeight) return null;

  const shortestHeight = getShortestHeightInches(familyProfile);
  if (shortestHeight == null || shortestHeight >= requiredHeight) return null;

  return {
    requiredHeight,
    shortestHeight,
    message:
      familyProfile.wholeGroupRidesTogether === "rider_switch"
        ? `Some riders may be under ${requiredHeight} inches. Use Rider Switch or split up if needed.`
        : `Not everyone may meet the ${requiredHeight}-inch height requirement.`,
  };
}


/* -------------------------------------------------------------------------- */
/* Must-do awareness                                                          */
/* -------------------------------------------------------------------------- */

function getMustDoExperiences(tripPlan = {}) {
  return Array.isArray(tripPlan?.mustDoExperiences) ? tripPlan.mustDoExperiences : [];
}

function getMustDoPriorityLabel(priority) {
  if (priority === "must_do") return "must-do";
  if (priority === "would_love") return "would-love";
  if (priority === "nice_if_possible") return "nice-if-possible";
  return "must-do";
}

function getMustDoMatch(tripPlan, parkId, ride, meta) {
  const mustDos = getMustDoExperiences(tripPlan);

  if (!mustDos.length || !parkId || !ride || !meta) return null;

  const rideId = ride?.id != null ? String(ride.id) : "";
  const rideName = normalizeRideName(ride?.name);
  const metaName = normalizeRideName(meta?.displayName);

  const sameParkMustDos = mustDos.filter((experience) => experience?.parkId === parkId);

  const idMatch = sameParkMustDos.find((experience) => {
    return experience?.id != null && rideId && String(experience.id) === rideId;
  });

  if (idMatch) return idMatch;

  // Conservative fallback only: exact-normalized name match.
  // No fuzzy matching. Better to miss a boost than silently boost the wrong ride.
  return (
    sameParkMustDos.find((experience) => {
      const experienceName = normalizeRideName(experience?.name);
      return experienceName && (experienceName === rideName || experienceName === metaName);
    }) || null
  );
}

function shouldProtectMustDoLater({
  mustDoMatch,
  ride,
  meta,
  waitValueStatus,
  weather,
  currentLand,
  proximityModifier,
  familyProfile,
  timeContext,
}) {
  if (!mustDoMatch || !meta) return false;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;
  const effectiveTempF = getEffectiveTempF(weather);
  const heatActive =
    timeContext?.dayPhase === "midday_heat_window" ||
    timeContext?.dayPhase === "afternoon_crash_window" ||
    (effectiveTempF != null && effectiveTempF >= 87);

  if ((status === "bad_value" || status === "above_normal") && waitTime != null && waitTime >= 35) {
    return true;
  }

  if (waitTime != null && waitTime >= 75) {
    return true;
  }

  if (
    heatActive &&
    waitTime != null &&
    waitTime >= 35 &&
    (meta.environment === "outdoor" || meta.environment === "mixed") &&
    !meta.hasAC &&
    !meta.getsWet
  ) {
    return true;
  }

  if (
    familyProfile?.walkingTolerance === "low" &&
    isFarFromCurrentArea(meta, currentLand, proximityModifier)
  ) {
    return true;
  }

  return false;
}

function getMustDoModifier({
  mustDoMatch,
  ride,
  meta,
  waitValueStatus,
  weather,
  currentLand,
  proximityModifier,
  familyProfile,
  timeContext,
}) {
  if (!mustDoMatch || !meta) {
    return {
      modifier: 0,
      priority: null,
      reason: null,
      shouldProtectLater: false,
    };
  }

  const priority = MUST_DO_MODIFIERS[mustDoMatch.priority]
    ? mustDoMatch.priority
    : "must_do";

  const baseModifier = MUST_DO_MODIFIERS[priority] || 0;
  const label = getMustDoPriorityLabel(priority);
  const shouldProtectLater = shouldProtectMustDoLater({
    mustDoMatch,
    ride,
    meta,
    waitValueStatus,
    weather,
    currentLand,
    proximityModifier,
    familyProfile,
    timeContext,
  });

  if (shouldProtectLater) {
    return {
      modifier: Math.min(baseModifier, 4),
      priority,
      reason: `This is one of your ${label} picks, but the current conditions make it smarter to save for later.`,
      shouldProtectLater: true,
    };
  }

  return {
    modifier: baseModifier,
    priority,
    reason: `This is one of your ${label} picks and the current conditions are reasonable enough to keep it visible.`,
    shouldProtectLater: false,
  };
}

function getMustDoPlanAheadPriorityBoost(ride) {
  if (!ride?.mustDoPriority) return 0;

  const baseBoost =
    ride.mustDoPriority === "must_do"
      ? 70
      : ride.mustDoPriority === "would_love"
      ? 42
      : 18;

  return ride.shouldProtectLater ? baseBoost + 35 : baseBoost;
}

function getMustDoWaitOnThisPriorityBoost(ride) {
  if (!ride?.mustDoPriority) return 0;

  if (!ride.shouldProtectLater) {
    return ride.mustDoPriority === "must_do"
      ? 24
      : ride.mustDoPriority === "would_love"
      ? 14
      : 6;
  }

  return ride.mustDoPriority === "must_do"
    ? 80
    : ride.mustDoPriority === "would_love"
    ? 50
    : 20;
}


/* -------------------------------------------------------------------------- */
/* Family profile modifier (unchanged from V1)                                */
/* -------------------------------------------------------------------------- */

function getFamilyProfileModifier(meta, familyProfile, weather) {
  if (!meta || !familyProfile) return 0;

  let mod = 0;
  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;
  const effectiveTempF = getEffectiveTempF(weather);

  if (familyProfile.thrillTolerance === "low") {
    if ((meta.intensity || 0) >= 4 || tags.includes("thrill") || tags.includes("coaster")) {
      mod -= 28;
    } else if ((meta.intensity || 0) >= 3) {
      mod -= 12;
    }

    if ((meta.intensity || 0) <= 2 && !tags.includes("thrill")) {
      mod += 6;
    }
  } else if (familyProfile.thrillTolerance === "high") {
    if ((meta.intensity || 0) >= 4 || tags.includes("thrill") || tags.includes("coaster")) {
      mod += 10;
    }
  }

  if (familyProfile.walkingTolerance === "low") {
    if (meta.environment === "outdoor" && effectiveTempF != null && effectiveTempF >= 87) {
      mod -= 4;
    }
  } else if (familyProfile.walkingTolerance === "high") {
    if (category?.startsWith("plan_ahead")) {
      mod += 3;
    }
  }

  if (familyProfile.heatSensitivity === "high" && effectiveTempF != null && effectiveTempF >= 87) {
    if (meta.hasAC || meta.environment === "indoor") mod += 10;
    if (meta.environment === "outdoor" && !meta.getsWet) mod -= 10;
    if (meta.environment === "mixed" && !meta.getsWet) mod -= 5;
  } else if (familyProfile.heatSensitivity === "low" && effectiveTempF != null && effectiveTempF >= 87) {
    if (meta.environment === "outdoor" && !meta.getsWet) mod += 3;
  }

  if (meta.getsWet) {
    if (familyProfile.waterRidePreference === "avoid") mod -= 45;
    else if (familyProfile.waterRidePreference === "yes") mod += 8;
  }

  if (familyProfile.pace === "relaxed") {
    if (category?.startsWith("plan_ahead") && (meta.intensity || 0) >= 4) mod -= 5;
    if (meta.hasAC || category === "filler_or_recovery") mod += 3;
  } else if (familyProfile.pace === "maximize") {
    if (category?.startsWith("plan_ahead")) mod += 5;
  }

  const priorities = new Set(familyProfile.priorities || []);

  const isCharacterOrMeet =
    tags.includes("characters") ||
    tags.includes("character") ||
    tags.includes("meet-greet") ||
    tags.includes("meet-and-greet");

  const isPrincessOrRoyal =
    tags.includes("princess") ||
    tags.includes("royal") ||
    normalizeRideName(meta.displayName).includes("belle") ||
    normalizeRideName(meta.displayName).includes("princess");

  const isInteractiveStoryShow =
    tags.includes("interactive") ||
    tags.includes("storytelling") ||
    normalizeRideName(meta.displayName).includes("enchanted tales");

  const wantsCharacters = priorities.has("characters");
  const wantsPrincesses = priorities.has("princesses");
  const wantsShows = priorities.has("shows_parades");
  const wantsLowStress = priorities.has("low_stress");

  if (priorities.has("headliners") && (meta.popularity || 0) >= 85) mod += 8;
  if (wantsLowStress && (meta.hasAC || category === "filler_or_recovery")) mod += 5;
  if (priorities.has("ac_breaks") && (meta.hasAC || meta.environment === "indoor")) mod += 8;
  if (wantsCharacters && isCharacterOrMeet) mod += 12;
  if (wantsPrincesses && isPrincessOrRoyal) mod += 14;
  if (wantsShows && tags.includes("show")) mod += 8;
  if (priorities.has("bluey_younger_kids") && tags.includes("bluey")) mod += 14;

  if (isPrincessOrRoyal && !wantsPrincesses) mod -= 24;
  if (isCharacterOrMeet && !wantsCharacters) mod -= 18;
  if (isInteractiveStoryShow && !wantsPrincesses && !wantsCharacters && !wantsShows) {
    mod -= 18;
  }

  if (familyProfile.hasSmallChildren) {
    if ((meta.intensity || 0) <= 2 && meta.minHeightInches === 0) mod += 5;
    if ((meta.intensity || 0) >= 5) mod -= 6;

    if ((isPrincessOrRoyal || isCharacterOrMeet) && !wantsPrincesses && !wantsCharacters) {
      mod -= 6;
    }
  }

  return mod;
}

/**
 * V1.1: cap personalization for plan-ahead category rides.
 *
 * Weak wait + not late evening:    cap at +4   (unchanged from V1)
 * Weak wait + late evening:        cap at +8   (unchanged from V1)
 * Strong wait:                     cap at +12  (NEW — previously returned uncapped)
 *
 * Without the strong-wait cap, personalization could stack to +20-24 on rides
 * like Peter Pan whenever wait dropped to "great_value" (≤40 min). That single
 * stack was enough to overpower the -16 proximity penalty, which is the root
 * cause of Peter Pan winning from anywhere in the park.
 */
function getPlanAheadPersonalizationCap({
  meta,
  ride,
  waitValueStatus,
  familyProfileModifier,
  timeContext,
}) {
  if (!meta) return familyProfileModifier;

  const category = meta?.planningProfile?.category;
  const isPlanAheadCategory =
    category === "plan_ahead_single_pass" ||
    category === "plan_ahead_multi_pass" ||
    category === "plan_ahead_standby_only";

  if (!isPlanAheadCategory) return familyProfileModifier;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;

  const isStrongWait =
    status === "great_value" ||
    status === "good_value" ||
    (waitTime != null && waitTime <= 35);

  const isLateEvening =
    timeContext?.dayPhase === "late_evening" ||
    (timeContext?.orlandoTotalMinutes != null &&
      timeContext.orlandoTotalMinutes >= 20 * 60);

  if (!isStrongWait && !isLateEvening) {
    return Math.min(familyProfileModifier, FAMILY_CAP_WEAK_WAIT);
  }

  if (!isStrongWait && isLateEvening) {
    return Math.min(familyProfileModifier, FAMILY_CAP_LATE_EVENING);
  }

  return Math.min(familyProfileModifier, FAMILY_CAP_STRONG_WAIT);
}

function getPlanAheadRealityCheckModifier({ parkId, meta, ride, waitValueStatus, timeContext }) {
  if (!meta) return 0;

  const category = meta?.planningProfile?.category;
  const isPlanAheadCategory =
    category === "plan_ahead_single_pass" ||
    category === "plan_ahead_multi_pass" ||
    category === "plan_ahead_standby_only";

  if (!isPlanAheadCategory) return 0;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;
  const displayName = meta.displayName;

  const isLateEvening =
    timeContext?.dayPhase === "late_evening" ||
    (timeContext?.orlandoTotalMinutes != null &&
      timeContext.orlandoTotalMinutes >= 20 * 60);

  let mod = 0;

  if (
    parkId === "magic_kingdom" &&
    (displayName === "TRON Lightcycle / Run" ||
      displayName === "Seven Dwarfs Mine Train")
  ) {
    if (waitTime != null && waitTime >= 55 && status !== "great_value") {
      mod -= isLateEvening ? 6 : 18;
    }

    if (waitTime != null && waitTime >= 70 && status !== "great_value") {
      mod -= 10;
    }
  }

  if (
    status !== "great_value" &&
    status !== "good_value" &&
    status !== "bad_value" &&
    waitTime != null &&
    waitTime >= 55
  ) {
    mod -= 8;
  }

  return mod;
}

/* -------------------------------------------------------------------------- */
/* Score components                                                           */
/* -------------------------------------------------------------------------- */

function getBaseScore(parkId, ride) {
  const meta = getMetaForRide(parkId, ride);
  return meta?.popularity ?? DEFAULT_POPULARITY;
}

function getWaitPenalty(waitTime) {
  if (waitTime == null) return 15;
  if (waitTime <= 10) return 0;
  if (waitTime <= 20) return 6;
  if (waitTime <= 35) return 14;
  if (waitTime <= 50) return 24;
  if (waitTime <= 70) return 36;
  return 50;
}

/**
 * V1.1: lowWaitBonus is now zero for plan-ahead category rides.
 *
 * Plan-ahead rides at low waits already receive +14 from waitValueModifier
 * (the great_value bracket). Adding lowWaitBonus on top double-counts the same
 * signal and disproportionately helps low-capacity classics like Peter Pan,
 * Jungle Cruise, Haunted Mansion. Normal standby and filler rides still get
 * the bonus because their wait curves don't already have great_value bumps.
 */
function getLowWaitBonus(waitTime, meta) {
  if (waitTime == null) return 0;

  const category = meta?.planningProfile?.category;
  const isPlanAheadCategory =
    category === "plan_ahead_single_pass" ||
    category === "plan_ahead_multi_pass" ||
    category === "plan_ahead_standby_only";

  if (isPlanAheadCategory) return 0;

  if (waitTime <= 5) return 12;
  if (waitTime <= 10) return 9;
  if (waitTime <= 20) return 5;
  return 0;
}

function getTrendModifier(rideName) {
  const trends = {
    "Buzz Lightyear's Space Ranger Spin": 8,
    "Buzz Lightyear’s Space Ranger Spin": 8,
    "Peter Pan's Flight": 4,
    "Tomorrowland Transit Authority PeopleMover": 1,
  };

  return trends[rideName] ?? 0;
}

function getContextModifier(meta, weather, mode = "default") {
  if (!meta || !weather) return 0;

  const effectiveTempF = getEffectiveTempF(weather);
  const { rainRisk = 0 } = weather;
  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);
  let mod = 0;

  if (stormActive) {
    if (meta.closesInRain) mod -= 90;
    if (meta.environment === "indoor") mod += 18;
    else if (meta.environment === "outdoor") mod -= 35;
    else if (meta.environment === "mixed") mod -= 25;
  } else if (rainActive) {
    if (meta.environment === "indoor") mod += 12;
    if (meta.hasAC) mod += 4;
    if (meta.closesInRain) mod -= 45;
    if (meta.environment === "outdoor") mod -= 30;
    if (meta.environment === "mixed") mod -= 18;
    if (meta.getsWet) mod -= 10;
  } else if (rainRisk >= 0.7) {
    if (meta.closesInRain) mod -= 15;
    if (meta.environment === "indoor") mod += 8;
    if (meta.getsWet) mod -= 3;
  } else if (rainRisk >= 0.4) {
    if (meta.environment === "indoor") mod += 4;
    if (meta.closesInRain) mod -= 3;
  }

  if (effectiveTempF != null) {
    if (effectiveTempF >= 98) {
      if (meta.hasAC) mod += 14;
      if (meta.getsWet && !rainActive && !stormActive) mod += 8;
      if (meta.environment === "indoor") mod += 8;
      if (meta.environment === "outdoor" && !meta.getsWet) mod -= 12;
      if (meta.environment === "mixed" && !meta.getsWet) mod -= 6;
    } else if (effectiveTempF >= 92) {
      if (meta.hasAC) mod += 10;
      if (meta.getsWet && !rainActive && !stormActive) mod += 6;
      if (meta.environment === "indoor") mod += 5;
      if (meta.environment === "outdoor" && !meta.getsWet) mod -= 7;
    } else if (effectiveTempF >= 87) {
      if (meta.hasAC) mod += 6;
      if (meta.getsWet && !rainActive && !stormActive) mod += 3;
      if (meta.environment === "indoor") mod += 3;
      if (meta.environment === "outdoor" && !meta.getsWet) mod -= 3;
    } else if (effectiveTempF >= 82) {
      if (meta.hasAC) mod += 3;
      if (meta.getsWet && !rainActive && !stormActive) mod += 2;
    }
  }

  return mod;
}

function getWetRideTimingModifier(meta, weather, waitValueStatus) {
  if (!meta?.getsWet) return 0;

  const effectiveTempF = getEffectiveTempF(weather);
  const { hour } = getOrlandoTimeParts();
  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  let mod = 0;

  if (hour < 11) mod -= 10;
  if (hour >= 12 && hour <= 16) mod += 10;
  if (hour >= 17 && hour < 18) mod += 2;
  if (hour >= 18) mod -= 12;

  if (effectiveTempF != null) {
    if (effectiveTempF >= 98) mod += 12;
    else if (effectiveTempF >= 92) mod += 10;
    else if (effectiveTempF >= 87) mod += 5;
    else if (effectiveTempF <= 75) mod -= 10;
    else if (effectiveTempF <= 80) mod -= 5;
  }

  if (stormActive) mod -= 60;
  else if (rainActive) mod -= 20;
  else if ((weather?.rainRisk ?? 0) >= 0.6) mod -= 6;

  if (
    waitValueStatus?.status === "above_normal" ||
    waitValueStatus?.status === "bad_value"
  ) {
    mod = Math.min(mod, 4);
  }

  return mod;
}

function getPlanningPriority(meta, waitValueStatus) {
  const category = meta?.planningProfile?.category;

  if (!category) return 0;

  if (category === "plan_ahead_single_pass") return 100;
  if (category === "plan_ahead_multi_pass") return 90;
  if (category === "plan_ahead_standby_only") return 70;

  if (waitValueStatus?.status === "plan_ahead") return 80;

  return 0;
}

/* -------------------------------------------------------------------------- */
/* Scheduled show handling                                                    */
/* -------------------------------------------------------------------------- */

function isScheduledShowMeta(meta) {
  if (!meta) return false;

  const category = meta?.planningProfile?.category;
  const tags = meta.tags || [];

  return (
    meta.isScheduledShow === true ||
    meta.showProfile?.type === "scheduled_show" ||
    category === "scheduled_show" ||
    tags.includes("scheduled-show")
  );
}

function isContextOnlyMeta(meta) {
  if (!meta) return false;

  const category = meta?.planningProfile?.category;
  const tags = meta.tags || [];

  return (
    meta.recommendationEligible === false ||
    category === "context_only" ||
    tags.includes("context-only") ||
    tags.includes("landmark")
  );
}

function parseShowtimeToMinutes(showtime) {
  const match = String(showtime || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function getNextShowtimeInfo(meta) {
  const showtimes = meta?.showProfile?.showtimes || [];
  const nowMinutes = getOrlandoTimeParts().totalMinutes;

  const upcoming = showtimes
    .map((label) => ({
      label,
      totalMinutes: parseShowtimeToMinutes(label),
    }))
    .filter((item) => item.totalMinutes != null && item.totalMinutes >= nowMinutes)
    .sort((a, b) => a.totalMinutes - b.totalMinutes);

  const next = upcoming[0] || null;

  if (!next) {
    return {
      nextShowtime: null,
      minutesUntilShow: null,
      isPastFinalShow: true,
    };
  }

  return {
    nextShowtime: next.label,
    minutesUntilShow: next.totalMinutes - nowMinutes,
    isPastFinalShow: false,
  };
}

function getScheduledShowScoreModifier(meta, weather, proximityModifier) {
  if (!isScheduledShowMeta(meta)) return 0;

  const effectiveTempF = getEffectiveTempF(weather);
  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);
  const nextShow = getNextShowtimeInfo(meta);
  const arrivalBuffer =
    effectiveTempF != null && effectiveTempF >= 87
      ? meta?.showProfile?.middayArrivalBufferMinutes ||
        meta?.showProfile?.arrivalBufferMinutes ||
        20
      : meta?.showProfile?.arrivalBufferMinutes || 15;

  let mod = -45;

  if (stormActive || rainActive) mod += 10;
  if (effectiveTempF != null && effectiveTempF >= 92 && meta.hasAC) mod += 12;
  else if (effectiveTempF != null && effectiveTempF >= 87 && meta.hasAC) mod += 8;

  if (proximityModifier > 0) mod += 8;
  else if (proximityModifier < -8) mod -= 10;

  if (nextShow.isPastFinalShow) return -120;

  if (nextShow.minutesUntilShow != null) {
    if (
      nextShow.minutesUntilShow >= arrivalBuffer &&
      nextShow.minutesUntilShow <= arrivalBuffer + 25
    ) {
      mod += 18;
    } else if (nextShow.minutesUntilShow < arrivalBuffer) {
      mod -= 18;
    } else if (nextShow.minutesUntilShow > 90) {
      mod -= 14;
    }
  }

  return mod;
}

function getScheduledShowPlanPriority(meta, ride, currentLand, proximityModifier) {
  if (!isScheduledShowMeta(meta)) return 0;

  const nextShow = getNextShowtimeInfo(meta);
  if (nextShow.isPastFinalShow) return -1000;

  const arrivalBuffer =
    meta?.showProfile?.arrivalBufferMinutes ||
    meta?.showProfile?.middayArrivalBufferMinutes ||
    20;

  let priority = 60;

  if (meta.land === currentLand) priority += 18;
  else if (proximityModifier > 0) priority += 10;
  else if (proximityModifier < -8) priority -= 12;

  if (nextShow.minutesUntilShow != null) {
    if (
      nextShow.minutesUntilShow >= arrivalBuffer &&
      nextShow.minutesUntilShow <= arrivalBuffer + 30
    ) {
      priority += 24;
    } else if (nextShow.minutesUntilShow < arrivalBuffer) {
      priority -= 20;
    } else if (nextShow.minutesUntilShow > 90) {
      priority -= 12;
    }
  }

  return priority;
}

function buildScheduledShowReason(meta) {
  const nextShow = getNextShowtimeInfo(meta);
  const profile = meta?.showProfile || {};
  const verifyText = profile.verifyDailySchedule
    ? " Double-check My Disney Experience because showtimes can change."
    : "";

  if (nextShow.isPastFinalShow) {
    return `Scheduled show. The final listed showtime may have passed for today.${verifyText}`;
  }

  const arrivalBuffer =
    profile.middayArrivalBufferMinutes || profile.arrivalBufferMinutes || 20;

  const nextText = nextShow.nextShowtime
    ? `Next listed show: ${nextShow.nextShowtime}. `
    : "";

  const strategy = profile.strategy || meta?.planningProfile?.strategy || "";

  return `${nextText}${strategy} Plan to arrive about ${arrivalBuffer} minutes early when needed.${verifyText}`;
}

/* -------------------------------------------------------------------------- */
/* Pool / classification helpers                                              */
/* -------------------------------------------------------------------------- */

function getUsedRideIds(...rides) {
  return new Set(
    rides
      .filter(Boolean)
      .map((ride) => String(ride.id))
  );
}

function uniqueRidesById(...pools) {
  const seen = new Set();
  const unique = [];

  for (const pool of pools) {
    for (const ride of pool || []) {
      const id = String(ride?.id || "");
      if (!id || seen.has(id)) continue;

      seen.add(id);
      unique.push(ride);
    }
  }

  return unique;
}

function getFirstUnusedRide(pool, usedIds) {
  return (pool || []).find((ride) => !usedIds.has(String(ride.id))) || null;
}

function isFillerOrRecovery(ride) {
  return ride?.planningProfile?.category === "filler_or_recovery";
}

function isSoftRecoveryOnlyCandidate(parkId, ride, weather) {
  const meta = getMetaForRide(parkId, ride);

  if (!meta) return false;

  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;
  const effectiveTempF = getEffectiveTempF(weather);
  const badWeatherOrHeat =
    isCurrentlyStorming(weather) ||
    isRainActive(weather) ||
    (effectiveTempF != null && effectiveTempF >= 87);

  if (isScheduledShowMeta(meta)) return true;

  const isRecoveryOrShow =
    category === "filler_or_recovery" ||
    tags.includes("show") ||
    tags.includes("walkthrough") ||
    tags.includes("recovery");

  if (badWeatherOrHeat) return false;

  return isRecoveryOrShow;
}

/* -------------------------------------------------------------------------- */
/* Park-specific strategy modifiers (unchanged from V1)                       */
/* -------------------------------------------------------------------------- */

function getHollywoodStrategyModifier(parkId, meta, ride, weather, waitValueStatus, currentLand) {
  if (parkId !== "hollywood" || !meta) return 0;

  let mod = 0;
  const effectiveTempF = getEffectiveTempF(weather);
  const rainActive = isRainActive(weather);
  const stormActive = isCurrentlyStorming(weather);
  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;

  const weatherRecoveryActive =
    stormActive ||
    rainActive ||
    (effectiveTempF != null && effectiveTempF >= 87);

  if (!weatherRecoveryActive && category === "filler_or_recovery") mod -= 10;
  if (!weatherRecoveryActive && tags.includes("show")) mod -= 8;

  if (
    effectiveTempF != null &&
    effectiveTempF >= 92 &&
    meta.land === "toy_story_land" &&
    meta.environment === "outdoor"
  ) {
    mod -= 10;
  }

  if (
    effectiveTempF != null &&
    effectiveTempF >= 98 &&
    meta.land === "toy_story_land" &&
    meta.environment === "outdoor"
  ) {
    mod -= 8;
  }

  if ((rainActive || stormActive) && meta.environment === "outdoor") {
    mod -= 18;
  }

  if (
    meta.displayName === "Slinky Dog Dash" &&
    effectiveTempF != null &&
    effectiveTempF >= 92 &&
    waitValueStatus?.status === "normal"
  ) {
    mod -= 12;
  }

  if (
    meta.displayName === "Star Wars: Rise of the Resistance" &&
    waitValueStatus?.status === "great_value"
  ) {
    mod += 8;
  }

  if (
    meta.displayName === "Star Tours – The Adventures Continue" &&
    !weatherRecoveryActive
  ) {
    mod -= 6;
  }

  const { totalMinutes } = getOrlandoTimeParts();
  if (
    meta.displayName === "Millennium Falcon: Smugglers Run" &&
    totalMinutes >= 18 * 60
  ) {
    mod += 6;
  }

  return mod;
}

/**
 * V1.1: nearbyHeadlinerOpportunity standalone great_value branch dropped from
 * +14 to +6 (see else-if at the bottom). All other branches preserved.
 */
function getNearbyHeadlinerOpportunityModifier({
  parkId,
  meta,
  ride,
  weather,
  waitValueStatus,
  currentLand,
  proximityModifier,
}) {
  if (!meta) return 0;

  const category = meta?.planningProfile?.category;
  const isPlanAheadCategory =
    category === "plan_ahead_single_pass" ||
    category === "plan_ahead_multi_pass" ||
    category === "plan_ahead_standby_only";

  if (!isPlanAheadCategory) return 0;

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return 0;

  const isSameArea = meta.land === currentLand || proximityModifier > 0;
  const isNearbyEnough = isSameArea || proximityModifier > -8;

  if (!isNearbyEnough) return 0;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;

  let mod = 0;

  if (status === "great_value" && isSameArea) {
    mod += 26;
  } else if (status === "good_value" && isSameArea) {
    mod += 18;
  } else if (status === "great_value") {
    // V1.1: was +14, now +6. Standalone case (adjacent but not same area)
    // was compounding with personalization to overpower geography.
    mod += 6;
  }

  if (
    parkId === "hollywood" &&
    meta.displayName === "Slinky Dog Dash" &&
    currentLand === "toy_story_land" &&
    waitTime != null &&
    waitTime <= 35
  ) {
    mod += 34;
  }

  return mod;
}

function isSameRideAsNearestAnchor(ride, meta, locationContext) {
  const nearestAnchorId = String(locationContext?.nearestAnchorId || "");
  const nearestAnchorName = normalizeRideName(locationContext?.nearestAnchorName);

  if (!nearestAnchorId && !nearestAnchorName) return false;

  const rideId = String(ride?.id || "");
  const rideName = normalizeRideName(ride?.name);
  const metaName = normalizeRideName(meta?.displayName);

  if (nearestAnchorId && rideId && nearestAnchorId === rideId) return true;

  if (!nearestAnchorName) return false;

  return (
    nearestAnchorName === rideName ||
    nearestAnchorName === metaName ||
    rideName.includes(nearestAnchorName) ||
    nearestAnchorName.includes(rideName) ||
    metaName.includes(nearestAnchorName) ||
    nearestAnchorName.includes(metaName)
  );
}

function getClosestAnchorOpportunityModifier({
  parkId,
  meta,
  ride,
  weather,
  waitValueStatus,
  locationContext,
}) {
  if (!meta || !locationContext || locationContext.type !== "gps") return 0;

  const confidence = locationContext.confidence;
  const distanceMeters = locationContext.distanceMeters;

  if (confidence === "low") return 0;
  if (distanceMeters != null && distanceMeters > 160) return 0;
  if (!isSameRideAsNearestAnchor(ride, meta, locationContext)) return 0;

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return 0;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;
  let mod = 0;

  if (status === "great_value") mod += 34;
  else if (status === "good_value") mod += 24;
  else if (waitTime != null && waitTime <= 25) mod += 16;

  if (confidence === "high") mod += 8;

  if (distanceMeters != null && distanceMeters <= 75) mod += 8;
  else if (distanceMeters != null && distanceMeters <= 120) mod += 4;

  if (
    parkId === "magic_kingdom" &&
    meta.displayName === "Big Thunder Mountain Railroad" &&
    waitTime != null &&
    waitTime <= 35
  ) {
    mod += 30;
  }

  if (
    parkId === "magic_kingdom" &&
    meta.displayName === "Tiana's Bayou Adventure" &&
    waitTime != null &&
    waitTime <= 45 &&
    (status === "great_value" || status === "good_value")
  ) {
    mod += 18;
  }

  return mod;
}

function isLowCapacityClassic(meta) {
  if (!meta) return false;

  return [
    "Peter Pan's Flight",
    "Jungle Cruise",
    "The Many Adventures of Winnie the Pooh",
    "Pirates of the Caribbean",
    "Haunted Mansion",
  ].includes(meta.displayName);
}

function isTrueHeadliner(meta) {
  if (!meta) return false;

  const category = meta?.planningProfile?.category;
  const tags = meta.tags || [];

  return (
    (meta.popularity || 0) >= 85 ||
    category === "plan_ahead_single_pass" ||
    category === "plan_ahead_multi_pass" ||
    category === "plan_ahead_standby_only" ||
    tags.includes("headliner")
  );
}

function isSameArea(meta, currentLand, proximityModifier) {
  return meta?.land === currentLand || proximityModifier > 0;
}

function isFarFromCurrentArea(meta, currentLand, proximityModifier) {
  if (!meta) return false;
  if (isSameArea(meta, currentLand, proximityModifier)) return false;

  if (proximityModifier < -8) return true;

  return meta.land && currentLand && meta.land !== currentLand && proximityModifier <= 0;
}

function getCrossParkRealityModifier({
  parkId,
  meta,
  ride,
  weather,
  waitValueStatus,
  currentLand,
  proximityModifier,
  familyProfile,
  timeContext,
}) {
  if (!meta) return 0;

  const farFromArea = isFarFromCurrentArea(meta, currentLand, proximityModifier);
  if (!farFromArea) return 0;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;
  const effectiveTempF = getEffectiveTempF(weather);
  const isHeatOrCrashWindow =
    timeContext?.dayPhase === "midday_heat_window" ||
    timeContext?.dayPhase === "afternoon_crash_window" ||
    (effectiveTempF != null && effectiveTempF >= 87);

  let mod = -14;

  if (familyProfile?.walkingTolerance === "low") mod -= 12;
  if (familyProfile?.walkingTolerance === "medium") mod -= 5;

  if (familyProfile?.heatSensitivity === "high" && isHeatOrCrashWindow) {
    mod -= 10;
  } else if (isHeatOrCrashWindow) {
    mod -= 5;
  }

  if (isTrueHeadliner(meta)) {
    if (status === "great_value") mod += 16;
    else if (status === "good_value") mod += 8;
    else mod -= 6;
  }

  if (isLowCapacityClassic(meta)) {
    if (status === "great_value" && waitTime != null && waitTime <= 25) {
      mod += 4;
    } else {
      mod -= 20;
    }
  }

  if (parkId === "magic_kingdom" && meta.displayName === "Peter Pan's Flight") {
    if (currentLand !== "fantasyland") {
      if (status === "great_value" && waitTime != null && waitTime <= 25) {
        mod -= 8;
      } else {
        mod -= 28;
      }
    }

    if (waitTime != null && waitTime >= 35) {
      mod -= 10;
    }
  }

  return mod;
}

function getMagicKingdomStrategyModifier(parkId, meta, ride, weather, waitValueStatus, currentLand) {
  if (parkId !== "magic_kingdom" || !meta) return 0;

  let mod = 0;
  const effectiveTempF = getEffectiveTempF(weather);
  const rainActive = isRainActive(weather);
  const stormActive = isCurrentlyStorming(weather);
  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;
  const { totalMinutes } = getOrlandoTimeParts();

  const weatherRecoveryActive =
    stormActive ||
    rainActive ||
    (effectiveTempF != null && effectiveTempF >= 87);

  if (!weatherRecoveryActive && category === "filler_or_recovery") mod -= 10;
  if (!weatherRecoveryActive && tags.includes("show")) mod -= 8;

  if (!weatherRecoveryActive && meta.displayName === "Tomorrowland Transit Authority PeopleMover") {
    mod -= 6;
  }
  if (!weatherRecoveryActive && meta.displayName === "Walt Disney's Carousel of Progress") {
    mod -= 6;
  }
  if (!weatherRecoveryActive && meta.displayName === "Mickey's PhilharMagic") {
    mod -= 5;
  }

  if (
    (meta.displayName === "TRON Lightcycle / Run" ||
      meta.displayName === "Seven Dwarfs Mine Train") &&
    waitValueStatus?.status === "normal"
  ) {
    mod -= 8;
  }

  if (
    (meta.displayName === "TRON Lightcycle / Run" ||
      meta.displayName === "Seven Dwarfs Mine Train") &&
    waitValueStatus?.status === "great_value"
  ) {
    mod += 8;
  }

  if (
    meta.displayName === "Peter Pan's Flight" &&
    waitValueStatus?.status === "great_value" &&
    currentLand === "fantasyland"
  ) {
    mod += 8;
  }

  if (
    meta.displayName === "Peter Pan's Flight" &&
    currentLand !== "fantasyland" &&
    waitValueStatus?.status !== "great_value"
  ) {
    mod -= 16;
  }

  if (
    meta.displayName === "Peter Pan's Flight" &&
    totalMinutes >= 10 * 60 + 30 &&
    totalMinutes <= 17 * 60 &&
    (waitValueStatus?.status === "normal" || waitValueStatus?.status === "above_normal")
  ) {
    mod -= 12;
  }

  if (
    meta.displayName === "Tiana's Bayou Adventure" &&
    effectiveTempF != null &&
    effectiveTempF >= 90 &&
    !rainActive &&
    !stormActive &&
    (waitValueStatus?.status === "great_value" ||
      waitValueStatus?.status === "good_value")
  ) {
    mod += 8;
  }

  if (
    meta.displayName === "Tiana's Bayou Adventure" &&
    effectiveTempF != null &&
    effectiveTempF >= 90 &&
    waitValueStatus?.status === "normal"
  ) {
    mod -= 5;
  }

  if (
    effectiveTempF != null &&
    effectiveTempF >= 92 &&
    meta.environment === "outdoor" &&
    !meta.getsWet
  ) {
    mod -= 6;
  }

  if (
    totalMinutes >= 20 * 60 &&
    [
      "TRON Lightcycle / Run",
      "Seven Dwarfs Mine Train",
      "Peter Pan's Flight",
      "Space Mountain",
      "Big Thunder Mountain Railroad",
      "Jungle Cruise",
    ].includes(meta.displayName)
  ) {
    mod += 5;
  }

  return mod;
}

/**
 * V1.1 NEW: cross-park positive sum cap.
 *
 * When a ride is NOT in the guest's current land AND the GPS closest-anchor
 * boost is not active, cap the sum of (waitValueModifier + familyProfileModifier
 * + trendModifier + nearbyHeadlinerOpportunityModifier) at
 * CROSS_PARK_POSITIVE_SUM_CAP (+30). Individual modifier values are still
 * preserved on the ride for telemetry; the cap is applied as a separate
 * crossParkSumCapAdjustment line item.
 *
 * Same-land recommendations get full benefit (no walking cost to absorb).
 * GPS closest-anchor opportunities override the cap (highest-confidence signal).
 */
function getCrossParkSumCapAdjustment({
  meta,
  currentLand,
  closestAnchorOpportunityModifier,
  waitValueModifier,
  familyProfileModifier,
  trendModifier,
  nearbyHeadlinerOpportunityModifier,
  mustDoModifier = 0,
}) {
  const isSameLand = !!meta?.land && !!currentLand && meta.land === currentLand;
  if (isSameLand) return 0;

  if (closestAnchorOpportunityModifier >= STRONG_CLOSEST_ANCHOR_THRESHOLD) {
    return 0;
  }

  const positiveSum =
    Math.max(0, waitValueModifier) +
    Math.max(0, familyProfileModifier) +
    Math.max(0, trendModifier) +
    Math.max(0, nearbyHeadlinerOpportunityModifier) +
    Math.max(0, mustDoModifier);

  if (positiveSum <= CROSS_PARK_POSITIVE_SUM_CAP) return 0;

  return -(positiveSum - CROSS_PARK_POSITIVE_SUM_CAP);
}

/**
 * V1.1 NEW: quality gate for the Best Move cross-park fallback.
 *
 * When the cascade has exhausted same-area and primary-nearby pools, this
 * gate determines whether the next-best cross-park candidate is good enough
 * to recommend at all. Without it, bestMove silently became "best score
 * anywhere in the park", which is exactly how Peter Pan won from across MK.
 */
function isQualifiedFallbackBestMove(ride, parkId) {
  if (!ride) return false;
  if (ride.recommendationScore < FALLBACK_BEST_MOVE_SCORE_FLOOR) return false;
  if (ride.waitValueStatus?.status !== "great_value") return false;

  const meta = getMetaForRide(parkId, ride);
  if (!meta) return false;

  // Even at great_value, a low-capacity classic crossing the park is rarely
  // the right call unless the wait is genuinely rare (<= 25 min).
  if (isLowCapacityClassic(meta)) {
    const waitTime = ride.waitTime;
    if (waitTime == null || waitTime > 25) return false;
  }

  return true;
}

function isWeatherBlockedFromPositiveCards(parkId, ride, weather) {
  const meta = getMetaForRide(parkId, ride);
  if (!meta) return true;

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  if (stormActive && isRainSensitiveRide(meta)) return true;
  if (rainActive && isRainSensitiveRide(meta)) return true;

  return false;
}

function fitsBeforeClose(waitTime, closeTime, now) {
  if (!closeTime) return true;

  const wait = waitTime || 0;
  const projectedEntry = new Date(
    now.getTime() + (wait + WALK_BUFFER_MINUTES) * 60 * 1000
  );

  return projectedEntry <= closeTime;
}

/* -------------------------------------------------------------------------- */
/* Reason builder                                                             */
/* -------------------------------------------------------------------------- */

function buildReason(ride, parts) {
  const waitStatus = parts.waitValueStatus?.status;
  const isNearby = parts.proximityModifier > 0;
  const isCloseAnchor = parts.closestAnchorOpportunityModifier >= 30;
  const isCrosspark = parts.crossParkRealityModifier <= -25;
  const isModeratelyFar = !isCrosspark && parts.crossParkRealityModifier <= -12;
  const hasGoodFamilyFit = parts.familyProfileModifier >= 10;
  const hasWeakFamilyFit = parts.familyProfileModifier <= -15;
  const hasGoodContext = parts.contextModifier >= 8;
  const hasNearbyHeadliner = parts.nearbyHeadlinerOpportunityModifier >= 20;
  const shouldProtect = parts.shouldProtectLater;

  // Must-do deferred to a better window
  if (parts.mustDoModifier > 0 && shouldProtect && parts.mustDoReason) {
    return parts.mustDoReason;
  }

  // Must-do being recommended now
  if (parts.mustDoModifier > 0 && parts.mustDoReason) {
    const waitNote =
      waitStatus === "great_value" ? " Wait is lower than usual right now." :
      waitStatus === "good_value" ? " Wait is running better than usual." : "";
    return `${parts.mustDoReason}${waitNote}`;
  }

  // Primary sentence: wait value + location
  let primary;

  if (waitStatus === "great_value") {
    if (isNearby || isCloseAnchor) {
      primary = "Well below its usual wait and you're already nearby.";
    } else if (isCrosspark) {
      primary = "Well below its usual wait, though it requires crossing the park.";
    } else {
      primary = "Well below its usual wait right now.";
    }
  } else if (waitStatus === "good_value") {
    primary = isNearby
      ? "Running better than usual and you're nearby."
      : "Running better than usual for this ride.";
  } else if (waitStatus === "above_normal") {
    primary = isNearby
      ? "Busier than usual, but you're already nearby."
      : "Running a bit busier than usual right now.";
  } else if (waitStatus === "bad_value") {
    primary = "Higher than this ride is usually worth right now.";
  } else if (waitStatus === "plan_ahead") {
    primary = "This ride usually requires a strategy. Worth planning around rather than waiting standby.";
  } else if (ride.waitTime != null && ride.waitTime <= 10) {
    primary = isNearby ? "Very short wait and you're nearby." : "Very short wait right now.";
  } else if (ride.waitTime != null && ride.waitTime <= 25) {
    primary = isNearby ? "Reasonable wait and you're nearby." : "Reasonable wait for this ride.";
  } else if (isNearby || isCloseAnchor) {
    primary = "Nearby — worth a look given the current window.";
  } else if (hasNearbyHeadliner) {
    primary = "Rare chance at a headliner without a long walk.";
  } else {
    primary = "Worth considering given the current effort and timing.";
  }

  // Secondary: one additional signal if relevant
  let secondary = "";

  if (parts.heightWarning) {
    secondary = ` ${parts.heightWarning.message}.`;
  } else if (isCrosspark && waitStatus !== "great_value") {
    secondary = " Requires crossing the park.";
  } else if (isModeratelyFar) {
    secondary = " Not the closest option right now.";
  } else if (hasWeakFamilyFit) {
    secondary = " Less ideal for your family's profile.";
  } else if (hasGoodFamilyFit && !isNearby && waitStatus !== "great_value" && waitStatus !== "good_value") {
    secondary = " Good fit for your family.";
  } else if (hasGoodContext && !isNearby && waitStatus !== "great_value") {
    secondary = " Good option for current conditions.";
  } else if (shouldProtect) {
    secondary = " Better saved for a different window.";
  }

  return `${primary}${secondary}`;
}

function buildPlanAheadReason(meta, ride, waitValueStatus) {
  if (isScheduledShowMeta(meta)) return buildScheduledShowReason(meta);

  const strategy = meta?.planningProfile?.strategy;
  const label = waitValueStatus?.label;

  if (waitValueStatus?.status === "great_value" && strategy) {
    return `Great value right now. If this is on your list, this is a strong time to ride. Normal strategy: ${strategy}`;
  }

  if (strategy && label) return `${label}. ${strategy}`;
  if (strategy) return strategy;

  return "This ride usually requires planning. Consider paid access, rope drop, late night, or watching for a rare dip.";
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function getNextBestRides({
  parkId,
  rides = [],
  weather = null,
  mode = "default",
  locationContext = null,
  completedRideIds = [],
  skippedRideIds = [],
  familyProfile = null,
  timeContext = null,
  tripPlan = null,
}) {
  const currentLand = resolveCurrentLand(parkId, locationContext);

  // V1.1: when currentLand is unknown, the geography defenses fail open and
  // bestMove silently becomes "best popularity-weighted score in the park".
  // Surface this to the UI rather than producing a misleading recommendation.
  const needsLocation = !currentLand;

  const completed = new Set(completedRideIds.map(String));
  const skipped = new Set(skippedRideIds.map(String));

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  const now = new Date();
  const closeTime = getParkCloseTime(parkId, now);
  const parkOpenStatus = getParkOpenStatus(parkId, now);
  const blockGoNowForPreOpen = parkOpenStatus.shouldBlockGoNow;

  const filterStats = {
    total: rides.length,
    noMeta: 0,
    closed: 0,
    completed: 0,
    skipped: 0,
    unsupportedVariant: 0,
    contextOnly: 0,
    heightRestricted: 0,
    earlyEntryBlocked: 0,
    closingSoon: 0,
    eligible: 0,
  };

  const filterExamples = {
    noMeta: [],
    closed: [],
    completed: [],
    skipped: [],
    unsupportedVariant: [],
    contextOnly: [],
    heightRestricted: [],
    earlyEntryBlocked: [],
    closingSoon: [],
    eligible: [],
  };

  function addExample(bucket, ride, extra = "") {
    if (filterExamples[bucket].length >= 8) return;
    filterExamples[bucket].push(`${ride.name || "Unknown"} (${ride.id})${extra}`);
  }

  function getEligibilityFailure(ride, { ignoreCloseTime = false } = {}) {
    if (isUnsupportedRecommendationVariant(ride)) {
      return { reason: "unsupportedVariant", meta: null };
    }

    const meta = getMetaForRide(parkId, ride);

    if (!meta) return { reason: "noMeta", meta: null };

    if (isContextOnlyMeta(meta)) {
      return { reason: "contextOnly", meta };
    }

    const heightFailure = getHeightEligibilityFailure(meta, familyProfile);
    if (heightFailure?.mode === "exclude") {
      return {
        reason: "heightRestricted",
        meta,
        extra: ` · requires ${heightFailure.requiredHeight} in / shortest ${heightFailure.shortestHeight} in`,
      };
    }

    if (!ride.isOpen) return { reason: "closed", meta };
    if (completed.has(String(ride.id))) return { reason: "completed", meta };
    if (skipped.has(String(ride.id))) return { reason: "skipped", meta };

    if (!isAllowedDuringEarlyEntry(parkId, meta, now)) {
      return { reason: "earlyEntryBlocked", meta };
    }

    if (!ignoreCloseTime && !fitsBeforeClose(ride.waitTime, closeTime, now)) {
      return { reason: "closingSoon", meta };
    }

    return { reason: null, meta };
  }

  let eligibleRides = rides.filter((ride) => {
    const result = getEligibilityFailure(ride);
    const reason = result.reason;

    if (reason) {
      filterStats[reason] += 1;
      addExample(
        reason,
        ride,
        result.extra || (result.meta?.land ? ` · ${result.meta.land}` : "")
      );
      return false;
    }

    filterStats.eligible += 1;
    addExample("eligible", ride, result.meta?.land ? ` · ${result.meta.land}` : "");
    return true;
  });

  // Safety valve preserved from V1: if park-hours logic gets too aggressive,
  // do not let the entire recommendation engine go blank.
  if (!eligibleRides.length && filterStats.closingSoon > 0) {
    eligibleRides = rides.filter((ride) => {
      return !getEligibilityFailure(ride, { ignoreCloseTime: true }).reason;
    });

    if (eligibleRides.length) {
      console.warn("ParkPlan: close-time filter removed all rides; using relaxed close-time fallback.", {
        parkId,
        closeTime,
        now,
      });
    }
  }

  if (!eligibleRides.length) {
    console.warn("ParkPlan: no eligible recommendation rides", {
      parkId,
      currentLand,
      weather,
      completedRideIds,
      skippedRideIds,
      closeTime,
      now,
      filterStats,
      filterExamples,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Per-ride scoring                                                         */
  /* ------------------------------------------------------------------------ */

  const scored = eligibleRides.map((ride) => {
    const meta = getMetaForRide(parkId, ride);

    const baseScore = meta?.popularity ?? DEFAULT_POPULARITY;
    const waitPenalty = getWaitPenalty(ride.waitTime);
    const lowWaitBonus = getLowWaitBonus(ride.waitTime, meta); // V1.1: takes meta
    const trendModifier = getTrendModifier(ride.name);
    const contextModifier = getContextModifier(meta, weather, mode);
    const proximityModifier = getProximityModifier(meta, currentLand, parkId);
    const waitValueStatus = getWaitValueStatus(meta, ride.waitTime);
    const waitValueModifier = waitValueStatus.modifier || 0;
    const mustDoMatch = getMustDoMatch(tripPlan, parkId, ride, meta);

    const rawFamilyProfileModifier = getFamilyProfileModifier(
      meta,
      familyProfile,
      weather
    );
    const familyProfileModifier = getPlanAheadPersonalizationCap({
      meta,
      ride,
      waitValueStatus,
      familyProfileModifier: rawFamilyProfileModifier,
      timeContext,
    });

    const planAheadRealityCheckModifier = getPlanAheadRealityCheckModifier({
      parkId,
      meta,
      ride,
      waitValueStatus,
      timeContext,
    });

    const heightWarning = getHeightWarning(meta, familyProfile);

    const scheduledShowModifier = getScheduledShowScoreModifier(
      meta,
      weather,
      proximityModifier
    );

    const wetRideModifier = getWetRideTimingModifier(
      meta,
      weather,
      waitValueStatus
    );

    const parkStrategyModifier =
      getHollywoodStrategyModifier(parkId, meta, ride, weather, waitValueStatus, currentLand) +
      getMagicKingdomStrategyModifier(parkId, meta, ride, weather, waitValueStatus, currentLand) +
      getLocalRainRecoveryModifier(meta, weather, currentLand, proximityModifier);

    const crossParkRealityModifier = getCrossParkRealityModifier({
      parkId,
      meta,
      ride,
      weather,
      waitValueStatus,
      currentLand,
      proximityModifier,
      familyProfile,
      timeContext,
    });

    const nearbyHeadlinerOpportunityModifier =
      getNearbyHeadlinerOpportunityModifier({
        parkId,
        meta,
        ride,
        weather,
        waitValueStatus,
        currentLand,
        proximityModifier,
      });

    const closestAnchorOpportunityModifier =
      getClosestAnchorOpportunityModifier({
        parkId,
        meta,
        ride,
        weather,
        waitValueStatus,
        locationContext,
      });

    const mustDoResult = getMustDoModifier({
      mustDoMatch,
      ride,
      meta,
      waitValueStatus,
      weather,
      currentLand,
      proximityModifier,
      familyProfile,
      timeContext,
    });
    const mustDoModifier = mustDoResult.modifier || 0;

    // V1.1: cross-park sum cap. Applied as a separate adjustment so individual
    // modifier values stay readable for telemetry.
    const crossParkSumCapAdjustment = getCrossParkSumCapAdjustment({
      meta,
      currentLand,
      closestAnchorOpportunityModifier,
      waitValueModifier,
      familyProfileModifier,
      trendModifier,
      nearbyHeadlinerOpportunityModifier,
      mustDoModifier,
    });

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier +
      waitValueModifier +
      familyProfileModifier +
      planAheadRealityCheckModifier +
      scheduledShowModifier +
      wetRideModifier +
      parkStrategyModifier +
      crossParkRealityModifier +
      nearbyHeadlinerOpportunityModifier +
      closestAnchorOpportunityModifier +
      mustDoModifier +
      crossParkSumCapAdjustment -
      (heightWarning ? 16 : 0);

    const proximityDistance =
      proximityModifier > 0
        ? "same"
        : proximityModifier < -8
        ? "far"
        : "adjacent";

    return {
      ...ride,
      recommendationScore: finalScore,
      proximityModifier,
      crossParkRealityModifier,
      crossParkSumCapAdjustment, // V1.1: new telemetry field
      proximityDistance,
      waitValueStatus,
      planningProfile: meta?.planningProfile || null,
      showProfile: meta?.showProfile || null,
      isScheduledShow: isScheduledShowMeta(meta),
      heightWarning,
      strategyNote: meta?.waitProfile?.strategyNote || null,
      familyProfileModifier,
      rawFamilyProfileModifier,
      planAheadRealityCheckModifier,
      scheduledShowModifier,
      wetRideModifier,
      nearbyHeadlinerOpportunityModifier,
      closestAnchorOpportunityModifier,
      mustDoPriority: mustDoResult.priority,
      mustDoModifier,
      mustDoReason: mustDoResult.reason,
      shouldProtectLater: mustDoResult.shouldProtectLater,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        contextModifier,
        proximityModifier,
        waitValueStatus,
        familyProfileModifier,
        rawFamilyProfileModifier,
        planAheadRealityCheckModifier,
        heightWarning,
        scheduledShowModifier,
        wetRideModifier,
        parkStrategyModifier,
        crossParkRealityModifier,
        nearbyHeadlinerOpportunityModifier,
        closestAnchorOpportunityModifier,
        mustDoModifier,
        mustDoReason: mustDoResult.reason,
        shouldProtectLater: mustDoResult.shouldProtectLater,
        crossParkSumCapAdjustment,
      }),
    };
  });

  const sorted = scored.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  /* ------------------------------------------------------------------------ */
  /* Weather-aware positive pool                                              */
  /* ------------------------------------------------------------------------ */

  let positivePool = sorted.filter((ride) => {
    return !isWeatherBlockedFromPositiveCards(parkId, ride, weather);
  });

  if (!positivePool.length && sorted.length) {
    const indoorRecoveryPool = sorted.filter((ride) => {
      const meta = getMetaForRide(parkId, ride);
      return meta?.environment === "indoor" || meta?.hasAC === true;
    });

    positivePool = indoorRecoveryPool.length ? indoorRecoveryPool : sorted;

    console.warn("ParkPlan: positive recommendation pool was empty; using fallback pool.", {
      parkId,
      currentLand,
      weather,
      sortedCount: sorted.length,
      fallbackCount: positivePool.length,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Pool partitioning by proximity                                           */
  /* ------------------------------------------------------------------------ */

  const hasStrongClosestAnchorOpportunity = positivePool.some((ride) => {
    return ride.closestAnchorOpportunityModifier >= STRONG_CLOSEST_ANCHOR_THRESHOLD;
  });

  const goNowPositivePool = positivePool.filter((ride) => {
    if (ride.shouldProtectLater) return false;

    const meta = getMetaForRide(parkId, ride);
    return !isScheduledShowMeta(meta);
  });

  const sameAreaRides = goNowPositivePool.filter((ride) => {
    const meta = getMetaForRide(parkId, ride);
    return isSameArea(meta, currentLand, ride.proximityModifier);
  });

  const nearbyRides = goNowPositivePool.filter((ride) => {
    return ride.proximityDistance !== "far";
  });

  const farRides = goNowPositivePool.filter((ride) => {
    if (ride.proximityDistance !== "far") return false;

    if (hasStrongClosestAnchorOpportunity && ride.recommendationScore < 95) {
      return false;
    }

    return true;
  });

  const primarySameAreaRides = sameAreaRides.filter((ride) => {
    return !isSoftRecoveryOnlyCandidate(parkId, ride, weather);
  });

  const primaryNearbyRides = nearbyRides.filter((ride) => {
    return !isSoftRecoveryOnlyCandidate(parkId, ride, weather);
  });

  const primaryPositivePool = goNowPositivePool.filter((ride) => {
    return !isSoftRecoveryOnlyCandidate(parkId, ride, weather);
  });

      /* --------------------------------------------------------------------*/
      /* Best Move selection — 56B: primary ride trust before soft recovery   */
      /* --------------------------------------------------------------------*/

      const sameAreaSoftRecoveryRides = sameAreaRides.filter((ride) => {
        return isSoftRecoveryOnlyCandidate(parkId, ride, weather);
      });

      const nearbySoftRecoveryRides = nearbyRides.filter((ride) => {
        return isSoftRecoveryOnlyCandidate(parkId, ride, weather);
      });

      const localSoftRecoveryRides = uniqueRidesById(
        sameAreaSoftRecoveryRides,
        nearbySoftRecoveryRides
      );

      const sameAreaPick = primarySameAreaRides[0] || null;

      const nearbyPick =
        primaryNearbyRides.find((ride) => ride !== sameAreaPick) || null;

      const usedBeforeSoftRecovery = getUsedRideIds(sameAreaPick, nearbyPick);
      const localSoftRecoveryPick = getFirstUnusedRide(
        localSoftRecoveryRides,
        usedBeforeSoftRecovery
      );

      // Cross-park fallback is limited to primary ride-like candidates that
      // clear the quality gate. Soft recovery items should not become a global
      // Best Move just because they have a short posted wait.
      const fallbackCandidate =
        primaryPositivePool.find(
          (ride) =>
            ride !== sameAreaPick &&
            ride !== nearbyPick &&
            ride !== localSoftRecoveryPick
        ) || null;

      const fallbackPick = isQualifiedFallbackBestMove(fallbackCandidate, parkId)
        ? fallbackCandidate
        : null;

      const bestMove = needsLocation || blockGoNowForPreOpen
        ? null
        : sameAreaPick || nearbyPick || localSoftRecoveryPick || fallbackPick;

      const usedAfterBest = getUsedRideIds(bestMove);

      const backup = needsLocation || blockGoNowForPreOpen
        ? null
        : (
            getFirstUnusedRide(primarySameAreaRides, usedAfterBest) ||
            getFirstUnusedRide(primaryNearbyRides, usedAfterBest) ||
            getFirstUnusedRide(localSoftRecoveryRides, usedAfterBest) ||
            getFirstUnusedRide(primaryPositivePool, usedAfterBest) ||
            null
          );

      const usedAfterBackup = getUsedRideIds(bestMove, backup);

  /* ------------------------------------------------------------------------ */
  /* Worth the Walk — V1.1: stricter score floor                              */
  /* ------------------------------------------------------------------------ */

  const worthTheWalk = needsLocation || blockGoNowForPreOpen
    ? null
    : (
        farRides.find((ride) => {
          if (usedAfterBackup.has(String(ride.id))) return false;
          const meta = getMetaForRide(parkId, ride);
          if (isScheduledShowMeta(meta)) return false;
          if (isFillerOrRecovery(ride)) return false;

          if (rainActive && ride.recommendationScore < 75) return false;

          if (isLowCapacityClassic(meta) && ride.waitValueStatus?.status !== "great_value") {
            return false;
          }

          // V1.1: was 70, raised to 75. Worth the Walk now demands more value
          // before suggesting a cross-park walk.
          if (ride.recommendationScore < WORTH_THE_WALK_SCORE_FLOOR) return false;

          return true;
        }) || null
      );

  const usedAfterWorth = getUsedRideIds(bestMove, backup, worthTheWalk);

  /* ------------------------------------------------------------------------ */
  /* Plan Ahead — geography-independent, always computed                      */
  /* ------------------------------------------------------------------------ */

  const planAheadCandidates = positivePool
    .filter((ride) => {
      if (usedAfterWorth.has(String(ride.id))) return false;

      const meta = getMetaForRide(parkId, ride);
      const category = meta?.planningProfile?.category;

      if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return false;

      const isPlanAheadCategory =
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only";

      const isScheduledShow = isScheduledShowMeta(meta);

      if (!isPlanAheadCategory && !isScheduledShow && !ride.shouldProtectLater) return false;

      // Suppress same-area strike-now opportunities — they should have been
      // promoted into Best Move / Smart Backup / Worth the Walk already.
      if (
        !ride.shouldProtectLater &&
        (ride.nearbyHeadlinerOpportunityModifier >= 20 ||
          ride.closestAnchorOpportunityModifier >= 30) &&
        (ride.waitValueStatus?.status === "great_value" ||
          ride.waitValueStatus?.status === "good_value" ||
          (parkId === "hollywood" &&
            ride.name === "Slinky Dog Dash" &&
            currentLand === "toy_story_land" &&
            ride.waitTime != null &&
            ride.waitTime <= 35) ||
          (parkId === "magic_kingdom" &&
            ride.name === "Big Thunder Mountain Railroad" &&
            ride.waitTime != null &&
            ride.waitTime <= 35))
      ) {
        return false;
      }

      return true;
    })
    .map((ride) => {
      const meta = getMetaForRide(parkId, ride);
      const waitValueStatus = getWaitValueStatus(meta, ride.waitTime);
      const proximityModifier = getProximityModifier(meta, currentLand, parkId);
      const scheduledShowPriority = getScheduledShowPlanPriority(
        meta,
        ride,
        currentLand,
        proximityModifier
      );

      return {
        ...ride,
        planAheadPriority: isScheduledShowMeta(meta)
          ? scheduledShowPriority + getMustDoPlanAheadPriorityBoost(ride)
          : getPlanningPriority(meta, waitValueStatus) +
            (ride.waitTime || 0) +
            getMustDoPlanAheadPriorityBoost(ride),
        planAheadReason: ride.shouldProtectLater
          ? ride.mustDoReason || "This is important, but the current conditions make it smarter to save for later."
          : buildPlanAheadReason(meta, ride, waitValueStatus),
      };
    })
    .sort((a, b) => b.planAheadPriority - a.planAheadPriority);

  const planAhead = planAheadCandidates[0] || null;

  const usedAfterPlanAhead = getUsedRideIds(
    bestMove,
    backup,
    worthTheWalk,
    planAhead
  );

  /* ------------------------------------------------------------------------ */
  /* Wait On This — geography-independent, always computed                    */
  /* ------------------------------------------------------------------------ */

  const waitOnThisCandidates = scored
    .filter((ride) => {
      if (usedAfterPlanAhead.has(String(ride.id))) return false;

      const meta = getMetaForRide(parkId, ride);
      const category = meta?.planningProfile?.category;
      const status = ride.waitValueStatus?.status;

      if (isScheduledShowMeta(meta)) return false;

      const isPlanAheadCategory =
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only";

      if (isPlanAheadCategory && !ride.shouldProtectLater) return false;

      if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return false;

      return ride.shouldProtectLater || status === "bad_value" || status === "above_normal";
    })
    .map((ride) => {
      const status = ride.waitValueStatus?.status;
      let waitOnThisPriority = ride.waitTime || 0;

      if (status === "bad_value") waitOnThisPriority += 40;
      if (status === "above_normal") waitOnThisPriority += 20;
      waitOnThisPriority += getMustDoWaitOnThisPriorityBoost(ride);

      return {
        ...ride,
        waitOnThisPriority,
        waitOnThisReason: ride.shouldProtectLater
          ? ride.mustDoReason || "This matters, but the current conditions are not the right window."
          : null,
      };
    })
    .sort((a, b) => b.waitOnThisPriority - a.waitOnThisPriority);

  const waitOnThis = blockGoNowForPreOpen ? null : waitOnThisCandidates[0] || null;

  return {
    bestMove,
    backup,
    worthTheWalk,
    planAhead,
    waitOnThis,
    needsLocation, // V1.1: new envelope field
    parkOpenStatus,
  };
}
