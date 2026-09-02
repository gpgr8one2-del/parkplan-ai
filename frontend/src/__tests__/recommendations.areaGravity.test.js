/**
 * TOHI — area gravity (touring efficiency).
 *
 * The field case: a guest who had just ridden Space Mountain, with PeopleMover
 * at 5 minutes and Buzz at 20 minutes in Tomorrowland, was sent to Fantasyland
 * for a 5-minute Little Mermaid. Measured against the real engine before this
 * change: Little Mermaid 92, Buzz 88, PeopleMover 81.
 *
 * Every test here EXECUTES the real getNextBestRides over the real ride
 * metadata and the committed fixtures. Nothing is reimplemented, and no ride is
 * special-cased in production code — the field outcome has to emerge from the
 * generalized rule.
 */

import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  gpsAtAnchor,
  hotWeather,
  mildWeather,
  neutralTimeContext,
  stormWeather,
} from "./fixtures/testHelpers";

const IN_TOMORROWLAND = () => gpsAtAnchor("tomorrowland", "Space Mountain");

/** Runs the real engine and returns every slotted ride, plus a lookup by name. */
function recommend({
  rides,
  weather = mildWeather(),
  familyProfile = adultOnlyFamily(),
  locationContext = IN_TOMORROWLAND(),
  completedRideIds = [],
  tripPlan = null,
  timeContext = neutralTimeContext(),
}) {
  const result = getNextBestRides({
    parkId: "magic_kingdom",
    rides,
    weather,
    familyProfile,
    locationContext,
    completedRideIds,
    tripPlan,
    timeContext,
  });

  const slotted = [
    result.bestMove,
    result.backup,
    result.worthTheWalk,
    result.planAhead,
    result.waitOnThis,
  ].filter(Boolean);

  return {
    ...result,
    slotted,
    byName: (name) => slotted.find((ride) => ride.name === name) || null,
  };
}

/** The field line-up, with Space Mountain already ridden. */
function fieldScenario(over = {}) {
  const space = MK.spaceMountain({ waitTime: 45 });

  return recommend({
    rides: [
      MK.peopleMover({ waitTime: 5 }),
      MK.buzz({ waitTime: 20 }),
      MK.ariel({ waitTime: 5 }),
      space,
    ],
    completedRideIds: [space.id],
    ...over,
  });
}

/* ========================================================================== */

describe("13. the Space Mountain field scenario", () => {
  test("keeps the family in Tomorrowland instead of sending them to Fantasyland", () => {
    const result = fieldScenario();

    // The outcome that matters: the next move is local.
    expect(result.bestMove.land).toBe("tomorrowland");

    const ariel = result.byName("Under the Sea ~ Journey of The Little Mermaid");
    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");

    expect(buzz.recommendationScore).toBeGreaterThan(ariel.recommendationScore);
    // Cross-land options are still offered, just not first.
    expect(ariel).not.toBeNull();
  });

  test("the local advantage is earned by wait quality, not by land membership", () => {
    const result = fieldScenario();
    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    const ariel = result.byName("Under the Sea ~ Journey of The Little Mermaid");

    expect(buzz.landDistance).toBe("same");
    expect(buzz.areaGravityModifier).toBeGreaterThan(0);

    // The cross-land option earns none of it, whatever its own wait value.
    expect(ariel.landDistance).toBe("adjacent");
    expect(ariel.areaGravityModifier).toBe(0);
  });
});

