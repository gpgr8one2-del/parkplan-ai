const fetch = require("node-fetch");
const { fetchWithResiliency } = require("./fetchWithResiliency");
const logger = require("../logger");

const PARK_WEATHER_COORDS = {
  magic_kingdom: {
    lat: 28.4177,
    lon: -81.5812,
    label: "Magic Kingdom",
  },
  epcot: {
    lat: 28.3747,
    lon: -81.5494,
    label: "EPCOT",
  },
  hollywood: {
    lat: 28.3575,
    lon: -81.5583,
    label: "Hollywood Studios",
  },
  animal_kingdom: {
    lat: 28.3554,
    lon: -81.5900,
    label: "Animal Kingdom",
  },
  universal_sf: {
    lat: 28.4744,
    lon: -81.4679,
    label: "Universal Studios Florida",
  },
  islands: {
    lat: 28.4729,
    lon: -81.4690,
    label: "Islands of Adventure",
  },
  epic_universe: {
    lat: 28.4404,
    lon: -81.4529,
    label: "Epic Universe",
  },
};

const DEFAULT_PARK_ID = "magic_kingdom";

function getWeatherTarget(parkId = DEFAULT_PARK_ID) {
  const safeParkId = PARK_WEATHER_COORDS[parkId] ? parkId : DEFAULT_PARK_ID;

  return {
    parkId: safeParkId,
    ...PARK_WEATHER_COORDS[safeParkId],
  };
}

function buildMockWeather(parkId = DEFAULT_PARK_ID) {
  const target = getWeatherTarget(parkId);

  return {
    parkId: target.parkId,
    location: target.label,
    summary: "Weather unavailable",
    rawSummary: "Weather unavailable",
    tempF: null,
    feelsLikeF: null,
    humidity: null,
    rainRisk: null,
    stormMode: false,
    currentPrecipitation: false,
    precipitationLastHourIn: 0,
  };
}

function roundNullable(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round(Number(value));
}

function getRainVolume(json = {}) {
  const rain1h = Number(json?.rain?.["1h"] || 0);
  const rain3h = Number(json?.rain?.["3h"] || 0);
  const snow1h = Number(json?.snow?.["1h"] || 0);
  const snow3h = Number(json?.snow?.["3h"] || 0);

  return {
    rain1h,
    rain3h,
    snow1h,
    snow3h,
    hasMeasuredPrecipitation: rain1h > 0 || rain3h > 0 || snow1h > 0 || snow3h > 0,
  };
}

function estimateRainRisk(summary, json) {
  const normalizedSummary = String(summary || "").toLowerCase();
  const { hasMeasuredPrecipitation } = getRainVolume(json);

  const hasRain =
    normalizedSummary.includes("rain") ||
    normalizedSummary.includes("drizzle") ||
    normalizedSummary.includes("shower");

  const hasStorm =
    normalizedSummary.includes("thunder") ||
    normalizedSummary.includes("storm") ||
    normalizedSummary.includes("lightning");

  if (hasStorm) return 0.8;

  // If the API gives measured rain volume, treat it as active rain.
  if (hasRain && hasMeasuredPrecipitation) return 0.65;

  // OpenWeather can report "light rain" from a nearby/representative station
  // even when the exact park is dry. Keep this as a watch signal, not active rain.
  if (hasRain) return 0.4;

  if (json?.rain?.["1h"] || json?.rain?.["3h"]) return 0.6;
  if (json?.snow?.["1h"] || json?.snow?.["3h"]) return 0.5;

  return 0.2;
}

function buildDisplaySummary(rawSummary, json) {
  const normalizedSummary = String(rawSummary || "").toLowerCase();
  const { hasMeasuredPrecipitation } = getRainVolume(json);

  const hasRainWord =
    normalizedSummary.includes("rain") ||
    normalizedSummary.includes("drizzle") ||
    normalizedSummary.includes("shower");

  const hasStormWord =
    normalizedSummary.includes("thunder") ||
    normalizedSummary.includes("storm") ||
    normalizedSummary.includes("lightning");

  if (hasStormWord) return rawSummary;
  if (hasRainWord && !hasMeasuredPrecipitation) {
    return "Rain possible nearby";
  }

  return rawSummary || "Weather available";
}

