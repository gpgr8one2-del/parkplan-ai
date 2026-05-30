import { getRideMeta, getWaitValueStatus, getParkRides } from "./rideMetadata";
import {
  resolveCurrentLand,
  getProximityModifier,
} from "./parkProximity";
import { getParkCloseTime } from "./parkHours";

const DEFAULT_POPULARITY = 40;
const WALK_BUFFER_MINUTES = 15;
const ORLANDO_TIME_ZONE = "America/New_York";

/* -------------------------------------------------------------------------- */
/* Time helpers                                                               */
/* -------------------------------------------------------------------------- */

function getOrlandoTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORLANDO_TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return { hour, minute, totalMinutes: hour * 60 + minute };
}

function isEarlyEntryWindow(parkId) {
  if (parkId !== "magic_kingdom") return false;

  const { totalMinutes } = getOrlandoTimeParts();

  // V1 assumption for Magic Kingdom testing:
  // Early Entry / rope-drop strategy window from 8:00 AM to 9:00 AM Orlando time.
  // Later this should come from official daily park hours.
  return totalMinutes >= 8 * 60 && totalMinutes < 9 * 60;
}

function isAllowedDuringEarlyEntry(parkId, meta) {
  if (!isEarlyEntryWindow(parkId)) return true;

  // Magic Kingdom Early Entry is primarily a Fantasyland / Tomorrowland play.
  // Suppress Adventureland, Frontierland, Liberty Square, Main Street, and filler items.
  if (parkId === "magic_kingdom") {
    return meta?.land === "fantasyland" || meta?.land === "tomorrowland";
  }

  return true;
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

function isRainSensitiveRide(meta) {
  if (!meta) return false;

  return (
    meta.closesInRain === true ||
    meta.environment === "outdoor" ||
    meta.environment === "mixed"
  );
}

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

function getFamilyProfileModifier(meta, familyProfile, weather) {
  if (!meta || !familyProfile) return 0;

  let mod = 0;
  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;
  const effectiveTempF = getEffectiveTempF(weather);

  // Thrill tolerance: do not nuke thrill rides completely unless height already
  // blocks them; just reduce how aggressively they win.
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

  // Walking tolerance: same-area proximity already matters, but low walking
  // tolerance should punish cross-park ideas harder.
  if (familyProfile.walkingTolerance === "low") {
    if (meta.environment === "outdoor" && effectiveTempF != null && effectiveTempF >= 87) {
      mod -= 4;
    }
  } else if (familyProfile.walkingTolerance === "high") {
    if (category?.startsWith("plan_ahead")) {
      mod += 3;
    }
  }

  // Heat sensitivity: amplify the existing weather logic for families who told us
  // heat/fatigue is a real concern.
  if (familyProfile.heatSensitivity === "high" && effectiveTempF != null && effectiveTempF >= 87) {
    if (meta.hasAC || meta.environment === "indoor") mod += 10;
    if (meta.environment === "outdoor" && !meta.getsWet) mod -= 10;
    if (meta.environment === "mixed" && !meta.getsWet) mod -= 5;
  } else if (familyProfile.heatSensitivity === "low" && effectiveTempF != null && effectiveTempF >= 87) {
    if (meta.environment === "outdoor" && !meta.getsWet) mod += 3;
  }

  // Water ride preference.
  if (meta.getsWet) {
    if (familyProfile.waterRidePreference === "avoid") mod -= 45;
    else if (familyProfile.waterRidePreference === "yes") mod += 8;
  }

  // Pace preference.
  if (familyProfile.pace === "relaxed") {
    if (category?.startsWith("plan_ahead") && (meta.intensity || 0) >= 4) mod -= 5;
    if (meta.hasAC || category === "filler_or_recovery") mod += 3;
  } else if (familyProfile.pace === "maximize") {
    if (category?.startsWith("plan_ahead")) mod += 5;
  }

  // Trip priorities.
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

  // Character/princess experiences are emotionally huge for the right family,
  // but they are bad default recommendations for families that did not tell us
  // characters/princesses matter. Do not let low waits push them into Smart Backup
  // over actual rides unless the profile supports that kind of moment.
  if (isPrincessOrRoyal && !wantsPrincesses) {
    mod -= 24;
  }

  if (isCharacterOrMeet && !wantsCharacters) {
    mod -= 18;
  }

  if (isInteractiveStoryShow && !wantsPrincesses && !wantsCharacters && !wantsShows) {
    mod -= 18;
  }

  // Younger kids should gently favor lower-intensity family experiences, but that
  // does not automatically mean princess/character content unless the family said
  // that is important.
  if (familyProfile.hasSmallChildren) {
    if ((meta.intensity || 0) <= 2 && meta.minHeightInches === 0) mod += 5;
    if ((meta.intensity || 0) >= 5) mod -= 6;

    if ((isPrincessOrRoyal || isCharacterOrMeet) && !wantsPrincesses && !wantsCharacters) {
      mod -= 6;
    }
  }

  return mod;
}

function getHeightEligibilityFailure(meta, familyProfile) {
  if (!meta || !familyProfile) return null;

  const requiredHeight = Number(meta.minHeightInches || 0);
  if (!requiredHeight) return null;

  const shortestHeight = getShortestHeightInches(familyProfile);
  if (shortestHeight == null) return null;

  if (shortestHeight >= requiredHeight) return null;

  const preference = familyProfile.wholeGroupRidesTogether || "warn";

  if (preference === "yes") {
    return {
      reason: "heightRestricted",
      requiredHeight,
      shortestHeight,
      mode: "exclude",
    };
  }

  return null;
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

function getLowWaitBonus(waitTime) {
  if (waitTime == null) return 0;
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

  if (hour < 11) {
    mod -= 10;
  }

  if (hour >= 12 && hour <= 16) {
    mod += 10;
  }

  if (hour >= 17 && hour < 18) {
    mod += 2;
  }

  if (hour >= 18) {
    mod -= 12;
  }

  if (effectiveTempF != null) {
    if (effectiveTempF >= 98) {
      mod += 12;
    } else if (effectiveTempF >= 92) {
      mod += 10;
    } else if (effectiveTempF >= 87) {
      mod += 5;
    } else if (effectiveTempF <= 75) {
      mod -= 10;
    } else if (effectiveTempF <= 80) {
      mod -= 5;
    }
  }

  if (stormActive) {
    mod -= 60;
  } else if (rainActive) {
    mod -= 20;
  } else if ((weather?.rainRisk ?? 0) >= 0.6) {
    mod -= 6;
  }

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

  // Shows can be useful recovery, but they should not win because the wait feed
  // says 0 minutes. They need showtime fit, heat/rain value, and preferably proximity.
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

function getUsedRideIds(...rides) {
  return new Set(
    rides
      .filter(Boolean)
      .map((ride) => String(ride.id))
  );
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

  // Scheduled shows are not standby rides. A 0-minute feed value should never
  // make them win Best Move over true ride opportunities. They belong in
  // showtime-based Plan Ahead / recovery logic unless the pool is otherwise empty.
  if (isScheduledShowMeta(meta)) return true;

  const isRecoveryOrShow =
    category === "filler_or_recovery" ||
    tags.includes("show") ||
    tags.includes("walkthrough") ||
    tags.includes("recovery");

  // During weather/heat, recovery options are allowed to become primary because
  // the family may need AC/seating more than a headliner. Scheduled shows are
  // still handled separately above because their timing matters.
  if (badWeatherOrHeat) return false;

  // In normal conditions, do not let low-wait shows/exhibits hijack Best Move.
  return isRecoveryOrShow;
}

function getHollywoodStrategyModifier(parkId, meta, ride, weather, waitValueStatus, currentLand) {
  if (parkId !== "hollywood" || !meta) return 0;

  let mod = 0;
  const effectiveTempF = getEffectiveTempF(weather);
  const rainActive = isRainActive(weather);
  const stormActive = isCurrentlyStorming(weather);
  const tags = meta.tags || [];
  const category = meta?.planningProfile?.category;

  // Hollywood Studios is top-heavy. Do not let shows/recovery filler beat real
  // attraction strategy during normal conditions unless the family needs weather relief.
  const weatherRecoveryActive =
    stormActive ||
    rainActive ||
    (effectiveTempF != null && effectiveTempF >= 87);

  if (!weatherRecoveryActive && category === "filler_or_recovery") {
    mod -= 10;
  }

  if (!weatherRecoveryActive && tags.includes("show")) {
    mod -= 8;
  }

  // Toy Story Land is exposed and rough in heat. Outdoor Toy Story options need
  // an extra heat penalty beyond the generic outdoor penalty.
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

  // In rain/storm mode, outdoor Hollywood attractions should be heavily suppressed.
  if ((rainActive || stormActive) && meta.environment === "outdoor") {
    mod -= 18;
  }

  // Slinky is a plan-ahead ride. Do not over-reward a merely normal wait in
  // brutal heat because the standby experience can be miserable.
  if (
    meta.displayName === "Slinky Dog Dash" &&
    effectiveTempF != null &&
    effectiveTempF >= 92 &&
    waitValueStatus?.status === "normal"
  ) {
    mod -= 12;
  }

  // Rise at a good/great wait is a legitimate opportunity, but we do not want
  // average waits blindly hijacking the whole app from across the park.
  if (
    meta.displayName === "Star Wars: Rise of the Resistance" &&
    waitValueStatus?.status === "great_value"
  ) {
    mod += 8;
  }

  // Star Tours is fantastic recovery, but in normal conditions it should not
  // beat major attractions just because the wait is low.
  if (
    meta.displayName === "Star Tours – The Adventures Continue" &&
    !weatherRecoveryActive
  ) {
    mod -= 6;
  }

  // Falcon should be better late day. This supports the historical pattern
  // without forcing a clock-heavy itinerary system yet.
  const { totalMinutes } = getOrlandoTimeParts();
  if (
    meta.displayName === "Millennium Falcon: Smugglers Run" &&
    totalMinutes >= 18 * 60
  ) {
    mod += 6;
  }

  return mod;
}

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

  // Do not promote weather-sensitive outdoor rides during active rain/storms.
  if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return 0;

  const isSameArea = meta.land === currentLand || proximityModifier > 0;
  const isNearbyEnough = isSameArea || proximityModifier > -8;

  if (!isNearbyEnough) return 0;

  const status = waitValueStatus?.status;
  const waitTime = ride?.waitTime;

  let mod = 0;

  // General rule: if a normally hard-to-get ride has a strong wait and the guest
  // is already near it, it should break out of the "Plan Ahead" bucket and become
  // a real go-now option.
  if (status === "great_value" && isSameArea) {
    mod += 26;
  } else if (status === "good_value" && isSameArea) {
    mod += 18;
  } else if (status === "great_value") {
    mod += 14;
  }

  // Hollywood-specific field test rule:
  // Slinky at ~30–35 minutes while the guest is in Toy Story Land is a no-brainer
  // strike-now opportunity. Do not bury it under Plan Ahead.
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

  // If GPS says the guest is basically standing at a ride and the wait is good,
  // that should heavily influence the recommendation. This is the field-test fix
  // for Big Thunder being 30 minutes while GPS is closest to Big Thunder.
  if (status === "great_value") mod += 34;
  else if (status === "good_value") mod += 24;
  else if (waitTime != null && waitTime <= 25) mod += 16;

  if (confidence === "high") mod += 8;

  if (distanceMeters != null && distanceMeters <= 75) {
    mod += 8;
  } else if (distanceMeters != null && distanceMeters <= 120) {
    mod += 4;
  }

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

  // Magic Kingdom has tons of tempting low-wait recovery rides. They are useful,
  // but in normal weather they should not hijack Best Move over real strategy.
  if (!weatherRecoveryActive && category === "filler_or_recovery") {
    mod -= 10;
  }

  if (!weatherRecoveryActive && tags.includes("show")) {
    mod -= 8;
  }

  if (
    !weatherRecoveryActive &&
    meta.displayName === "Tomorrowland Transit Authority PeopleMover"
  ) {
    mod -= 6;
  }

  if (
    !weatherRecoveryActive &&
    meta.displayName === "Walt Disney's Carousel of Progress"
  ) {
    mod -= 6;
  }

  if (
    !weatherRecoveryActive &&
    meta.displayName === "Mickey's PhilharMagic"
  ) {
    mod -= 5;
  }

  // TRON and Seven Dwarfs are true plan-ahead rides. Do not let a normal high wait
  // become a casual "go now" recommendation.
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

  // Peter Pan is low-capacity. A great wait is a real opportunity, but normal
  // mid-day waits should not look attractive.
  if (
    meta.displayName === "Peter Pan's Flight" &&
    waitValueStatus?.status === "great_value"
  ) {
    mod += 6;
  }

  if (
    meta.displayName === "Peter Pan's Flight" &&
    totalMinutes >= 10 * 60 + 30 &&
    totalMinutes <= 17 * 60 &&
    waitValueStatus?.status === "normal"
  ) {
    mod -= 8;
  }

  // Tiana's is heat-demanded but weather-sensitive. Warm weather helps only when
  // rain/storm risk is not active and the wait is actually attractive.
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

  // Outdoor Magic Kingdom rides get extra suppression in heat unless they are
  // water rides with a strong wait value.
  if (
    effectiveTempF != null &&
    effectiveTempF >= 92 &&
    meta.environment === "outdoor" &&
    !meta.getsWet
  ) {
    mod -= 6;
  }

  // Late evening is when several Magic Kingdom headliners become more realistic.
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

function isWeatherBlockedFromPositiveCards(parkId, ride, weather) {
  const meta = getMetaForRide(parkId, ride);
  if (!meta) return true;

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  if (stormActive && isRainSensitiveRide(meta)) return true;

  // In active rain, do not send guests toward outdoor/mixed/rain-sensitive rides
  // as Best Move, Smart Backup, Worth the Walk, or Plan Ahead.
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
  const reasons = [];

  if (parts.waitValueStatus?.status === "great_value") {
    reasons.push("well below its usual wait");
  } else if (parts.waitValueStatus?.status === "good_value") {
    reasons.push("better than usual for this ride");
  } else if (parts.waitValueStatus?.status === "bad_value") {
    reasons.push("higher than it is usually worth");
  } else if (parts.waitValueStatus?.status === "plan_ahead") {
    reasons.push("this ride usually runs high");
  } else if (ride.waitTime <= 10) {
    reasons.push("low wait right now");
  } else if (ride.waitTime <= 25) {
    reasons.push("reasonable wait");
  }

  if (parts.baseScore >= 85) {
    reasons.push("high-priority attraction");
  }

  if (parts.proximityModifier > 0) {
    reasons.push("near you");
  } else if (parts.proximityModifier < -8) {
    reasons.push("worth considering, but farther away");
  }

  if (parts.trendModifier > 0) {
    reasons.push("strong guest demand");
  }

  if (parts.contextModifier >= 8) {
    reasons.push("great fit for current conditions");
  } else if (parts.contextModifier > 0) {
    reasons.push("good weather-safe option");
  }

  if (parts.familyProfileModifier >= 10) {
    reasons.push("strong fit for your family profile");
  } else if (parts.familyProfileModifier <= -15) {
    reasons.push("less ideal for your family profile");
  }

  if (parts.heightWarning) {
    reasons.push(`height warning: ${parts.heightWarning.message}`);
  }

  if (parts.scheduledShowModifier >= 12) {
    reasons.push("showtime timing may work well");
  } else if (parts.scheduledShowModifier <= -20) {
    reasons.push("showtime timing matters");
  }

  if (parts.wetRideModifier >= 8) {
    reasons.push("good water-ride timing");
  } else if (parts.wetRideModifier <= -8) {
    reasons.push("water-ride timing is less ideal");
  }

  if (parts.parkStrategyModifier >= 8) {
    reasons.push("strong park-specific opportunity");
  } else if (parts.parkStrategyModifier <= -8) {
    reasons.push("less ideal for this park situation");
  }

  if (parts.nearbyHeadlinerOpportunityModifier >= 20) {
    reasons.push("rare nearby headliner opportunity");
  } else if (parts.nearbyHeadlinerOpportunityModifier >= 10) {
    reasons.push("strong nearby headliner value");
  }

  if (parts.closestAnchorOpportunityModifier >= 30) {
    reasons.push("you are basically right here");
  } else if (parts.closestAnchorOpportunityModifier >= 15) {
    reasons.push("very close to your current location");
  }

  if (!reasons.length) {
    reasons.push("solid value based on current conditions");
  }

  return reasons.join(", ");
}

function buildPlanAheadReason(meta, ride, waitValueStatus) {
  if (isScheduledShowMeta(meta)) {
    return buildScheduledShowReason(meta);
  }

  const strategy = meta?.planningProfile?.strategy;
  const label = waitValueStatus?.label;

  if (waitValueStatus?.status === "great_value" && strategy) {
    return `Great value right now. If this is on your list, this is a strong time to ride. Normal strategy: ${strategy}`;
  }

  if (strategy && label) {
    return `${label}. ${strategy}`;
  }

  if (strategy) {
    return strategy;
  }

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
}) {
  const currentLand = resolveCurrentLand(parkId, locationContext);

  const completed = new Set(completedRideIds.map(String));
  const skipped = new Set(skippedRideIds.map(String));

  const stormActive = isCurrentlyStorming(weather);
  const rainActive = isRainActive(weather);

  const now = new Date();
  const closeTime = getParkCloseTime(parkId, now);

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

    // Critical: if we did not intentionally add metadata, do not recommend it.
    // This blocks Cinderella Castle, Casey Jr., meet-and-greets, random landmarks, etc.
    if (!meta) return { reason: "noMeta", meta: null };

    // Some entries exist only for wayfinding, GPS context, photos, or educational
    // content. They should never become ride recommendations.
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

    if (!isAllowedDuringEarlyEntry(parkId, meta)) {
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

  // Safety valve: if park-hours logic gets too aggressive, do not let the entire
  // recommendation engine go blank. This can happen if a static close-time config
  // is wrong for a specific day or event.
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

  const scored = eligibleRides.map((ride) => {
    const meta = getMetaForRide(parkId, ride);

    const baseScore = meta?.popularity ?? DEFAULT_POPULARITY;
    const waitPenalty = getWaitPenalty(ride.waitTime);
    const lowWaitBonus = getLowWaitBonus(ride.waitTime);
    const trendModifier = getTrendModifier(ride.name);
    const contextModifier = getContextModifier(meta, weather, mode);
    const proximityModifier = getProximityModifier(meta, currentLand, parkId);
    const waitValueStatus = getWaitValueStatus(meta, ride.waitTime);
    const waitValueModifier = waitValueStatus.modifier || 0;
    const familyProfileModifier = getFamilyProfileModifier(meta, familyProfile, weather);
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
      getHollywoodStrategyModifier(
        parkId,
        meta,
        ride,
        weather,
        waitValueStatus,
        currentLand
      ) +
      getMagicKingdomStrategyModifier(
        parkId,
        meta,
        ride,
        weather,
        waitValueStatus,
        currentLand
      );

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

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier +
      waitValueModifier +
      familyProfileModifier +
      scheduledShowModifier +
      wetRideModifier +
      parkStrategyModifier +
      nearbyHeadlinerOpportunityModifier +
      closestAnchorOpportunityModifier -
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
      proximityDistance,
      waitValueStatus,
      planningProfile: meta?.planningProfile || null,
      showProfile: meta?.showProfile || null,
      isScheduledShow: isScheduledShowMeta(meta),
      heightWarning,
      strategyNote: meta?.waitProfile?.strategyNote || null,
      familyProfileModifier,
      scheduledShowModifier,
      wetRideModifier,
      nearbyHeadlinerOpportunityModifier,
      closestAnchorOpportunityModifier,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        contextModifier,
        proximityModifier,
        waitValueStatus,
        familyProfileModifier,
        heightWarning,
        scheduledShowModifier,
        wetRideModifier,
        parkStrategyModifier,
        nearbyHeadlinerOpportunityModifier,
        closestAnchorOpportunityModifier,
      }),
    };
  });

  const sorted = scored.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  // During active rain/storm mode, positive recommendation slots should not point
  // guests toward outdoor, mixed, or rain-sensitive attractions.
  let positivePool = sorted.filter((ride) => {
    return !isWeatherBlockedFromPositiveCards(parkId, ride, weather);
  });

  // Safety valve: if weather filtering removes every positive option, prefer
  // indoor/AC recovery options instead of going completely blank.
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

  const hasStrongClosestAnchorOpportunity = positivePool.some((ride) => {
    return ride.closestAnchorOpportunityModifier >= 30;
  });

  const nearbyRides = positivePool.filter((ride) => {
    return ride.proximityDistance !== "far";
  });

  let farRides = positivePool.filter((ride) => {
    if (ride.proximityDistance !== "far") return false;

    // If GPS says there is a strong ride right where the family is standing,
    // be much more conservative about sending them away as Worth the Walk.
    if (hasStrongClosestAnchorOpportunity && ride.recommendationScore < 95) {
      return false;
    }

    return true;
  });

  const primaryNearbyRides = nearbyRides.filter((ride) => {
    return !isSoftRecoveryOnlyCandidate(parkId, ride, weather);
  });

  const primaryPositivePool = positivePool.filter((ride) => {
    return !isSoftRecoveryOnlyCandidate(parkId, ride, weather);
  });

  const bestMove =
    primaryNearbyRides[0] ||
    primaryPositivePool[0] ||
    nearbyRides[0] ||
    positivePool[0] ||
    null;

  const usedAfterBest = getUsedRideIds(bestMove);

  const backup =
    primaryNearbyRides.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    primaryPositivePool.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    nearbyRides.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    positivePool.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    null;

  const usedAfterBackup = getUsedRideIds(bestMove, backup);

  const worthTheWalk =
    farRides.find((ride) => {
      if (usedAfterBackup.has(String(ride.id))) return false;
      const meta = getMetaForRide(parkId, ride);
      if (isScheduledShowMeta(meta)) return false;
      if (isFillerOrRecovery(ride)) return false;

      // Be more conservative about cross-park walks during active rain.
      if (rainActive && ride.recommendationScore < 75) return false;

      if (ride.recommendationScore < 60) return false;

      return true;
    }) || null;

  const usedAfterWorth = getUsedRideIds(bestMove, backup, worthTheWalk);

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

      if (!isPlanAheadCategory && !isScheduledShow) return false;

      // If the ride is a same-area strike-now opportunity, it should have been
      // promoted into Best Move / Smart Backup / Worth the Walk. Do not also
      // frame it as "Plan Ahead" because that sends the wrong signal.
      if (
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
          ? scheduledShowPriority
          : getPlanningPriority(meta, waitValueStatus) + (ride.waitTime || 0),
        planAheadReason: buildPlanAheadReason(meta, ride, waitValueStatus),
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

      if (isPlanAheadCategory) return false;

      // Do not use rain-sensitive rides in Wait On This during active rain/storm.
      // The weather card already explains why guests should avoid them.
      if ((stormActive || rainActive) && isRainSensitiveRide(meta)) return false;

      return status === "bad_value" || status === "above_normal";
    })
    .map((ride) => {
      const status = ride.waitValueStatus?.status;
      let waitOnThisPriority = ride.waitTime || 0;

      if (status === "bad_value") waitOnThisPriority += 40;
      if (status === "above_normal") waitOnThisPriority += 20;

      return {
        ...ride,
        waitOnThisPriority,
      };
    })
    .sort((a, b) => b.waitOnThisPriority - a.waitOnThisPriority);

  const waitOnThis = waitOnThisCandidates[0] || null;

  return {
    bestMove,
    backup,
    worthTheWalk,
    planAhead,
    waitOnThis,
  };
}