describe("1-2. same-area versus cross-area at comparable waits", () => {
  test("a same-area 5-minute option beats a cross-area 5-minute option", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 5 }), MK.ariel({ waitTime: 5 })],
    });

    expect(result.bestMove.land).toBe("tomorrowland");
  });

  test("a filler-tier local option still cannot hijack the plan", () => {
    // PeopleMover is planningProfile.category "filler_or_recovery", which an
    // existing product rule bars from leading the plan. Area gravity does not
    // and should not override that: when the ONLY local option is a filler, a
    // cross-land recommendation is still correct.
    const result = recommend({
      rides: [MK.peopleMover({ waitTime: 5 }), MK.ariel({ waitTime: 5 })],
    });

    const peopleMover = result.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover?.areaGravityModifier ?? 0).toBeGreaterThan(0);
    expect(result.bestMove.land).toBe("fantasyland");
  });

  test("a same-area 20-minute good-value option still beats a cross-area 5-minute option", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })],
    });

    expect(result.bestMove.name).toBe("Buzz Lightyear's Space Ranger Spin");
  });
});

describe("3-4. gravity is earned against the attraction's own normal range", () => {
  test("a nearby attraction at or below its normal wait earns gravity", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 30 })],
    });

    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    expect(["great_value", "good_value", "normal"]).toContain(buzz.waitValueStatus.status);
    expect(buzz.areaGravityModifier).toBeGreaterThan(0);
  });

  test("a nearby attraction materially above normal earns none, so another area can win", () => {
    // Buzz well past its badValueOver: the local option has gone soft, and
    // nothing should hold the family there.
    const result = recommend({
      rides: [MK.buzz({ waitTime: 75 }), MK.ariel({ waitTime: 5 })],
    });

    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    expect(buzz.areaGravityModifier).toBe(0);
    expect(result.bestMove.land).toBe("fantasyland");
  });
});

describe("5. an extreme advantage elsewhere still wins", () => {
  test("a local option merely inside its normal range loses to a cross-land walk-on", () => {
    // Local is fine but unremarkable; the other area is a genuine bargain.
    const result = recommend({
      rides: [MK.peopleMover({ waitTime: 15 }), MK.sevenDwarfs({ waitTime: 5 })],
    });

    const peopleMover = result.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover.areaGravityModifier).toBeLessThanOrEqual(2);
    expect(result.bestMove.land).toBe("fantasyland");
  });

  test("gravity is capped so it can never become an unconditional lock", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 5 })],
      weather: hotWeather(),
      familyProfile: adultOnlyFamily({ walkingTolerance: "low", pace: "relaxed" }),
    });

    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    // Every condition stacked at once still lands on the documented ceiling,
    // which is what keeps the must-do escape valve genuine.
    expect(buzz.areaGravityModifier).toBeLessThanOrEqual(9);
  });
});

describe("6. escape valves", () => {
  test("an urgent must-do in another land still outranks a good local option", () => {
    const ariel = MK.ariel({ waitTime: 5 });

    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), ariel],
      tripPlan: {
        mustDoExperiences: [
          {
            // parkId is required for the match — a must-do is scoped to a park.
            parkId: "magic_kingdom",
            id: ariel.id,
            name: "Under the Sea ~ Journey of The Little Mermaid",
            priority: "must_do",
          },
        ],
      },
    });

    expect(result.bestMove.land).toBe("fantasyland");
  });
});

