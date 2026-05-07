import { getWeatherRideModifier } from "./utils/weatherAdvice";
import { getRideMeta } from "./rideMetadata";

const DEFAULT_POPULARITY = 40;

/* -------------------------------------------------------------------------- */
/* Score components                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Pull a ride's baseline popularity from the metadata layer.
 * Prefers ride.id (exact join with queue-times); falls back to ride.name.
 */
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
 * Trend modifier captures *guest demand momentum* — rides trending up or
 * underrated by raw popularity alone. NOT for situational/contextual value
 * (e.g. PeopleMover for heat). That belongs in getContextModifier.
 *
 * Both apostrophe variants are listed because queue-times sometimes returns
 * straight ' and sometimes smart ’.
 */
function getTrendModifier(rideName) {
  const trends = {
    "Buzz Lightyear's Space Ranger Spin": 8,
    "Buzz Lightyear\u2019s Space Ranger Spin": 8,
    "Peter Pan's Flight": 4,
    "Tomorrowland Transit Authority PeopleMover": 1,
  };
  return trends[rideName] ?? 0;
}

/**
 * Legacy weather modifier (kept for backward compatibility with existing
 * weatherAdvice.js logic). Eventually getContextModifier should subsume this.
 */
function getWeatherModifier(ride, weather) {
  return getWeatherRideModifier(ride, weather);
}

/* -------------------------------------------------------------------------- */
/* Context modifier — V1: weather-driven (heat / rain / storm)                */
/* -------------------------------------------------------------------------- */

/**
 * Adjusts a ride's score based on current conditions and (eventually)
 * user mode. Reads ride attributes from metadata, not hardcoded names —
 * so this works for any park once metadata is filled in.
 *
 * Weather shape expected:
 *   { tempF, rainRisk (0-1), stormMode (bool), summary, ... }
 *
 * V1 implements heat / rain / storm only.
 * User modes (toddler, thrill, recovery, low_walking) are accepted in the
 * signature but not yet active — see TODO blocks below.
 */
function getContextModifier(meta, weather, mode = "default") {
  if (!meta || !weather) return 0;

  const { tempF, rainRisk = 0, stormMode = false } = weather;
  let mod = 0;

  // -------- STORM MODE (active severe weather) --------
  // Outdoor rides likely to close mid-queue. Push hard toward indoor.
  if (stormMode) {
    if (meta.closesInRain) mod -= 40;
    if (meta.environment === "indoor") mod += 12;
    else if (meta.environment === "outdoor") mod -= 8;
  }
  // -------- RAIN RISK (probabilistic, no active storm) --------
  else if (rainRisk >= 0.7) {
    if (meta.closesInRain) mod -= 15;
    if (meta.environment === "indoor") mod += 8;
    if (meta.getsWet) mod -= 3;
  } else if (rainRisk >= 0.4) {
    if (meta.environment === "indoor") mod += 4;
    if (meta.closesInRain) mod -= 3;
  }

  // -------- HEAT --------
  // Florida-calibrated thresholds: 95+ extreme, 88+ hot, 82+ warm.
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

  // -------- USER MODES (V2 — not yet active) --------
  // TODO: if (mode === "toddler") boost when minHeightInches === 0 && intensity <= 2
  // TODO: if (mode === "thrill") boost when intensity >= 4
  // TODO: if (mode === "recovery") boost when tags.includes("recovery")
  // TODO: if (mode === "low_walking") boost when tags.includes("relaxing")

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
  if (parts.trendModifier > 0) {
    reasons.push("strong guest demand");
  }
  if (parts.contextModifier >= 8) {
    reasons.push("great fit for current conditions");
  } else if (
    parts.contextModifier > 0 ||
    parts.weatherModifier > 0
  ) {
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

/**
 * V1 signature accepts mode, completedRideIds, and skippedRideIds for
 * forward compatibility, but does not yet act on them. Filtering by
 * completed/skipped will land in V2 alongside user modes.
 */
export function getNextBestRides({
  parkId,
  rides = [],
  weather = null,
  mode = "default",
  // eslint-disable-next-line no-unused-vars
  completedRideIds = [],
  // eslint-disable-next-line no-unused-vars
  skippedRideIds = [],
}) {
  const openRides = rides.filter((r) => r.isOpen);

  const scored = openRides.map((ride) => {
    const meta = getRideMeta(parkId, ride.id ?? ride.name);
    const baseScore = meta?.popularity ?? DEFAULT_POPULARITY;
    const waitPenalty = getWaitPenalty(ride.waitTime);
    const lowWaitBonus = getLowWaitBonus(ride.waitTime);
    const trendModifier = getTrendModifier(ride.name);
    const weatherModifier = getWeatherModifier(ride, weather);
    const contextModifier = getContextModifier(meta, weather, mode);

    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      weatherModifier +
      contextModifier;

    return {
      ...ride,
      recommendationScore: finalScore,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        weatherModifier,
        contextModifier,
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
      .filter((r) => r.isOpen && getBaseScore(parkId, r) >= 85)
      .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0))[0] || null;

  return {
    bestMove,
    backup,
    waitOnThis,
  };
}
