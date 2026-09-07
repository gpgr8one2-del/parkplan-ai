/**
 * Regression: Best Move is honest about which land the guest is standing in.
 *
 * The defect: the engine computes a structured `landDistance`, but the Best Move
 * pool still asked isSameArea(), which counts ANY positive proximity modifier as
 * "same area". An adjacent land scores +3, so a neighbouring attraction entered
 * the same-area pool, took the immediate move ahead of everything the family
 * could reach without leaving their land, and never met the quality bar that
 * exists for candidates further away.
 *
 * The product rule this pins is NOT "closest always wins". Proximity matters and
 * is not absolute:
 *
 *   Prefer a worthwhile same-land option unless an eligible adjacent option
 *   offers clearly stronger value — especially an explicit must-do with a rare
 *   low wait.
 *
 * The escape valve is the existing quality gate, applied one step earlier rather
 * than newly invented: a candidate outside the guest's land must post a
 * great_value wait and clear the fallback score floor before it may compete. Once
 * it does, it competes on the score it already carries — must-do modifier
 * included — against the local candidate, which keeps its own proximity and
 * area-gravity advantages. No scoring value was changed to make any of this work.
 *
 * Every scenario below pins an explicit nowIso, so a failure here means the
 * geography rule moved rather than the hour did.
 */

import fs from "fs";
import path from "path";

import { getNextBestRides } from "../rideRecommendations";
import { getRideMeta } from "../rideMetadata";
import {
  MK,
  buildRide,
  adultOnlyFamily,
  familyWithShortestHeight,
  mildWeather,
  stormWeather,
  locationAtLand,
  timeContextAt,
} from "../testUtils/testHelpers";

const PARK = "magic_kingdom";
const HS = "hollywood";

// 1:00 PM Orlando, mid-afternoon, park open, no showtime edge.
const NOW = new Date("2026-06-27T13:00:00-04:00");

const SLOTS = ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"];

function recommend({
  parkId = PARK,
  rides,
  land,
  familyProfile = adultOnlyFamily(),
  weather = mildWeather(),
  mustDos = [],
  completedRideIds = [],
  skippedRideIds = [],
  now = NOW,
} = {}) {
  return getNextBestRides({
    parkId,
    rides,
    weather,
    locationContext: locationAtLand(land),
    familyProfile,
    completedRideIds,
    skippedRideIds,
    timeContext: timeContextAt(now),
    tripPlan: { mustDoExperiences: mustDos },
  });
}

function surfaced(recs) {
  return SLOTS.map((slot) => recs[slot])
    .filter(Boolean)
    .map((ride) => ride.name);
}

function slotOf(recs, name) {
  return SLOTS.find((slot) => recs[slot]?.name === name) || null;
}

