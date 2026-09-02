/**
 * TOHI — one honest weather classification, shared by the engine and the UI.
 *
 * THE DEFECT THESE TESTS EXIST FOR
 *
 * A 99% chance of LIGHT rain was shown as a Storm Watch. Two classifiers each
 * inferred storm severity from a probability, at two different thresholds:
 *
 *   - `isStormyPrecipitationWindow()` in rideRecommendations.js, at
 *     `rainRisk >= 0.7`
 *   - `isUpcomingStorming()` in weatherAdvice.js, at `rainRisk >= 0.75`
 *
 * So probability was being read as severity, and anything between 0.70 and
 * 0.75 was a Storm Watch to one half of the product and a Rain Watch to the
 * other. Both thresholds are gone, and the sweep below is written so that
 * restoring EITHER of them fails.
 *
 * A probability is evidence of likelihood. It is never evidence of thunder,
 * lightning, or intensity.
 */

import {
  getNextBestRides,
  getRecommendationWeatherState,
} from "../rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "../utils/weatherAdvice";
import {
  WEATHER_LABELS,
  WEATHER_PHASE,
  WEATHER_SEVERITY,
  classifyWeather,
  isStormyForecastWindow,
} from "../utils/weatherClassification";
import {
  MK,
  adultOnlyFamily,
  gpsAtAnchor,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const LAND = "tomorrowland";

/* -------------------------------------------------------------------------- */
/* Weather shapes                                                             */
/* -------------------------------------------------------------------------- */

const base = {
  tempF: 82,
  feelsLikeF: 84,
  humidity: 70,
  stormMode: false,
  precipitationIntensityInPerHr: 0,
};

/** Nothing falling. A light-rain hour ahead, at whatever probability is given. */
function forecastLightRain(rainRisk) {
  return {
    ...base,
    summary: "Rain possible soon",
    currentPrecipitation: false,
    upcomingPrecipitation: true,
    rainRisk,
    precipitationProbability: Math.round(rainRisk * 100),
    weatherCode: 4200,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Light rain",
      rainRisk,
      precipitationProbability: Math.round(rainRisk * 100),
      precipitationIntensityInPerHr: 0,
      weatherCode: 4200,
    },
  };
}

/** Nothing falling. Explicit thunderstorm evidence at a LOW probability. */
function forecastThunderstorm(rainRisk = 0.05) {
  return {
    ...base,
    summary: "Cloudy",
    currentPrecipitation: false,
    upcomingPrecipitation: true,
    rainRisk,
    precipitationProbability: Math.round(rainRisk * 100),
    weatherCode: 1001,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Thunderstorm",
      rainRisk,
      precipitationProbability: Math.round(rainRisk * 100),
      precipitationIntensityInPerHr: 0,
      weatherCode: 8000,
    },
  };
}

const activeLightRain = () => ({
  ...base,
  summary: "Light rain",
  currentPrecipitation: true,
  rainRisk: 0.99,
  weatherCode: 4200,
  precipitationIntensityInPerHr: 0.02,
});

const activeHeavyRain = () => ({
  ...base,
  summary: "Heavy rain",
  currentPrecipitation: true,
  rainRisk: 0.5,
  weatherCode: 4201,
  precipitationIntensityInPerHr: 0.4,
});

const activeThunderstorm = () => ({
  ...base,
  summary: "Thunderstorm",
  stormMode: true,
  currentPrecipitation: true,
  rainRisk: 0.9,
  weatherCode: 8000,
  precipitationIntensityInPerHr: 0.3,
});

/** Code 8000 alone: no stormMode flag, no storm word anywhere. */
const activeStormCodeOnly = () => ({
  ...base,
  summary: "",
  stormMode: false,
  currentPrecipitation: true,
  rainRisk: 0.5,
  weatherCode: 8000,
  precipitationIntensityInPerHr: 0.2,
});

