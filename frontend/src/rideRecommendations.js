import { getRideMeta, getWaitValueStatus } from "./rideMetadata";
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
/* Score components                                                           */
/* -------------------------------------------------------------------------- */

function getBaseScore(parkId, ride) {
  const meta = getRideMeta(parkId, ride.id ?? ride.name);
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

  const { tempF, rainRisk = 0, stormMode = false } = weather;
  let mod = 0;

  if (stormMode) {
    if (meta.closesInRain) mod -= 90;
    if (meta.environment === "indoor") mod += 18;
    else if (meta.environment === "outdoor") mod -= 20;
    else if (meta.environment === "mixed") mod -= 12;
  } else if (rainRisk >= 0.7) {
    if (meta.closesInRain) mod -= 15;
    if (meta.environment === "indoor") mod += 8;
    if (meta.getsWet) mod -= 3;
  } else if (rainRisk >= 0.4) {
    if (meta.environment === "indoor") mod += 4;
    if (meta.closesInRain) mod -= 3;
  }

  if (tempF != null) {
    if (tempF >= 95) {
      if (meta.hasAC) mod += 10;
      if (meta.getsWet) mod += 8;
      if (meta.environment === "indoor") mod += 4;
      if (meta.environment === "outdoor" && !meta.getsWet) mod -= 4;
    } else if (tempF >= 88) {
      if (meta.hasAC) mod += 6;
      if (meta.getsWet) mod += 5;
      if (meta.environment === "indoor") mod += 2;
    } else if (tempF >= 82) {
      if (meta.hasAC) mod += 3;
      if (meta.getsWet) mod += 3;
    }
  }

  return mod;
}

function getWetRideTimingModifier(meta, weather, waitValueStatus) {
  if (!meta?.getsWet) return 0;

  const tempF = weather?.tempF ?? null;
  const { hour } = getOrlandoTimeParts();

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

  if (tempF != null) {
    if (tempF >= 92) {
      mod += 10;
    } else if (tempF >= 86) {
      mod += 5;
    } else if (tempF <= 75) {
      mod -= 10;
    } else if (tempF <= 80) {
      mod -= 5;
    }
  }

  if (weather?.stormMode) {
    mod -= 50;
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

function isStormBlockedRide(parkId, ride, weather) {
  if (!weather?.stormMode) return false;

  const meta = getRideMeta(parkId, ride.id ?? ride.name);
  return Boolean(meta?.closesInRain);
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

  const isStormActive = weather?.stormMode === true;

  const now = new Date();
  const closeTime = getParkCloseTime(parkId, now);

  const eligibleRides = rides.filter((ride) => {
    const meta = getRideMeta(parkId, ride.id ?? ride.name);

    // Critical: if we did not intentionally add metadata, do not recommend it.
    // This blocks Cinderella Castle, Casey Jr., meet-and-greets, random landmarks, etc.
    if (!meta) return false;

    if (!ride.isOpen) return false;
    if (completed.has(String(ride.id))) return false;
    if (skipped.has(String(ride.id))) return false;

    if (!isAllowedDuringEarlyEntry(parkId, meta)) return false;

    if (!fitsBeforeClose(ride.waitTime, closeTime, now)) return false;

    return true;
  });

  const scored = eligibleRides.map((ride) => {
    const meta = getRideMeta(parkId, ride.id ?? ride.name);

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

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier +
      waitValueModifier +
      wetRideModifier;

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
      }),
    };
  });

  const sorted = scored.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  // During active storm mode, positive recommendation slots should not point
  // guests toward attractions that commonly close in lightning/rain.
  const positivePool = sorted.filter((ride) => {
    if (!isStormActive) return true;
    return !isStormBlockedRide(parkId, ride, weather);
  });

  const nearbyRides = positivePool.filter((ride) => {
    return ride.proximityDistance !== "far";
  });

  const farRides = positivePool.filter((ride) => {
    return ride.proximityDistance === "far";
  });

  const bestMove = nearbyRides[0] || positivePool[0] || null;

  const usedAfterBest = getUsedRideIds(bestMove);

  const backup =
    nearbyRides.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    positivePool.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    null;

  const usedAfterBackup = getUsedRideIds(bestMove, backup);

  const worthTheWalk =
    farRides.find((ride) => {
      if (usedAfterBackup.has(String(ride.id))) return false;
      if (isFillerOrRecovery(ride)) return false;
      if (ride.recommendationScore < 60) return false;

      return true;
    }) || null;

  const usedAfterWorth = getUsedRideIds(bestMove, backup, worthTheWalk);

  const planAheadCandidates = positivePool
    .filter((ride) => {
      if (usedAfterWorth.has(String(ride.id))) return false;

      const meta = getRideMeta(parkId, ride.id ?? ride.name);
      const category = meta?.planningProfile?.category;

      if (isStormActive && meta?.closesInRain) return false;

      return (
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only"
      );
    })
    .map((ride) => {
      const meta = getRideMeta(parkId, ride.id ?? ride.name);
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

      const meta = getRideMeta(parkId, ride.id ?? ride.name);
      const category = meta?.planningProfile?.category;
      const status = ride.waitValueStatus?.status;

      const isPlanAheadCategory =
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only";

      if (isPlanAheadCategory) return false;

      if (isStormActive && meta?.closesInRain) return false;

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
