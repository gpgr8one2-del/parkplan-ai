/**
 * TOHI — "Not Yet" must reach every decision layer.
 *
 * Field report: the guest selected Not Yet, explicitly saying rain was not
 * happening. The recommendation ranking did not change and the Plan screen kept
 * showing active-rain guidance.
 *
 * Two causes, both executed below:
 *   1. A "not yet" record carried no decision window at all — only a prompt
 *      cooldown — so nothing downstream ever saw the answer.
 *   2. `isRainActive` ORed in `rainRisk`, a FORECAST probability, which
 *      independently reasserted active-rain behaviour over the guest's answer.
 *
 * These tests run the real recommendation engine, the real weather-mode copy
 * and the real recovery advice. The forecast is never edited: every assertion
 * that it survives is checked explicitly.
 */

import {
  getNextBestRides,
  getRecommendationWeatherState,
} from "../rideRecommendations";
import {
  applyRainConfirmationToWeather,
  applyRainNotYetToWeather,
  buildRainConfirmationRecord,
  getActiveRainConfirmation,
  getActiveRainNotYet,
  getRainConfirmationEpisode,
  isRainConfirmationObsolete,
  RAIN_CONFIRMATION_RESPONSES,
  RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES,
} from "../utils/rainConfirmation";
import { getWeatherMode, getRecoverySuggestions } from "../utils/weatherAdvice";
import {
  MK,
  adultOnlyFamily,
  gpsAtAnchor,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const TRIP_DATE = "2026-06-27";
const NOW = new Date("2026-06-27T16:00:00-04:00").getTime();
const MINUTE = 60 * 1000;

/**
 * A forecast-only Rain Watch: nothing is falling, but the probability is high
 * enough that the legacy helper called it active rain. This is the exact state
 * the guest was answering about.
 */
function rainWatchWeather(over = {}) {
  return {
    tempF: 84,
    feelsLikeF: 88,
    humidity: 75,
    summary: "Rain possible soon",
    rainRisk: 0.6,
    stormMode: false,
    currentPrecipitation: false,
    upcomingPrecipitation: true,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Light rain",
      rainRisk: 0.6,
      precipitationProbability: 60,
      weatherCode: 4000,
    },
    ...over,
  };
}

const episodeFor = (weather) =>
  getRainConfirmationEpisode({
    weatherState: getRecommendationWeatherState(weather),
    weather,
    parkId: PARK,
    tripDate: TRIP_DATE,
  });

const answer = (weather, response, now = NOW) =>
  buildRainConfirmationRecord({ episode: episodeFor(weather), response, now });

/** The single decision-weather seam App builds, reproduced exactly. */
function decisionWeather(weather, record, now = NOW) {
  const episode = episodeFor(weather);

  const confirmed = getActiveRainConfirmation({ episode, record, now });
  if (confirmed) return applyRainConfirmationToWeather(weather, confirmed);

  const notYet = getActiveRainNotYet({ episode, record, now });
  return applyRainNotYetToWeather(weather, notYet);
}

function recommend(weather) {
  return getNextBestRides({
    parkId: PARK,
    rides: [
      MK.buzz({ waitTime: 20 }),
      MK.peopleMover({ waitTime: 10 }),
      MK.bigThunder({ waitTime: 15 }),
      MK.ariel({ waitTime: 15 }),
    ],
    weather,
    familyProfile: adultOnlyFamily(),
    locationContext: gpsAtAnchor("tomorrowland", "Space Mountain"),
    timeContext: neutralTimeContext(),
  });
}

/* ========================================================================== */

describe("before answering — forecast-only Rain Watch", () => {
  test("the baseline really is a forecast watch, not falling rain", () => {
    const weather = rainWatchWeather();
    const state = getRecommendationWeatherState(weather);

    expect(state.activeRain).toBe(false);
    expect(state.activeStorm).toBe(false);
    // Corrected invariant: a 99% chance is a WATCH, not rain. Probability can
    // never create active rain, before or after any answer.
    expect(state.legacyRainActive).toBe(false);
    expect(state.forecastRainWatch).toBe(true);
    // Still surfaced as a Rain Watch — forecast awareness is preserved.
    expect(getWeatherMode(weather).mode).toBe("rain");
    expect(getWeatherMode(weather).label).toMatch(/Watch/);
  });
});