function recommend(weather, familyProfile = adultOnlyFamily()) {
  return getNextBestRides({
    parkId: PARK,
    rides: [
      MK.peopleMover({ waitTime: 10 }),
      MK.buzz({ waitTime: 20 }),
      MK.ariel({ waitTime: 15 }),
      MK.bigThunder({ waitTime: 15 }),
    ],
    weather,
    familyProfile,
    locationContext: gpsAtAnchor(LAND, "Space Mountain"),
    timeContext: neutralTimeContext(),
  });
}

const slotted = (result) =>
  [
    result.bestMove,
    result.backup,
    result.worthTheWalk,
    result.planAhead,
    result.waitOnThis,
  ].filter(Boolean);

const adviceText = (weather) =>
  JSON.stringify(getRecoverySuggestions({ parkId: PARK, weather, currentLand: LAND }));

/* ========================================================================== */
/* 1. A 99% light-rain forecast is a Rain Watch                               */
/* ========================================================================== */

describe("99% probability of light rain", () => {
  const weather = forecastLightRain(0.99);

  test("is a Rain Watch and is not a Storm Watch", () => {
    const state = getRecommendationWeatherState(weather);

    expect(state.label).toBe(WEATHER_LABELS.RAIN_WATCH);
    expect(state.forecastRainWatch).toBe(true);
    expect(state.forecastStormWatch).toBe(false);
    expect(state.phase).toBe(WEATHER_PHASE.FORECAST);
    expect(state.severity).toBe(WEATHER_SEVERITY.LIGHT);

    // And the UI says exactly the same thing.
    const mode = getWeatherMode(weather);
    expect(mode.label).toBe(WEATHER_LABELS.RAIN_WATCH);
    expect(mode.label).not.toBe(WEATHER_LABELS.STORM_WATCH);
  });

  test("earns no active-rain scoring and no storm scoring", () => {
    const state = getRecommendationWeatherState(weather);

    expect(state.activeRain).toBe(false);
    expect(state.activeStorm).toBe(false);
    expect(state.activeRainSeverity).toBe(WEATHER_SEVERITY.NONE);
    expect(state.legacyRainActive).toBe(false);

    const cards = slotted(recommend(weather, adultOnlyFamily({ stormTolerance: "indoor_only" })));
    expect(cards.length).toBeGreaterThan(0);

    cards.forEach((ride) => {
      expect(ride.activeRainSeverity).toBe(WEATHER_SEVERITY.NONE);
      expect(ride.localRainRecoveryModifier).toBe(0);
      expect(ride.rainKeepCloseWalkModifier).toBe(0);
      expect(ride.rainKeepCloseActive).toBe(false);
      // Active-rain / storm preference reshaping stays off entirely.
      expect(ride.stormPreferenceModifier).toBe(0);
    });
  });

  test("the advice never says a storm, and never says rain is falling", () => {
    const text = adviceText(weather);

    expect(text).not.toMatch(/thunder|lightning|shelter/i);
    expect(text).not.toMatch(/rain is active right now/i);
    expect(text).not.toMatch(/crossing the park through rain/i);
    // It still prepares the family rather than saying nothing.
    expect(text).toMatch(/forecast|flexible|rain gear/i);
  });
});

/* ========================================================================== */
/* 2. Probability can never promote a forecast to a storm, at any value       */
/* ========================================================================== */

describe("mutation guard — no probability threshold may be restored", () => {
  // 0.70 was the engine's old promotion, 0.75 the advice system's. The sweep
  // runs past both, and past 1.0, so reinstating either constant fails here.
  const RISKS = [0, 0.4, 0.55, 0.69, 0.7, 0.71, 0.72, 0.74, 0.75, 0.76, 0.85, 0.95, 0.99, 1];

  test.each(RISKS)(
    "rainRisk %s with light-rain evidence is a Rain Watch in the engine AND the UI",
    (rainRisk) => {
      const weather = forecastLightRain(rainRisk);

      const state = getRecommendationWeatherState(weather);
      const mode = getWeatherMode(weather);

      expect(state.forecastStormWatch).toBe(false);
      expect(state.label).toBe(WEATHER_LABELS.RAIN_WATCH);
      expect(mode.label).toBe(WEATHER_LABELS.RAIN_WATCH);

      // The two halves of the product agree, value by value.
      expect(mode.label).toBe(state.label);
      expect(mode.severity).toBe(state.severity);
      expect(mode.phase).toBe(state.phase);
    }
  );

  test.each(RISKS)(
    "a window carrying only rainRisk %s and light-rain text is not a stormy window",
    (rainRisk) => {
      expect(
        isStormyForecastWindow({
          summary: "Light rain",
          rainRisk,
          precipitationProbability: Math.round(rainRisk * 100),
          weatherCode: 4200,
        })
      ).toBe(false);
    }
  );

  test("a bare probability with no structured evidence is never a storm", () => {
    [0.7, 0.75, 0.99, 1].forEach((rainRisk) => {
      expect(isStormyForecastWindow({ rainRisk })).toBe(false);
      expect(
        classifyWeather({ ...base, currentPrecipitation: false, rainRisk }).forecastStormWatch
      ).toBe(false);
    });
  });
});

