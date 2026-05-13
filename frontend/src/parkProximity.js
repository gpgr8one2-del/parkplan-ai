/**
 * ParkPlan AI — Park Proximity (V1)
 *
 * Per-park land adjacency graph + location resolution. Kept separate from
 * rideMetadata.js because it's park-level layout data, not per-ride.
 *
 * Design: each park has its own adjacency map. Three proximity tiers:
 *   "same"     — guest is in this land
 *   "adjacent" — one walking hop away
 *   "far"      — two or more hops, or no path defined
 *
 * Scaling note: when adding Universal/Epic Universe, just add a new park key
 * with its own adjacency map. No universal rules — each park's topology is
 * different (hub-and-spoke, circular, perimeter, etc.).
 */

export const PARK_PROXIMITY = {
  magic_kingdom: {
    main_street: {
      adjacent: ["adventureland", "tomorrowland", "fantasyland"],
    },
    adventureland: {
      adjacent: ["main_street", "frontierland"],
    },
    frontierland: {
      adjacent: ["adventureland", "liberty_square"],
    },
    liberty_square: {
      adjacent: ["frontierland", "fantasyland"],
    },
    fantasyland: {
      adjacent: ["liberty_square", "tomorrowland", "main_street"],
    },
    tomorrowland: {
      adjacent: ["fantasyland", "main_street"],
    },
  },

  epcot: {
    world_celebration: {
      adjacent: ["world_discovery", "world_nature", "world_showcase"],
    },
    world_discovery: {
      adjacent: ["world_celebration", "world_showcase"],
    },
    world_nature: {
      adjacent: ["world_celebration", "world_showcase"],
    },
    world_showcase: {
      adjacent: ["world_celebration", "world_discovery", "world_nature"],
    },
  },

  // Future parks: hollywood_studios, animal_kingdom,
  // universal_studios, islands_of_adventure, epic_universe
  // each gets its own adjacency map keyed by snake_case land name.
};

/* -------------------------------------------------------------------------- */
/* Location context resolution                                                */
/* -------------------------------------------------------------------------- */

/**
 * Turn a locationContext object into a current land string.
 *
 * locationContext is a discriminated union:
 *   { type: "manual_land", land: "adventureland" }   ← V1
 *   { type: "gps", lat, lng, accuracy }              ← future
 *   { type: "ble_beacon", beaconId }                 ← future
 *   { type: "last_seen", land, at }                  ← future
 *
 * Returns null when location is unknown or "not_sure" — scoring then skips
 * the proximity modifier entirely (treats all rides as equidistant).
 */
export function resolveCurrentLand(parkId, locationContext) {
  if (!locationContext || !locationContext.type) return null;

  switch (locationContext.type) {
    case "manual_land": {
      const land = locationContext.land;
      if (!land || land === "not_sure") return null;
      return land;
    }

    // case "gps":
    //   return gpsToLand(parkId, locationContext.lat, locationContext.lng);

    // case "ble_beacon":
    //   return beaconToLand(parkId, locationContext.beaconId);

    // case "last_seen":
    //   return locationContext.land;

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Distance + scoring helpers                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns "same" | "adjacent" | "far".
 * If either land is unknown or the park has no proximity map, returns "far"
 * by default — but callers should usually skip the modifier when current
 * land is null.
 */
export function getLandDistance(parkId, fromLand, toLand) {
  if (!fromLand || !toLand) return "far";
  if (fromLand === toLand) return "same";

  const park = PARK_PROXIMITY[parkId];
  if (!park) return "far";

  const fromEntry = park[fromLand];
  if (!fromEntry) return "far";

  if (fromEntry.adjacent?.includes(toLand)) return "adjacent";
  return "far";
}

/**
 * Score modifier for walking distance.
 *
 * Updated tuning:
 *   - same land gets a stronger bonus so nearby rides feel prioritized
 *   - adjacent lands stay viable because parks naturally flow between areas
 *   - far lands get a larger penalty so cross-park options don't hijack backups
 *
 * If currentLand is null, returns 0 for every ride — no proximity influence.
 */
export function getProximityModifier(meta, currentLand, parkId) {
  if (!meta || !currentLand) return 0;

  const distance = getLandDistance(parkId, currentLand, meta.land);

  switch (distance) {
    case "same":
      return 8;
    case "adjacent":
      return -2;
    case "far":
      return -16;
    default:
      return 0;
  }
}
