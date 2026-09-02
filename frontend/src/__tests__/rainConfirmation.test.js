/**
 * Rain confirmation and bounded session learning.
 *
 * TOHI's forecast can say rain is coming without knowing whether it has started
 * over the guest's head. On a forecast-only Rain Watch or Storm Watch, TOHI may
 * ask once — and remember the answer for that weather episode only.
 *
 * These tests pin the whole contract: when the question is allowed, what each
 * answer does to recommendations, when TOHI is required to stop asking, when an
 * answer must expire or be discarded, that the raw forecast is never edited,
 * and that the stored record carries nothing personal.
 *
 * Deterministic throughout: fixed clock, fixed waits, fixed manual land, no
 * network and no reliance on real weather.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getNextBestRides,
  getRecommendationWeatherState,
} from "../rideRecommendations";
import {
  applyRainConfirmationToWeather,
  buildRainConfirmationRecord,
  canAskRainConfirmation,
  getActiveRainConfirmation,
  getRainConfirmationEpisode,
  isRainConfirmationObsolete,
  normalizeRainConfirmationRecord,
  shouldAskRainConfirmation,
  RAIN_CONFIRMATION_RESPONSES,
  RAIN_CONFIRMATION_TTL_MINUTES,
  RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES,
  RAIN_CONFIRMATION_RECORD_MAX_AGE_MINUTES,
} from "../utils/rainConfirmation";
import { RainCheckPrompt } from "../components/RainCheckPrompt";
import {
  normalizeTripPlan,
  updateTripPlanFreshnessContext,
} from "../utils/tripPlan";
import {
  MK,
  adultOnlyFamily,
  locationAtLand,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const TRIP_DATE = "2026-06-27";
const NOW = new Date("2026-06-27T16:00:00-04:00").getTime();
const MINUTE = 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Weather fixtures — all forecast shapes the engine already understands       */
/* -------------------------------------------------------------------------- */

function clearWeather(over = {}) {
  return {
    tempF: 82,
    feelsLikeF: 86,
    humidity: 50,
    summary: "Partly cloudy",
    rainRisk: 0.1,
    stormMode: false,
    currentPrecipitation: false,
    upcomingPrecipitation: false,
    nextPrecipitationWindow: null,
    ...over,
  };
}

/**
 * Forecast-only: nothing falling now, a light rain hour ahead.
 *
 * The summary is the PRODUCTION string. backend/services/weatherService.js
 * emits "Rain possible soon" / "Rain possible nearby" specifically when the
 * provider reports no measured precipitation — so these strings contain the
 * word "rain" during the exact state that is only a forecast watch.
 * `currentPrecipitation: false` is the authoritative reading, and it is what
 * must decide this, not the display text.
 */
function rainWatchWeather(over = {}) {
  return clearWeather({
    summary: "Rain possible soon",
    rainRisk: 0.4,
    upcomingPrecipitation: true,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Light rain",
      rainRisk: 0.5,
      precipitationProbability: 55,
      weatherCode: 4000,
    },
    ...over,
  });
}

/**
 * Forecast-only: nothing falling now, a thunderstorm hour ahead.
 *
 * Also the production shape — buildTomorrowForecastDisplaySummary promotes a
 * stormy window's own summary into the display string while precipitation is
 * still unmeasured.
 */
function stormWatchWeather(over = {}) {
  return clearWeather({
    summary: "Thunderstorm",
    rainRisk: 0.4,
    upcomingPrecipitation: true,
    nextPrecipitationWindow: {
      time: "2026-06-27T18:00:00-04:00",
      summary: "Thunderstorm",
      rainRisk: 0.85,
      precipitationProbability: 80,
      weatherCode: 8000,
    },
    ...over,
  });
}

/** The provider itself reports rain falling now. */
function activeRainWeather(over = {}) {
  return clearWeather({
    summary: "Light rain",
    rainRisk: 0.8,
    currentPrecipitation: true,
    ...over,
  });
}

