/**
 * ParkPlan AI — Park Proximity (V1)
 *
 * Per-park land adjacency graph + location resolution. Kept separate from
 * rideMetadata.js because it's park-level layout data, not per-ride.
 *
 * Design:
 * - "same" = guest is in this land
 * - "adjacent" = nearby / natural next-land flow
 * - "nearby" = not directly adjacent, but still realistic without feeling like a huge commitment
 * - "far" = meaningful walk / cross-park move
 *
 * Product philosophy:
 * This should not behave like a strict map algorithm.
 * It should behave like a family-friendly walking-friction model.
 */

export const PARK_PROXIMITY = {
  magic_kingdom: {
    main_street: {
      adjacent: ["adventureland", "tomorrowland", "fantasyland"],
      nearby: ["liberty_square"],
    },

    adventureland: {
      adjacent: ["main_street", "frontierland"],
      nearby: ["liberty_square", "fantasyland"],
    },

    frontierland: {
      adjacent: ["adventureland", "liberty_square"],
      nearby: ["fantasyland", "main_street"],
    },

    liberty_square: {
      adjacent: ["frontierland", "fantasyland"],
      nearby: ["adventureland", "main_street"],
    },

    fantasyland: {
      adjacent: ["liberty_square", "tomorrowland", "main_street"],
      nearby: ["frontierland", "adventureland"],
    },

    tomorrowland: {
      adjacent: ["fantasyland", "main_street"],
      nearby: ["liberty_square"],
    },
  },

  epcot: {
    // EPCOT is not a simple hub-and-spoke park.
    // World Celebration is the front/center connector.
    // World Discovery and World Nature are opposite front-side neighborhoods.
    // World Showcase is a huge lagoon loop, so it is split into west/center/east.
    //
    // West: Canada / United Kingdom / France / International Gateway / Remy
    // Center: Morocco / Japan / American Adventure / Italy / Germany
    // East: China / Norway / Mexico / Frozen / Gran Fiesta
    //
    // Important product rule:
    // From France/Remy, World Nature is a much more realistic move than
    // Test Track/Guardians. From Mexico/Norway, World Discovery is more realistic.
    world_celebration: {
      adjacent: ["world_discovery", "world_nature"],
      nearby: [
        "world_showcase_west",
        "world_showcase_center",
        "world_showcase_east",
      ],
    },

    world_discovery: {
      adjacent: ["world_celebration", "world_showcase_east"],
      nearby: ["world_nature", "world_showcase_center"],
    },

    world_nature: {
      adjacent: ["world_celebration", "world_showcase_west"],
      nearby: ["world_discovery", "world_showcase_center"],
    },

    world_showcase_west: {
      adjacent: ["world_nature", "world_showcase_center"],
      nearby: ["world_celebration"],
    },

    world_showcase_center: {
      adjacent: ["world_showcase_west", "world_showcase_east"],
      nearby: ["world_celebration", "world_nature", "world_discovery"],
    },

    world_showcase_east: {
      adjacent: ["world_discovery", "world_showcase_center"],
      nearby: ["world_celebration"],
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
 * the proximity modifier entirely.
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
 * Returns "same" | "adjacent" | "nearby" | "far".
 *
 * If either land is unknown or the park has no proximity map, returns "far"
 * by default — but callers should usually skip the modifier when currentLand
 * is null.
 */
export function getLandDistance(parkId, fromLand, toLand) {
  if (!fromLand || !toLand) return "far";
  if (fromLand === toLand) return "same";

  const park = PARK_PROXIMITY[parkId];
  if (!park) return "far";

  const fromEntry = park[fromLand];
  if (!fromEntry) return "far";

  if (fromEntry.adjacent?.includes(toLand)) return "adjacent";
  if (fromEntry.nearby?.includes(toLand)) return "nearby";

  return "far";
}

/**
 * Score modifier for walking distance.
 *
 * Tuning:
 * - Same land gets a meaningful boost.
 * - Adjacent lands are still encouraged because families naturally flow between lands.
 * - Nearby lands are allowed without feeling like a big cross-park commitment.
 * - Far lands are penalized, but not murdered. A great wait can still be worth it.
 *
 * If currentLand is null, returns 0 for every ride — no proximity influence.
 */
export function getProximityModifier(meta, currentLand, parkId) {
  if (!meta || !currentLand) return 0;

  const distance = getLandDistance(parkId, currentLand, meta.land);

  switch (distance) {
    case "same":
      return 10;
    case "adjacent":
      return 3;
    case "nearby":
      return -4;
    case "far":
      return -10;
    default:
      return 0;
  }
}