/* ========================================================================== */
/* 3. Engine and UI agree across the whole matrix                             */
/* ========================================================================== */

describe("the engine and the weather-advice system cannot disagree", () => {
  const CASES = [
    ["forecast light rain at 0.72", forecastLightRain(0.72), WEATHER_LABELS.RAIN_WATCH],
    ["forecast light rain at 0.99", forecastLightRain(0.99), WEATHER_LABELS.RAIN_WATCH],
    ["forecast thunderstorm at 0.05", forecastThunderstorm(), WEATHER_LABELS.STORM_WATCH],
    ["active light rain", activeLightRain(), WEATHER_LABELS.LIGHT_RAIN_ACTIVE],
    ["active heavy rain", activeHeavyRain(), WEATHER_LABELS.HEAVY_RAIN_ACTIVE],
    ["active thunderstorm", activeThunderstorm(), WEATHER_LABELS.STORM_ACTIVE],
    ["active storm by weather code alone", activeStormCodeOnly(), WEATHER_LABELS.STORM_ACTIVE],
  ];

  test.each(CASES)("%s is named the same on both sides", (_label, weather, expected) => {
    const state = getRecommendationWeatherState(weather);
    const mode = getWeatherMode(weather);

    expect(state.label).toBe(expected);
    expect(mode.label).toBe(expected);
    expect(mode.phase).toBe(state.phase);
    expect(mode.severity).toBe(state.severity);
  });

  test("a forecast is never given an active name, and active is never a watch", () => {
    CASES.forEach(([, weather]) => {
      const state = getRecommendationWeatherState(weather);

      if (state.phase === WEATHER_PHASE.FORECAST) {
        expect(state.label).toMatch(/Watch$/);
        expect(state.activeRain).toBe(false);
        expect(state.activeStorm).toBe(false);
      }

      if (state.phase === WEATHER_PHASE.ACTIVE) {
        expect(state.label).not.toMatch(/Watch/);
        expect(state.activeRain).toBe(true);
      }
    });
  });
});

/* ========================================================================== */
/* 4. Low probability with real storm evidence is still a storm               */
/* ========================================================================== */

describe("structured evidence, not probability, makes a storm", () => {
  test("5% chance of thunderstorms is a Storm Watch", () => {
    const weather = forecastThunderstorm(0.05);
    const state = getRecommendationWeatherState(weather);

    expect(state.forecastStormWatch).toBe(true);
    expect(state.label).toBe(WEATHER_LABELS.STORM_WATCH);
    expect(state.severity).toBe(WEATHER_SEVERITY.STORM);
    expect(getWeatherMode(weather).label).toBe(WEATHER_LABELS.STORM_WATCH);
  });

  test("a thunderstorm window with no probability field at all is still a Storm Watch", () => {
    const weather = {
      ...base,
      summary: "Cloudy",
      currentPrecipitation: false,
      upcomingPrecipitation: true,
      nextPrecipitationWindow: { summary: "Thunderstorm", weatherCode: 8000 },
    };

    expect(getRecommendationWeatherState(weather).forecastStormWatch).toBe(true);
    expect(getWeatherMode(weather).label).toBe(WEATHER_LABELS.STORM_WATCH);
  });

  test("weather code 8000 is a storm without stormMode or any summary prose", () => {
    const weather = activeStormCodeOnly();
    const state = getRecommendationWeatherState(weather);

    expect(state.activeStorm).toBe(true);
    expect(state.activeRainSeverity).toBe(WEATHER_SEVERITY.STORM);
    expect(state.label).toBe(WEATHER_LABELS.STORM_ACTIVE);
    expect(getWeatherMode(weather).mode).toBe("storm");

    // The safety guidance is the storm set, not the rain set.
    expect(adviceText(weather)).toMatch(/shelter|indoors|lightning|storm/i);
  });
});

