/**
 * Regression: one clock per recommendation pass.
 *
 * The defect these tests pin: getNextBestRides computed a single `now`, but
 * getWetRideTimingModifier, getNextShowtimeInfo, getHollywoodStrategyModifier
 * and getMagicKingdomStrategyModifier each called getOrlandoTimeParts() with no
 * argument and read the wall clock themselves. One pass could therefore consult
 * the clock five separate times, and the same commit with identical inputs
 * scored Peter Pan 46 on one day and 41 on another while every exposed modifier
 * stayed the same.
 *
 * The fix resolves one instant per call — timeContext.nowIso when it is usable,
 * otherwise a single capture at the entry point — and threads it through every
 * time-dependent helper.
 *
 * These tests are written against the public surface only. They move Jest's
 * system clock between otherwise identical calls: if any helper reaches for the
 * clock again, the two results diverge and the test fails.
 */

import fs from "fs";
import path from "path";

import { getNextBestRides } from "../rideRecommendations";
import { getRideMeta } from "../rideMetadata";
import {
  MK,
  buildRide,
  adultOnlyFamily,
  mildWeather,
  locationAtLand,
  neutralTimeContext,
  timeContextAt,
} from "../testUtils/testHelpers";

/* -------------------------------------------------------------------------- */
/* Instants                                                                   */
/* -------------------------------------------------------------------------- */

// The declared pass instant: 1:00 PM Orlando, mid-afternoon, park open.
const CANONICAL_NOW = new Date("2026-01-15T18:00:00.000Z");

// Wall-clock instants deliberately far from CANONICAL_NOW, chosen to straddle
// every time gate in the engine: a different hour, a different day, a different
// side of the 10:30 AM / 5:00 PM Peter Pan window, and a different side of the
// 8:00 PM late-evening branch.
const WALL_CLOCK_MORNING = new Date("2026-03-02T14:30:00.000Z"); // 9:30 AM Orlando
const WALL_CLOCK_NIGHT = new Date("2026-09-21T01:45:00.000Z"); // 9:45 PM Orlando

const MK_PARK = "magic_kingdom";
const HS_PARK = "hollywood";

function mkRides() {
  return [
    MK.peterPan({ waitTime: 45 }),
    MK.buzz({ waitTime: 25 }),
    MK.bigThunder({ waitTime: 35 }),
    MK.tianas({ waitTime: 30 }),
    MK.peopleMover({ waitTime: 10 }),
    MK.smallWorld({ waitTime: 15 }),
  ];
}

function recommendMK(over = {}) {
  return getNextBestRides({
    parkId: MK_PARK,
    rides: mkRides(),
    weather: mildWeather({ tempF: 88, feelsLikeF: 93 }),
    locationContext: locationAtLand("tomorrowland"),
    familyProfile: adultOnlyFamily(),
    timeContext: timeContextAt(CANONICAL_NOW),
    ...over,
  });
}

const SLOTS = ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"];

/**
 * Everything a pass decided that a family would actually see or feel: which
 * ride landed in each slot, what it scored, why the card says it is there, and
 * whether the park reads as open. Comparing this whole shape — rather than one
 * field — is what makes "the clock no longer leaks" a real claim.
 */
function decisionShape(recs) {
  return {
    parkOpenStatus: recs.parkOpenStatus,
    needsLocation: recs.needsLocation,
    slots: SLOTS.map((slot) => {
      const ride = recs[slot];
      if (!ride) return { slot, ride: null };

      return {
        slot,
        ride: ride.name,
        score: ride.recommendationScore,
        reason: ride.reason ?? null,
        planAheadReason: ride.planAheadReason ?? null,
        wetRideModifier: ride.wetRideModifier,
        scheduledShowModifier: ride.scheduledShowModifier,
        waitValueStatus: ride.waitValueStatus?.status ?? null,
      };
    }),
  };
}

function atWallClock(instant, run) {
  jest.setSystemTime(instant);
  return run();
}

/* -------------------------------------------------------------------------- */
/* 1. Same nowIso, different wall clock -> identical decisions                 */
/* -------------------------------------------------------------------------- */

