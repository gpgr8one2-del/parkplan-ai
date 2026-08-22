/**
 * Rain Mode + "Keep choices nearby" proximity weighting.
 *
 * Field-test scenario these cover: a family standing in Liberty Square during
 * rain, with the low walking tolerance selected, was being sent to an adjacent
 * land because an adjacent land scored as if it were the land they were already
 * standing in. The walking weight never applied, and the card claimed they were
 * "already nearby" when they were not.
 *
 * These tests are deterministic: fixed clock, fixed waits, fixed manual land.
 * They assert behaviour, never specific attractions in engine code.
 */

import {
  getNextBestRides,
  getRecommendationWeatherState,
} from "../rideRecommendations";
import { getLandDistance } from "../parkProximity";
import {
  MK,
  adultOnlyFamily,
  locationAtLand,
  mildWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const STABLE_TEST_NOW = new Date("2026-06-27T16:00:00-04:00");

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(STABLE_TEST_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

function rainWeather(over = {}) {
  return {
    tempF: 78,
    feelsLikeF: 80,
    humidity: 88,
    condition: "Intense rain",
    summary: "Intense rain",
    rainRisk: 0.95,
    stormMode: false,
    ...over,
  };
}

/** Precipitation is falling now. */
function activeStormWeather(over = {}) {
  return {
    tempF: 76,
    feelsLikeF: 80,
    humidity: 90,
    summary: "Thunderstorms",
    rainRisk: 0.95,
    stormMode: true,
    currentPrecipitation: true,
    ...over,
  };
}

/**
 * Forecast-only states. Nothing is falling yet, but rainRisk is high enough
 * that the legacy isRainActive() helper reports true — the exact trap this
 * modifier must not fall into.
 */
function rainWatchWeather(over = {}) {
  return {
    tempF: 82,
    feelsLikeF: 86,
    humidity: 70,
    summary: "Cloudy",
    rainRisk: 0.6,
    currentPrecipitation: false,
    nextPrecipitationWindow: { summary: "Light rain", rainRisk: 0.5 },
    ...over,
  };
}

function stormWatchWeather(over = {}) {
  return {
    tempF: 84,
    feelsLikeF: 90,
    humidity: 74,
    summary: "Cloudy",
    rainRisk: 0.6,
    currentPrecipitation: false,
    nextPrecipitationWindow: { summary: "Thunderstorms", rainRisk: 0.85 },
    ...over,
  };
}

/** Elevated risk, no forecast window, nothing falling. */
function bareRainRiskWeather(over = {}) {
  return {
    tempF: 84,
    feelsLikeF: 88,
    humidity: 68,
    summary: "Partly cloudy",
    rainRisk: 0.6,
    currentPrecipitation: false,
    ...over,
  };
}

const keepItCloseFamily = (over = {}) =>
  adultOnlyFamily({ walkingTolerance: "low", pace: "leisurely", ...over });
const normalWalkingFamily = (over = {}) =>
  adultOnlyFamily({ walkingTolerance: "medium", ...over });

function recommend({ rides, weather, land, familyProfile }) {
  return getNextBestRides({
    parkId: PARK,
    rides,
    weather,
    locationContext: locationAtLand(land),
    familyProfile,
    timeContext: neutralTimeContext(),
  });
}

function allCards(recs) {
  return [
    recs.bestMove,
    recs.backup,
    recs.worthTheWalk,
    recs.planAhead,
    recs.waitOnThis,
  ].filter(Boolean);
}

function cardFor(recs, partialName) {
  return allCards(recs).find((card) => card.name.includes(partialName));
}

/**
 * The reproduction pair: an indoor attraction in the land the family is
 * standing in, at a moderate wait, against an indoor attraction one land over
 * at a very low wait.
 */
function libertySquarePair({ hereWait = 30, oneLandOverWait = 5 } = {}) {
  return [
    MK.haunted({ waitTime: hereWait }), // liberty_square — same land
    MK.ariel({ waitTime: oneLandOverWait }), // fantasyland — adjacent land
  ];
}

describe("rain + keep it close proximity weighting", () => {
  /* 1. Dry weather without Keep It Close — untouched baseline. */
  test("dry weather without Keep It Close leaves the low-wait adjacent pick in front", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: mildWeather(),
      land: "liberty_square",
      familyProfile: normalWalkingFamily(),
    });

    expect(recs.bestMove?.name).toContain("Under the Sea");
    expect(cardFor(recs, "Under the Sea").rainKeepCloseWalkModifier).toBe(0);
    expect(cardFor(recs, "Haunted Mansion").rainKeepCloseWalkModifier).toBe(0);
  });

  /* 2. Rain without Keep It Close — rain alone must not add walking weight. */
  test("rain without Keep It Close does not add walking weight", () => {
    const dry = recommend({
      rides: libertySquarePair(),
      weather: mildWeather(),
      land: "liberty_square",
      familyProfile: normalWalkingFamily(),
    });
    const wet = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: normalWalkingFamily(),
    });

    expect(wet.bestMove?.name).toBe(dry.bestMove?.name);

    // Rain lifts both indoor options, so the gap between them is unchanged.
    const gap = (recs) =>
      cardFor(recs, "Under the Sea").recommendationScore -
      cardFor(recs, "Haunted Mansion").recommendationScore;
    expect(gap(wet)).toBe(gap(dry));

    for (const card of allCards(wet)) {
      expect(card.rainKeepCloseWalkModifier).toBe(0);
    }
  });

  /* 3. Rain with Keep It Close — the reported scenario. */
  test("rain with Keep It Close puts the attraction they are standing next to first", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    expect(recs.bestMove?.name).toBe("Haunted Mansion");

    const here = cardFor(recs, "Haunted Mansion");
    const oneLandOver = cardFor(recs, "Under the Sea");

    expect(here.landDistance).toBe("same");
    expect(here.rainKeepCloseWalkModifier).toBe(0);

    expect(oneLandOver.landDistance).toBe("adjacent");
    expect(oneLandOver.rainKeepCloseWalkModifier).toBeLessThan(0);

    expect(here.recommendationScore).toBeGreaterThan(
      oneLandOver.recommendationScore
    );
  });

  /* 4. Nearby indoor / moderate wait vs farther indoor / very low wait. */
  test("a moderate wait in this land beats a very low wait a land away in the rain", () => {
    // Standing in Fantasyland. Adventureland is "nearby" from here, a longer
    // walk than the adjacent case above.
    const recs = recommend({
      rides: [
        MK.philharmagic({ waitTime: 20 }), // fantasyland — same land, indoor
        MK.pirates({ waitTime: 5 }), // adventureland — nearby, indoor
      ],
      weather: rainWeather(),
      land: "fantasyland",
      familyProfile: keepItCloseFamily(),
    });

    expect(recs.bestMove?.name).toBe("Mickey's PhilharMagic");

    const farther = cardFor(recs, "Pirates of the Caribbean");
    expect(farther.landDistance).toBe("nearby");
    expect(farther.rainKeepCloseWalkModifier).toBeLessThan(
      cardFor(recs, "Mickey's PhilharMagic").rainKeepCloseWalkModifier
    );
  });

  /* 5. An extreme wait advantage can still win the walk. */
  test("a large enough wait advantage still wins the walk", () => {
    const recs = recommend({
      rides: libertySquarePair({ hereWait: 60, oneLandOverWait: 5 }),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    // 55 minutes saved is a genuinely extreme advantage: the walk is worth it
    // even for a family asking to stay close.
    expect(recs.bestMove?.name).toContain("Under the Sea");
    expect(
      cardFor(recs, "Under the Sea").rainKeepCloseWalkModifier
    ).toBeLessThan(0);
  });

  /* 6. Manual location drives proximity. */
  test("the manual location decides which attraction counts as close", () => {
    const rides = () => libertySquarePair();

    const fromLibertySquare = recommend({
      rides: rides(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });
    const fromFantasyland = recommend({
      rides: rides(),
      weather: rainWeather(),
      land: "fantasyland",
      familyProfile: keepItCloseFamily(),
    });

    expect(cardFor(fromLibertySquare, "Haunted Mansion").landDistance).toBe("same");
    expect(cardFor(fromLibertySquare, "Under the Sea").landDistance).toBe("adjacent");

    expect(cardFor(fromFantasyland, "Under the Sea").landDistance).toBe("same");
    expect(cardFor(fromFantasyland, "Haunted Mansion").landDistance).toBe("adjacent");

    // Moving the anchor moves the winner, with the waits held constant.
    expect(fromLibertySquare.bestMove?.name).toBe("Haunted Mansion");
    expect(fromFantasyland.bestMove?.name).toContain("Under the Sea");
  });

  /* 7. "Already nearby" only inside its threshold. */
  test("'already nearby' is only used for the land the family is standing in", () => {
    // Standing in Fantasyland: the low-wait attraction is in this land, so the
    // phrase is truthful here.
    const standingWithIt = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "fantasyland",
      familyProfile: keepItCloseFamily(),
    });
    expect(cardFor(standingWithIt, "Under the Sea").reason).toContain(
      "already nearby"
    );

    // Standing in Liberty Square: the same low-wait attraction is a land away,
    // so nothing about it may claim the family is already nearby.
    const oneLandAway = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });
    expect(cardFor(oneLandAway, "Under the Sea").reason).not.toContain(
      "already nearby"
    );
    expect(cardFor(oneLandAway, "Under the Sea").reason).not.toContain(
      "you're nearby"
    );
  });

  /* 8. Ranking data and explanation data agree. */
  test("the distance used for ranking is the distance the card talks about", () => {
    for (const land of ["liberty_square", "fantasyland", "adventureland"]) {
      for (const familyProfile of [keepItCloseFamily(), normalWalkingFamily()]) {
        const recs = recommend({
          rides: libertySquarePair(),
          weather: rainWeather(),
          land,
          familyProfile,
        });

        for (const card of allCards(recs)) {
          const trueDistance = getLandDistance(PARK, land, card.land);

          // The reported bucket is the bucket scoring used.
          expect(card.landDistance).toBe(trueDistance);
          expect(card.proximityDistance).toBe(trueDistance);

          // Proximity claims in the copy match that same bucket.
          if (/already nearby|you're nearby/.test(card.reason || "")) {
            expect(trueDistance).toBe("same");
          }

          // The walking weight is keyed to the same bucket.
          if (card.rainKeepCloseWalkModifier < 0) {
            expect(trueDistance).not.toBe("same");
          }
        }
      }
    }
  });
});

