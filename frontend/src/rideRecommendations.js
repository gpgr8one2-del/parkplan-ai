import { getWeatherRideModifier } from "./utils/weatherAdvice";
import { getRideMeta } from "./rideMetadata";

const DEFAULT_POPULARITY = 40;

/**
 * Pull a ride's baseline popularity from the metadata layer.
 * Prefers ride.id (exact join with queue-times data); falls back to ride.name.
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

function getTrendModifier(rideName) {
  const trends = {
    "Buzz Lightyear's Space Ranger Spin": 8,
    "Tomorrowland Transit Authority PeopleMover": 5,
    "Peter Pan's Flight": 4,
  };
  return trends[rideName] ?? 0;
}

function getWeatherModifier(ride, weather) {
  return getWeatherRideModifier(ride, weather);
}

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
  if (parts.weatherModifier > 0) {
    reasons.push("good weather-safe option");
  }
  if (!reasons.length) {
    reasons.push("solid value based on current conditions");
  }
  return reasons.join(", ");
}

export function getNextBestRides({ parkId, rides = [], weather = null }) {
  const openRides = rides.filter((r) => r.isOpen);

  const scored = openRides.map((ride) => {
    const baseScore = getBaseScore(parkId, ride);
    const waitPenalty = getWaitPenalty(ride.waitTime);
    const lowWaitBonus = getLowWaitBonus(ride.waitTime);
    const trendModifier = getTrendModifier(ride.name);
    const weatherModifier = getWeatherModifier(ride, weather);
    const finalScore =
      baseScore -
      waitPenalty +
      lowWaitBonus +
      trendModifier +
      weatherModifier;
    return {
      ...ride,
      recommendationScore: finalScore,
      reason: buildReason(ride, {
        baseScore,
        trendModifier,
        weatherModifier,
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
