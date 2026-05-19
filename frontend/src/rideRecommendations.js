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

  const isRecoveryOrShow =
    category === "filler_or_recovery" ||
    tags.includes("show") ||
    tags.includes("walkthrough") ||
    tags.includes("recovery");

  // During weather/heat, recovery options are allowed to become primary because
  // the family may need AC/seating more than a headliner.
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

  if (!reasons.length) {
    reasons.push("solid value based on current conditions");
  }

  return reasons.join(", ");
}

function buildPlanAheadReason(meta, ride, waitValueStatus) {
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
      addExample(reason, ride, result.meta?.land ? ` · ${result.meta.land}` : "");
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

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier +
      waitValueModifier +
      wetRideModifier +
      parkStrategyModifier;

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
      strategyNote: meta?.waitProfile?.strategyNote || null,
      wetRideModifier,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        contextModifier,
        proximityModifier,
        waitValueStatus,
        wetRideModifier,
        parkStrategyModifier,
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

  const nearbyRides = positivePool.filter((ride) => {
    return ride.proximityDistance !== "far";
  });

  const farRides = positivePool.filter((ride) => {
    return ride.proximityDistance === "far";
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

      return (
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only"
      );
    })
    .map((ride) => {
      const meta = getMetaForRide(parkId, ride);
      const waitValueStatus = getWaitValueStatus(meta, ride.waitTime);

      return {
        ...ride,
        planAheadPriority:
          getPlanningPriority(meta, waitValueStatus) + (ride.waitTime || 0),
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