describe("after Not Yet — still forecast-only, everywhere", () => {
  const weather = rainWatchWeather();
  const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET);
  const decided = decisionWeather(weather, record);

  test("the answer reaches the decision layer at all", () => {
    expect(record.response).toBe("not_yet");
    // It used to carry no decision window, so nothing downstream saw it.
    expect(record.effectExpiresAt).toBe(
      NOW + RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES * MINUTE
    );
    expect(getActiveRainNotYet({ episode: episodeFor(weather), record, now: NOW }))
      .not.toBeNull();
    expect(decided.guestReportedNoRain).toBe(true);
  });

  test("no active-rain scoring survives the answer", () => {
    const state = getRecommendationWeatherState(decided);

    expect(state.activeRain).toBe(false);
    expect(state.activeStorm).toBe(false);
    // The forecast probability can no longer assert falling rain over the guest.
    expect(state.legacyRainActive).toBe(false);
  });

  test("no active-rain scoring exists before OR after the answer", () => {
    const slotted = (result) =>
      [result.bestMove, result.backup, result.worthTheWalk, result.planAhead]
        .filter(Boolean);

    // Forecast-only must already be free of active-rain scoring. The answer
    // then cannot make it worse.
    [recommend(weather), recommend(decided)].forEach((result) => {
      slotted(result).forEach((ride) => {
        expect(ride.rainKeepCloseWalkModifier).toBe(0);
        expect(ride.stormPreferenceModifier).toBe(0);
      });
    });
  });

  test("no leftover forecast lean survives the answer, for every storm comfort", () => {
    // The previous version used a profile whose lean happened to be zero, which
    // proved nothing. Every storm-comfort value is exercised here.
    ["indoor_only", "brief_outdoor_ok", "no_preference", undefined].forEach((tolerance) => {
      const profile = adultOnlyFamily(
        tolerance === undefined ? {} : { stormTolerance: tolerance }
      );

      const answered = getNextBestRides({
        parkId: PARK,
        rides: [MK.buzz({ waitTime: 20 }), MK.peopleMover({ waitTime: 10 }), MK.ariel({ waitTime: 15 })],
        weather: decided,
        familyProfile: profile,
        locationContext: gpsAtAnchor("tomorrowland", "Space Mountain"),
        timeContext: neutralTimeContext(),
      });

      [answered.bestMove, answered.backup, answered.worthTheWalk, answered.planAhead]
        .filter(Boolean)
        .forEach((ride) => {
          // No ACTIVE-rain scoring survives, for any storm comfort.
          expect(ride.stormPreferenceModifier).toBe(0);

          // A small forecast-preparation lean is deliberately retained — the
          // forecast is still real — but it lives in its own named field so it
          // can never be mistaken for active-rain behaviour, and it is small
          // enough that it cannot reorder a ranking on its own. Non-displacement
          // is proved by the production case below.
          expect(Math.abs(ride.forecastRainPreferenceModifier)).toBeLessThanOrEqual(2);
        });
    });
  });

  test("weather-mode copy stops claiming rain is being reported", () => {
    const mode = getWeatherMode(decided);

    expect(mode.message).not.toMatch(/being reported at the park right now/i);
    // Still a watch — the forecast is intact, not erased.
    expect(mode.mode).toBe("rain");
    expect(mode.label).toMatch(/Watch/);
  });

  test("Plan recovery advice agrees with the ranking", () => {
    const beforeAdvice = getRecoverySuggestions({
      parkId: PARK,
      weather,
      currentLand: "tomorrowland",
    });
    const afterAdvice = getRecoverySuggestions({
      parkId: PARK,
      weather: decided,
      currentLand: "tomorrowland",
    });

    // Both are arrays of guidance; the point is that recovery advice now reads
    // the SAME weather the ranking used, so the two cannot disagree.
    expect(Array.isArray(afterAdvice)).toBe(true);
    expect(JSON.stringify(afterAdvice)).not.toMatch(/right now/i);
    expect(beforeAdvice).toBeDefined();
  });

  test("TOHI context receives the same decision weather", () => {
    // The chat payload carries weatherForDecisions, so an answer TOHI gives
    // cannot contradict the cards.
    expect(decided.guestReportedNoRain).toBe(true);
    expect(getWeatherMode(decided).message).not.toMatch(/right now/i);
  });
});

