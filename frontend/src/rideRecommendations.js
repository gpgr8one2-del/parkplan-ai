import { getRideMeta, getWaitValueStatus } from "./rideMetadata";
import {
  resolveCurrentLand,
  getProximityModifier,
} from "./parkProximity";

const DEFAULT_POPULARITY = 40;

/* -------------------------------------------------------------------------- */
/* Score components                                                           */
/* -------------------------------------------------------------------------- */

function getBaseScore(parkId, ride) {
  const meta = getRideMeta(parkId, ride.id ?? ride.name);
  return meta?.popularity ?? DEFAULT_POPULARITY;
}

/**
 * Generic wait penalty is still useful, but the new waitProfile modifier
 * gives the app ride-specific intelligence.
 */
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

/**
 * Trend modifier — guest demand momentum, NOT contextual value.
 * Both apostrophe variants listed because API formatting can vary.
 */
function getTrendModifier(rideName) {
  const trends = {
    "Buzz Lightyear's Space Ranger Spin": 8,
    "Buzz Lightyear’s Space Ranger Spin": 8,
    "Peter Pan's Flight": 4,
    "Tomorrowland Transit Authority PeopleMover": 1,
  };

  return trends[rideName] ?? 0;
}

/**
 * Context modifier — V1: weather only.
 * Uses rideMetadata, not raw live ride data.
 *
 * Storm mode is intentionally severe. closesInRain rides take a -90 hit
 * so even very high popularity can't drag them into a positive slot.
 */
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

/**
 * Wet ride timing modifier.
 *
 * Real guest behavior:
 * - Morning: guests often avoid getting wet early.
 * - Midday heat: water rides become more desirable.
 * - Evening/night: guests often avoid getting wet with less drying time.
 *
 * This applies to any ride with getsWet: true, not just Tiana's.
 */
function getWetRideTimingModifier(meta, weather, waitValueStatus) {
  if (!meta?.getsWet) return 0;

  const tempF = weather?.tempF ?? null;
  const hour = new Date().getHours();

  let mod = 0;

  // Morning penalty: people often do not want to start the day wet.
  if (hour < 11) {
    mod -= 10;
  }

  // Prime water ride window: hot part of the day with time left to dry.
  if (hour >= 12 && hour <= 16) {
    mod += 10;
  }

  // Late afternoon is still okay if it is hot, but less powerful than midday.
  if (hour >= 17 && hour < 18) {
    mod += 2;
  }

  // Evening penalty: less drying time and cooler air.
  if (hour >= 18) {
    mod -= 12;
  }

  // Temperature adjustment.
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

  // Storm/rain risk makes a wet ride less attractive. During an active
  // storm we apply a brutal penalty — a water ride during lightning is
  // a category error, no amount of heat boost should overcome it.
  if (weather?.stormMode) {
    mod -= 50;
  } else if ((weather?.rainRisk ?? 0) >= 0.6) {
    mod -= 6;
  }

  // Guardrail: heat can help a wet ride, but it should not overrule bad wait value.
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

  // Storm guardrail flag — used to keep storm-sensitive rides
  // out of every positive recommendation slot.
  const isStormActive = weather?.stormMode === true;

  const eligibleRides = rides.filter(
    (ride) =>
      ride.isOpen &&
      !completed.has(String(ride.id)) &&
      !skipped.has(String(ride.id))
  );

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

  const nearbyRides = sorted.filter((ride) => {
    return ride.proximityDistance !== "far";
  });

  const farRides = sorted.filter((ride) => {
    return ride.proximityDistance === "far";
  });

  const bestMove = nearbyRides[0] || sorted[0] || null;

  const usedAfterBest = getUsedRideIds(bestMove);

  const backup =
    nearbyRides.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    sorted.find((ride) => !usedAfterBest.has(String(ride.id))) ||
    null;

  const usedAfterBackup = getUsedRideIds(bestMove, backup);

  const worthTheWalk =
    farRides.find((ride) => {
      if (usedAfterBackup.has(String(ride.id))) return false;
      if (isFillerOrRecovery(ride)) return false;
      if (ride.recommendationScore < 60) return false;

      // Storm guardrail: never tell people to walk farther for a ride
      // that is about to close in lightning.
      if (isStormActive) {
        const meta = getRideMeta(parkId, ride.id ?? ride.name);
        if (meta?.closesInRain) return false;
      }

      return true;
    }) || null;

  const usedAfterWorth = getUsedRideIds(bestMove, backup, worthTheWalk);

  const planAheadCandidates = scored
    .filter((ride) => {
      if (usedAfterWorth.has(String(ride.id))) return false;

      const meta = getRideMeta(parkId, ride.id ?? ride.name);
      const category = meta?.planningProfile?.category;

      // Storm guardrail: closesInRain rides do NOT belong in Plan Ahead
      // during an active storm — Plan Ahead implies "head there with a
      // strategy," and that's not safe advice during lightning.
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

      // Storm guardrail: storm-sensitive rides have unreliable waits
      // during active storms (they may be paused or about to close).
      // "Wait on this" implies the wait is the issue, when really the
      // weather is. Hide them entirely.
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
