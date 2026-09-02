/**
 * The single structured weather classifier.
 *
 * WHY THIS FILE EXISTS
 *
 * The recommendation engine and the weather-advice system each carried their
 * own answer to the same four questions — forecast or active, rain or storm,
 * light or heavy, and what to call it. The two answers drifted:
 *
 *   - `isStormyPrecipitationWindow()` promoted a window to a STORM at
 *     `rainRisk >= 0.7`; `isUpcomingStorming()` did it at `rainRisk >= 0.75`.
 *     Any forecast between those two values was a Storm Watch to one half of
 *     the product and a Rain Watch to the other.
 *   - Both promotions read a PROBABILITY. A 99% chance of light rain means
 *     light rain is very likely; it says nothing about thunder, lightning or
 *     intensity. The guest was shown a Storm Watch for a sprinkle.
 *   - Only `stormMode` and summary prose were consulted for a storm, so weather
 *     code 8000 — the provider's own thunderstorm code — was not on its own
 *     enough to classify one.
 *
 * THE RULE THIS FILE ENFORCES
 *
 * Probability is evidence of LIKELIHOOD, never of SEVERITY. It can say that
 * precipitation is expected — that is what a Rain Watch is — and it can never,
 * at any value, make something a storm. Storm severity comes only from
 * structured storm evidence: a thunderstorm weather code, an explicit
 * thunder/storm/lightning reading, or explicit heavy-rain evidence, which this
 * product deliberately groups into the stronger watch state.
 *
 * Everything here is pure. No I/O, no clock, no state.
 */

/* ------------------------------------------------------------------ phase -- */

/**
 * Is precipitation FORECAST, or is it FALLING? The distinction the labels and
 * the advice both hang on: a watch is about later, active is about now.
 */
export const WEATHER_PHASE = Object.freeze({
  NONE: "none",
  FORECAST: "forecast",
  ACTIVE: "active",
});

/** How bad it is — from structured evidence only, never from probability. */
export const WEATHER_SEVERITY = Object.freeze({
  NONE: "none",
  LIGHT: "light",
  HEAVY: "heavy",
  STORM: "storm",
});

/**
 * User-facing state names. One per (phase, severity) the product distinguishes,
 * so no consumer has to invent a name and none of them can disagree.
 *
 * A watch is never used for something that is happening, and an active name is
 * never used for something that is only forecast.
 */
export const WEATHER_LABELS = Object.freeze({
  STORM_ACTIVE: "Storm Smart Mode",
  STORM_WATCH: "Storm Watch",
  HEAVY_RAIN_ACTIVE: "Heavy Rain",
  LIGHT_RAIN_ACTIVE: "Light Rain",
  RAIN_WATCH: "Rain Watch",
});

/* --------------------------------------------------------------- evidence -- */

// Tomorrow.io codes. 8000 is the provider's thunderstorm code and counts as
// storm evidence on its own — `stormMode` and the summary text may both be
// absent from an otherwise valid payload.
const STORM_WEATHER_CODES = new Set([8000]);

// 4201 is Heavy Rain. Grouped into the stronger state deliberately: heavy rain
// pauses outdoor attractions and soaks a family the same way a storm does.
const HEAVY_RAIN_WEATHER_CODES = new Set([4201]);

// 4000 Drizzle, 4001 Rain, 4200 Light Rain. Used only to recognise that a
// FORECAST window describes precipitation, never to assert that rain is falling.
const RAIN_WEATHER_CODES = new Set([4000, 4001, 4200, 4201]);

const STORM_PHRASES = ["thunderstorm", "thunder", "storm", "lightning"];
const HEAVY_RAIN_PHRASES = ["heavy rain", "intense rain"];
const RAIN_PHRASES = ["rain", "drizzle", "shower"];

/**
 * A forecast window counts as precipitation at this probability even with no
 * usable text or code. This is the one legitimate use of probability: it says
 * something is EXPECTED. It selects between "watch" and "nothing" — never
 * between rain and storm, and never between light and heavy.
 */
const FORECAST_WINDOW_RAIN_RISK = 0.4;
const FORECAST_WINDOW_PROBABILITY_PCT = 40;