/* ========================================================================== */
/* 5 + 6. Active rain is named and advised in proportion                      */
/* ========================================================================== */

describe("active rain is labelled and advised in proportion to what is falling", () => {
  test("active light rain gets a light label and light guidance", () => {
    const weather = activeLightRain();
    const state = getRecommendationWeatherState(weather);

    expect(state.label).toBe(WEATHER_LABELS.LIGHT_RAIN_ACTIVE);
    expect(state.phase).toBe(WEATHER_PHASE.ACTIVE);
    expect(state.activeRainSeverity).toBe(WEATHER_SEVERITY.LIGHT);
    // 99% probability with LIGHT rain falling: probability is not intensity.
    expect(state.severity).not.toBe(WEATHER_SEVERITY.HEAVY);

    const mode = getWeatherMode(weather);
    expect(mode.label).toBe(WEATHER_LABELS.LIGHT_RAIN_ACTIVE);
    expect(mode.message).toMatch(/right now/i);

    const text = adviceText(weather);
    expect(text).toMatch(/light rain right now|sprinkling/i);
    expect(text).not.toMatch(/crossing the park through rain/i);
    expect(text).not.toMatch(/rain-safe picks/i);
  });

  test("active heavy rain gets a heavy label and the stronger guidance", () => {
    const weather = activeHeavyRain();
    const state = getRecommendationWeatherState(weather);

    expect(state.label).toBe(WEATHER_LABELS.HEAVY_RAIN_ACTIVE);
    expect(state.activeRainSeverity).toBe(WEATHER_SEVERITY.HEAVY);
    expect(getWeatherMode(weather).label).toBe(WEATHER_LABELS.HEAVY_RAIN_ACTIVE);

    const text = adviceText(weather);
    expect(text).toMatch(/rain is active right now/i);
    expect(text).toMatch(/rain-safe picks/i);
  });

  test("heavy rain pulls harder toward cover than light rain does", () => {
    const lightCards = slotted(recommend(activeLightRain()));
    const heavyCards = slotted(recommend(activeHeavyRain()));

    const best = (cards) => Math.max(...cards.map((ride) => ride.localRainRecoveryModifier), 0);

    expect(best(heavyCards)).toBeGreaterThan(best(lightCards));
  });
});

/* ========================================================================== */
/* 9. Existing active-storm safety behaviour is untouched                     */
/* ========================================================================== */

describe("active-storm safety behaviour still holds", () => {
  const RAIN_SENSITIVE = new Set([
    "Big Thunder Mountain Railroad",
    "Tomorrowland Transit Authority PeopleMover",
  ]);

  test.each([
    ["a flagged thunderstorm", activeThunderstorm()],
    ["weather code 8000 alone", activeStormCodeOnly()],
  ])("%s keeps exposed attractions off the immediate cards", (_label, weather) => {
    const result = recommend(weather);
    const immediate = [result.bestMove, result.backup].filter(Boolean).map((r) => r.name);

    expect(immediate.length).toBeGreaterThan(0);
    immediate.forEach((name) => expect(RAIN_SENSITIVE.has(name)).toBe(false));
  });

  test("a storm overhead is still Storm Smart Mode, not a rain state", () => {
    [activeThunderstorm(), activeStormCodeOnly()].forEach((weather) => {
      expect(getWeatherMode(weather).mode).toBe("storm");
      expect(getRecommendationWeatherState(weather).activeStorm).toBe(true);
    });
  });
});