function mustDo(name, priority = "must_do") {
  return {
    id: `must-do-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    parkId: PARK,
    type: "attraction",
    priority,
    source: "plan_tab",
  };
}

/** Tomorrowland Speedway is not in the shared fixture set; Gabe's case needs it. */
const speedway = (over = {}) =>
  buildRide({ name: "Tomorrowland Speedway", land: "tomorrowland", ...over });

/** The land the engine's own metadata says an attraction is in. */
function landOf(name, parkId = PARK) {
  return getRideMeta(parkId, name)?.land ?? null;
}

/* -------------------------------------------------------------------------- */
/* 1-2. A neighbour cannot walk in unearned                                   */
/* -------------------------------------------------------------------------- */

describe("an adjacent attraction must earn Best Move", () => {
  test("a same-land option with equal value beats an ordinary adjacent one", () => {
    // Identical waits, comparable attractions, one land apart. The family is
    // standing in Tomorrowland, so Tomorrowland wins — proximity and area
    // gravity are exactly the advantages a local option is supposed to have.
    const recs = recommend({
      rides: [MK.buzz({ waitTime: 10 }), MK.ariel({ waitTime: 10 })],
      land: "tomorrowland",
    });

    expect(recs.bestMove?.name).toBe("Buzz Lightyear's Space Ranger Spin");
    expect(landOf(recs.bestMove.name)).toBe("tomorrowland");
    expect(recs.bestMove.landDistance).toBe("same");

    // The neighbour is not banished — it is simply offered second.
    expect(surfaced(recs)).toContain("Under the Sea ~ Journey of The Little Mermaid");
  });

  test("an adjacent attraction that fails the quality gate cannot take Best Move", () => {
    // Peter Pan at 45 posts a great_value wait, and outscores Buzz. It is still
    // refused the immediate move: it is a low-capacity classic a land away, and
    // the gate holds those to a genuinely rare wait. Score alone is not a
    // passport across a land boundary.
    const recs = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.peterPan({ waitTime: 45 })],
      land: "tomorrowland",
    });

    const peterPan = SLOTS.map((s) => recs[s]).find((r) => r?.name === "Peter Pan's Flight");

    expect(recs.bestMove?.name).toBe("Buzz Lightyear's Space Ranger Spin");
    expect(peterPan).toBeTruthy();
    expect(peterPan.recommendationScore).toBeGreaterThan(recs.bestMove.recommendationScore);
    expect(slotOf(recs, "Peter Pan's Flight")).not.toBe("bestMove");
  });

  test("the canonical case: Peter Pan does not beat Tomorrowland from Tomorrowland", () => {
    const recs = recommend({
      rides: [
        MK.peterPan({ waitTime: 30 }),
        MK.buzz({ waitTime: 25 }),
        MK.peopleMover({ waitTime: 10 }),
      ],
      land: "tomorrowland",
    });

    expect(recs.bestMove?.name).not.toBe("Peter Pan's Flight");
    expect(recs.bestMove.landDistance).toBe("same");
  });
});

/* -------------------------------------------------------------------------- */
/* 3-4. Nothing good enough, and something good enough                        */
/* -------------------------------------------------------------------------- */

describe("when there is nothing local", () => {
  test("all-poor adjacent and far choices produce no Best Move at all", () => {
    // Nothing in the guest's land, and nothing elsewhere posting a rare wait.
    // TOHI says so rather than manufacturing a walk.
    const recs = recommend({
      rides: [
        MK.peterPan({ waitTime: 65 }),
        MK.jungle({ waitTime: 70 }),
        MK.haunted({ waitTime: 60 }),
        MK.pooh({ waitTime: 55 }),
      ],
      land: "tomorrowland",
    });

    expect(recs.bestMove).toBeNull();
  });

  test("an adjacent attraction with exceptional value still wins when nothing local exists", () => {
    // The other half of the same rule. The gate is a bar, not a wall.
    const recs = recommend({
      rides: [MK.sevenDwarfs({ waitTime: 15 }), MK.peterPan({ waitTime: 60 })],
      land: "tomorrowland",
    });

    expect(recs.bestMove?.name).toBe("Seven Dwarfs Mine Train");
    expect(recs.bestMove.landDistance).not.toBe("same");
    expect(recs.bestMove.waitValueStatus?.status).toBe("great_value");
  });
});

/* -------------------------------------------------------------------------- */
/* 5-7. The must-do escape valve                                              */
/* -------------------------------------------------------------------------- */

describe("an explicit must-do a land away", () => {
  test("Gabe's case: Speedway is closer, but a must-do Seven Dwarfs at a rare wait wins", () => {
    // Standing in Tomorrowland. Speedway is right there. Seven Dwarfs is one
    // land over, is on the family's list, and is posting a wait it almost never
    // posts. TOHI must not ignore it just because Speedway is closer.
    const recs = recommend({
      rides: [speedway({ waitTime: 15 }), MK.sevenDwarfs({ waitTime: 20 })],
      land: "tomorrowland",
      mustDos: [mustDo("Seven Dwarfs Mine Train")],
    });

    expect(recs.bestMove?.name).toBe("Seven Dwarfs Mine Train");
    expect(recs.bestMove.mustDoModifier).toBeGreaterThan(0);
    expect(recs.bestMove.waitValueStatus?.status).toBe("great_value");

    // The closer option is still offered — it lost the slot, not its place.
    expect(surfaced(recs)).toContain("Tomorrowland Speedway");
  });

  test("the same must-do at a poor wait does not win, and is kept for a better window", () => {
    // Identical family, identical geography, ordinary wait. The must-do does not
    // buy its way to the front; it waits for a window worth walking for.
    const recs = recommend({
      rides: [speedway({ waitTime: 15 }), MK.sevenDwarfs({ waitTime: 75 })],
      land: "tomorrowland",
      mustDos: [mustDo("Seven Dwarfs Mine Train")],
    });

    expect(recs.bestMove?.name).toBe("Tomorrowland Speedway");
    expect(recs.bestMove.landDistance).toBe("same");

    // Still on the family's radar, in a slot that explains the timing.
    const slot = slotOf(recs, "Seven Dwarfs Mine Train");
    expect(slot).toBeTruthy();
    expect(slot).not.toBe("bestMove");
  });

  test("a must-do at a rare wait beats a merely convenient local attraction", () => {
    // PeopleMover is a pleasant local filler. It does not outrank a goal the
    // family named, at a wait that rarely appears, one land away.
    const recs = recommend({
      rides: [MK.peopleMover({ waitTime: 5 }), MK.sevenDwarfs({ waitTime: 20 })],
      land: "tomorrowland",
      mustDos: [mustDo("Seven Dwarfs Mine Train")],
    });

    expect(recs.bestMove?.name).toBe("Seven Dwarfs Mine Train");
  });
});

/* -------------------------------------------------------------------------- */
/* 8-9. Local options stay visible                                            */
/* -------------------------------------------------------------------------- */

describe("local attractions are not made invisible", () => {
  test("PeopleMover and Buzz still surface after Space Mountain is completed", () => {
    // buildRide mints a fresh id per call, so the ride that goes into the pool
    // is the same object whose id is marked completed.
    const spaceMountain = MK.spaceMountain({ waitTime: 35 });

    const recs = recommend({
      rides: [
        spaceMountain,
        MK.buzz({ waitTime: 15 }),
        MK.peopleMover({ waitTime: 5 }),
        MK.ariel({ waitTime: 15 }),
      ],
      land: "tomorrowland",
      completedRideIds: [spaceMountain.id],
    });

    const names = surfaced(recs);
    expect(names).not.toContain("Space Mountain");
    expect(names).toContain("Buzz Lightyear's Space Ranger Spin");
    expect(names).toContain("Tomorrowland Transit Authority PeopleMover");
    expect(recs.bestMove.landDistance).toBe("same");
  });

  test("an adjacent attraction refused Best Move is still eligible for a later slot", () => {
    const recs = recommend({
      rides: [MK.buzz({ waitTime: 15 }), MK.pooh({ waitTime: 20 })],
      land: "tomorrowland",
    });

    expect(recs.bestMove?.name).toBe("Buzz Lightyear's Space Ranger Spin");
    expect(surfaced(recs)).toContain("The Many Adventures of Winnie the Pooh");
  });
});

/* -------------------------------------------------------------------------- */
/* 10. Every existing exclusion still holds                                   */
/* -------------------------------------------------------------------------- */

describe("no recommendation crosses an existing exclusion", () => {
  test("a closed attraction is never recommended, however good its wait", () => {
    const recs = recommend({
      rides: [MK.sevenDwarfs({ waitTime: 10, isOpen: false }), MK.buzz({ waitTime: 40 })],
      land: "tomorrowland",
    });

    expect(surfaced(recs)).not.toContain("Seven Dwarfs Mine Train");
  });

  test("a completed attraction is never recommended", () => {
    const sevenDwarfs = MK.sevenDwarfs({ waitTime: 10 });

    const recs = recommend({
      rides: [sevenDwarfs, MK.buzz({ waitTime: 40 })],
      land: "tomorrowland",
      completedRideIds: [sevenDwarfs.id],
    });

    expect(surfaced(recs)).not.toContain("Seven Dwarfs Mine Train");
  });

  test("a skipped attraction is never recommended", () => {
    const sevenDwarfs = MK.sevenDwarfs({ waitTime: 10 });

    const recs = recommend({
      rides: [sevenDwarfs, MK.buzz({ waitTime: 40 })],
      land: "tomorrowland",
      skippedRideIds: [sevenDwarfs.id],
    });

    expect(surfaced(recs)).not.toContain("Seven Dwarfs Mine Train");
  });

  test("a height-ineligible attraction is never recommended, even as a must-do", () => {
    // Seven Dwarfs requires 38 inches. The shortest rider is 34.
    const recs = recommend({
      rides: [MK.sevenDwarfs({ waitTime: 10 }), MK.buzz({ waitTime: 40 })],
      land: "tomorrowland",
      familyProfile: familyWithShortestHeight(34),
      mustDos: [mustDo("Seven Dwarfs Mine Train")],
    });

    expect(surfaced(recs)).not.toContain("Seven Dwarfs Mine Train");
  });

  test("an active storm still blocks an exposed adjacent attraction from the immediate slots", () => {
    // Big Thunder is outdoor. A rare wait does not make it a good idea in a storm.
    const recs = recommend({
      rides: [MK.bigThunder({ waitTime: 10 }), MK.philharmagic({ waitTime: 20 })],
      land: "tomorrowland",
      weather: stormWeather(),
    });

    const immediate = ["bestMove", "backup", "worthTheWalk"]
      .map((slot) => recs[slot])
      .filter(Boolean)
      .map((ride) => ride.name);

    expect(immediate).not.toContain("Big Thunder Mountain Railroad");
  });

  test("pre-open gating still suppresses the immediate slots entirely", () => {
    // 8:00 AM Orlando, before a 9:00 AM open and before Early Entry.
    const recs = recommend({
      rides: [MK.sevenDwarfs({ waitTime: 10 }), MK.buzz({ waitTime: 10 })],
      land: "tomorrowland",
      now: new Date("2026-01-15T13:00:00.000Z"),
    });

    expect(recs.parkOpenStatus.isPreOpen).toBe(true);
    expect(recs.bestMove).toBeNull();
    expect(recs.backup).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* 11. Distance categories, not a Magic Kingdom lookup table                  */
/* -------------------------------------------------------------------------- */

describe("the rule is about distance categories, not named attractions", () => {
  test("it holds in Hollywood Studios with none of the Magic Kingdom names", () => {
    // Standing in Echo Lake. Tower of Terror is a headliner one land over at an
    // ordinary wait; Star Tours is right here. The same rule decides it.
    const recs = recommend({
      parkId: HS,
      rides: [
        buildRide({ name: "Star Tours – The Adventures Continue", land: "echo_lake", waitTime: 10 }),
        buildRide({ name: "The Twilight Zone Tower of Terror", land: "sunset_boulevard", waitTime: 45 }),
      ],
      land: "echo_lake",
    });

    expect(recs.bestMove?.name).toBe("Star Tours – The Adventures Continue");
    expect(landOf("Star Tours – The Adventures Continue", HS)).toBe("echo_lake");
    expect(recs.bestMove.landDistance).toBe("same");

    // Still offered, just not as the immediate move.
    expect(surfaced(recs)).toContain("The Twilight Zone Tower of Terror");
  });

  test("no attraction name is hardcoded into the Best Move selection", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "rideRecommendations.js"),
      "utf8"
    );

    // The selection block must decide from landDistance and the shared quality
    // gate, never from a list of rides. isLowCapacityClassic is metadata-driven
    // and lives far above this block; the guard is scoped to the selection.
    const start = source.indexOf("const qualifiedNonLocalRides");
    const end = source.indexOf("const usedAfterBest");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const selectionBlock = source.slice(start, end);
    for (const name of [
      "Peter Pan",
      "Seven Dwarfs",
      "Speedway",
      "Mermaid",
      "Buzz",
      "PeopleMover",
    ]) {
      expect(selectionBlock).not.toContain(name);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 12. The card explains the geography the ranking used                       */
/* -------------------------------------------------------------------------- */

describe("explanation geography matches ranking geography", () => {
  test("a same-land winner may claim proximity; an adjacent winner may not", () => {
    const local = recommend({
      rides: [MK.buzz({ waitTime: 10 }), MK.ariel({ waitTime: 10 })],
      land: "tomorrowland",
    });

    expect(local.bestMove.landDistance).toBe("same");
    expect(local.bestMove.reason).toMatch(/nearby/i);

    const adjacent = recommend({
      rides: [speedway({ waitTime: 15 }), MK.sevenDwarfs({ waitTime: 20 })],
      land: "tomorrowland",
      mustDos: [mustDo("Seven Dwarfs Mine Train")],
    });

    expect(adjacent.bestMove.landDistance).toBe("adjacent");
    expect(adjacent.bestMove.reason).not.toMatch(/already nearby/i);
    expect(adjacent.bestMove.reason).not.toMatch(/saves a walk/i);
  });

  test("every surfaced card's stated geography agrees with its landDistance", () => {
    const recs = recommend({
      rides: [
        MK.buzz({ waitTime: 15 }),
        MK.peopleMover({ waitTime: 5 }),
        MK.ariel({ waitTime: 15 }),
        MK.pooh({ waitTime: 20 }),
      ],
      land: "tomorrowland",
    });

    for (const slot of SLOTS) {
      const ride = recs[slot];
      if (!ride?.reason) continue;

      if (ride.landDistance !== "same") {
        expect(ride.reason).not.toMatch(/already nearby/i);
      }
    }
  });
});
