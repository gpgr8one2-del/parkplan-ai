import { getNextBestRides } from "../rideRecommendations";
import {
  buildRide,
  adultOnlyFamily,
  hotWeather,
  locationAtLand,
  mildWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "hollywood";
const SHOW_WINDOW_NOW = new Date("2026-01-15T16:15:00.000Z"); // 11:15 AM Orlando

describe("scheduled show recommendation behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(SHOW_WINDOW_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Hollywood stage shows use scheduled-show plan-ahead behavior instead of 0-minute ride behavior", () => {
    const rides = [
      buildRide({
        name: "For the First Time in Forever: A Frozen Sing-Along Celebration",
        land: "echo_lake",
        waitTime: 0,
      }),
      buildRide({
        name: "Indiana Jones Epic Stunt Spectacular",
        land: "echo_lake",
        waitTime: 0,
      }),
      buildRide({
        name: "Beauty and the Beast Live on Stage",
        land: "sunset_boulevard",
        waitTime: 0,
      }),
      buildRide({
        name: "Star Tours – The Adventures Continue",
        land: "echo_lake",
        waitTime: 15,
      }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: mildWeather(),
      locationContext: locationAtLand("echo_lake"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove?.name).not.toBe(
      "For the First Time in Forever: A Frozen Sing-Along Celebration"
    );
    expect(recs.bestMove?.name).not.toBe("Indiana Jones Epic Stunt Spectacular");
    expect(recs.bestMove?.name).not.toBe("Beauty and the Beast Live on Stage");

    expect(recs.planAhead?.isScheduledShow).toBe(true);
    expect([
      "For the First Time in Forever: A Frozen Sing-Along Celebration",
      "Indiana Jones Epic Stunt Spectacular",
      "Beauty and the Beast Live on Stage",
    ]).toContain(recs.planAhead?.name);
    expect(recs.planAhead?.planAheadReason).toMatch(/Next listed show/i);
  });

  test("continuous wait-time theater attractions are not accidentally scheduled shows", () => {
    const rides = [
      buildRide({
        name: "Mickey's PhilharMagic",
        land: "fantasyland",
        waitTime: 5,
      }),
    ];

    const recs = getNextBestRides({
      parkId: "magic_kingdom",
      rides,
      weather: hotWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.bestMove?.name).toBe("Mickey's PhilharMagic");
    expect(recs.bestMove?.isScheduledShow).toBe(false);
  });
});
