import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  locationAtLand,
  mildWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PRE_OPEN_NOW = new Date("2026-01-15T08:00:00-05:00");
const EARLY_ENTRY_NOW = new Date("2026-01-15T08:40:00-05:00");

describe("pre-open recommendation gating", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("before park open and before Early Entry, go-now cards are suppressed but planning remains", () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(PRE_OPEN_NOW);

    const recs = getNextBestRides({
      parkId: "magic_kingdom",
      rides: [
        MK.peterPan({ waitTime: 5 }),
        MK.spaceMountain({ waitTime: 5 }),
        MK.tron({ waitTime: 80 }),
        MK.sevenDwarfs({ waitTime: 70 }),
      ],
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext({ orlandoTotalMinutes: 8 * 60 }),
    });

    expect(recs.parkOpenStatus?.isPreOpen).toBe(true);
    expect(recs.parkOpenStatus?.isEarlyEntryWindow).toBe(false);
    expect(recs.parkOpenStatus?.shouldBlockGoNow).toBe(true);

    expect(recs.bestMove).toBeNull();
    expect(recs.backup).toBeNull();
    expect(recs.worthTheWalk).toBeNull();
    expect(recs.waitOnThis).toBeNull();
    expect(recs.planAhead).not.toBeNull();
  });

  test("during Magic Kingdom Early Entry, existing Fantasyland/Tomorrowland guidance still works", () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(EARLY_ENTRY_NOW);

    const recs = getNextBestRides({
      parkId: "magic_kingdom",
      rides: [
        MK.peterPan({ waitTime: 20 }),
        MK.spaceMountain({ waitTime: 25 }),
        MK.bigThunder({ waitTime: 5 }),
      ],
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext({ dayPhase: "early_entry", orlandoTotalMinutes: 8 * 60 + 40 }),
    });

    expect(recs.parkOpenStatus?.isPreOpen).toBe(true);
    expect(recs.parkOpenStatus?.isEarlyEntryWindow).toBe(true);
    expect(recs.parkOpenStatus?.shouldBlockGoNow).toBe(false);

    expect(recs.bestMove).not.toBeNull();
    expect(recs.bestMove?.name).not.toBe("Big Thunder Mountain Railroad");
    expect(["Peter Pan's Flight", "Space Mountain"]).toContain(recs.bestMove?.name);
  });
});