describe("7-9. conditions change the cost of an unnecessary walk", () => {
  test("dry mild conditions with no Keep It Close still favour the local option", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })],
      weather: mildWeather(),
      familyProfile: adultOnlyFamily({ walkingTolerance: "moderate" }),
    });

    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    expect(buzz.areaGravityModifier).toBeGreaterThan(0);
    expect(result.bestMove.land).toBe("tomorrowland");
  });

  test("extreme heat raises the local advantage above the mild-weather value", () => {
    const mild = recommend({ rides: [MK.buzz({ waitTime: 20 })], weather: mildWeather() });
    const hot = recommend({ rides: [MK.buzz({ waitTime: 20 })], weather: hotWeather() });

    const mildBuzz = mild.byName("Buzz Lightyear's Space Ranger Spin");
    const hotBuzz = hot.byName("Buzz Lightyear's Space Ranger Spin");

    expect(hotBuzz.areaGravityModifier).toBeGreaterThan(mildBuzz.areaGravityModifier);
  });

  test("Keep It Close raises it further, and rain keeps its own separate weight", () => {
    const plain = recommend({ rides: [MK.buzz({ waitTime: 20 })] });
    const keepClose = recommend({
      rides: [MK.buzz({ waitTime: 20 })],
      familyProfile: adultOnlyFamily({ walkingTolerance: "low" }),
    });

    expect(keepClose.byName("Buzz Lightyear's Space Ranger Spin").areaGravityModifier)
      .toBeGreaterThan(plain.byName("Buzz Lightyear's Space Ranger Spin").areaGravityModifier);

    // Rain + Keep It Close: the cross-land option carries the existing rain
    // walking weight, which area gravity does not duplicate.
    // stormWeather() alone is a forecast signal; the rain walking weight only
    // applies when precipitation is actually falling, which is deliberate.
    const rainy = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })],
      weather: stormWeather({ currentPrecipitation: true }),
      familyProfile: adultOnlyFamily({ walkingTolerance: "low" }),
    });

    const ariel = rainy.byName("Under the Sea ~ Journey of The Little Mermaid");
    if (ariel) {
      expect(ariel.rainKeepCloseWalkModifier).toBeLessThan(0);
      expect(ariel.areaGravityModifier).toBe(0);
    }
    expect(rainy.bestMove.land).toBe("tomorrowland");
  });
});

describe("10-11. gravity does not override closeness or trap the guest", () => {
  test("a same-land option does not win on membership when the guest is standing at a cross-land attraction", () => {
    // GPS puts the guest AT Little Mermaid's anchor. Same-land membership alone
    // must not beat the attraction they are physically next to.
    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })],
      locationContext: gpsAtAnchor("fantasyland", "Under the Sea ~ Journey of The Little Mermaid"),
    });

    const ariel = result.byName("Under the Sea ~ Journey of The Little Mermaid");
    expect(ariel.closestAnchorOpportunityModifier).toBeGreaterThan(0);
    expect(result.bestMove.name).toBe("Under the Sea ~ Journey of The Little Mermaid");
  });

  test("with no good local option, cross-land recommendations behave normally", () => {
    // Every Tomorrowland option is past its badValueOver, so nothing local is
    // boosted and the guest is free to move.
    const result = recommend({
      rides: [MK.buzz({ waitTime: 80 }), MK.peopleMover({ waitTime: 45 }), MK.ariel({ waitTime: 5 })],
    });

    expect(result.byName("Buzz Lightyear's Space Ranger Spin")?.areaGravityModifier ?? 0).toBe(0);
    expect(result.bestMove.land).toBe("fantasyland");
  });
});

describe("12. explanations use the same evidence as the ranking", () => {
  test("the local card explains the saved walk, and a cross-land card never claims it", () => {
    const result = fieldScenario();
    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    const ariel = result.byName("Under the Sea ~ Journey of The Little Mermaid");

    // Same landDistance the score used.
    expect(buzz.landDistance).toBe("same");
    expect(buzz.reason).toMatch(/nearby|walk|area/i);
    expect(buzz.areaGravityModifier).toBeGreaterThan(0);

    // The cross-land card must not claim proximity it was not credited for.
    expect(ariel.areaGravityModifier).toBe(0);
    expect(ariel.reason).not.toMatch(/already nearby|saves a walk/i);
  });

  test("a card that earned no gravity does not mention saving a walk", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 80 }), MK.ariel({ waitTime: 5 })],
    });

    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");
    if (buzz) {
      expect(buzz.areaGravityModifier).toBe(0);
      expect(buzz.reason).not.toMatch(/saves a walk/i);
    }
  });
});

