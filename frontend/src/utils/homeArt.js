/**
 * Home artwork key resolution (62B-2A).
 *
 * Pure, deterministic, data-only. No React, no DOM, no theme, no asset
 * selection, no fallback artwork. These functions return a KEY or null; the
 * caller decides what to render, including the composed no-art state.
 *
 * WHY THE INPUT SET IS DELIBERATELY NARROW
 *
 * Three fields that look like current conditions are contaminated with
 * forecast data and must never drive artwork:
 *
 *   - weather.summary   backend rewrites it to "Rain possible nearby" /
 *                       "Rain possible soon", and can substitute the forecast
 *                       window's own summary — so it can read "Thunderstorm"
 *                       while the sky overhead is clear.
 *   - weather.stormMode ORs the forecast window, so a storm hours away sets it.
 *   - weather.rainRisk  max() of current and forecast risk.
 *   - weatherMode       conflates current and upcoming by design; it is a
 *                       guidance signal, not an observation.
 *
 * Reading any of them would put storm artwork over clear skies. This module
 * therefore reads exactly five fields, all genuine current observations:
 * rawSummary, currentPrecipitation, weatherCode, tempF, feelsLikeF.
 */

/* ------------------------------------------------------------------ parks -- */

// Exact identifiers only. No lowercasing, trimming, aliasing, or partial
// matching: a near miss must fail closed to null rather than silently render
// the wrong park's artwork.
const PARK_ART_KEY_BY_PARK_ID = {
  magic_kingdom: "magicKingdom",
  epcot: "epcot",
  hollywood: "hollywoodStudios",
  animal_kingdom: "animalKingdom",
};

export function resolveHomeParkArtKey(parkId) {
  if (typeof parkId !== "string") return null;
  if (!Object.prototype.hasOwnProperty.call(PARK_ART_KEY_BY_PARK_ID, parkId)) {
    return null;
  }
  return PARK_ART_KEY_BY_PARK_ID[parkId];
}

/* ---------------------------------------------------------------- weather -- */

const STORM_CODES = new Set([8000]);
const RAIN_CODES = new Set([4000, 4001, 4200, 4201]);
const PARTLY_CLOUDY_CODES = new Set([1100, 1101]);
const CLOUDY_FOG_CODES = new Set([1001, 1102, 2000, 2100]);
const CLEAR_CODES = new Set([1000]);

const HEAT_THRESHOLD_F = 92;

// The literal sentinel the backend emits when no live reading is available.
const UNAVAILABLE_SUMMARY = "weather unavailable";

// "partly cloudy" and "mostly clear" are checked BEFORE the broad cloudy test
// so they cannot fall through to cloudyFog or clear. "mostly cloudy" is
// deliberately absent here: it belongs to cloudyFog.
const PARTLY_CLOUDY_PHRASES = ["partly cloudy", "mostly clear", "few clouds"];
const CLOUDY_FOG_PHRASES = ["cloudy", "overcast", "fog", "mist", "haze"];
const STORM_PHRASES = ["thunder", "lightning"];
const RAIN_PHRASES = ["rain", "drizzle", "shower"];
const CLEAR_PHRASES = ["clear", "sunny"];

function normalizeWeatherCode(value) {
  // Providers may send a numeric string. Everything else — null, undefined,
  // booleans, empty or whitespace strings, non-numeric text — is not a code.
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTemperature(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

export function resolveHomeWeatherFamily(weather) {
  if (!weather || typeof weather !== "object") return null;

  // Exactly five reads. Nothing forecast-derived is touched.
  const rawSummary = weather.rawSummary;
  const currentPrecipitation = weather.currentPrecipitation;
  const weatherCode = normalizeWeatherCode(weather.weatherCode);
  const tempF = normalizeTemperature(weather.tempF);
  const feelsLikeF = normalizeTemperature(weather.feelsLikeF);

  // The provider's explicit "weather unavailable" sentinel never produces
  // artwork, whatever else the payload happens to carry.
  if (typeof rawSummary === "string" && rawSummary.trim().toLowerCase() === UNAVAILABLE_SUMMARY) {
    return null;
  }

  // Current-observation evidence. A forecast-like rawSummary on its own is not
  // enough: without a real code or a real measurement there is nothing proving
  // the text describes conditions at the park right now.
  //
  // currentPrecipitation === true counts on its own — it is a direct measured
  // current condition, so rain must still resolve when code and temperatures
  // are temporarily absent. `false` does NOT count, because it is the default
  // in an otherwise unavailable payload and would wrongly certify it as live.
  const hasCurrentObservation =
    weatherCode !== null ||
    tempF !== null ||
    feelsLikeF !== null ||
    currentPrecipitation === true;
  if (!hasCurrentObservation) return null;

  const text = typeof rawSummary === "string" ? rawSummary.toLowerCase() : "";

  // 2. Storm
  if (weatherCode !== null && STORM_CODES.has(weatherCode)) return "storm";
  if (containsAny(text, STORM_PHRASES)) return "storm";

  // 3. Rain — measurement first, then code, then text.
  if (currentPrecipitation === true) return "rain";
  if (weatherCode !== null && RAIN_CODES.has(weatherCode)) return "rain";
  if (containsAny(text, RAIN_PHRASES)) return "rain";

  // 4. Heat — a current measurement, so it may drive artwork. feelsLikeF wins
  //    when finite because that is what the family actually experiences.
  const effectiveTempF = feelsLikeF !== null ? feelsLikeF : tempF;
  if (effectiveTempF !== null && effectiveTempF >= HEAT_THRESHOLD_F) return "heat";

  // 5. Partly cloudy — before the broad cloudy test.
  if (weatherCode !== null && PARTLY_CLOUDY_CODES.has(weatherCode)) return "partlyCloudy";
  if (containsAny(text, PARTLY_CLOUDY_PHRASES)) return "partlyCloudy";

  // 6. Cloudy / fog
  if (weatherCode !== null && CLOUDY_FOG_CODES.has(weatherCode)) return "cloudyFog";
  if (containsAny(text, CLOUDY_FOG_PHRASES)) return "cloudyFog";

  // 7. Clear
  if (weatherCode !== null && CLEAR_CODES.has(weatherCode)) return "clear";
  if (containsAny(text, CLEAR_PHRASES)) return "clear";

  // 8. Anything else — snow, freezing precipitation, ice pellets, unknown
  //    codes, unreadable text. No family, so the caller renders no-art rather
  //    than borrowing a misleading illustration.
  return null;
}