describe("a supplied nowIso governs the pass, not the wall clock", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Magic Kingdom: moving the system clock hours and months changes nothing", () => {
    const morning = atWallClock(WALL_CLOCK_MORNING, () => decisionShape(recommendMK()));
    const night = atWallClock(WALL_CLOCK_NIGHT, () => decisionShape(recommendMK()));

    expect(night).toEqual(morning);
  });

  test("scores specifically are stable across the two wall clocks", () => {
    const scoresAt = (instant) =>
      atWallClock(instant, () =>
        decisionShape(recommendMK()).slots.map((s) => [s.slot, s.ride, s.score])
      );

    expect(scoresAt(WALL_CLOCK_NIGHT)).toEqual(scoresAt(WALL_CLOCK_MORNING));
  });

  test("time-dependent reason text is stable across the two wall clocks", () => {
    const reasonsAt = (instant) =>
      atWallClock(instant, () =>
        decisionShape(recommendMK()).slots.map((s) => [
          s.slot,
          s.reason,
          s.planAheadReason,
        ])
      );

    expect(reasonsAt(WALL_CLOCK_NIGHT)).toEqual(reasonsAt(WALL_CLOCK_MORNING));
  });

  test("park-open status is stable across the two wall clocks", () => {
    const statusAt = (instant) =>
      atWallClock(instant, () => recommendMK().parkOpenStatus);

    // A 9:30 AM wall clock is before the weekly 9:00 AM... open; a 9:45 PM wall
    // clock is long after. Neither may reach the pass.
    expect(statusAt(WALL_CLOCK_NIGHT)).toEqual(statusAt(WALL_CLOCK_MORNING));
  });

  test("Hollywood Studios time modifiers are stable across the two wall clocks", () => {
    // getHollywoodStrategyModifier read the clock independently, so this park
    // needs its own coverage rather than riding on the Magic Kingdom case.
    const recommendHS = () =>
      getNextBestRides({
        parkId: HS_PARK,
        rides: [
          buildRide({ name: "Millennium Falcon: Smugglers Run", land: "galaxys_edge", waitTime: 40 }),
          buildRide({ name: "Slinky Dog Dash", land: "toy_story_land", waitTime: 55 }),
          buildRide({ name: "The Twilight Zone Tower of Terror", land: "sunset_boulevard", waitTime: 45 }),
          buildRide({ name: "Star Tours – The Adventures Continue", land: "echo_lake", waitTime: 15 }),
        ],
        weather: mildWeather({ tempF: 88, feelsLikeF: 93 }),
        locationContext: locationAtLand("echo_lake"),
        familyProfile: adultOnlyFamily(),
        timeContext: timeContextAt(CANONICAL_NOW),
      });

    const morning = atWallClock(WALL_CLOCK_MORNING, () => decisionShape(recommendHS()));
    const night = atWallClock(WALL_CLOCK_NIGHT, () => decisionShape(recommendHS()));

    expect(night).toEqual(morning);
  });

  test("wet-ride timing is stable across the two wall clocks", () => {
    // getWetRideTimingModifier swings by 22 points across the day (-10 before
    // 11 AM, +10 midday, -12 after 6 PM), so a leaking clock shows up here first.
    const wetModifierAt = (instant) =>
      atWallClock(instant, () => {
        const recs = getNextBestRides({
          parkId: MK_PARK,
          rides: [MK.tianas({ waitTime: 25 }), MK.bigThunder({ waitTime: 30 })],
          weather: mildWeather({ tempF: 91, feelsLikeF: 97 }),
          locationContext: locationAtLand("frontierland"),
          familyProfile: adultOnlyFamily({ waterRidePreference: "yes" }),
          timeContext: timeContextAt(CANONICAL_NOW),
        });

        return SLOTS.map((slot) => [slot, recs[slot]?.name ?? null, recs[slot]?.wetRideModifier ?? null]);
      });

    expect(wetModifierAt(WALL_CLOCK_NIGHT)).toEqual(wetModifierAt(WALL_CLOCK_MORNING));
  });
});

/* -------------------------------------------------------------------------- */
/* 2. A different nowIso still moves a time-dependent decision                */
/* -------------------------------------------------------------------------- */

