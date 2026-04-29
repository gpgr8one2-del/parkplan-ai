const fetch = require("node-fetch");
const { fetchWithResiliency } = require("./fetchWithResiliency");
const logger = require("../logger");

const ORLANDO = { lat: 28.5383, lon: -81.3792 };

function buildMockWeather() {
  return {
    location: "Orlando, FL",
    summary: "Weather unavailable",
    tempF: null,
    rainRisk: null,
    stormMode: false,
  };
}

async function fetchLiveWeather() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return buildMockWeather();

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ORLANDO.lat}&lon=${ORLANDO.lon}&appid=${key}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather ${res.status}`);
  const json = await res.json();

  const summary = json.weather?.[0]?.description || "Weather available";
  const tempF = Math.round(json.main?.temp || 0);
  const stormMode = /thunder|storm|heavy rain/i.test(summary);

  return {
    location: "Orlando, FL",
    summary,
    tempF,
    rainRisk: stormMode ? 0.8 : 0.2,
    stormMode,
  };
}

async function getWeather() {
  const result = await fetchWithResiliency("weather:orlando", fetchLiveWeather, {
    ttlMs: 10 * 60 * 1000,
    staleWhileRevalidate: true,
    timeoutMs: 8000,
    fallbackFn: buildMockWeather,
  });

  logger.info({ source: result.source, ageMs: result.ageMs || 0 }, "weather returned");
  return result;
}

module.exports = { getWeather };