/**
 * Current risk high enough to be worth a Rain Watch with no window attached.
 * The threshold the weather-advice system has always used; it now governs the
 * engine too, so the two cannot disagree about whether a watch exists. It
 * produces a RAIN watch only.
 */
const BARE_RAIN_WATCH_RISK = 0.55;

function getText(source) {
  return String(source?.summary || "").toLowerCase();
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

/** Providers may send a numeric string. Anything unreadable is simply absent. */
export function normalizeWeatherCode(value) {
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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Structured storm evidence. Accepts either a current reading or a forecast
 * window — both carry the same fields, and a storm is a storm in either.
 *
 * Deliberately does NOT consult rainRisk or precipitationProbability.
 */
export function hasStormEvidence(source) {
  if (!source || typeof source !== "object") return false;
  if (source.stormMode === true) return true;

  const code = normalizeWeatherCode(source.weatherCode);
  if (code !== null && STORM_WEATHER_CODES.has(code)) return true;

  return containsAny(getText(source), STORM_PHRASES);
}

/** Structured heavy-rain evidence. Also probability-free. */
export function hasHeavyRainEvidence(source) {
  if (!source || typeof source !== "object") return false;

  const code = normalizeWeatherCode(source.weatherCode);
  if (code !== null && HEAVY_RAIN_WEATHER_CODES.has(code)) return true;

  return containsAny(getText(source), HEAVY_RAIN_PHRASES);
}

/** Text that describes rain. The only evidence trusted to assert falling rain. */
function hasRainSummary(source) {
  if (!source || typeof source !== "object") return false;
  return containsAny(getText(source), RAIN_PHRASES);
}

/** Rain evidence for a FORECAST window: text or a precipitation weather code. */
function hasForecastRainEvidence(source) {
  if (!source || typeof source !== "object") return false;

  const code = normalizeWeatherCode(source.weatherCode);
  if (code !== null && RAIN_WEATHER_CODES.has(code)) return true;

  return hasRainSummary(source);
}

/* ----------------------------------------------------------------- now vs -- */

/**
 * Is precipitation actually falling right now?
 *
 * `currentPrecipitation` is a direct reading and is authoritative in BOTH
 * directions — it is also the field a guest's "yes it is raining" / "not yet"
 * answer sets. The summary is consulted only when the provider sends no
 * reading at all, because the display string is forecast-facing: production
 * emits "Rain possible soon" precisely when nothing is measured.
 */
export function isPrecipitationFalling(weather) {
  if (weather?.currentPrecipitation === true) return true;
  if (weather?.currentPrecipitation === false) return false;

  return hasRainSummary(weather);
}

/**
 * Storm conditions over the park right now.
 *
 * Storm evidence, unless the provider explicitly reports that nothing is
 * falling — in which case the storm is nearby or ahead, not overhead. This is
 * the predicate the outdoor-attraction safety rules are gated on, and it is
 * deliberately unchanged apart from now recognising weather code 8000.
 */
export function isStormOverhead(weather) {
  if (weather?.currentPrecipitation === false) return false;

  return hasStormEvidence(weather);
}

/* ------------------------------------------------------------- forecast --- */

/**
 * The upcoming precipitation window, or null when the forecast does not
 * actually describe precipitation.
 *
 * A `nextPrecipitationWindow` object is not on its own a forecast of rain —
 * providers send one with nothing in it. It counts when the provider flags
 * upcoming precipitation, when it describes rain or a storm, or when it carries
 * a real intensity or probability.
 */
export function getPrecipitationForecastWindow(weather) {
  const window = weather?.nextPrecipitationWindow;
  const flagged = weather?.upcomingPrecipitation === true;

  if (!window || typeof window !== "object") {
    return flagged ? {} : null;
  }

  if (flagged) return window;

  const rainRisk = toNumber(window.rainRisk) ?? 0;
  const probability = toNumber(window.precipitationProbability) ?? 0;
  const intensity = toNumber(window.precipitationIntensityInPerHr) ?? 0;

  if (
    intensity > 0 ||
    probability >= FORECAST_WINDOW_PROBABILITY_PCT ||
    rainRisk >= FORECAST_WINDOW_RAIN_RISK ||
    hasForecastRainEvidence(window) ||
    hasStormEvidence(window)
  ) {
    return window;
  }

  return null;
}

/**
 * Does a forecast window describe a STORM?
 *
 * Structured evidence only. Both former probability thresholds — `>= 0.7` in
 * the engine and `>= 0.75` in the advice system — were removed from here, and
 * neither may be restored: a 99% chance of light rain is a Rain Watch.
 */
export function isStormyForecastWindow(window) {
  if (!window || typeof window !== "object") return false;

  return hasStormEvidence(window) || hasHeavyRainEvidence(window);
}

/* ------------------------------------------------------------- classify --- */

function getActiveSeverity(weather, activeStorm) {
  if (activeStorm) return WEATHER_SEVERITY.STORM;
  if (hasHeavyRainEvidence(weather)) return WEATHER_SEVERITY.HEAVY;

  // Confirmed falling rain with no intensity evidence — most importantly when
  // the GUEST confirmed it and the provider has no reading. Light is the
  // conservative answer: a sprinkle must never be treated as a downpour on the
  // strength of missing data.
  return WEATHER_SEVERITY.LIGHT;
}

function getLabel(phase, severity) {
  if (phase === WEATHER_PHASE.ACTIVE) {
    if (severity === WEATHER_SEVERITY.STORM) return WEATHER_LABELS.STORM_ACTIVE;
    if (severity === WEATHER_SEVERITY.HEAVY) return WEATHER_LABELS.HEAVY_RAIN_ACTIVE;
    return WEATHER_LABELS.LIGHT_RAIN_ACTIVE;
  }

  if (phase === WEATHER_PHASE.FORECAST) {
    return severity === WEATHER_SEVERITY.STORM
      ? WEATHER_LABELS.STORM_WATCH
      : WEATHER_LABELS.RAIN_WATCH;
  }

  return null;
}

/**
 * The one structured weather reading. Every consumer selects its behaviour,
 * label and copy from this result rather than re-deriving weather of its own.
 *
 * @returns {{
 *   phase: string, severity: string, label: string|null,
 *   activeStorm: boolean, activeRain: boolean, activeRainSeverity: string,
 *   forecastStormWatch: boolean, forecastRainWatch: boolean,
 *   nearbyStorm: boolean, hasUpcomingPrecipitation: boolean,
 *   precipitationWindow: object|null,
 * }}
 */
export function classifyWeather(weather) {
  const precipitationFalling = isPrecipitationFalling(weather);
  const stormEvidence = hasStormEvidence(weather);

  const activeStorm = stormEvidence && precipitationFalling;
  const activeRain = precipitationFalling;

  // Storm evidence with nothing falling: the system is nearby or ahead of the
  // park. A watch, not an active storm.
  const nearbyStorm = stormEvidence && !precipitationFalling;

  const precipitationWindow = getPrecipitationForecastWindow(weather);
  const currentRainRisk = toNumber(weather?.rainRisk) ?? 0;

  const forecastStormWatch =
    !activeRain && (nearbyStorm || isStormyForecastWindow(precipitationWindow));

  const forecastRainWatch =
    !activeRain &&
    !forecastStormWatch &&
    (Boolean(precipitationWindow) || currentRainRisk >= BARE_RAIN_WATCH_RISK);

  const activeRainSeverity = activeRain
    ? getActiveSeverity(weather, activeStorm)
    : WEATHER_SEVERITY.NONE;

  let phase = WEATHER_PHASE.NONE;
  let severity = WEATHER_SEVERITY.NONE;

  if (activeRain) {
    phase = WEATHER_PHASE.ACTIVE;
    severity = activeRainSeverity;
  } else if (forecastStormWatch) {
    phase = WEATHER_PHASE.FORECAST;
    severity = WEATHER_SEVERITY.STORM;
  } else if (forecastRainWatch) {
    phase = WEATHER_PHASE.FORECAST;
    severity = WEATHER_SEVERITY.LIGHT;
  }

  return {
    phase,
    severity,
    label: getLabel(phase, severity),
    activeStorm,
    activeRain,
    activeRainSeverity,
    forecastStormWatch,
    forecastRainWatch,
    nearbyStorm,
    hasUpcomingPrecipitation: Boolean(precipitationWindow),
    precipitationWindow,
  };
}