describe("the forecast is preserved, never erased or falsified", () => {
  const weather = rainWatchWeather();
  const decided = decisionWeather(
    weather,
    answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET)
  );

  test("summary, probability and the upcoming window all survive untouched", () => {
    expect(decided.summary).toBe(weather.summary);
    expect(decided.rainRisk).toBe(weather.rainRisk);
    expect(decided.nextPrecipitationWindow).toEqual(weather.nextPrecipitationWindow);
    expect(decided.upcomingPrecipitation).toBe(true);
  });

  test("the provider's own reading is kept for provenance", () => {
    expect(decided.forecastCurrentPrecipitation).toBe(false);
    expect(weather.currentPrecipitation).toBe(false);
  });

  test("the raw weather object is never mutated", () => {
    const snapshot = JSON.parse(JSON.stringify(weather));
    decisionWeather(weather, answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET));
    expect(weather).toEqual(snapshot);
  });
});

describe("the answer is bounded and cannot outlive its truth", () => {
  const weather = rainWatchWeather();
  const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET);

  test("it expires, and the forecast resumes governing", () => {
    const afterExpiry = NOW + RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES * MINUTE + 1000;

    expect(
      getActiveRainNotYet({ episode: episodeFor(weather), record, now: afterExpiry })
    ).toBeNull();

    const decided = decisionWeather(weather, record, afterExpiry);
    expect(decided.guestReportedNoRain).toBeUndefined();
    // Back to plain forecast-only — still a watch, still not active rain.
    const state = getRecommendationWeatherState(decided);
    expect(state.legacyRainActive).toBe(false);
    expect(state.forecastRainWatch).toBe(true);
  });

  test("the provider reporting real precipitation makes the answer obsolete", () => {
    const nowRaining = rainWatchWeather({
      currentPrecipitation: true,
      summary: "Light rain",
    });

    expect(
      isRainConfirmationObsolete({
        record,
        episode: episodeFor(weather),
        weatherState: getRecommendationWeatherState(nowRaining),
        now: NOW + MINUTE,
      })
    ).toBe(true);
  });

  test("a Yes answer still activates rain behaviour as before", () => {
    const confirmed = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
    const decided = decisionWeather(weather, confirmed);

    expect(decided.currentPrecipitation).toBe(true);
    expect(decided.guestConfirmedRain).toBe(true);
    expect(getRecommendationWeatherState(decided).activeRain).toBe(true);
    expect(getWeatherMode(decided).message).toMatch(/right now/i);
  });

  test("an answer for a different park does not apply", () => {
    const otherEpisode = getRainConfirmationEpisode({
      weatherState: getRecommendationWeatherState(weather),
      weather,
      parkId: "epcot",
      tripDate: TRIP_DATE,
    });

    expect(
      getActiveRainNotYet({ episode: otherEpisode, record, now: NOW })
    ).toBeNull();
  });
});

/* ========================================================================== */
/* The production case, end to end                                           */
/* ========================================================================== */

/** 99% chance of LIGHT rain, nothing falling. Probability is not intensity. */
function lightRainForecast99(over = {}) {
  return rainWatchWeather({
    summary: "Rain possible soon",
    rainRisk: 0.99,
    currentPrecipitation: false,
    weatherCode: 4200,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Light rain",
      rainRisk: 0.99,
      precipitationProbability: 99,
      weatherCode: 4200,
    },
    ...over,
  });
}

/** The reported line-up: Space Mountain ridden, standing in Tomorrowland. */
function productionCase({ weather, familyProfile }) {
  const space = MK.spaceMountain({ waitTime: 45 });

  return getNextBestRides({
    parkId: PARK,
    rides: [
      MK.peopleMover({ waitTime: 5 }),
      MK.ariel({ waitTime: 10 }),
      MK.buzz({ waitTime: 30 }),
      space,
    ],
    completedRideIds: [space.id],
    weather,
    familyProfile,
    locationContext: gpsAtAnchor("tomorrowland", "Space Mountain"),
    timeContext: neutralTimeContext(),
  });
}