describe("the supplied instant still drives time-dependent decisions", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    // Held fixed for every case below, so any difference observed is caused by
    // nowIso alone and never by the wall clock.
    jest.setSystemTime(WALL_CLOCK_MORNING);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a pre-open nowIso suppresses go-now cards that an open-hours nowIso allows", () => {
    const preOpen = getNextBestRides({
      parkId: MK_PARK,
      rides: mkRides(),
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: adultOnlyFamily(),
      // 8:00 AM Orlando — before the 9:00 AM open and before Early Entry.
      timeContext: timeContextAt(new Date("2026-01-15T13:00:00.000Z"), {
        orlandoTotalMinutes: 8 * 60,
      }),
    });

    const openHours = recommendMK();

    expect(preOpen.parkOpenStatus.isPreOpen).toBe(true);
    expect(preOpen.parkOpenStatus.shouldBlockGoNow).toBe(true);
    expect(preOpen.bestMove).toBeNull();

    expect(openHours.parkOpenStatus.isPreOpen).toBe(false);
    expect(openHours.bestMove).not.toBeNull();
  });

  test("an Early Entry nowIso is recognised from the supplied instant", () => {
    const earlyEntry = getNextBestRides({
      parkId: MK_PARK,
      rides: mkRides(),
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      // 8:40 AM Orlando — inside the 30 minutes before a 9:00 AM open.
      timeContext: timeContextAt(new Date("2026-01-15T13:40:00.000Z"), {
        orlandoTotalMinutes: 8 * 60 + 40,
      }),
    });

    expect(earlyEntry.parkOpenStatus.isEarlyEntryWindow).toBe(true);
    expect(recommendMK().parkOpenStatus.isEarlyEntryWindow).toBe(false);
  });

  test("wet-ride timing differs between a morning and an afternoon nowIso", () => {
    const wetAt = (nowIso) => {
      const recs = getNextBestRides({
        parkId: MK_PARK,
        rides: [MK.tianas({ waitTime: 25 })],
        weather: mildWeather({ tempF: 91, feelsLikeF: 97 }),
        locationContext: locationAtLand("frontierland"),
        familyProfile: adultOnlyFamily({ waterRidePreference: "yes" }),
        timeContext: timeContextAt(nowIso),
      });

      return SLOTS.map((slot) => recs[slot]).find(
        (ride) => ride?.name === "Tiana's Bayou Adventure"
      )?.wetRideModifier;
    };

    // 9:30 AM Orlando sits in the "before 11" branch; 1:00 PM sits in the
    // midday branch. The engine must tell them apart from nowIso alone.
    const morning = wetAt(new Date("2026-01-15T14:30:00.000Z"));
    const afternoon = wetAt(CANONICAL_NOW);

    expect(morning).not.toBe(afternoon);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Scheduled shows read one instant for every derived answer               */
/* -------------------------------------------------------------------------- */

describe("scheduled shows use the supplied instant throughout", () => {
  const INDIANA = "Indiana Jones Epic Stunt Spectacular";

  function showtimesFor(name) {
    const meta = getRideMeta(HS_PARK, name);
    expect(meta?.showProfile?.showtimes?.length).toBeGreaterThan(0);
    return meta.showProfile.showtimes;
  }

  function recommendShow(nowIso) {
    return getNextBestRides({
      parkId: HS_PARK,
      rides: [
        buildRide({ name: INDIANA, land: "echo_lake", waitTime: 0, isOpen: true }),
        buildRide({ name: "Star Tours – The Adventures Continue", land: "echo_lake", waitTime: 15 }),
      ],
      weather: mildWeather(),
      locationContext: locationAtLand("echo_lake"),
      familyProfile: adultOnlyFamily(),
      timeContext: timeContextAt(nowIso),
    });
  }

  function findShow(recs) {
    return SLOTS.map((slot) => recs[slot]).find((ride) => ride?.name === INDIANA) || null;
  }

  beforeEach(() => {
    jest.useFakeTimers("modern");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("eligibility, priority, score and explanation all come from one instant", () => {
    // Well before the first listed performance, so the show is live for the day.
    const BEFORE_SHOWS = new Date("2026-01-15T16:00:00.000Z"); // 11:00 AM Orlando

    const morning = atWallClock(WALL_CLOCK_MORNING, () => recommendShow(BEFORE_SHOWS));
    const night = atWallClock(WALL_CLOCK_NIGHT, () => recommendShow(BEFORE_SHOWS));

    const a = findShow(morning);
    const b = findShow(night);

    expect(a).toBeTruthy();
    expect(b).toBeTruthy();

    // Final-performance eligibility: present in the same slot either way.
    expect(SLOTS.filter((s) => morning[s]?.name === INDIANA)).toEqual(
      SLOTS.filter((s) => night[s]?.name === INDIANA)
    );

    // Next-show selection and show priority, via the score they feed.
    expect(b.scheduledShowModifier).toBe(a.scheduledShowModifier);
    expect(b.recommendationScore).toBe(a.recommendationScore);
    expect(b.planAheadPriority).toBe(a.planAheadPriority);

    // Explanation text, which names the next listed showtime.
    expect(b.planAheadReason).toBe(a.planAheadReason);
    expect(b.reason).toBe(a.reason);
  });

  test("a nowIso after the final performance retires the show regardless of wall clock", () => {
    const showtimes = showtimesFor(INDIANA);
    expect(showtimes.length).toBeGreaterThan(0);

    // 8:00 PM Orlando is past every listed Indiana Jones performance.
    const AFTER_FINAL = new Date("2026-01-16T01:00:00.000Z");

    const morning = atWallClock(WALL_CLOCK_MORNING, () => recommendShow(AFTER_FINAL));
    const night = atWallClock(WALL_CLOCK_NIGHT, () => recommendShow(AFTER_FINAL));

    for (const recs of [morning, night]) {
      expect(SLOTS.some((slot) => recs[slot]?.name === INDIANA)).toBe(false);
    }
  });

  test("the explanation names the next showtime chosen from the same instant", () => {
    const BEFORE_SHOWS = new Date("2026-01-15T16:00:00.000Z"); // 11:00 AM Orlando

    const recs = atWallClock(WALL_CLOCK_NIGHT, () => recommendShow(BEFORE_SHOWS));
    const show = findShow(recs);

    expect(show).toBeTruthy();

    // If the reason quoted a showtime it must be one the schedule actually
    // lists — a clock read elsewhere would let it name a different performance
    // than the one the score and priority were computed against.
    const text = `${show.planAheadReason || ""} ${show.reason || ""}`;
    const quoted = showtimesFor(INDIANA).filter((t) => text.includes(t));

    if (text.includes("Next listed show")) {
      expect(quoted.length).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Missing or invalid nowIso falls back once, at the entry point           */
/* -------------------------------------------------------------------------- */

describe("a missing or invalid nowIso uses one captured timestamp", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Each entry is a timeContext the resolver must reject in favour of the
  // single entry-point capture.
  const UNUSABLE = [
    ["no timeContext at all", null],
    ["timeContext without nowIso", neutralTimeContext()],
    ["nowIso undefined", neutralTimeContext({ nowIso: undefined })],
    ["nowIso empty string", neutralTimeContext({ nowIso: "" })],
    ["nowIso whitespace", neutralTimeContext({ nowIso: "   " })],
    ["nowIso unparseable", neutralTimeContext({ nowIso: "not-a-date" })],
    ["nowIso wrong type", neutralTimeContext({ nowIso: 1737000000000 })],
  ];

  test.each(UNUSABLE)("%s falls back to the frozen wall clock", (_label, timeContext) => {
    // With the clock frozen, one capture and several captures are
    // indistinguishable — so this case pins the fallback's VALUE.
    jest.setSystemTime(CANONICAL_NOW);

    const fallback = decisionShape(
      getNextBestRides({
        parkId: MK_PARK,
        rides: mkRides(),
        weather: mildWeather({ tempF: 88, feelsLikeF: 93 }),
        locationContext: locationAtLand("tomorrowland"),
        familyProfile: adultOnlyFamily(),
        timeContext,
      })
    );

    // Identical to declaring the same instant explicitly: the fallback lands on
    // the same moment, not on some other read.
    expect(fallback).toEqual(decisionShape(recommendMK()));
  });

  test("the fallback is captured once — a clock that advances mid-pass cannot split it", () => {
    // Date.now advances 45 minutes on EVERY read. Under the old code the four
    // independent getOrlandoTimeParts() calls would each land in a different
    // window; with a single capture the whole pass shares the first value.
    jest.setSystemTime(CANONICAL_NOW);

    const realNow = Date.now;
    let reads = 0;
    const STEP_MS = 45 * 60 * 1000;

    try {
      Date.now = () => realNow.call(Date) + reads++ * STEP_MS;

      const drifting = decisionShape(
        getNextBestRides({
          parkId: MK_PARK,
          rides: mkRides(),
          weather: mildWeather({ tempF: 88, feelsLikeF: 93 }),
          locationContext: locationAtLand("tomorrowland"),
          familyProfile: adultOnlyFamily(),
          timeContext: null,
        })
      );

      Date.now = realNow;

      // The pass must agree with the instant it started at, which is what
      // "captured once" means.
      expect(drifting).toEqual(decisionShape(recommendMK()));
    } finally {
      Date.now = realNow;
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Structural guard                                                        */
/* -------------------------------------------------------------------------- */

describe("no helper may reintroduce an independent clock read", () => {
  test("every getOrlandoTimeParts call in the engine passes an explicit instant", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "rideRecommendations.js"),
      "utf8"
    );

    // Comments are prose about the old behaviour and are not call sites.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    const parameterless = code.match(/getOrlandoTimeParts\(\s*\)/g) || [];
    expect(parameterless).toEqual([]);

    // And the only wall-clock reads left are the util's own default and the
    // single entry-point fallback inside resolveRecommendationNow.
    const clockReads = code.match(/new Date\(\s*\)/g) || [];
    expect(clockReads.length).toBe(2);
  });
});