function activeStormWeather(over = {}) {
  return clearWeather({
    summary: "Thunderstorms",
    rainRisk: 0.95,
    stormMode: true,
    currentPrecipitation: true,
    ...over,
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function episodeFor(weather, over = {}) {
  return getRainConfirmationEpisode({
    weatherState: getRecommendationWeatherState(weather),
    weather,
    parkId: PARK,
    tripDate: TRIP_DATE,
    ...over,
  });
}

function answer(weather, response, now = NOW) {
  return buildRainConfirmationRecord({
    episode: episodeFor(weather),
    response,
    now,
  });
}

function recommend(weather, over = {}) {
  return getNextBestRides({
    parkId: PARK,
    rides: [
      MK.bigThunder({ waitTime: 20 }),
      MK.tianas({ waitTime: 25 }),
      MK.pirates({ waitTime: 20 }),
      MK.jungle({ waitTime: 25 }),
      MK.haunted({ waitTime: 25 }),
      MK.philharmagic({ waitTime: 15 }),
      MK.smallWorld({ waitTime: 15 }),
      MK.pooh({ waitTime: 20 }),
      MK.peterPan({ waitTime: 35 }),
      MK.spaceMountain({ waitTime: 40 }),
    ],
    weather,
    locationContext: locationAtLand("liberty_square"),
    familyProfile: adultOnlyFamily(),
    timeContext: neutralTimeContext(),
    tripPlan: { mustDoExperiences: [] },
    ...over,
  });
}

const RAIN_SENSITIVE = new Set([
  "Big Thunder Mountain Railroad",
  "Tiana's Bayou Adventure",
  "Jungle Cruise",
]);

function goNowNames(result) {
  return [result.bestMove, result.backup, result.worthTheWalk]
    .filter(Boolean)
    .map((ride) => ride.name);
}

/* -------------------------------------------------------------------------- */
/* 1–4. When TOHI may ask                                                     */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — when the question is allowed", () => {
  test("forecast-only Rain Watch triggers one prompt", () => {
    const weather = rainWatchWeather();
    expect(getRecommendationWeatherState(weather).label).toBe("Rain Watch");

    const episode = episodeFor(weather);
    expect(episode).toBeTruthy();
    expect(episode.watchKind).toBe("rain");

    expect(
      shouldAskRainConfirmation({ episode, record: null, now: NOW })
    ).toBe(true);

    // Answering ends the question for this episode.
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
    expect(shouldAskRainConfirmation({ episode, record, now: NOW })).toBe(false);
  });

  test("forecast-only Storm Watch triggers one prompt", () => {
    const weather = stormWatchWeather();
    expect(getRecommendationWeatherState(weather).label).toBe("Storm Watch");

    const episode = episodeFor(weather);
    expect(episode).toBeTruthy();
    expect(episode.watchKind).toBe("storm");

    expect(
      shouldAskRainConfirmation({ episode, record: null, now: NOW })
    ).toBe(true);
  });

  test("clear weather never prompts", () => {
    const weather = clearWeather();
    expect(getRecommendationWeatherState(weather).label).toBe("Normal");
    expect(episodeFor(weather)).toBeNull();
    expect(
      shouldAskRainConfirmation({ episode: null, record: null, now: NOW })
    ).toBe(false);
  });

  test("already-active rain or storm never prompts", () => {
    [activeRainWeather(), activeStormWeather()].forEach((weather) => {
      const state = getRecommendationWeatherState(weather);
      expect(state.activeRain || state.activeStorm).toBe(true);
      expect(episodeFor(weather)).toBeNull();
    });
  });

  test("no prompt without an active park, or while the caller says not to ask", () => {
    const weather = rainWatchWeather();

    expect(episodeFor(weather, { parkId: "" })).toBeNull();

    // canAsk carries onboarding / incomplete-profile / no-plan gating.
    expect(
      shouldAskRainConfirmation({
        episode: episodeFor(weather),
        record: null,
        now: NOW,
        canAsk: false,
      })
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Production provider shapes                                                 */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — real provider-shaped forecasts", () => {
  // backend/services/weatherService.js emits these two strings ONLY when
  // precipitation is unmeasured. They contain the word "rain", so a
  // summary-text check reports active rain during the exact state that is only
  // a forecast watch — and an episode is never created, so the prompt that
  // exists for this state can never appear.
  const PRODUCTION_SUMMARIES = ["Rain possible soon", "Rain possible nearby"];

  PRODUCTION_SUMMARIES.forEach((summary) => {
    test(`"${summary}" with unmeasured precipitation is a Rain Watch, not active rain`, () => {
      const weather = rainWatchWeather({ summary });

      const state = getRecommendationWeatherState(weather);
      expect(state.activeRain).toBe(false);
      expect(state.activeStorm).toBe(false);
      expect(state.forecastRainWatch).toBe(true);
      expect(state.label).toBe("Rain Watch");
    });

    test(`"${summary}" produces an episode and prompts`, () => {
      const weather = rainWatchWeather({ summary });
      const episode = episodeFor(weather);

      expect(episode).toBeTruthy();
      expect(episode.watchKind).toBe("rain");
      expect(
        shouldAskRainConfirmation({ episode, record: null, now: NOW })
      ).toBe(true);
    });
  });

  test("the authoritative reading wins over the display text in both directions", () => {
    // Rain words, nothing measured -> not raining.
    expect(
      getRecommendationWeatherState(
        clearWeather({ summary: "Rain possible soon", currentPrecipitation: false })
      ).activeRain
    ).toBe(false);

    // Dry-sounding words, precipitation measured -> raining.
    expect(
      getRecommendationWeatherState(
        clearWeather({ summary: "Partly cloudy", currentPrecipitation: true })
      ).activeRain
    ).toBe(true);
  });

  test("summary text still decides when the field is absent or unknown", () => {
    const legacy = clearWeather({ summary: "Light rain" });
    delete legacy.currentPrecipitation;

    expect(getRecommendationWeatherState(legacy).activeRain).toBe(true);

    const legacyDry = clearWeather({ summary: "Partly cloudy" });
    delete legacyDry.currentPrecipitation;

    expect(getRecommendationWeatherState(legacyDry).activeRain).toBe(false);
  });

  test("a forecast watch is still derived from the precipitation window", () => {
    // No window, nothing falling -> nothing to ask about, whatever the text.
    const noWindow = clearWeather({ summary: "Rain possible soon" });
    expect(getRecommendationWeatherState(noWindow).forecastRainWatch).toBe(false);
    expect(episodeFor(noWindow)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* 5–7. What each answer does                                                 */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — the three answers", () => {
  test('"Yes" activates a bounded confirmed-rain override and changes recommendations', () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    const confirmation = getActiveRainConfirmation({
      episode: episodeFor(weather),
      record,
      now: NOW,
    });
    expect(confirmation).toBeTruthy();

    const confirmed = applyRainConfirmationToWeather(weather, confirmation);

    // The interpreted state flips to active rain using existing weather logic.
    const state = getRecommendationWeatherState(confirmed);
    expect(state.activeRain).toBe(true);
    expect(state.forecastRainWatch).toBe(false);
    // DELIBERATELY CHANGED from "Rain Active". The active states now name what
    // is happening — "Light Rain" / "Heavy Rain" — so a watch is never used for
    // falling rain and a sprinkle is never dressed up as a downpour. A guest
    // confirmation carries no intensity evidence, so light is the honest read.
    expect(state.label).toBe("Light Rain");
    expect(state.activeRainSeverity).toBe("light");

    // And the recommendations follow: rain-sensitive outdoor picks give way.
    const before = recommend(weather);
    const after = recommend(confirmed);

    expect(goNowNames(before).some((name) => RAIN_SENSITIVE.has(name))).toBe(true);
    expect(goNowNames(after).every((name) => !RAIN_SENSITIVE.has(name))).toBe(true);
    expect(after.bestMove).toBeTruthy();
  });

  test('"Yes" is bounded — it carries an expiry from the moment it was given', () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    expect(record.effectExpiresAt).toBe(
      NOW + RAIN_CONFIRMATION_TTL_MINUTES * MINUTE
    );
    // Settled for this episode: no cooldown means never ask again.
    expect(record.promptCooldownUntil).toBeNull();
  });

  test('"Not yet" keeps Watch mode and does not activate Rain Mode', () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET);

    const confirmation = getActiveRainConfirmation({
      episode: episodeFor(weather),
      record,
      now: NOW,
    });
    expect(confirmation).toBeNull();

    const applied = applyRainConfirmationToWeather(weather, confirmation);
    expect(applied).toBe(weather);

    const state = getRecommendationWeatherState(applied);
    expect(state.forecastRainWatch).toBe(true);
    expect(state.activeRain).toBe(false);
    expect(state.label).toBe("Rain Watch");
  });

  test('"Dismiss" changes no recommendation behavior', () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.DISMISSED);

    const confirmation = getActiveRainConfirmation({
      episode: episodeFor(weather),
      record,
      now: NOW,
    });
    expect(confirmation).toBeNull();

    const baseline = recommend(weather);
    const dismissed = recommend(
      applyRainConfirmationToWeather(weather, confirmation)
    );

    expect(goNowNames(dismissed)).toEqual(goNowNames(baseline));
    expect(dismissed.bestMove?.recommendationScore).toBe(
      baseline.bestMove?.recommendationScore
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 8–9. Asking again                                                          */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — cooldown and new episodes", () => {
  test("cooldown prevents repeated prompting after every answer", () => {
    const weather = rainWatchWeather();
    const episode = episodeFor(weather);

    Object.values(RAIN_CONFIRMATION_RESPONSES).forEach((response) => {
      const record = answer(weather, response);
      expect(shouldAskRainConfirmation({ episode, record, now: NOW })).toBe(false);
      expect(
        shouldAskRainConfirmation({ episode, record, now: NOW + 5 * MINUTE })
      ).toBe(false);
    });
  });

  test('"Not yet" may be revisited once its cooldown passes, a confirmation or dismissal may not', () => {
    const weather = rainWatchWeather();
    const episode = episodeFor(weather);
    const afterCooldown =
      NOW + RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES * MINUTE + MINUTE;

    expect(
      shouldAskRainConfirmation({
        episode,
        record: answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET),
        now: afterCooldown,
      })
    ).toBe(true);

    [
      RAIN_CONFIRMATION_RESPONSES.CONFIRMED,
      RAIN_CONFIRMATION_RESPONSES.DISMISSED,
    ].forEach((response) => {
      expect(
        shouldAskRainConfirmation({
          episode,
          record: answer(weather, response),
          now: afterCooldown,
        })
      ).toBe(false);
    });
  });

  test("a materially new weather episode may prompt again", () => {
    const firstWeather = rainWatchWeather();
    const record = answer(firstWeather, RAIN_CONFIRMATION_RESPONSES.DISMISSED);

    // A later window, and a watch that escalates from rain to storm, are both
    // new episodes.
    const laterWindow = rainWatchWeather({
      nextPrecipitationWindow: {
        ...rainWatchWeather().nextPrecipitationWindow,
        time: "2026-06-27T21:00:00-04:00",
      },
    });
    const escalated = stormWatchWeather();

    [laterWindow, escalated].forEach((weather) => {
      const episode = episodeFor(weather);
      expect(episode.episodeId).not.toBe(record.episodeId);
      expect(shouldAskRainConfirmation({ episode, record, now: NOW })).toBe(true);
    });
  });

  test("a routine refresh that nudges the window a few minutes is the same episode", () => {
    const weather = rainWatchWeather();
    const nudged = rainWatchWeather({
      nextPrecipitationWindow: {
        ...rainWatchWeather().nextPrecipitationWindow,
        time: "2026-06-27T18:12:00-04:00",
        precipitationProbability: 58,
      },
    });

    expect(episodeFor(nudged).episodeId).toBe(episodeFor(weather).episodeId);

    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.DISMISSED);
    expect(
      shouldAskRainConfirmation({ episode: episodeFor(nudged), record, now: NOW })
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 10–12. Expiry and clearing                                                 */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — expiry and stale state", () => {
  test("confirmation expires automatically", () => {
    const weather = rainWatchWeather();
    const episode = episodeFor(weather);
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    const justBefore = record.effectExpiresAt - MINUTE;
    const justAfter = record.effectExpiresAt + MINUTE;

    expect(getActiveRainConfirmation({ episode, record, now: justBefore })).toBeTruthy();
    expect(getActiveRainConfirmation({ episode, record, now: justAfter })).toBeNull();

    // And once expired, TOHI is no longer sitting in Rain Mode.
    const stillConfirmed = applyRainConfirmationToWeather(
      weather,
      getActiveRainConfirmation({ episode, record, now: justAfter })
    );
    expect(getRecommendationWeatherState(stillConfirmed).activeRain).toBe(false);

    // The effect is over, but the record itself is NOT obsolete — the episode
    // is still live and TOHI must remember it already asked.
    expect(
      isRainConfirmationObsolete({
        record,
        episode,
        weatherState: getRecommendationWeatherState(weather),
        now: justAfter,
      })
    ).toBe(false);
    expect(
      shouldAskRainConfirmation({ episode, record, now: justAfter })
    ).toBe(false);

    // The absolute backstop still retires it eventually.
    const pastBackstop =
      NOW + RAIN_CONFIRMATION_RECORD_MAX_AGE_MINUTES * MINUTE + MINUTE;
    expect(
      isRainConfirmationObsolete({
        record,
        episode,
        weatherState: getRecommendationWeatherState(weather),
        now: pastBackstop,
      })
    ).toBe(true);
  });

  test("official active precipitation overrides a prior \"Not yet\"", () => {
    const watch = rainWatchWeather();
    const notYet = answer(watch, RAIN_CONFIRMATION_RESPONSES.NOT_YET);

    // The provider now reports rain itself.
    const official = activeRainWeather();
    const officialState = getRecommendationWeatherState(official);

    expect(officialState.activeRain).toBe(true);

    // The earlier answer cannot hold Rain Mode off, and is discarded.
    expect(
      isRainConfirmationObsolete({
        record: notYet,
        episode: episodeFor(official),
        weatherState: officialState,
        now: NOW,
      })
    ).toBe(true);

    expect(goNowNames(recommend(official)).every((n) => !RAIN_SENSITIVE.has(n))).toBe(
      true
    );
  });

  test("park and trip-date changes clear stale confirmation", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
    const weatherState = getRecommendationWeatherState(weather);

    const otherPark = getRainConfirmationEpisode({
      weatherState,
      weather,
      parkId: "epcot",
      tripDate: TRIP_DATE,
    });
    const otherDate = getRainConfirmationEpisode({
      weatherState,
      weather,
      parkId: PARK,
      tripDate: "2026-06-28",
    });

    [otherPark, otherDate].forEach((episode) => {
      expect(getActiveRainConfirmation({ episode, record, now: NOW })).toBeNull();
      expect(
        isRainConfirmationObsolete({ record, episode, weatherState, now: NOW })
      ).toBe(true);
    });
  });

  test("weather returning to clear discards the record", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    expect(
      isRainConfirmationObsolete({
        record,
        episode: episodeFor(clearWeather()),
        weatherState: getRecommendationWeatherState(clearWeather()),
        now: NOW,
      })
    ).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* App lifecycle order — cleanup must not erase answer memory                 */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — App lifecycle order", () => {
  /**
   * Reproduces what App.jsx actually does on every 30-second tick: run the
   * obsolescence cleanup FIRST, drop the record if it says so, then decide
   * whether to prompt with whatever survived.
   *
   * The original bug lived entirely in this ordering. Cleanup deleted any
   * record whose single expiry had passed, and a deleted record is an
   * unanswered one — so a dismissal came back after 30 minutes and a
   * confirmation re-asked after 90, inside the same episode.
   */
  function tick({ weather, record, now, canAsk = true }) {
    const weatherState = getRecommendationWeatherState(weather);
    const episode = episodeFor(weather);

    const obsolete = isRainConfirmationObsolete({
      record,
      episode,
      weatherState,
      now,
    });

    const survivingRecord = obsolete ? null : record;

    return {
      obsolete,
      survivingRecord,
      asks: shouldAskRainConfirmation({
        episode,
        record: survivingRecord,
        now,
        canAsk,
      }),
      confirmation: getActiveRainConfirmation({
        episode,
        record: survivingRecord,
        now,
      }),
    };
  }

  test("Dismiss stays remembered well past the old 30-minute expiry", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.DISMISSED);

    [31, 45, 90, 200].forEach((minutes) => {
      const result = tick({ weather, record, now: NOW + minutes * MINUTE });

      expect(result.obsolete).toBe(false);
      expect(result.survivingRecord).toBe(record);
      expect(result.asks).toBe(false);
    });
  });

  test("Confirmed stops steering recommendations at 90 minutes but stays remembered", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    const during = tick({ weather, record, now: NOW + 60 * MINUTE });
    expect(during.confirmation).toBeTruthy();
    expect(during.asks).toBe(false);

    [91, 120, 240].forEach((minutes) => {
      const after = tick({ weather, record, now: NOW + minutes * MINUTE });

      // Effect over...
      expect(after.confirmation).toBeNull();
      // ...but the episode is still answered, and the record survives cleanup.
      expect(after.obsolete).toBe(false);
      expect(after.asks).toBe(false);
    });
  });

  test("Not yet becomes eligible again after its cooldown", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.NOT_YET);

    expect(tick({ weather, record, now: NOW + 20 * MINUTE }).asks).toBe(false);
    expect(tick({ weather, record, now: NOW + 31 * MINUTE }).asks).toBe(true);

    // And it never steers recommendations at any point.
    [10, 31, 120].forEach((minutes) => {
      expect(tick({ weather, record, now: NOW + minutes * MINUTE }).confirmation).toBeNull();
    });
  });

  test("a different park, date, window or clear sky still clears the record", () => {
    const weather = rainWatchWeather();
    const record = answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
    const soon = NOW + 10 * MINUTE;

    // Clear weather.
    expect(tick({ weather: clearWeather(), record, now: soon }).obsolete).toBe(true);

    // A materially later window.
    const laterWindow = rainWatchWeather({
      nextPrecipitationWindow: {
        ...rainWatchWeather().nextPrecipitationWindow,
        time: "2026-06-27T22:00:00-04:00",
      },
    });
    const moved = tick({ weather: laterWindow, record, now: soon });
    expect(moved.obsolete).toBe(true);
    expect(moved.asks).toBe(true);

    // Official precipitation takes over.
    expect(tick({ weather: activeRainWeather(), record, now: soon }).obsolete).toBe(true);

    // Different park / date, via the episode identity.
    const weatherState = getRecommendationWeatherState(weather);
    [
      { parkId: "epcot", tripDate: TRIP_DATE },
      { parkId: PARK, tripDate: "2026-06-28" },
    ].forEach((over) => {
      expect(
        isRainConfirmationObsolete({
          record,
          episode: getRainConfirmationEpisode({ weatherState, weather, ...over }),
          weatherState,
          now: soon,
        })
      ).toBe(true);
    });
  });

  test("official precipitation still overrides a prior Not yet through the lifecycle", () => {
    const record = answer(rainWatchWeather(), RAIN_CONFIRMATION_RESPONSES.NOT_YET);
    const result = tick({ weather: activeRainWeather(), record, now: NOW + 5 * MINUTE });

    expect(result.obsolete).toBe(true);
    // No episode exists while precipitation is official, so nothing is asked.
    expect(result.asks).toBe(false);
    expect(getRecommendationWeatherState(activeRainWeather()).activeRain).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* The active-plan gate                                                       */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — active plan required", () => {
  /**
   * Exercises the SHARED gate App.jsx calls, rather than a copy of it, so this
   * cannot drift away from the shipped behaviour.
   */
  function canAsk({
    activeScreen = "home",
    isProfileIncomplete = false,
    activePark = PARK,
    weather = rainWatchWeather(),
    tripPlanState = normalizeTripPlan({}),
  } = {}) {
    return canAskRainConfirmation({
      activeScreen,
      isProfileIncomplete,
      activePark,
      weather,
      tripPlan: tripPlanState,
    });
  }

  const generatedPlan = () =>
    updateTripPlanFreshnessContext(normalizeTripPlan({}), {
      activePark: PARK,
      dayPhase: "midday",
    });

  test("the default empty trip plan cannot prompt", () => {
    const emptyPlan = normalizeTripPlan({});

    // It is a real object — which is exactly why presence is not the test.
    expect(emptyPlan).toBeTruthy();
    expect(emptyPlan.lastGeneratedAt).toBeNull();

    expect(canAsk({ tripPlanState: emptyPlan })).toBe(false);
    expect(
      shouldAskRainConfirmation({
        episode: episodeFor(rainWatchWeather()),
        record: null,
        now: NOW,
        canAsk: canAsk({ tripPlanState: emptyPlan }),
      })
    ).toBe(false);
  });

  test("a generated plan can prompt", () => {
    const plan = generatedPlan();
    expect(plan.lastGeneratedAt).toBeTruthy();

    expect(canAsk({ tripPlanState: plan })).toBe(true);
    expect(
      shouldAskRainConfirmation({
        episode: episodeFor(rainWatchWeather()),
        record: null,
        now: NOW,
        canAsk: canAsk({ tripPlanState: plan }),
      })
    ).toBe(true);
  });

  test("onboarding and incomplete-profile behaviour is unchanged", () => {
    const plan = generatedPlan();

    expect(canAsk({ tripPlanState: plan, activeScreen: "family_profile" })).toBe(false);
    expect(canAsk({ tripPlanState: plan, isProfileIncomplete: true })).toBe(false);
    expect(canAsk({ tripPlanState: plan, activePark: "" })).toBe(false);
    expect(canAsk({ tripPlanState: plan, weather: null })).toBe(false);
  });

  test("a missing trip plan cannot prompt", () => {
    expect(canAsk({ tripPlanState: null })).toBe(false);
    expect(canAsk({ tripPlanState: undefined })).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 13–14. Forecast integrity and the privacy boundary                         */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — data boundaries", () => {
  test("raw forecast data remains unchanged", () => {
    const weather = rainWatchWeather();
    const snapshot = JSON.parse(JSON.stringify(weather));
    const confirmation = getActiveRainConfirmation({
      episode: episodeFor(weather),
      record: answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED),
      now: NOW,
    });

    const applied = applyRainConfirmationToWeather(weather, confirmation);

    // The source object is untouched.
    expect(weather).toEqual(snapshot);
    expect(applied).not.toBe(weather);

    // The forecast fields survive on the derived object, and the provider's own
    // precipitation reading is preserved rather than overwritten.
    expect(applied.summary).toBe(snapshot.summary);
    expect(applied.rainRisk).toBe(snapshot.rainRisk);
    expect(applied.nextPrecipitationWindow).toEqual(snapshot.nextPrecipitationWindow);
    expect(applied.forecastCurrentPrecipitation).toBe(false);

    // Guest-confirmed conditions are clearly distinguishable from forecast.
    expect(applied.guestConfirmedRain).toBe(true);
    expect(applied.currentPrecipitation).toBe(true);
  });

  test("stored feedback is bounded and contains no GPS or personal profile data", () => {
    const record = answer(rainWatchWeather(), RAIN_CONFIRMATION_RESPONSES.CONFIRMED);

    expect(Object.keys(record).sort()).toEqual(
      [
        "effectExpiresAt",
        "episodeId",
        "parkId",
        "promptCooldownUntil",
        "recordExpiresAt",
        "respondedAt",
        "response",
        "tripDate",
        "version",
        "watchKind",
      ].sort()
    );

    const serialized = JSON.stringify(record);
    [
      "lat",
      "lon",
      "latitude",
      "longitude",
      "coords",
      "distanceMeters",
      "nearestAnchor",
      "name",
      "child",
      "height",
      "email",
    ].forEach((forbidden) => {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });

    // Three fixed answers only — never free text.
    expect(Object.values(RAIN_CONFIRMATION_RESPONSES)).toContain(record.response);
    expect(serialized.length).toBeLessThan(400);
  });

  test("a corrupted or hand-edited record is inert", () => {
    [
      null,
      {},
      { version: 2, response: "confirmed", episodeId: "x", respondedAt: 1, expiresAt: 2 },
      { version: 1, response: "raining_hard", episodeId: "x", respondedAt: 1, expiresAt: 2 },
      { version: 1, response: "confirmed", episodeId: "", respondedAt: 1, expiresAt: 2 },
    ].forEach((bad) => {
      expect(normalizeRainConfirmationRecord(bad)).toBeNull();
    });
  });

  test("one report never changes a weather threshold", () => {
    const weather = rainWatchWeather();
    const confirmed = applyRainConfirmationToWeather(
      weather,
      getActiveRainConfirmation({
        episode: episodeFor(weather),
        record: answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED),
        now: NOW,
      })
    );

    // A second, untouched forecast of the same shape is still a plain Watch.
    expect(confirmed.guestConfirmedRain).toBe(true);
    expect(getRecommendationWeatherState(rainWatchWeather()).label).toBe("Rain Watch");
    expect(rainWatchWeather().rainRisk).toBe(0.4);
    expect(rainWatchWeather().currentPrecipitation).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 15. Existing rain behaviour still holds                                    */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — existing Rain Mode behaviour", () => {
  test("Rain Mode + Keep It Close still works after confirmation", () => {
    const weather = rainWatchWeather();
    const confirmed = applyRainConfirmationToWeather(
      weather,
      getActiveRainConfirmation({
        episode: episodeFor(weather),
        record: answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED),
        now: NOW,
      })
    );

    const keepClose = adultOnlyFamily({ walkingTolerance: "low" });

    const result = recommend(confirmed, { familyProfile: keepClose });
    const cards = [result.bestMove, result.backup].filter(Boolean);

    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((ride) => {
      expect(ride.rainKeepCloseActive).toBe(true);
      // The walking weight is live, and same-land choices are not penalised.
      expect(ride.rainKeepCloseWalkModifier).toBeLessThanOrEqual(0);
    });

    // Without the confirmation the same family is not in keep-close rain mode.
    const watchOnly = recommend(weather, { familyProfile: keepClose });
    expect(watchOnly.bestMove?.rainKeepCloseActive).toBe(false);
  });

  test("a provider storm flag plus confirmed rain does become Storm Smart Mode", () => {
    // Deliberate and pinned. The storm signal here is the PROVIDER's own
    // stormMode, not an inference from the guest's answer: the family only
    // confirmed precipitation, and the provider had already said the system
    // overhead is stormy. Precipitation now falling under a flagged storm is a
    // real storm, and Storm Smart Mode is the more cautious of the two states.
    const weather = stormWatchWeather({ stormMode: true });
    expect(getRecommendationWeatherState(weather).label).toBe("Storm Watch");

    const confirmed = applyRainConfirmationToWeather(
      weather,
      getActiveRainConfirmation({
        episode: episodeFor(weather),
        record: answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED),
        now: NOW,
      })
    );

    expect(getRecommendationWeatherState(confirmed).activeStorm).toBe(true);
  });

  test("confirmation does not claim a storm the guest never reported", () => {
    // The production shape where the display string stays "Rain possible soon".
    // Confirming rain here must not invent thunder.
    const weather = rainWatchWeather({
      nextPrecipitationWindow: {
        time: "2026-06-27T18:00:00-04:00",
        summary: "Rain",
        rainRisk: 0.8,
        precipitationProbability: 75,
        weatherCode: 4001,
      },
    });
    // DELIBERATELY CHANGED from forecastStormWatch === true. This case used to
    // be a Storm Watch solely because the window carried rainRisk 0.8, and the
    // old comment here said so out loud: "Storm class comes from the window's
    // RISK". That is the defect. The window says "Rain", weather code 4001 —
    // ordinary rain — and no probability may promote that to a storm.
    const forecastState = getRecommendationWeatherState(weather);
    expect(forecastState.forecastStormWatch).toBe(false);
    expect(forecastState.forecastRainWatch).toBe(true);
    expect(forecastState.label).toBe("Rain Watch");

    const confirmed = applyRainConfirmationToWeather(
      weather,
      getActiveRainConfirmation({
        episode: episodeFor(weather),
        record: answer(weather, RAIN_CONFIRMATION_RESPONSES.CONFIRMED),
        now: NOW,
      })
    );

    const state = getRecommendationWeatherState(confirmed);
    expect(state.activeRain).toBe(true);
    expect(state.activeStorm).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 16. Presentation                                                           */
/* -------------------------------------------------------------------------- */

describe("rain confirmation — prompt presentation", () => {
  const markup = renderToStaticMarkup(
    React.createElement(RainCheckPrompt, { watchKind: "rain" })
  );

  test("is a calm live region, not an interruptive modal", () => {
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Rain check"');

    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain('role="alertdialog"');
    expect(markup).not.toContain("aria-modal");
    expect(markup).not.toContain("autofocus");
    expect(markup).not.toContain("position:fixed");
  });

  test("offers all three actions as real keyboard-reachable buttons", () => {
    const buttons = markup.match(/<button[^>]*>/g) || [];
    expect(buttons).toHaveLength(3);

    buttons.forEach((button) => {
      expect(button).toContain('type="button"');
      // No positive tabindex reordering, and nothing disabled.
      expect(button).not.toContain("tabindex");
      expect(button).not.toContain("disabled");
    });

    expect(markup).toContain("Yes — switch to Rain Mode");
    expect(markup).toContain("Not yet");
    expect(markup).toContain("Dismiss");
    expect(markup).toContain("Is it raining where you are?");
  });

  test("presents safely on a narrow phone", () => {
    // Actions wrap rather than overflow, and every target clears 44px.
    expect(markup).toContain("flex-wrap:wrap");
    expect((markup.match(/min-height:44px/g) || [])).toHaveLength(3);
  });

  test("names storms when the watch is a storm watch", () => {
    const stormMarkup = renderToStaticMarkup(
      React.createElement(RainCheckPrompt, { watchKind: "storm" })
    );
    expect(stormMarkup).toContain("storms may be moving in");
  });
});
