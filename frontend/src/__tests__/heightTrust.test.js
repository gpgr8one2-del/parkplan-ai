/**
 * Regression: height-restricted rides must hard-exclude from all four
 * positive slots (bestMove, backup, worthTheWalk, planAhead) when the
 * shortest rider doesn't meet the height requirement.
 *
 * Background: the height filter was patched to default to hard-exclude
 * unless future rider-switch mode explicitly allows shorter riders. These
 * tests pin that contract so a refactor cannot silently regress it.
 */

import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  familyWithShortestHeight,
  mildWeather,
  locationAtLand,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";

// Helper: pull every ride that surfaced in any positive slot
function allPositiveRideNames(recs) {
  return [
    recs.bestMove,
    recs.backup,
    recs.worthTheWalk,
    recs.planAhead,
  ]
    .filter(Boolean)
    .map((r) => r.name);
}

describe("height trust", () => {
  test("shortest rider 36 in: TRON, Space Mountain, Big Thunder, Tiana's, Guardians-tier rides excluded from all positive slots", () => {
    const rides = [
      MK.tron({ waitTime: 40 }),
      MK.spaceMountain({ waitTime: 35 }),
      MK.bigThunder({ waitTime: 30 }),
      MK.tianas({ waitTime: 45 }),
      MK.sevenDwarfs({ waitTime: 50 }),
      MK.peterPan({ waitTime: 25 }),
      MK.smallWorld({ waitTime: 15 }),
      MK.philharmagic({ waitTime: 10 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: familyWithShortestHeight(36),
      timeContext: neutralTimeContext(),
    });

    const surfaced = allPositiveRideNames(recs);

    expect(surfaced).not.toContain("TRON Lightcycle / Run");
    expect(surfaced).not.toContain("Space Mountain");
    expect(surfaced).not.toContain("Big Thunder Mountain Railroad");
    expect(surfaced).not.toContain("Tiana's Bayou Adventure");
    expect(surfaced).not.toContain("Seven Dwarfs Mine Train");
  });

  test("shortest rider 36 in: at least one no-height-limit ride still surfaces", () => {
    const rides = [
      MK.tron({ waitTime: 40 }),
      MK.bigThunder({ waitTime: 30 }),
      MK.peterPan({ waitTime: 25 }),
      MK.smallWorld({ waitTime: 15 }),
      MK.philharmagic({ waitTime: 10 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: familyWithShortestHeight(36),
      timeContext: neutralTimeContext(),
    });

    // The engine must still produce *something* — not falling back to a
    // height-excluded ride.
    expect(recs.bestMove || recs.backup).not.toBeNull();
    expect(allPositiveRideNames(recs).length).toBeGreaterThan(0);
  });

  test("shortest rider 48 in: height-restricted rides become eligible again", () => {
    const rides = [
      MK.tron({ waitTime: 35 }),
      MK.spaceMountain({ waitTime: 30 }),
      MK.bigThunder({ waitTime: 25 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: familyWithShortestHeight(48),
      timeContext: neutralTimeContext(),
    });

    // At least one of the height-restricted rides should surface.
    const surfaced = allPositiveRideNames(recs);
    const headlinersPresent = surfaced.some((n) =>
      ["TRON Lightcycle / Run", "Space Mountain", "Big Thunder Mountain Railroad"].includes(n)
    );
    expect(headlinersPresent).toBe(true);
  });

  test("adults-only family: no height restrictions applied", () => {
    const rides = [
      MK.tron({ waitTime: 35 }),
      MK.spaceMountain({ waitTime: 25 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove || recs.backup).not.toBeNull();
  });

  test("rider-switch mode: height-restricted ride may surface but carries a warning", () => {
    // Contract: when wholeGroupRidesTogether === "rider_switch", the engine
    // is allowed to surface a height-restricted ride, but the ride object
    // must carry heightWarning so the UI can show it.
    const rides = [MK.bigThunder({ waitTime: 20 })];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("frontierland"),
      familyProfile: familyWithShortestHeight(36, {
        wholeGroupRidesTogether: "rider_switch",
      }),
      timeContext: neutralTimeContext(),
    });

    const surfaced = recs.bestMove || recs.backup;
    if (surfaced) {
      expect(surfaced.heightWarning).toBeTruthy();
      expect(surfaced.heightWarning.requiredHeight).toBeGreaterThan(36);
    }
  });

  test("planAhead bucket also respects height filtering", () => {
    // TRON is the canonical plan-ahead headliner. With a 36in rider, it must
    // not appear even as a "plan ahead" suggestion.
    const rides = [
      MK.tron({ waitTime: 75 }),
      MK.sevenDwarfs({ waitTime: 65 }),
      MK.peterPan({ waitTime: 45 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: familyWithShortestHeight(36),
      timeContext: neutralTimeContext(),
    });

    expect(recs.planAhead?.name).not.toBe("TRON Lightcycle / Run");
    expect(recs.planAhead?.name).not.toBe("Seven Dwarfs Mine Train");
  });
});