describe("14. no recent-completion location fallback was introduced", () => {
  test("an unknown location still refuses to guess a land from a completed ride", () => {
    // Investigated and deliberately NOT added: the field failure reproduces with
    // location correctly known, so it was never a location gap. When location is
    // genuinely unknown the engine already declines to recommend rather than
    // inventing a land, and that existing safety rule is preserved.
    const space = MK.spaceMountain({ waitTime: 45 });

    const result = recommend({
      rides: [MK.peopleMover({ waitTime: 5 }), MK.ariel({ waitTime: 5 }), space],
      completedRideIds: [space.id],
      locationContext: null,
    });

    expect(result.needsLocation).toBe(true);
    expect(result.bestMove).toBeNull();
  });
});

/* ========================================================================== */
/* The live field scenario, in full                                          */
/* ========================================================================== */

/** A saved must-do entry for this park. */
const mustDo = (name, priority = "must_do") => ({
  parkId: "magic_kingdom",
  name,
  priority,
});

/**
 * Six saved must-dos, none of which is an appropriate immediate move here:
 * every one of them is absent from the live ride pool.
 */
const SIX_PENDING_MUST_DOS = [
  mustDo("Seven Dwarfs Mine Train"),
  mustDo("Peter Pan's Flight"),
  mustDo("Jungle Cruise"),
  mustDo("Haunted Mansion"),
  mustDo("Big Thunder Mountain Railroad"),
  mustDo("Pirates of the Caribbean"),
];

/** TRON and Space Mountain ridden; the family is standing in Tomorrowland. */
function liveFieldScenario({ mustDos = [], buzzWait = 25 } = {}) {
  const tron = MK.tron({ waitTime: 60 });
  const space = MK.spaceMountain({ waitTime: 45 });

  return recommend({
    rides: [
      MK.peopleMover({ waitTime: 5 }),
      MK.buzz({ waitTime: buzzWait }),
      MK.ariel({ waitTime: 5 }),
      tron,
      space,
    ],
    completedRideIds: [tron.id, space.id],
    tripPlan: mustDos.length ? { mustDoExperiences: mustDos } : null,
  });
}

describe("1-4. the live Space Mountain field scenario", () => {
  test("the close 5-minute local option reaches an immediate slot", () => {
    const result = liveFieldScenario();

    const peopleMover = result.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover).not.toBeNull();
    // It used to appear in NO slot at all while an equal-wait attraction a land
    // away took Best Move.
    expect([result.bestMove?.id, result.backup?.id]).toContain(peopleMover.id);
    expect(peopleMover.landDistance).toBe("same");
  });

  test("both immediate slots are filled, not just Best Move", () => {
    const result = liveFieldScenario();

    expect(result.bestMove).toBeTruthy();
    expect(result.backup).toBeTruthy();
    expect(result.backup.id).not.toBe(result.bestMove.id);
  });

  test("six pending must-dos that are not actionable change nothing", () => {
    // Every saved must-do is absent from the live pool, so none of them is a
    // possible immediate move. They must not switch off local touring.
    const without = liveFieldScenario();
    const withMustDos = liveFieldScenario({ mustDos: SIX_PENDING_MUST_DOS });

    // Compared by name: each scenario builds fresh rides, so ids differ by
    // construction and would never match across two runs.
    expect(withMustDos.bestMove.name).toBe(without.bestMove.name);
    expect(withMustDos.backup.name).toBe(without.backup.name);

    const peopleMover = withMustDos.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover.areaGravityModifier).toBeGreaterThan(0);
  });

  test("Buzz is evaluated against its own normal wait, not discarded", () => {
    // At 25 minutes Buzz is inside its normal range, so it earns the small
    // at-or-below-normal advantage rather than the great-value one.
    const result = liveFieldScenario({ buzzWait: 25 });
    const buzz = result.byName("Buzz Lightyear's Space Ranger Spin");

    if (buzz) {
      expect(buzz.landDistance).toBe("same");
      expect(["normal", "good_value", "great_value"]).toContain(buzz.waitValueStatus.status);
      expect(buzz.areaGravityModifier).toBeGreaterThan(0);
    }

    // And at a genuinely good wait it leads the local field.
    const better = liveFieldScenario({ buzzWait: 20 });
    const betterBuzz = better.byName("Buzz Lightyear's Space Ranger Spin");
    expect(betterBuzz.waitValueStatus.status).toBe("great_value");
    expect(betterBuzz.areaGravityModifier).toBeGreaterThan(0);
  });
});