/**
 * The walking weight belongs to precipitation that is actually falling.
 *
 * getRecommendationWeatherState() separates that from a forecast: Rain Watch and
 * Storm Watch both report activeRain/activeStorm false while legacyRainActive is
 * true, because the legacy helper trips at rainRisk >= 0.45. Keying off the
 * legacy signal would weight walking for rain that has not arrived, and would
 * let the card say it is raining when the app knows it is not.
 */
describe("rain + keep it close only counts precipitation that is falling", () => {
  const claimsItIsRaining = (recs) =>
    allCards(recs).some((card) => /rain(ing|s|y)?\b/i.test(card.reason || ""));

  function walkModifiers(recs) {
    return allCards(recs).map((card) => card.rainKeepCloseWalkModifier);
  }

  /* Fixture self-check: these must be the states we think they are. */
  test("the fixtures produce the intended weather states", () => {
    expect(getRecommendationWeatherState(rainWeather()).activeRain).toBe(true);

    const storm = getRecommendationWeatherState(activeStormWeather());
    expect(storm.activeStorm).toBe(true);
    expect(storm.label).toBe("Storm Smart Mode");

    const rainWatch = getRecommendationWeatherState(rainWatchWeather());
    expect(rainWatch.label).toBe("Rain Watch");
    expect(rainWatch.activeRain).toBe(false);
    expect(rainWatch.activeStorm).toBe(false);
    // The trap: legacy says rain, structured says not yet.
    expect(rainWatch.legacyRainActive).toBe(true);

    const stormWatch = getRecommendationWeatherState(stormWatchWeather());
    expect(stormWatch.label).toBe("Storm Watch");
    expect(stormWatch.activeRain).toBe(false);
    expect(stormWatch.activeStorm).toBe(false);
    expect(stormWatch.legacyRainActive).toBe(true);

    const bare = getRecommendationWeatherState(bareRainRiskWeather());
    expect(bare.activeRain).toBe(false);
    expect(bare.activeStorm).toBe(false);
    expect(bare.legacyRainActive).toBe(true);
  });

  /* 1. Active rain still produces the corrected ranking. */
  test("active rain keeps the corrected ranking", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    expect(recs.bestMove?.name).toBe("Haunted Mansion");
    expect(
      cardFor(recs, "Under the Sea").rainKeepCloseWalkModifier
    ).toBeLessThan(0);
  });

  /* 2. Active storm activates the walking weight. */
  test("active storm activates the walking weight", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: activeStormWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    const oneLandOver = cardFor(recs, "Under the Sea");
    expect(oneLandOver.rainKeepCloseActive).toBe(true);
    expect(oneLandOver.rainKeepCloseWalkModifier).toBeLessThan(0);
    expect(recs.bestMove?.name).toBe("Haunted Mansion");
  });

  /* 3 + 4 + 5. Forecast-only and bare-risk states stay neutral. */
  const neutralCases = [
    ["forecast-only Rain Watch", rainWatchWeather],
    ["forecast-only Storm Watch", stormWatchWeather],
    ["elevated rainRisk with nothing falling", bareRainRiskWeather],
  ];

  test.each(neutralCases)(
    "%s leaves the walking weight at zero",
    (_label, buildWeather) => {
      const recs = recommend({
        rides: libertySquarePair(),
        weather: buildWeather(),
        land: "liberty_square",
        familyProfile: keepItCloseFamily(),
      });

      for (const card of allCards(recs)) {
        expect(card.rainKeepCloseActive).toBe(false);
        expect(card.rainKeepCloseWalkModifier).toBe(0);
      }
      expect(walkModifiers(recs).every((value) => value === 0)).toBe(true);
    }
  );

  /* 6. Copy never asserts current rain in a forecast-only state. */
  test.each(neutralCases)(
    "%s never says it is raining",
    (_label, buildWeather) => {
      const recs = recommend({
        rides: libertySquarePair(),
        weather: buildWeather(),
        land: "liberty_square",
        familyProfile: keepItCloseFamily(),
      });

      expect(claimsItIsRaining(recs)).toBe(false);
    }
  );

  test("active rain may say so, which is what makes the forecast cases meaningful", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    expect(claimsItIsRaining(recs)).toBe(true);
  });

  /* Missing or malformed weather stays neutral rather than throwing. */
  test.each([
    ["undefined weather", undefined],
    ["null weather", null],
    ["empty weather", {}],
    ["malformed rainRisk", { summary: "Cloudy", rainRisk: "banana" }],
  ])("%s stays neutral", (_label, weather) => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather,
      land: "liberty_square",
      familyProfile: keepItCloseFamily(),
    });

    for (const card of allCards(recs)) {
      expect(card.rainKeepCloseActive).toBe(false);
      expect(card.rainKeepCloseWalkModifier).toBe(0);
    }
  });

  /* The gate must not reopen for a family without the low walking tolerance. */
  test("active rain without Keep It Close stays neutral", () => {
    const recs = recommend({
      rides: libertySquarePair(),
      weather: rainWeather(),
      land: "liberty_square",
      familyProfile: normalWalkingFamily(),
    });

    for (const card of allCards(recs)) {
      expect(card.rainKeepCloseActive).toBe(false);
      expect(card.rainKeepCloseWalkModifier).toBe(0);
    }
  });
});
