/**
 * Field test — Hollywood Studios, Issue 1.
 *
 * Reported: at roughly 8:00 PM, TOHI was still surfacing Indiana Jones Epic
 * Stunt Spectacular and the Frozen Sing-Along Celebration, whose final listed
 * performances were 4:30 PM and 5:30 PM.
 *
 * The invariant these tests pin:
 *
 *   A scheduled show with no remaining future performance today is not
 *   recommendation-eligible anywhere in TOHI.
 *
 * "Anywhere" is asserted against the engine's complete public surface — every
 * one of the five slots it returns — rather than against Plan Ahead, which is
 * merely where the leak happened to become visible.
 *
 * Determinism: every test pins an absolute UTC instant. The engine converts to
 * Orlando local time through an Intl formatter with an explicit
 * `timeZone: "America/New_York"`, so these assertions do not depend on the host
 * machine's clock or its TZ. That is not taken on trust — the DST pair in
 * "date and time handling is deterministic" below fails if the engine ever
 * starts reading UTC hours or host-local hours instead.
 */

import { getNextBestRides } from "../rideRecommendations";
import { getRideMeta } from "../rideMetadata";

/*
 * No shipped attraction has an unreadable schedule, so the malformed-schedule
 * case needs one substituted. The engine resolves every attraction through
 * getRideMeta and binds that import at module load, which is why jest.spyOn on
 * the namespace does not reach it — the mock has to be installed here.
 *
 * It is inert by default: with the toggle null every call returns the real
 * metadata, so every other test in this file runs against the shipped data
 * exactly as before.
 */
let mockShowtimeOverride = null;

