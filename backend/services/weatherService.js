const fetch = require("node-fetch");
const { fetchWithResiliency } = require("./fetchWithResiliency");
const logger = require("../logger");

const ORLANDO = { lat: 28.5383, lon: -81.3792 };

function buildMockWeather() {
  return {
    location: "Orlando, FL",
    summary: "Weather unavailable",
    tempF: null,
    feelsLikeF: null,
    humidity: null,
    rainRisk: null,
    stormMode: false,
  };
}

function roundNullable(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round(Number(value));
}

function estimateRainRisk(summary, json) {
  const normalizedSummary = String(summary || "").toLowerCase();

  const hasRain =
    normalizedSummary.includes("rain") ||
    normalizedSummary.includes("drizzle") ||
    normalizedSummary.includes("shower");

  const hasStorm =
    normalizedSummary.includes("thunder") ||
    normalizedSummary.includes("storm") ||
    normalizedSummary.includes("lightning");

  if (hasStorm) return 0.8;
  if (hasRain) return 0.65;

  if (json?.rain?.["1h"] || json?.rain?.["3h"]) return 0.6;
  if (json?.snow?.["1h"] || json?.snow?.["3h"]) return 0.5;

  return 0.2;
}

async function fetchLiveWeather() {
  const key = process.env.OPENWEATHER_API_KEY;

  if (!key) {
    return buildMockWeather();
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ORLANDO.lat}&lon=${ORLANDO.lon}&appid=${key}&units=imperial`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`OpenWeather ${res.status}`);
  }

  const json = await res.json();

  const summary = json.weather?.[0]?.description || "Weather available";
  const tempF = roundNullable(json.main?.temp);
  const feelsLikeF = roundNullable(json.main?.feels_like);
  const humidity = roundNullable(json.main?.humidity);
  const rainRisk = estimateRainRisk(summary, json);
  const stormMode = /thunder|storm|heavy rain|lightning/i.test(summary);

  return {
    location: "Orlando, FL",
    summary,
    tempF,
    feelsLikeF,
    humidity,
    rainRisk,
    stormMode,
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
  const { force = false } = options;

  /**
   * Manual/auto force refresh path:
   * When the frontend sends force=true, bypass the backend cache and pull
   * current OpenWeather data right now.
   */
  if (force) {
    try {
      const freshWeather = await fetchLiveWeather();
      const result = withFreshMetadata(freshWeather, "live");

      logger.info(
        {
          force: true,
          source: result.source,
          ageMs: result.ageMs,
          tempF: result.tempF,
          feelsLikeF: result.feelsLikeF,
          humidity: result.humidity,
          rainRisk: result.rainRisk,
          stormMode: result.stormMode,
        },
        "weather force refreshed"
      );

      return result;
    } catch (err) {
      logger.warn(
        { force: true, err: err.message },
        "weather force refresh failed, falling back to resilient cache"
      );

      // If live force-refresh fails, fall back to cached/stale/mock instead of breaking the app.
    }
  }

  const result = await fetchWithResiliency("weather:orlando", fetchLiveWeather, {
    ttlMs: 10 * 60 * 1000,
    staleWhileRevalidate: true,
    timeoutMs: 8000,
    fallbackFn: buildMockWeather,
  });

  logger.info(
    {
      force,
      source: result.source,
      ageMs: result.ageMs || 0,
      tempF: result.tempF,
      feelsLikeF: result.feelsLikeF,
      humidity: result.humidity,
      rainRisk: result.rainRisk,
      stormMode: result.stormMode,
    },
    "weather returned"
  );

  return result;
}

module.exports = { getWeather };
