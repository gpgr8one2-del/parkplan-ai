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
const DEFAULT_WEATHER_PROVIDER = "openweather";

const WEATHER_PROVIDER_CONFIGS = {
  openweather: {
    id: "openweather",
    label: "OpenWeather",
    coordinateSource: "park_center",
  },
  tomorrow: {
    id: "tomorrow",
    label: "Tomorrow.io",
    coordinateSource: "park_center",
  },
};

function getWeatherProviderConfig(providerId = process.env.WEATHER_PROVIDER) {
  const normalizedProviderId = String(providerId || DEFAULT_WEATHER_PROVIDER)
    .trim()
    .toLowerCase();

  return (
    WEATHER_PROVIDER_CONFIGS[normalizedProviderId] ||
    WEATHER_PROVIDER_CONFIGS[DEFAULT_WEATHER_PROVIDER]
  );
}

function buildWeatherTargetMetadata(target, providerConfig = getWeatherProviderConfig()) {
  return {
    provider: providerConfig.id,
    providerLabel: providerConfig.label,
    coordinateSource: providerConfig.coordinateSource,
    weatherTarget: {
      parkId: target.parkId,
      label: target.label,
      lat: target.lat,
      lon: target.lon,
    },
  };
}


function getWeatherTarget(parkId = DEFAULT_PARK_ID) {
  const safeParkId = PARK_WEATHER_COORDS[parkId] ? parkId : DEFAULT_PARK_ID;

  return {
    parkId: safeParkId,
    ...PARK_WEATHER_COORDS[safeParkId],
  };
}