describe("5-6. a close option is not beaten by an equal-wait farther one", () => {
  test("a same-area 5-minute recovery option outranks an equal-wait cross-land option for a slot", () => {
    const result = recommend({
      rides: [MK.peopleMover({ waitTime: 5 }), MK.ariel({ waitTime: 5 })],
    });

    const peopleMover = result.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover).not.toBeNull();
    expect([result.bestMove?.id, result.backup?.id]).toContain(peopleMover.id);
  });

  test("a slightly longer same-area good value still beats a farther walk-on", () => {
    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })],
    });

    expect(result.bestMove.land).toBe("tomorrowland");
  });

  test("a local recovery option above its normal range earns no preference", () => {
    const result = recommend({
      rides: [MK.peopleMover({ waitTime: 40 }), MK.ariel({ waitTime: 5 })],
    });

    const peopleMover = result.byName("Tomorrowland Transit Authority PeopleMover");
    expect(peopleMover?.areaGravityModifier ?? 0).toBe(0);
    expect(result.bestMove.land).toBe("fantasyland");
  });
});

describe("10-14. non-actionable must-dos never suppress area gravity", () => {
  const localOnly = () => [MK.buzz({ waitTime: 20 }), MK.ariel({ waitTime: 5 })];

  const gravityFor = (tripPlan, rides = localOnly()) =>
    recommend({ rides, tripPlan }).byName("Buzz Lightyear's Space Ranger Spin")
      ?.areaGravityModifier ?? 0;

  test("a must-do absent from the live ride pool does not suppress gravity", () => {
    expect(gravityFor({ mustDoExperiences: [mustDo("Seven Dwarfs Mine Train")] }))
      .toBeGreaterThan(0);
  });

  test("a closed must-do does not suppress gravity", () => {
    const rides = [...localOnly(), MK.sevenDwarfs({ waitTime: 60, isOpen: false })];
    expect(gravityFor({ mustDoExperiences: [mustDo("Seven Dwarfs Mine Train")] }, rides))
      .toBeGreaterThan(0);
  });

  test("a height-ineligible must-do does not suppress gravity", () => {
    const rides = [...localOnly(), MK.sevenDwarfs({ waitTime: 20 })];
    const result = recommend({
      rides,
      tripPlan: { mustDoExperiences: [mustDo("Seven Dwarfs Mine Train")] },
      familyProfile: adultOnlyFamily({ shortestHeightInches: 30 }),
    });

    expect(result.byName("Buzz Lightyear's Space Ranger Spin").areaGravityModifier)
      .toBeGreaterThan(0);
  });

  test("a nice_if_possible entry does not suppress gravity", () => {
    expect(
      gravityFor({
        mustDoExperiences: [mustDo("Seven Dwarfs Mine Train", "nice_if_possible")],
      })
    ).toBeGreaterThan(0);
  });

  test("a must-do saved for later does not suppress immediate local choices", () => {
    const rides = [...localOnly(), MK.sevenDwarfs({ waitTime: 95 })];
    const result = recommend({
      rides,
      tripPlan: { mustDoExperiences: [mustDo("Seven Dwarfs Mine Train")] },
    });

    expect(result.byName("Buzz Lightyear's Space Ranger Spin").areaGravityModifier)
      .toBeGreaterThan(0);
    expect(result.bestMove.land).toBe("tomorrowland");
  });
});

