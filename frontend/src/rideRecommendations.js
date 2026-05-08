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
 */
function getContextModifier(meta, weather, mode = "default") {
  if (!meta || !weather) return 0;

  const { tempF, rainRisk = 0, stormMode = false } = weather;
  let mod = 0;

  if (stormMode) {
    if (meta.closesInRain) mod -= 40;
    if (meta.environment === "indoor") mod += 12;
    else if (meta.environment === "outdoor") mod -= 8;
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

  if (!reasons.length) {
    reasons.push("solid value based on current conditions");
  }

  return reasons.join(", ");
}

function buildPlanAheadReason(meta, ride, waitValueStatus) {
  const strategy = meta?.planningProfile?.strategy;
  const label = waitValueStatus?.label;

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

  const completed = new Set(completedRideIds);
  const skipped = new Set(skippedRideIds);

  const eligibleRides = rides.filter(
    (ride) => ride.isOpen && !completed.has(ride.id) && !skipped.has(ride.id)
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

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier +
      waitValueModifier;

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
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        contextModifier,
        proximityModifier,
        waitValueStatus,
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
  const backup = nearbyRides[1] || sorted[1] || null;

  const worthTheWalk =
    farRides.find((ride) => ride.recommendationScore >= 60) || null;

  const planAheadCandidates = scored
    .filter((ride) => {
      const meta = getRideMeta(parkId, ride.id ?? ride.name);
      const category = meta?.planningProfile?.category;

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

  /**
   * Wait On This:
   * Only show rides where the current wait is actually poor versus its own profile.
   * Do not show a ride just because it belongs to "wait_for_drop."
   */
  const waitOnThisCandidates = scored
    .filter((ride) => {
      const meta = getRideMeta(parkId, ride.id ?? ride.name);
      const category = meta?.planningProfile?.category;
      const status = ride.waitValueStatus?.status;

      const isPlanAheadCategory =
        category === "plan_ahead_single_pass" ||
        category === "plan_ahead_multi_pass" ||
        category === "plan_ahead_standby_only";

      if (isPlanAheadCategory) return false;

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