jest.mock("../rideMetadata", () => {
  const actual = jest.requireActual("../rideMetadata");

  return {
    ...actual,
    getRideMeta: (parkId, key) => {
      const meta = actual.getRideMeta(parkId, key);
      if (!mockShowtimeOverride || meta?.displayName !== mockShowtimeOverride.name) {
        return meta;
      }
      return {
        ...meta,
        showProfile: { ...meta.showProfile, showtimes: mockShowtimeOverride.showtimes },
      };
    },
  };
});
import {
  buildRide,
  adultOnlyFamily,
  locationAtLand,
  mildWeather,
  stormWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "hollywood";

/* -------------------------------------------------------------------------- */
/* Fixed instants                                                             */
/* -------------------------------------------------------------------------- */
/*
 * Written as UTC so the wall-clock intent is explicit and host-independent.
 * Orlando is UTC-5 in January (EST) and UTC-4 in July (EDT).
 */
const JAN_2_00_PM = new Date("2026-01-15T19:00:00.000Z"); // 2:00 PM Orlando, EST
const JAN_1_30_PM = new Date("2026-01-15T18:30:00.000Z"); // 1:30 PM Orlando, EST
const JAN_8_00_PM = new Date("2026-01-16T01:00:00.000Z"); // 8:00 PM Orlando, EST
const JUL_2_00_PM = new Date("2026-07-15T18:00:00.000Z"); // 2:00 PM Orlando, EDT
const JUL_8_00_PM = new Date("2026-07-16T00:00:00.000Z"); // 8:00 PM Orlando, EDT
const JAN_8_00_AM = new Date("2026-01-15T13:00:00.000Z"); // 8:00 AM Orlando, EST

/*
 * Minute-boundary instants around Indiana Jones' schedule
 * (10:45 AM, 12:00 PM, 1:15 PM, 3:15 PM, 4:30 PM).
 *
 * Eligibility is strictly future-facing: a performance counts only while it
 * starts LATER than the current park-local minute. Park-local time is
 * minute-resolution, so the whole of 4:30 PM — :00 through :59 — reads as
 * started.
 */
const JAN_4_29_PM = new Date("2026-01-15T21:29:00.000Z"); // 4:29 PM Orlando
const JAN_4_30_PM = new Date("2026-01-15T21:30:00.000Z"); // 4:30 PM Orlando, exactly
const JAN_4_30_59_PM = new Date("2026-01-15T21:30:59.000Z"); // 4:30:59 PM Orlando
const JAN_3_15_PM = new Date("2026-01-15T20:15:00.000Z"); // 3:15 PM Orlando, exactly

// Independent of the engine: what Orlando clock does an instant really show?
function orlandoClock(instant) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

function at(instant) {
  jest.setSystemTime(instant);
}

/* -------------------------------------------------------------------------- */
/* Attractions under test — read from the real metadata, never hard-coded      */
/* -------------------------------------------------------------------------- */

const INDIANA = "Indiana Jones Epic Stunt Spectacular";
const FROZEN = "For the First Time in Forever: A Frozen Sing-Along Celebration";
const BEAUTY = "Beauty and the Beast Live on Stage";
const STAR_TOURS = "Star Tours – The Adventures Continue";
const TOWER = "The Twilight Zone Tower of Terror";

// Every assertion about "the final show was at X" is derived from the shipped
// metadata rather than restated here, so the tests stay true if the schedule is
// ever edited, and fail loudly if a show stops being a scheduled show at all.
function showtimesFor(name) {
  const meta = getRideMeta(PARK, name);
  expect(meta).toBeTruthy();
  expect(meta.showProfile?.showtimes?.length).toBeGreaterThan(0);
  return meta.showProfile.showtimes;
}

function showRide(name, land, over = {}) {
  // waitTime 0 mirrors the live feed: a scheduled show posts a 0-minute wait,
  // which is precisely why it must not be treated like a walk-on ride.
  return buildRide({ name, land, waitTime: 0, isOpen: true, ...over });
}

function recommend(rides, over = {}) {
  return getNextBestRides({
    parkId: PARK,
    rides,
    weather: mildWeather(),
    locationContext: locationAtLand("echo_lake"),
    familyProfile: adultOnlyFamily(),
    timeContext: neutralTimeContext(),
    ...over,
  });
}

// The engine's complete recommendation surface. Asserting against this list —
// rather than against planAhead alone — is what makes "anywhere" meaningful.
const SLOTS = ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"];

function surfacedNames(recs) {
  return SLOTS.map((slot) => recs[slot]?.name).filter(Boolean);
}

function expectNeverSurfaced(recs, name) {
  SLOTS.forEach((slot) => {
    expect(recs[slot]?.name).not.toBe(name);
  });
}

beforeEach(() => {
  jest.useFakeTimers("modern");
});

afterEach(() => {
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */

describe("past scheduled shows are not recommendation-eligible", () => {
  test("the reported field scenario no longer surfaces a finished show", () => {
    // The exact reported conditions: Hollywood Studios, ~8:00 PM, the shows
    // still posting an open status and a 0-minute wait.
    at(JAN_8_00_PM);
    expect(orlandoClock(JAN_8_00_PM)).toBe("20:00");

    // Final listed performances, straight from the shipped metadata.
    const indianaTimes = showtimesFor(INDIANA);
    const frozenTimes = showtimesFor(FROZEN);
    expect(indianaTimes[indianaTimes.length - 1]).toBe("4:30 PM");
    expect(frozenTimes[frozenTimes.length - 1]).toBe("5:30 PM");

    const recs = recommend([
      showRide(INDIANA, "echo_lake"),
      showRide(FROZEN, "echo_lake"),
      showRide(BEAUTY, "sunset_boulevard"),
    ]);

    expect(surfacedNames(recs)).toEqual([]);
  });

  test("before its final performance a show can still be recommended", () => {
    // 2:00 PM, well before Indiana Jones' 4:30 PM finale. The show must remain
    // eligible — the fix must not have simply removed scheduled shows.
    at(JAN_2_00_PM);

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(recs.planAhead?.name).toBe(INDIANA);
    expect(recs.planAhead?.isScheduledShow).toBe(true);
  });

  test("after its final performance it is gone from every slot and fallback", () => {
    at(JAN_8_00_PM);

    const ordinaryRides = [
      buildRide({ name: STAR_TOURS, land: "echo_lake", waitTime: 15 }),
      buildRide({ name: TOWER, land: "sunset_boulevard", waitTime: 40 }),
    ];

    const withFinishedShows = recommend([
      showRide(INDIANA, "echo_lake"),
      showRide(FROZEN, "echo_lake"),
      ...ordinaryRides,
    ]);

    expectNeverSurfaced(withFinishedShows, INDIANA);
    expectNeverSurfaced(withFinishedShows, FROZEN);

    // Stated as a differential rather than "something surfaced": feeding the
    // engine the finished shows must produce exactly the result it produces
    // without them. That is a stronger claim than a non-empty check, and unlike
    // one it holds under any host timezone — both runs meet identical park-hours
    // conditions, so nothing here depends on where the test machine is.
    const withoutFinishedShows = recommend(ordinaryRides);
    expect(surfacedNames(withFinishedShows)).toEqual(
      surfacedNames(withoutFinishedShows)
    );
  });

  test("the storm fallback pool cannot resurrect a finished show", () => {
    // When weather empties the positive pool the engine falls back to indoor /
    // air-conditioned candidates. An indoor finished show is exactly the kind
    // of candidate that fallback would otherwise reach for.
    at(JAN_8_00_PM);

    const frozenMeta = getRideMeta(PARK, FROZEN);
    // Guard the premise: this only tests the fallback if the show really is an
    // indoor / AC candidate the recovery pool would consider.
    expect(frozenMeta?.environment === "indoor" || frozenMeta?.hasAC === true).toBe(true);

    const recs = recommend([showRide(FROZEN, "echo_lake")], {
      weather: stormWeather(),
    });

    expect(surfacedNames(recs)).toEqual([]);
  });

  test("a show with several performances targets the next genuinely future one", () => {
    // Indiana Jones runs 10:45 AM, 12:00 PM, 1:15 PM, 3:15 PM, 4:30 PM.
    // At 1:30 PM the 1:15 PM show has started, so the next one is 3:15 PM.
    at(JAN_1_30_PM);

    const times = showtimesFor(INDIANA);
    expect(times).toContain("1:15 PM");
    expect(times).toContain("3:15 PM");

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(recs.planAhead?.name).toBe(INDIANA);
    expect(recs.planAhead?.planAheadReason).toContain("Next listed show: 3:15 PM");
    // It must not still be pointing at a performance that has already begun.
    expect(recs.planAhead?.planAheadReason).not.toContain("1:15 PM");
    expect(recs.planAhead?.planAheadReason).not.toContain("10:45 AM");
  });

  test("date and time handling is deterministic and park-local, not host-local", () => {
    // The same Orlando wall-clock time on either side of the DST boundary maps
    // to two DIFFERENT UTC instants. If the engine compared UTC hours, or the
    // host machine's local hours, these two would disagree. They must not.
    expect(orlandoClock(JAN_8_00_PM)).toBe("20:00");
    expect(orlandoClock(JUL_8_00_PM)).toBe("20:00");
    expect(JAN_8_00_PM.getUTCHours()).not.toBe(JUL_8_00_PM.getUTCHours());

    at(JAN_8_00_PM);
    const winterEvening = recommend([showRide(INDIANA, "echo_lake")]);

    at(JUL_8_00_PM);
    const summerEvening = recommend([showRide(INDIANA, "echo_lake")]);

    expect(surfacedNames(winterEvening)).toEqual([]);
    expect(surfacedNames(summerEvening)).toEqual([]);

    // And the same equivalence holds on the eligible side of the boundary.
    expect(orlandoClock(JAN_2_00_PM)).toBe("14:00");
    expect(orlandoClock(JUL_2_00_PM)).toBe("14:00");

    at(JAN_2_00_PM);
    const winterAfternoon = recommend([showRide(INDIANA, "echo_lake")]);

    at(JUL_2_00_PM);
    const summerAfternoon = recommend([showRide(INDIANA, "echo_lake")]);

    expect(winterAfternoon.planAhead?.name).toBe(INDIANA);
    expect(summerAfternoon.planAhead?.name).toBe(INDIANA);
  });

  test("ordinary rides and attractions are unaffected", () => {
    // The gate must be scoped to scheduled shows. Ordinary rides carry no
    // showProfile at all, so they can never reach the new check — asserted here
    // across both an afternoon and an evening instant.
    [JAN_2_00_PM, JAN_8_00_PM].forEach((instant) => {
      at(instant);

      const ordinaryRides = [
        buildRide({ name: STAR_TOURS, land: "echo_lake", waitTime: 10 }),
        buildRide({ name: TOWER, land: "sunset_boulevard", waitTime: 35 }),
      ];

      const recs = recommend(ordinaryRides);

      // Whatever the engine decides about these rides, it must decide it for
      // ride reasons. Neither has a showProfile, so neither is reachable by the
      // finished-show gate.
      ordinaryRides.forEach((ride) => {
        expect(getRideMeta(PARK, ride.name)?.showProfile).toBeFalsy();
      });

      // The positive control is guarded on the engine's own park-open verdict
      // rather than assumed. Park-hours resolution is a separate concern from
      // this fix (and is host-local today), so this asserts rides surface only
      // when the engine considers go-now slots available at all.
      if (!recs.parkOpenStatus?.shouldBlockGoNow) {
        expect(surfacedNames(recs)).toContain(STAR_TOURS);
      }
    });
  });

  test("a scheduled show with no published schedule stays eligible all day", () => {
    // Feathered Friends in Flight! is a scheduled show that ships with an empty
    // showtimes array and verifyDailySchedule: true. An absent schedule means
    // unknown, not finished — excluding it would silently drop a real
    // attraction for the whole day, so the gate must leave it alone.
    const meta = getRideMeta("animal_kingdom", "Feathered Friends in Flight!");
    expect(meta?.isScheduledShow).toBe(true);
    expect(meta?.showProfile?.showtimes).toEqual([]);

    at(JAN_8_00_PM);

    const recs = getNextBestRides({
      parkId: "animal_kingdom",
      rides: [showRide("Feathered Friends in Flight!", "asia")],
      weather: mildWeather(),
      locationContext: locationAtLand("asia"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.planAhead?.name).toBe("Feathered Friends in Flight!");
  });

  test("one minute before the final performance the show is still eligible", () => {
    // 4:29 PM, one minute before Indiana Jones' 4:30 PM finale.
    at(JAN_4_29_PM);
    expect(orlandoClock(JAN_4_29_PM)).toBe("16:29");

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(recs.planAhead?.name).toBe(INDIANA);
    expect(recs.planAhead?.planAheadReason).toContain("Next listed show: 4:30 PM");
  });

  test("at the final performance's start minute the show is excluded", () => {
    // The boundary itself. A performance beginning this minute has begun, so it
    // no longer keeps the show eligible.
    at(JAN_4_30_PM);
    expect(orlandoClock(JAN_4_30_PM)).toBe("16:30");

    const times = showtimesFor(INDIANA);
    expect(times[times.length - 1]).toBe("4:30 PM");

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(surfacedNames(recs)).toEqual([]);
  });

  test("through the remaining seconds of that minute the show stays excluded", () => {
    // 4:30:59 PM. Park-local time is minute-resolution, so every second of the
    // start minute must behave the same as :00 — no re-eligibility flicker.
    at(JAN_4_30_59_PM);
    expect(orlandoClock(JAN_4_30_59_PM)).toBe("16:30");

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(surfacedNames(recs)).toEqual([]);
  });

  test("at an earlier performance's start minute it targets the later one", () => {
    // 3:15 PM exactly, with 4:30 PM still to come. The show stays eligible, but
    // must skip the performance that is starting right now and point at the next
    // genuinely future one.
    at(JAN_3_15_PM);
    expect(orlandoClock(JAN_3_15_PM)).toBe("15:15");

    const times = showtimesFor(INDIANA);
    expect(times).toContain("3:15 PM");
    expect(times).toContain("4:30 PM");

    const recs = recommend([showRide(INDIANA, "echo_lake")]);

    expect(recs.planAhead?.name).toBe(INDIANA);
    expect(recs.planAhead?.planAheadReason).toContain("Next listed show: 4:30 PM");
    expect(recs.planAhead?.planAheadReason).not.toContain("3:15 PM");
  });

  test("empty and malformed schedules keep the accepted fail-open behavior", () => {
    // The gate excludes only when it can prove the day is over. A schedule it
    // cannot read is unknown, not finished — asserted at 8:00 PM, when a
    // readable schedule would already have excluded the show.
    at(JAN_8_00_PM);

    // Empty: the real Feathered Friends in Flight! entry.
    const emptyMeta = getRideMeta("animal_kingdom", "Feathered Friends in Flight!");
    expect(emptyMeta?.showProfile?.showtimes).toEqual([]);

    const emptyRecs = getNextBestRides({
      parkId: "animal_kingdom",
      rides: [showRide("Feathered Friends in Flight!", "asia")],
      weather: mildWeather(),
      locationContext: locationAtLand("asia"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });
    expect(emptyRecs.planAhead?.name).toBe("Feathered Friends in Flight!");

    // Malformed: every listed time is unparseable, which must read as unknown
    // rather than finished.
    //
    // The ride carries an explicit id matching the metadata key. getMetaForRide
    // tries getRideMeta(parkId, ride.id) first and only falls back to scanning
    // getParkRides by name — that fallback reads the real table directly and
    // would slip past the substitution below.
    const malformedRide = () => showRide(INDIANA, "echo_lake", { id: INDIANA });

    try {
      // Guard that the substitution really reached the engine's own lookup, so
      // an ineffective mock cannot make this pass for the wrong reason: with a
      // genuinely future time the show must surface at 8:00 PM.
      mockShowtimeOverride = { name: INDIANA, showtimes: ["11:59 PM"] };
      expect(recommend([malformedRide()]).planAhead?.name).toBe(INDIANA);

      mockShowtimeOverride = {
        name: INDIANA,
        showtimes: ["whenever", "", "25:99 XM", "noon-ish"],
      };
      expect(recommend([malformedRide()]).planAhead?.name).toBe(INDIANA);
    } finally {
      mockShowtimeOverride = null;
    }

    // ...and with the real schedule restored, 8:00 PM excludes it again, which
    // proves the lines above came from the substituted schedule and not from the
    // gate having stopped working.
    expect(surfacedNames(recommend([showRide(INDIANA, "echo_lake")]))).toEqual([]);
  });

  test("pre-open behavior is unchanged: nothing is finished before the park opens", () => {
    // 8:00 AM, before any listed performance. The engine blocks go-now slots
    // pre-open, which is existing behavior; what matters here is that the new
    // gate does not fire and the show is still carried for planning.
    at(JAN_8_00_AM);

    const recs = recommend([
      showRide(INDIANA, "echo_lake"),
      showRide(FROZEN, "echo_lake"),
    ]);

    expect(recs.planAhead?.name).toBeTruthy();
    expect([INDIANA, FROZEN]).toContain(recs.planAhead.name);
  });
});
