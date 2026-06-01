/**
 * Regression: cross-park sanity.
 *
 * The single biggest scoring failure in V1 was that Peter Pan, Jungle Cruise,
 * and other low-capacity classics could win Best Move from anywhere in the
 * park whenever their wait happened to drop into great_value range. The
 * V1.1 engine added:
 *   - hard cap on family profile personalization for plan-ahead rides
 *   - cross-park positive-sum cap when not in same land and no closest-anchor
 *   - reduced standalone "great_value nearby" boost from +14 to +6
 *   - Best Move fallback quality gate (score 85+, status great_value, etc.)
 *
 * These tests pin those caps. If a future scoring tweak undoes any of them,
 * Peter Pan starts winning from Adventureland again.
 */

import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  peterPanMagnetFamily,
  mildWeather,
  locationAtLand,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";

describe("cross-park sanity", () => {
  test("Peter Pan at 30 min from Tomorrowland with Peter-Pan-magnet family does NOT win Best Move", () => {
    // This is the canonical bug case. Same family profile that triggered it
    // in V1 (low thrill, small kids, characters/princesses priority, low stress).
    const rides = [
      MK.peterPan({ waitTime: 30 }),
      MK.buzz({ waitTime: 25 }),
      MK.peopleMover({ waitTime: 10 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove?.name).not.toBe("Peter Pan's Flight");
  });

  test("Peter Pan at 30 min from Fantasyland (same area) CAN win Best Move", () => {
    // Sanity check: same-area logic should still favor it. The cross-park cap
    // is supposed to fire only when crossing lands.
    const rides = [
      MK.peterPan({ waitTime: 30 }),
      MK.ariel({ waitTime: 20 }),
      MK.philharmagic({ waitTime: 5 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    // At 30 min from Fantasyland, Peter Pan should at least appear somewhere.
    // It doesn't have to win bestMove — small world might — but it should be
    // a realistic candidate.
    const surfaced = [recs.bestMove, recs.backup, recs.worthTheWalk]
      .filter(Boolean)
      .map((r) => r.name);

    expect(surfaced).toContain("Peter Pan's Flight");
  });

  test("Jungle Cruise at 25 min from Tomorrowland does NOT win Best Move", () => {
    const rides = [
      MK.jungle({ waitTime: 25 }),
      MK.buzz({ waitTime: 20 }),
      MK.peopleMover({ waitTime: 10 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove?.name).not.toBe("Jungle Cruise");
  });

  test("Haunted Mansion at 25 min from Adventureland does NOT win Best Move", () => {
    // Haunted Mansion is adjacent to Adventureland (both are around the hub),
    // so it can be a backup or worth-the-walk, but not Best Move on the
    // single classic-low-cap-cross-park signal alone.
    const rides = [
      MK.haunted({ waitTime: 25 }),
      MK.jungle({ waitTime: 30 }),
      MK.pirates({ waitTime: 15 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("adventureland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    // Pirates is same-area; it should win over a cross-park classic.
    expect(recs.bestMove?.name).toBe("Pirates of the Caribbean");
  });

  test("when nothing clears the fallback quality gate, bestMove is null (not a forced pick)", () => {
    // Every ride is at high wait, no great_value status anywhere. The V1
    // engine would force-pick the highest score regardless; V1.1 returns null.
    const rides = [
      MK.peterPan({ waitTime: 65 }),
      MK.jungle({ waitTime: 70 }),
      MK.haunted({ waitTime: 60 }),
      MK.pooh({ waitTime: 55 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    // None of the rides is same-area as Tomorrowland AND none has a rare
    // great_value wait. Fallback gate must reject all of them.
    expect(recs.bestMove).toBeNull();
  });

  test("rare great_value wait can still earn Worth the Walk across the park", () => {
    // Sanity check that the engine isn't *too* defensive. Tiana's at 20 min
    // is a true rare-value moment and the family hot/heat profile makes it
    // a strong recommendation.
    const rides = [
      MK.tianas({ waitTime: 20 }),
      MK.haunted({ waitTime: 50 }),
      MK.buzz({ waitTime: 35 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather({ tempF: 92, feelsLikeF: 99 }),
      locationContext: locationAtLand("tomorrowland"),
      // Adults only, height tolerance met, water rides ok
      familyProfile: adultOnlyFamily({
        thrillTolerance: "mixed",
        waterRidePreference: "yes",
        priorities: ["headliners"],
      }),
      timeContext: neutralTimeContext(),
    });

    const allSurfaced = [
      recs.bestMove,
      recs.backup,
      recs.worthTheWalk,
      recs.planAhead,
    ]
      .filter(Boolean)
      .map((r) => r.name);

    expect(allSurfaced).toContain("Tiana's Bayou Adventure");
  });

  test("crossParkSumCapAdjustment field is exposed for telemetry", () => {
    // The V1.1 cap is applied as a separate adjustment field so we can
    // measure how often it fires in field data. This test asserts the
    // field is present.
    const rides = [MK.peterPan({ waitTime: 25 })];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: peterPanMagnetFamily(),
      timeContext: neutralTimeContext(),
    });

    // The ride object (whether surfaced or not) must have the cap field.
    // Pull it from any slot that has the ride.
    const peterPan = [
      recs.bestMove,
      recs.backup,
      recs.worthTheWalk,
      recs.planAhead,
      recs.waitOnThis,
    ].find((r) => r?.name === "Peter Pan's Flight");

    if (peterPan) {
      expect(peterPan.crossParkSumCapAdjustment).toBeDefined();
      expect(typeof peterPan.crossParkSumCapAdjustment).toBe("number");
      expect(peterPan.crossParkSumCapAdjustment).toBeLessThanOrEqual(0);
    }
  });
});