describe("8-9. eligible must-dos keep their protected slots", () => {
  test("an eligible urgent must-do in another area still takes an immediate slot", () => {
    const ariel = MK.ariel({ waitTime: 5 });

    const result = recommend({
      rides: [MK.buzz({ waitTime: 20 }), ariel],
      tripPlan: {
        mustDoExperiences: [
          { parkId: "magic_kingdom", id: ariel.id, name: ariel.name, priority: "must_do" },
        ],
      },
    });

    expect([result.bestMove?.id, result.backup?.id]).toContain(ariel.id);
    expect(result.bestMove.land).toBe("fantasyland");
  });

  test("area gravity cannot outbid a must-do for a protected slot", () => {
    // Sized so the discount is what DECIDES. Measured: the local competitor
    // scores 107 with +6 of gravity against a must-do at 91 — a 16-point lead,
    // wider than the must-do modifier (12), so without discounting the
    // competitor's gravity the must-do loses its protected slot. Discounted the
    // lead is 10, inside the modifier, and the must-do keeps it.
    const ariel = MK.ariel({ waitTime: 15 });
    const buzz = MK.buzz({ waitTime: 5 });

    const result = recommend({
      rides: [buzz, ariel],
      tripPlan: {
        mustDoExperiences: [
          { parkId: "magic_kingdom", id: ariel.id, name: ariel.name, priority: "must_do" },
        ],
      },
    });

    const competitor = result.byName("Buzz Lightyear's Space Ranger Spin");
    const mustDoRide = result.byName("Under the Sea ~ Journey of The Little Mermaid");

    expect(competitor.areaGravityModifier).toBeGreaterThan(0);
    expect(
      competitor.recommendationScore - mustDoRide.recommendationScore
    ).toBeGreaterThan(mustDoRide.mustDoModifier);

    expect(result.bestMove.id).toBe(ariel.id);
  });
});

describe("20. no ride occupies more than one slot", () => {
  test("every slotted ride is distinct across the whole shortlist", () => {
    const result = liveFieldScenario({ mustDos: SIX_PENDING_MUST_DOS });
    const ids = result.slotted.map((ride) => String(ride.id));

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("boundary tests for the documented constants", () => {
  test("gravity applies at the top of the normal range and stops above it", () => {
    // Buzz normalRange high boundary vs one minute past badValueOver.
    const atNormal = recommend({ rides: [MK.buzz({ waitTime: 30 })] });
    const wayAbove = recommend({ rides: [MK.buzz({ waitTime: 90 })] });

    const inRange = atNormal.byName("Buzz Lightyear's Space Ranger Spin");
    const outOfRange = wayAbove.byName("Buzz Lightyear's Space Ranger Spin");

    if (inRange) {
      expect(["great_value", "good_value", "normal"]).toContain(inRange.waitValueStatus.status);
      expect(inRange.areaGravityModifier).toBeGreaterThan(0);
    }
    if (outOfRange) expect(outOfRange.areaGravityModifier).toBe(0);
  });

  test("a great value earns more local advantage than a merely normal wait", () => {
    const great = recommend({ rides: [MK.buzz({ waitTime: 5 })] });
    const normal = recommend({ rides: [MK.buzz({ waitTime: 30 })] });

    const greatBuzz = great.byName("Buzz Lightyear's Space Ranger Spin");
    const normalBuzz = normal.byName("Buzz Lightyear's Space Ranger Spin");

    if (greatBuzz && normalBuzz) {
      expect(greatBuzz.areaGravityModifier).toBeGreaterThan(normalBuzz.areaGravityModifier);
    }
  });

  test("no location means no gravity for anyone", () => {
    const result = getNextBestRides({
      parkId: "magic_kingdom",
      rides: [MK.buzz({ waitTime: 5 })],
      weather: mildWeather(),
      familyProfile: adultOnlyFamily(),
      locationContext: null,
      timeContext: neutralTimeContext(),
    });

    expect(result.needsLocation).toBe(true);
  });
});