function buildMockWeather(parkId = DEFAULT_PARK_ID, providerConfig = getWeatherProviderConfig()) {
  const target = getWeatherTarget(parkId);

  return {
    ...buildWeatherTargetMetadata(target, providerConfig),
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
    normalizedSummary.includes("lightning") ||
    normalizedSummary.includes("heavy rain");

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
    normalizedSummary.includes("lightning") ||
    normalizedSummary.includes("heavy rain");

  if (hasStormWord) return rawSummary;
  if (hasRainWord && !hasMeasuredPrecipitation) {
    return "Rain possible nearby";
  }

  return rawSummary || "Weather available";
}

async function fetchOpenWeather(parkId = DEFAULT_PARK_ID, providerConfig = getWeatherProviderConfig()) {
  const key = process.env.OPENWEATHER_API_KEY;
  const target = getWeatherTarget(parkId);

  if (!key) {
    return buildMockWeather(target.parkId, providerConfig);
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
    ...buildWeatherTargetMetadata(target, providerConfig),
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


const TOMORROW_WEATHER_CODE_SUMMARIES = {
  1000: "Clear",
  1001: "Cloudy",
  1100: "Mostly clear",
  1101: "Partly cloudy",
  1102: "Mostly cloudy",
  2000: "Fog",
  2100: "Light fog",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light rain",
  4201: "Heavy rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light snow",
  5101: "Heavy snow",
  6000: "Freezing drizzle",
  6001: "Freezing rain",
  6200: "Light freezing rain",
  6201: "Heavy freezing rain",
  7000: "Ice pellets",
  7101: "Heavy ice pellets",
  7102: "Light ice pellets",
  8000: "Thunderstorm",
};

function getTomorrowWeatherSummary(values = {}) {
  const code = Number(values.weatherCode);
  return TOMORROW_WEATHER_CODE_SUMMARIES[code] || "Weather available";
}

function getTomorrowPrecipitationIntensity(values = {}) {
  const intensity = Number(values.precipitationIntensity || 0);
  return Number.isFinite(intensity) && intensity > 0 ? intensity : 0;
}

function estimateTomorrowRainRisk(values = {}) {
  const summary = getTomorrowWeatherSummary(values).toLowerCase();
  const intensity = getTomorrowPrecipitationIntensity(values);
  const probability = Number(values.precipitationProbability || 0);

  if (summary.includes("thunder") || summary.includes("heavy rain")) return 0.8;
  if (intensity > 0) return 0.65;
  if (summary.includes("rain") || summary.includes("drizzle") || summary.includes("shower")) {
    return probability >= 50 ? 0.55 : 0.4;
  }
  if (probability >= 70) return 0.6;
  if (probability >= 40) return 0.4;

  return 0.2;
}

function buildTomorrowDisplaySummary(values = {}) {
  const rawSummary = getTomorrowWeatherSummary(values);
  const normalizedSummary = rawSummary.toLowerCase();
  const intensity = getTomorrowPrecipitationIntensity(values);
  const probability = Number(values.precipitationProbability || 0);

  if (normalizedSummary.includes("thunder") || normalizedSummary.includes("heavy rain")) {
    return rawSummary;
  }

  if (
    intensity <= 0 &&
    probability >= 40 &&
    (normalizedSummary.includes("rain") ||
      normalizedSummary.includes("drizzle") ||
      normalizedSummary.includes("shower"))
  ) {
    return "Rain possible nearby";
  }

  return rawSummary;
}

async function fetchTomorrowWeather(parkId = DEFAULT_PARK_ID, providerConfig = getWeatherProviderConfig()) {
  const key = process.env.TOMORROW_API_KEY;
  const target = getWeatherTarget(parkId);

  if (!key) {
    return buildMockWeather(target.parkId, providerConfig);
  }

  const location = encodeURIComponent(`${target.lat},${target.lon}`);
  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${location}&apikey=${key}&units=imperial`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Tomorrow.io ${res.status}`);
  }

  const json = await res.json();
  const values = json?.data?.values || {};
  const rawSummary = getTomorrowWeatherSummary(values);
  const summary = buildTomorrowDisplaySummary(values);
  const precipitationIntensity = getTomorrowPrecipitationIntensity(values);
  const rainRisk = estimateTomorrowRainRisk(values);
  const stormMode = /thunder|storm|heavy rain|lightning/i.test(rawSummary);

  return {
    ...buildWeatherTargetMetadata(target, providerConfig),
    parkId: target.parkId,
    location: target.label,
    summary,
    rawSummary,
    tempF: roundNullable(values.temperature),
    feelsLikeF: roundNullable(values.temperatureApparent),
    humidity: roundNullable(values.humidity),
    rainRisk,
    stormMode,
    currentPrecipitation: precipitationIntensity > 0,
    precipitationLastHourIn: precipitationIntensity,
    precipitationIntensityInPerHr: precipitationIntensity,
    precipitationProbability: roundNullable(values.precipitationProbability),
    weatherCode: values.weatherCode ?? null,
  };
}

async function fetchLiveWeather(parkId = DEFAULT_PARK_ID, providerConfig = getWeatherProviderConfig()) {
  if (providerConfig.id === "tomorrow") {
    return fetchTomorrowWeather(parkId, providerConfig);
  }

  return fetchOpenWeather(parkId, providerConfig);
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
  const providerConfig = getWeatherProviderConfig();

  /**
   * Manual/auto force refresh path:
   * When the frontend sends force=true, bypass the backend cache and pull
   * current OpenWeather data right now.
   */
  if (force) {
    try {
      const freshWeather = await fetchLiveWeather(target.parkId, providerConfig);
      const result = withFreshMetadata(freshWeather, "live");

      logger.info(
        {
          parkId: target.parkId,
          location: result.location,
      provider: result.provider,
      providerLabel: result.providerLabel,
      coordinateSource: result.coordinateSource,
      weatherTarget: result.weatherTarget,
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
    `weather:${providerConfig.id}:${target.parkId}`,
    () => fetchLiveWeather(target.parkId, providerConfig),
    {
      ttlMs: 5 * 60 * 1000,
      staleWhileRevalidate: true,
      timeoutMs: 8000,
      fallbackFn: () => buildMockWeather(target.parkId, providerConfig),
    }
  );

  logger.info(
    {
      parkId: target.parkId,
      location: result.location,
      provider: result.provider,
      providerLabel: result.providerLabel,
      coordinateSource: result.coordinateSource,
      weatherTarget: result.weatherTarget,
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
