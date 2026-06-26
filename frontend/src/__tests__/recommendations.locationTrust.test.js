/**
 * Regression: when currentLand / locationContext is unknown, the engine
 * must NOT fake geographic confidence. Best Move, Smart Backup, and
 * Worth the Walk should all return null and the response should set
 * `needsLocation: true` so the UI can prompt for location.
 *
 * Plan Ahead and Wait On This do NOT depend on proximity, so they must
 * still compute normally — otherwise the app feels broken when GPS is off.
 */

import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  mildWeather,
  hotWeather,
  locationAtLand,
  locationUnknown,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";
const STABLE_TEST_NOW = new Date("2026-01-15T15:00:00.000Z");

describe("location trust", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(STABLE_TEST_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("locationContext null: bestMove / backup / worthTheWalk return null", () => {
    const rides = [
      MK.peterPan({ waitTime: 25 }),
      MK.haunted({ waitTime: 30 }),
      MK.buzz({ waitTime: 15 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationUnknown(),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove).toBeNull();
    expect(recs.backup).toBeNull();
    expect(recs.worthTheWalk).toBeNull();
    expect(recs.needsLocation).toBe(true);
  });

  test("locationContext null: planAhead and waitOnThis still compute", () => {
    // Plan Ahead should still suggest TRON or Seven Dwarfs since those don't
    // depend on proximity. Wait On This should still flag a bad-value ride.
    const rides = [
      MK.tron({ waitTime: 90 }),                  // plan-ahead candidate
      MK.peterPan({ waitTime: 75 }),              // bad value, should be wait-on-this
      MK.haunted({ waitTime: 25 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationUnknown(),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.needsLocation).toBe(true);
    // At least one of these should populate to prove the engine didn't
    // bail entirely.
    expect(recs.planAhead || recs.waitOnThis).not.toBeNull();
  });

  test("locationContext with valid land: needsLocation is false and bestMove can be set", () => {
    const rides = [
      MK.peterPan({ waitTime: 25 }),
      MK.haunted({ waitTime: 30 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.needsLocation).toBeFalsy();
    expect(recs.bestMove).not.toBeNull();
  });

  test("locationContext with empty land string: treated as unknown", () => {
    // Guard against a UI bug where currentLand defaults to "" instead of null.
    // The engine must not pretend "" is a real land.
    const recs = getNextBestRides({
      parkId: PARK,
      rides: [MK.peterPan({ waitTime: 20 })],
      weather: mildWeather(),
      locationContext: { type: "manual_land", land: "", landKey: "" },
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.needsLocation).toBe(true);
    expect(recs.bestMove).toBeNull();
  });

  test("during heat, planAhead still computes without location", () => {
    // Family-energy scenario: hot day, no GPS. We still need to give the
    // family some kind of planning signal, even without bestMove.
    const rides = [
      MK.tron({ waitTime: 80 }),
      MK.sevenDwarfs({ waitTime: 70 }),
      MK.haunted({ waitTime: 35 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: hotWeather(),
      locationContext: locationUnknown(),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.needsLocation).toBe(true);
    expect(recs.bestMove).toBeNull();
    // The user can still see "here's what to plan around" without GPS
    expect(recs.planAhead).not.toBeNull();
  });
});
