/**
 * Shared test fixtures for TOHI regression suite.
 *
 * Rides reference by NAME so tests stay valid even if Queue-Times.com IDs
 * change in rideMetadata.js — the engine's getMetaForRide() resolves either.
 *
 * Profiles are built around the contracts that need to hold for beta safety:
 *   - shortest height filtering
 *   - heat / thrill / walking sensitivity
 *   - priorities driving family modifier
 */

let _id = 0;
const nextId = () => `test-ride-${++_id}`;

/* -------------------------------------------------------------------------- */
/* Ride builders                                                              */
/* -------------------------------------------------------------------------- */

export function buildRide({
  name,
  land,
  waitTime = 35,
  isOpen = true,
  id = nextId(),
  ...rest
} = {}) {
  return { id, name, land, waitTime, isOpen, ...rest };
}

// Magic Kingdom rides. Names must match displayName in rideMetadata.js exactly.
export const MK = {
  spaceMountain: (over = {}) =>
    buildRide({ name: "Space Mountain", land: "tomorrowland", ...over }),
  tron: (over = {}) =>
    buildRide({ name: "TRON Lightcycle / Run", land: "tomorrowland", ...over }),
  buzz: (over = {}) =>
    buildRide({ name: "Buzz Lightyear's Space Ranger Spin", land: "tomorrowland", ...over }),
  peopleMover: (over = {}) =>
    buildRide({ name: "Tomorrowland Transit Authority PeopleMover", land: "tomorrowland", ...over }),
  peterPan: (over = {}) =>
    buildRide({ name: "Peter Pan's Flight", land: "fantasyland", ...over }),
  sevenDwarfs: (over = {}) =>
    buildRide({ name: "Seven Dwarfs Mine Train", land: "fantasyland", ...over }),
  smallWorld: (over = {}) =>
    buildRide({ name: "It's a Small World", land: "fantasyland", ...over }),
  philharmagic: (over = {}) =>
    buildRide({ name: "Mickey's PhilharMagic", land: "fantasyland", ...over }),
  ariel: (over = {}) =>
    buildRide({ name: "Under the Sea ~ Journey of The Little Mermaid", land: "fantasyland", ...over }),
  bigThunder: (over = {}) =>
    buildRide({ name: "Big Thunder Mountain Railroad", land: "frontierland", ...over }),
  tianas: (over = {}) =>
    buildRide({ name: "Tiana's Bayou Adventure", land: "frontierland", ...over }),
  haunted: (over = {}) =>
    buildRide({ name: "Haunted Mansion", land: "liberty_square", ...over }),
  pirates: (over = {}) =>
    buildRide({ name: "Pirates of the Caribbean", land: "adventureland", ...over }),
  jungle: (over = {}) =>
    buildRide({ name: "Jungle Cruise", land: "adventureland", ...over }),
  pooh: (over = {}) =>
    buildRide({ name: "The Many Adventures of Winnie the Pooh", land: "fantasyland", ...over }),
};

/* -------------------------------------------------------------------------- */
/* Family profile builders                                                    */
/* -------------------------------------------------------------------------- */

const BASE_FAMILY = {
  adultCount: 2,
  childCount: 0,
  children: [],
  guests: [],
  wholeGroupRidesTogether: "yes",
  thrillTolerance: "mixed",
  walkingTolerance: "medium",
  heatSensitivity: "medium",
  waterRidePreference: "depends",
  pace: "balanced",
  priorities: [],
  shortestHeightInches: null,
  hasSmallChildren: false,
  ageSummary: { under3Count: 0, childCount: 0, disneyAdultCount: 2 },
  planningPreferences: {},
  tripContext: {},
  resortContext: {},
};

export function adultOnlyFamily(over = {}) {
  return { ...BASE_FAMILY, ...over };
}

/**
 * Family with one shorter child rider. `shortestHeightInches` is the field
 * the engine reads. Tests use this to verify height-restricted rides are
 * actually excluded.
 */
export function familyWithShortestHeight(inches, over = {}) {
  return {
    ...BASE_FAMILY,
    childCount: 2,
    children: [
      { id: "c1", label: "Child 1", age: 4, heightInches: inches },
      { id: "c2", label: "Child 2", age: 7, heightInches: 50 },
    ],
    hasSmallChildren: true,
    shortestHeightInches: inches,
    ageSummary: { under3Count: 0, childCount: 2, disneyAdultCount: 2 },
    wholeGroupRidesTogether: "yes",
    thrillTolerance: "low",
    heatSensitivity: "high",
    priorities: ["low_stress", "characters"],
    ...over,
  };
}

/**
 * Family that would, under the V1 bug, cause Peter Pan to win from anywhere:
 * low thrill, low stress, characters/princesses prioritized, small children.
 * Used to verify the cross-park caps hold.
 */
export function peterPanMagnetFamily(over = {}) {
  return {
    ...BASE_FAMILY,
    childCount: 2,
    children: [
      { id: "c1", label: "Child 1", age: 5, heightInches: 44 },
      { id: "c2", label: "Child 2", age: 7, heightInches: 50 },
    ],
    hasSmallChildren: true,
    shortestHeightInches: 44,
    ageSummary: { under3Count: 0, childCount: 2, disneyAdultCount: 2 },
    thrillTolerance: "low",
    walkingTolerance: "low",
    heatSensitivity: "high",
    priorities: ["low_stress", "characters", "princesses", "ac_breaks"],
    ...over,
  };
}

/* -------------------------------------------------------------------------- */
/* Weather + location + time fixtures                                         */
/* -------------------------------------------------------------------------- */

export function mildWeather(over = {}) {
  return {
    tempF: 78,
    feelsLikeF: 80,
    humidity: 55,
    summary: "Partly cloudy",
    rainRisk: 0.1,
    stormMode: false,
    ...over,
  };
}

export function hotWeather(over = {}) {
  return {
    tempF: 92,
    feelsLikeF: 99,
    humidity: 70,
    summary: "Hot and humid",
    rainRisk: 0.2,
    stormMode: false,
    ...over,
  };
}

export function stormWeather(over = {}) {
  return {
    tempF: 80,
    feelsLikeF: 84,
    humidity: 88,
    summary: "Thunderstorms",
    rainRisk: 0.95,
    stormMode: true,
    ...over,
  };
}

export function locationAtLand(landKey) {
  return {
    type: "manual_land",
    land: landKey,
    landKey,
    source: "manual",
  };
}

export function locationUnknown() {
  return null;
}

export function gpsAtAnchor(landKey, anchorName) {
  return {
    type: "gps",
    land: landKey,
    landKey,
    source: "gps",
    nearestAnchorName: anchorName,
    nearestAnchorId: null,
    distanceMeters: 40,
    confidence: "high",
  };
}

export function neutralTimeContext(over = {}) {
  return {
    dayPhase: "midday",
    orlandoTotalMinutes: 13 * 60,
    aiAccess: { shouldAllowAi: true, reason: "in trip" },
    ...over,
  };
}
