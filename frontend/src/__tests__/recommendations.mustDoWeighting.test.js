/**
 * Must-do weighting and shortlist visibility.
 *
 * Field-test scenario these cover: a family in Magic Kingdom selected two
 * geographically close attractions as must-dos. The engine recommended one of
 * them and the other — open, in an adjacent land, and carrying the *better*
 * posted wait — appeared on no card at all.
 *
 * Root cause the fix addresses: Best Move and Smart Backup are drawn from the
 * same score-sorted pool, so the second must-do can be displaced by a
 * non-must-do it lost to by a point or two. A standby must-do then has no
 * admission path into Plan Ahead (plan-ahead category / scheduled show /
 * shouldProtectLater) or Wait On This (shouldProtectLater / poor-value wait),
 * so it leaves the shortlist silently.
 *
 * These tests are deterministic: fixed clock, fixed waits, fixed manual land.
 * They assert slot behaviour and must-do contracts, never a hardcoded ranking.
 */

import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  locationAtLand,
  mildWeather,
  stormWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const STABLE_TEST_NOW = new Date("2026-06-27T16:00:00-04:00");

const TIANAS = "Tiana's Bayou Adventure";
const BIG_THUNDER = "Big Thunder Mountain Railroad";

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(STABLE_TEST_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mustDoEntry(name, { priority = "must_do", land = "frontierland" } = {}) {
  return {
    id: `must-do-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    parkId: PARK,
    type: "attraction",
    priority,
    land,
    source: "plan_tab",
  };
}

function baseRides({ bigThunderWait = 15, tianasWait = 25, overrides = {} } = {}) {
  return [
    MK.tianas({ waitTime: tianasWait, ...(overrides.tianas || {}) }),
    MK.bigThunder({ waitTime: bigThunderWait, ...(overrides.bigThunder || {}) }),
    MK.haunted({ waitTime: 30 }),
    MK.pirates({ waitTime: 20 }),
    MK.jungle({ waitTime: 25 }),
    MK.peterPan({ waitTime: 40 }),
    MK.sevenDwarfs({ waitTime: 60 }),
    MK.spaceMountain({ waitTime: 35 }),
    MK.smallWorld({ waitTime: 10 }),
    MK.pooh({ waitTime: 20 }),
  ];
}

function recommend({
  land = "frontierland",
  mustDos = [],
  rides = baseRides(),
  weather = mildWeather(),
  familyProfile = adultOnlyFamily(),
} = {}) {
  return getNextBestRides({
    parkId: PARK,
    rides,
    weather,
    locationContext: locationAtLand(land),
    familyProfile,
    timeContext: neutralTimeContext(),
    tripPlan: { mustDoExperiences: mustDos },
  });
}

/** Every slot that can surface an attraction on the shortlist. */
function slotEntries(result) {
  return [
    ["bestMove", result.bestMove],
    ["backup", result.backup],
    ["worthTheWalk", result.worthTheWalk],
    ["planAhead", result.planAhead],
    ["waitOnThis", result.waitOnThis],
  ];
}

/** Which slots, if any, an attraction occupies. */
function slotsFor(result, name) {
  return slotEntries(result)
    .filter(([, ride]) => ride && ride.name === name)
    .map(([slot]) => slot);
}

function cardFor(result, name) {
  const hit = slotEntries(result).find(([, ride]) => ride && ride.name === name);
  return hit ? hit[1] : null;
}

/* -------------------------------------------------------------------------- */
/* 1. Neither attraction selected as a must-do                                */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — no selections", () => {
  test("neither attraction carries must-do weighting or must-do copy", () => {
    const result = recommend({ mustDos: [] });

    slotEntries(result).forEach(([, ride]) => {
      if (!ride) return;
      expect(ride.mustDoModifier).toBe(0);
      expect(ride.mustDoPriority).toBeNull();
      expect(ride.shouldProtectLater).toBe(false);
      expect(ride.reason).not.toMatch(/must-do|would-love|nice-if-possible/i);
    });
  });

  test("selecting nothing leaves the go-now slots filled by ordinary scoring", () => {
    const result = recommend({ mustDos: [] });

    expect(result.bestMove).toBeTruthy();
    expect(result.backup).toBeTruthy();
    expect(result.bestMove.name).not.toBe(result.backup.name);
  });
});

/* -------------------------------------------------------------------------- */
/* 2 + 3. One attraction selected                                             */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — single selection", () => {
  test("only the selected attraction receives the must-do modifier", () => {
    const result = recommend({ mustDos: [mustDoEntry(TIANAS)] });

    const tianas = cardFor(result, TIANAS);
    expect(tianas).toBeTruthy();
    expect(tianas.mustDoModifier).toBeGreaterThan(0);
    expect(tianas.mustDoPriority).toBe("must_do");

    const bigThunder = cardFor(result, BIG_THUNDER);
    if (bigThunder) {
      expect(bigThunder.mustDoModifier).toBe(0);
      expect(bigThunder.mustDoPriority).toBeNull();
    }
  });

  test("selecting only the lower-profile attraction still materially lifts it", () => {
    const withoutMustDo = recommend({ land: "adventureland", mustDos: [] });
    const withMustDo = recommend({
      land: "adventureland",
      mustDos: [mustDoEntry(BIG_THUNDER)],
    });

    const before = slotsFor(withoutMustDo, BIG_THUNDER);
    const after = slotsFor(withMustDo, BIG_THUNDER);

    // A must-do selection has to change something. Without it the attraction
    // does not reach the shortlist at all; with it, it does.
    expect(before).toHaveLength(0);
    expect(after.length).toBeGreaterThan(0);
    expect(cardFor(withMustDo, BIG_THUNDER).mustDoModifier).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* 4 + 5 + 10. Both selected — the field scenario and its mirror              */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — two nearby must-dos", () => {
  const CLOSE_LANDS = ["frontierland", "liberty_square", "adventureland"];

  test("field scenario: both reach the shortlist from every nearby land", () => {
    CLOSE_LANDS.forEach((land) => {
      const result = recommend({
        land,
        rides: baseRides({ bigThunderWait: 15, tianasWait: 25 }),
        mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
      });

      expect(slotsFor(result, TIANAS).length).toBeGreaterThan(0);
      expect(slotsFor(result, BIG_THUNDER).length).toBeGreaterThan(0);
    });
  });

  test("field scenario: the two must-dos take Best Move and Smart Backup", () => {
    const result = recommend({
      rides: baseRides({ bigThunderWait: 15, tianasWait: 25 }),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    const goNow = [result.bestMove?.name, result.backup?.name];
    expect(goNow).toContain(TIANAS);
    expect(goNow).toContain(BIG_THUNDER);

    expect(result.bestMove.mustDoModifier).toBeGreaterThan(0);
    expect(result.backup.mustDoModifier).toBeGreaterThan(0);
    expect(result.bestMove.name).not.toBe(result.backup.name);
  });

  test("waits reversed: both still take Best Move and Smart Backup", () => {
    const result = recommend({
      rides: baseRides({ bigThunderWait: 25, tianasWait: 15 }),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    const goNow = [result.bestMove?.name, result.backup?.name];
    expect(goNow).toContain(TIANAS);
    expect(goNow).toContain(BIG_THUNDER);
    expect(result.bestMove.name).not.toBe(result.backup.name);
  });

  test("the must-do with the better wait never leaves the shortlist silently", () => {
    [
      { bigThunderWait: 15, tianasWait: 25, better: BIG_THUNDER },
      { bigThunderWait: 25, tianasWait: 15, better: TIANAS },
    ].forEach(({ bigThunderWait, tianasWait, better }) => {
      const result = recommend({
        rides: baseRides({ bigThunderWait, tianasWait }),
        mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
      });

      const slots = slotsFor(result, better);
      expect(slots.length).toBeGreaterThan(0);
      expect(cardFor(result, better).reason).toBeTruthy();
    });
  });

  test("neither slot is filled twice by the same attraction", () => {
    const result = recommend({
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    const names = slotEntries(result)
      .map(([, ride]) => ride && ride.name)
      .filter(Boolean);

    expect(new Set(names).size).toBe(names.length);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Must-dos versus a genuinely stronger non-must-do                        */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — bounded preference", () => {
  test("a clearly stronger non-must-do keeps the Smart Backup slot", () => {
    // Same land, same must-dos, same competitors — only the second must-do's
    // wait moves. At 25 minutes it trails the strongest same-area non-must-do
    // by more than its own modifier and must not force its way past it; at 15
    // it is within that margin and reclaims the slot. The contrast is the
    // contract: the preference is bounded, not absolute.
    const mustDos = [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)];

    const outOfBand = recommend({
      land: "adventureland",
      rides: baseRides({ bigThunderWait: 25, tianasWait: 15 }),
      mustDos,
    });

    const inBand = recommend({
      land: "adventureland",
      rides: baseRides({ bigThunderWait: 15, tianasWait: 25 }),
      mustDos,
    });

    expect(outOfBand.backup).toBeTruthy();
    expect(outOfBand.backup.mustDoModifier).toBe(0);
    expect(outOfBand.backup.name).not.toBe(BIG_THUNDER);

    expect(inBand.backup).toBeTruthy();
    expect(inBand.backup.name).toBe(BIG_THUNDER);
    expect(inBand.backup.mustDoModifier).toBeGreaterThan(0);
  });

  test("the preference never promotes a must-do above the Best Move", () => {
    const result = recommend({
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    expect(result.bestMove.recommendationScore).toBeGreaterThanOrEqual(
      result.backup.recommendationScore
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 7. A must-do with a genuinely poor wait is held for a better window        */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — held for a better window", () => {
  test("a must-do with a very poor wait is not pushed into the go-now slots", () => {
    const result = recommend({
      rides: baseRides({ bigThunderWait: 15, tianasWait: 95 }),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    const tianas = cardFor(result, TIANAS);
    expect(tianas).toBeTruthy();
    expect(tianas.shouldProtectLater).toBe(true);

    expect(result.bestMove?.name).not.toBe(TIANAS);
    expect(result.backup?.name).not.toBe(TIANAS);

    // It must still be visible, and it must still be explained.
    expect(slotsFor(result, TIANAS).length).toBeGreaterThan(0);
    expect(tianas.reason).toMatch(/save for later|not the right window/i);
  });

  test("the healthy must-do still takes a go-now slot alongside it", () => {
    const result = recommend({
      rides: baseRides({ bigThunderWait: 15, tianasWait: 95 }),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    const goNow = [result.bestMove?.name, result.backup?.name];
    expect(goNow).toContain(BIG_THUNDER);
    expect(cardFor(result, BIG_THUNDER).shouldProtectLater).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 8. Hard eligibility always wins                                            */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — hard eligibility is never overridden", () => {
  test("a closed must-do stays off every slot", () => {
    const result = recommend({
      rides: baseRides({
        overrides: { bigThunder: { isOpen: false, waitTime: null } },
      }),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    expect(slotsFor(result, BIG_THUNDER)).toHaveLength(0);
  });

  test("a weather-blocked must-do stays out of the go-now slots during a storm", () => {
    const result = recommend({
      weather: stormWeather(),
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    // Both are rain-sensitive, so neither may be sent to as a go-now pick.
    [TIANAS, BIG_THUNDER].forEach((name) => {
      expect(result.bestMove?.name).not.toBe(name);
      expect(result.backup?.name).not.toBe(name);
      expect(result.worthTheWalk?.name).not.toBe(name);
      expect(result.planAhead?.name).not.toBe(name);
    });
  });

  test("a height-restricted must-do is not promoted past the height guard", () => {
    const result = recommend({
      mustDos: [mustDoEntry(BIG_THUNDER)],
      familyProfile: adultOnlyFamily({
        shortestHeightInches: 34,
        hasSmallChildren: true,
        childCount: 1,
      }),
    });

    const bigThunder = cardFor(result, BIG_THUNDER);
    if (bigThunder) {
      // If it still surfaces at all, the height warning must be attached.
      expect(bigThunder.heightWarning).toBeTruthy();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 9. Must-do explanation copy only when a real match exists                  */
/* -------------------------------------------------------------------------- */

describe("must-do weighting — explanation copy", () => {
  test("must-do copy appears only on attractions that actually matched", () => {
    const result = recommend({
      mustDos: [mustDoEntry(TIANAS), mustDoEntry(BIG_THUNDER)],
    });

    slotEntries(result).forEach(([, ride]) => {
      if (!ride) return;

      const mentionsMustDo = /one of your (must-do|would-love|nice-if-possible) picks/i.test(
        ride.reason || ""
      );

      expect(mentionsMustDo).toBe(ride.mustDoModifier > 0);
    });
  });

  test("a name that matches nothing in the park produces no must-do copy", () => {
    const result = recommend({
      mustDos: [mustDoEntry("A Ride That Does Not Exist")],
    });

    slotEntries(result).forEach(([, ride]) => {
      if (!ride) return;
      expect(ride.mustDoModifier).toBe(0);
      expect(ride.reason || "").not.toMatch(/one of your .* picks/i);
    });
  });

  test("a must-do selected in a different park does not leak into this park", () => {
    const result = recommend({
      mustDos: [{ ...mustDoEntry(BIG_THUNDER), parkId: "epcot" }],
    });

    slotEntries(result).forEach(([, ride]) => {
      if (!ride) return;
      expect(ride.mustDoModifier).toBe(0);
    });
  });

  test("lower must-do priorities carry proportionally smaller weight", () => {
    const strong = recommend({ mustDos: [mustDoEntry(BIG_THUNDER)] });
    const soft = recommend({
      mustDos: [mustDoEntry(BIG_THUNDER, { priority: "nice_if_possible" })],
    });

    const strongCard = cardFor(strong, BIG_THUNDER);
    const softCard = cardFor(soft, BIG_THUNDER);

    expect(strongCard).toBeTruthy();
    expect(softCard).toBeTruthy();
    expect(strongCard.mustDoModifier).toBeGreaterThan(softCard.mustDoModifier);
    expect(softCard.mustDoPriority).toBe("nice_if_possible");
    expect(softCard.reason).toMatch(/nice-if-possible/i);
  });
});