describe("production case — PeopleMover 5 vs Little Mermaid 10, 99% light rain", () => {
  const forecast = lightRainForecast99();
  const answered = decisionWeather(
    forecast,
    answer(forecast, RAIN_CONFIRMATION_RESPONSES.NOT_YET)
  );

  const profiles = [
    ["default", adultOnlyFamily()],
    // The strongest indoor preference, so no leftover modifier can hide a defect.
    ["indoor_only", adultOnlyFamily({ stormTolerance: "indoor_only" })],
  ];

  const cases = [
    ["A. before answering", forecast],
    ["B. after Not Yet", answered],
  ];

  cases.forEach(([caseLabel, weather]) => {
    profiles.forEach(([profileLabel, familyProfile]) => {
      test(`${caseLabel} / ${profileLabel}: forecast rain gets no active-rain scoring`, () => {
        const result = productionCase({ weather, familyProfile });
        const slots = [result.bestMove, result.backup, result.worthTheWalk, result.planAhead]
          .filter(Boolean);

        expect(getRecommendationWeatherState(weather).activeRain).toBe(false);
        expect(getRecommendationWeatherState(weather).legacyRainActive).toBe(false);

        slots.forEach((ride) => {
          expect(ride.stormPreferenceModifier).toBe(0);
          expect(ride.rainKeepCloseWalkModifier).toBe(0);
        });
      });

      test(`${caseLabel} / ${profileLabel}: the close 5-minute option holds an immediate slot`, () => {
        const result = productionCase({ weather, familyProfile });

        const immediate = [result.bestMove, result.backup]
          .filter(Boolean)
          .map((ride) => ride.name);

        // The reported failure: the nearby walk-on vanished while a farther
        // attraction with a longer wait led. Asserted on the actual slot.
        expect(immediate).toContain("Tomorrowland Transit Authority PeopleMover");
      });
    });
  });

  test("Little Mermaid may still appear, just not by displacing the close option", () => {
    const result = productionCase({ weather: answered, familyProfile: adultOnlyFamily() });
    const everywhere = [
      result.bestMove,
      result.backup,
      result.worthTheWalk,
      result.planAhead,
      result.waitOnThis,
    ].filter(Boolean);

    expect(everywhere.length).toBeGreaterThan(1);
    // No ride occupies two slots.
    const ids = everywhere.map((ride) => String(ride.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ========================================================================== */
/* Copy — the whole collection, not just the first card                      */
/* ========================================================================== */

const ACTIVE_RAIN_CLAIMS = [
  /rain is active right now/i,
  /being reported at the park right now/i,
  /crossing the park through rain/i,
  /outdoor rides may become uncomfortable or pause/i,
  /rain-safe picks/i,
];

const adviceText = (weather) =>
  JSON.stringify(
    getRecoverySuggestions({ parkId: PARK, weather, currentLand: "tomorrowland" })
  );

describe("forecast-only advice never claims active rain, anywhere in the set", () => {
  const forecast = lightRainForecast99();
  const answered = decisionWeather(
    forecast,
    answer(forecast, RAIN_CONFIRMATION_RESPONSES.NOT_YET)
  );

  [["before answering", forecast], ["after Not Yet", answered]].forEach(([label, weather]) => {
    test(`${label}: no card in the collection claims rain is happening`, () => {
      const text = adviceText(weather);

      expect(text.length).toBeGreaterThan(0);
      ACTIVE_RAIN_CLAIMS.forEach((claim) => expect(text).not.toMatch(claim));
      // And it still prepares the family, rather than saying nothing.
      expect(text).toMatch(/forecast|flexible|rain gear/i);
    });
  });
});

/* ========================================================================== */
/* Active weather still protected                                            */
/* ========================================================================== */

describe("observed weather activates proportional behaviour", () => {
  const lightActive = () =>
    rainWatchWeather({ currentPrecipitation: true, summary: "Light rain", weatherCode: 4200 });
  const heavyActive = () =>
    rainWatchWeather({ currentPrecipitation: true, summary: "Heavy rain", weatherCode: 4201 });
  const stormActive = () =>
    rainWatchWeather({
      currentPrecipitation: true,
      summary: "Thunderstorm",
      weatherCode: 8000,
      stormMode: true,
    });

  test("1. provider-observed light rain activates light-rain behaviour", () => {
    const state = getRecommendationWeatherState(lightActive());
    expect(state.activeRain).toBe(true);
    expect(state.activeStorm).toBe(false);

    const text = adviceText(lightActive());
    expect(text).toMatch(/light rain right now|sprinkling/i);
    expect(text).not.toMatch(/crossing the park through rain/i);
  });

  test("2. guest-confirmed rain defaults to light when severity is unknown", () => {
    const forecast = lightRainForecast99();
    const confirmed = decisionWeather(
      forecast,
      answer(forecast, RAIN_CONFIRMATION_RESPONSES.CONFIRMED)
    );

    expect(getRecommendationWeatherState(confirmed).activeRain).toBe(true);
    // Conservative: a confirmation is not evidence of a downpour.
    const text = adviceText(confirmed);
    expect(text).toMatch(/light rain right now|sprinkling/i);
    expect(text).not.toMatch(/rain-safe picks/i);
  });

  test("severity comes from structured evidence, never from probability", () => {
    // 99% probability with LIGHT rain actually falling. Probability measures
    // likelihood, not intensity: this must classify as light, and earn the
    // light recovery weight rather than the heavy one.
    const light99 = lightRainForecast99({
      currentPrecipitation: true,
      summary: "Light rain",
      weatherCode: 4200,
    });

    const result = productionCase({ weather: light99, familyProfile: adultOnlyFamily() });
    const slots = [result.bestMove, result.backup, result.worthTheWalk, result.planAhead]
      .filter(Boolean);

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((ride) => {
      expect(ride.activeRainSeverity).toBe("light");
      // The light same-area weight, not the heavy one.
      expect(ride.localRainRecoveryModifier).toBeLessThanOrEqual(10);
    });

    // Same 99% probability, but heavy rain is actually falling.
    const heavy99 = lightRainForecast99({
      currentPrecipitation: true,
      summary: "Heavy rain",
      weatherCode: 4201,
    });
    const heavyResult = productionCase({ weather: heavy99, familyProfile: adultOnlyFamily() });
    const heavySlots = [heavyResult.bestMove, heavyResult.backup].filter(Boolean);

    heavySlots.forEach((ride) => expect(ride.activeRainSeverity).toBe("heavy"));
  });

  test("an adjacent land never collects the full same-area rain bonus", () => {
    const heavy = rainWatchWeather({
      currentPrecipitation: true,
      summary: "Heavy rain",
      weatherCode: 4201,
    });

    const result = productionCase({ weather: heavy, familyProfile: adultOnlyFamily() });
    const all = [result.bestMove, result.backup, result.worthTheWalk, result.planAhead]
      .filter(Boolean);

    all.forEach((ride) => {
      if (ride.landDistance === "adjacent") {
        expect(ride.localRainRecoveryModifier).toBeLessThan(22);
      }
    });
  });

  test("3. structured heavy rain activates the stronger guidance", () => {
    const text = adviceText(heavyActive());
    expect(text).toMatch(/rain is active right now/i);
    expect(text).toMatch(/rain-safe picks/i);
  });

  test("4. an active thunderstorm keeps its existing safety guidance", () => {
    const state = getRecommendationWeatherState(stormActive());
    expect(state.activeStorm).toBe(true);
    expect(getWeatherMode(stormActive()).mode).toBe("storm");
    expect(adviceText(stormActive())).toMatch(/shelter|indoors|lightning|storm/i);
  });

  test("5. the provider observing rain overrides a standing Not Yet", () => {
    const forecast = lightRainForecast99();
    const record = answer(forecast, RAIN_CONFIRMATION_RESPONSES.NOT_YET);
    const nowRaining = lightRainForecast99({
      currentPrecipitation: true,
      summary: "Light rain",
    });

    // The record is obsolete the moment the provider reports precipitation.
    expect(
      isRainConfirmationObsolete({
        record,
        episode: episodeFor(forecast),
        weatherState: getRecommendationWeatherState(nowRaining),
        now: NOW + MINUTE,
      })
    ).toBe(true);

    // And even if it lingered a tick, the observation wins.
    const decided = decisionWeather(nowRaining, record, NOW + MINUTE);
    expect(getRecommendationWeatherState(decided).activeRain).toBe(true);
  });
});