async function fetchLiveWeather(parkId = DEFAULT_PARK_ID) {
  const key = process.env.OPENWEATHER_API_KEY;
  const target = getWeatherTarget(parkId);

  if (!key) {
    return buildMockWeather(target.parkId);
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${target.lat}&lon=${target.lon}&appid=${key}&units=imperial`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`OpenWeather ${res.status}`);
  }

  const json = await res.json();

  const rawSummary = json.weather?.[0]?.description || "Weather available";
  const summary = buildDisplaySummary(rawSummary, json);
  const tempF = roundNullable(json.main?.temp);
  const feelsLikeF = roundNullable(json.main?.feels_like);
  const humidity = roundNullable(json.main?.humidity);
  const rainRisk = estimateRainRisk(rawSummary, json);
  const stormMode = /thunder|storm|heavy rain|lightning/i.test(rawSummary);
  const rainVolume = getRainVolume(json);

  return {
    parkId: target.parkId,
    location: target.label,
    summary,
    rawSummary,
    tempF,
    feelsLikeF,
    humidity,
    rainRisk,
    stormMode,
    currentPrecipitation: rainVolume.hasMeasuredPrecipitation,
    precipitationLastHourIn: rainVolume.rain1h || rainVolume.snow1h || 0,
  };
}

function withFreshMetadata(data, source = "live") {
  return {
    ...data,
    source,
    ageMs: 0,
    fetchedAt: new Date().toISOString(),
  };
}

async function getWeather(options = {}) {
  const { force = false, parkId = DEFAULT_PARK_ID } = options;
  const target = getWeatherTarget(parkId);

  /**
   * Manual/auto force refresh path:
   * When the frontend sends force=true, bypass the backend cache and pull
   * current OpenWeather data right now.
   */
  if (force) {
    try {
      const freshWeather = await fetchLiveWeather(target.parkId);
      const result = withFreshMetadata(freshWeather, "live");

      logger.info(
        {
          parkId: target.parkId,
          location: result.location,
          force: true,
          source: result.source,
          ageMs: result.ageMs,
          tempF: result.tempF,
          feelsLikeF: result.feelsLikeF,
          humidity: result.humidity,
          rainRisk: result.rainRisk,
          stormMode: result.stormMode,
          currentPrecipitation: result.currentPrecipitation,
          rawSummary: result.rawSummary,
          summary: result.summary,
        },
        "weather force refreshed"
      );

      return result;
    } catch (err) {
      logger.warn(
        { parkId: target.parkId, force: true, err: err.message },
        "weather force refresh failed, falling back to resilient cache"
      );

      // If live force-refresh fails, fall back to cached/stale/mock instead of breaking the app.
    }
  }

  const result = await fetchWithResiliency(
    `weather:${target.parkId}`,
    () => fetchLiveWeather(target.parkId),
    {
      ttlMs: 5 * 60 * 1000,
      staleWhileRevalidate: true,
      timeoutMs: 8000,
      fallbackFn: () => buildMockWeather(target.parkId),
    }
  );

  logger.info(
    {
      parkId: target.parkId,
      location: result.location,
      force,
      source: result.source,
      ageMs: result.ageMs || 0,
      tempF: result.tempF,
      feelsLikeF: result.feelsLikeF,
      humidity: result.humidity,
      rainRisk: result.rainRisk,
      stormMode: result.stormMode,
      currentPrecipitation: result.currentPrecipitation,
      rawSummary: result.rawSummary,
      summary: result.summary,
    },
    "weather returned"
  );

  return result;
}

module.exports = { getWeather };
