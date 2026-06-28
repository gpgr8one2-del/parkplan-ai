import { getNextBestRides } from "../rideRecommendations";
import {
  MK,
  adultOnlyFamily,
  locationAtLand,
  neutralTimeContext,
} from "./fixtures/testHelpers";

const PARK = "magic_kingdom";


const STABLE_TEST_NOW = new Date("2026-06-27T16:00:00-04:00");

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(STABLE_TEST_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

function intenseRainWeather(over = {}) {
  return {
    tempF: 78,
    condition: "Intense rain",
    summary: "Intense rain",
    rainRisk: 0.95,
    ...over,
  };
}

describe("rain recovery recommendations", () => {
  test("Adventureland rain favors local indoor Pirates over cross-park low-wait Small World", () => {
    const rides = [
      MK.smallWorld({ waitTime: 5 }),
      MK.pirates({ waitTime: 30 }),
      MK.jungle({ waitTime: 5 }),
      MK.peterPan({ waitTime: 45 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: intenseRainWeather(),
      locationContext: locationAtLand("adventureland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    expect(recs.needsLocation).toBeFalsy();
    expect(recs.bestMove?.name).toBe("Pirates of the Caribbean");
    expect(recs.bestMove?.recommendationScore).toBeGreaterThan(
      recs.debug?.scoredRides?.find((ride) => ride.name === "It's a Small World")
        ?.recommendationScore ?? 0
    );
  });

  test("Fantasyland rain allows PhilharMagic to compete with Small World as a nearby indoor recovery", () => {
    const rides = [
      MK.smallWorld({ waitTime: 5 }),
      MK.philharmagic({ waitTime: 10 }),
      MK.pirates({ waitTime: 30 }),
      MK.jungle({ waitTime: 5 }),
    ];

    const recs = getNextBestRides({
      parkId: PARK,
      rides,
      weather: intenseRainWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });

    const goNowNames = [
      recs.bestMove?.name,
      recs.backup?.name,
      recs.worthTheWalk?.name,
    ].filter(Boolean);

    expect(goNowNames).toContain("Mickey's PhilharMagic");
    expect(goNowNames).not.toContain("Jungle Cruise");
  });
});
