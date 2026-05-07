import { getRideMeta } from "./rideMetadata";
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

  // Storm mode
  if (stormMode) {
    if (meta.closesInRain) mod -= 40;
    if (meta.environment === "indoor") mod += 12;
    else if (meta.environment === "outdoor") mod -= 8;
  }

  // Rain risk
  else if (rainRisk >= 0.7) {
    if (meta.closesInRain) mod -= 15;
    if (meta.environment === "indoor") mod += 8;
    if (meta.getsWet) mod -= 3;
  } else if (rainRisk >= 0.4) {
    if (meta.environment === "indoor") mod += 4;
    if (meta.closesInRain) mod -= 3;
  }

  // Heat
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

  // Future modes:
  // if (mode === "toddler") ...
  // if (mode === "thrill") ...
  // if (mode === "recovery") ...
  // if (mode === "low_walking") ...

  return mod;
}

/* -------------------------------------------------------------------------- */
/* Reason builder                                                             */
/* -------------------------------------------------------------------------- */

function buildReason(ride, parts) {
  const reasons = [];

  if (ride.waitTime <= 10) {
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

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      contextModifier +
      proximityModifier;

    return {
      ...ride,
      recommendationScore: finalScore,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        contextModifier,
        proximityModifier,
      }),
    };
  });

  const sorted = scored.sort(
    (a, b) => b.recommendationScore - a.recommendationScore
  );

  const bestMove = sorted[0] || null;
  const backup = sorted[1] || null;

  const waitOnThis =
    rides
      .filter(
        (ride) =>
          ride.isOpen &&
          !completed.has(ride.id) &&
          !skipped.has(ride.id) &&
          getBaseScore(parkId, ride) >= 85
      )
      .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0))[0] || null;

  return {
    bestMove,
    backup,
    waitOnThis,
  };
}
