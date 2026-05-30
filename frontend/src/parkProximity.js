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

  hollywood: {
    // Hollywood Studios has strong walking friction.
    // Galaxy's Edge and Toy Story Land flow together well.
    // Sunset Boulevard is a commitment from the back of the park.
    // Hollywood Boulevard / Echo Lake / Commissary Lane function as the middle/front connectors.
    hollywood_boulevard: {
      adjacent: ["echo_lake", "commissary_lane", "sunset_boulevard"],
      nearby: ["animation_courtyard", "grand_avenue"],
    },

    sunset_boulevard: {
      adjacent: ["hollywood_boulevard", "animation_courtyard"],
      nearby: ["echo_lake", "commissary_lane"],
    },

    echo_lake: {
      adjacent: ["hollywood_boulevard", "commissary_lane", "grand_avenue"],
      nearby: ["animation_courtyard", "star_wars_galaxys_edge", "sunset_boulevard"],
    },

    commissary_lane: {
      adjacent: ["hollywood_boulevard", "echo_lake", "grand_avenue"],
      nearby: ["animation_courtyard", "sunset_boulevard", "star_wars_galaxys_edge"],
    },

    grand_avenue: {
      adjacent: ["echo_lake", "commissary_lane", "star_wars_galaxys_edge"],
      nearby: ["toy_story_land", "hollywood_boulevard"],
    },

    star_wars_galaxys_edge: {
      adjacent: ["grand_avenue", "toy_story_land"],
      nearby: ["echo_lake", "commissary_lane"],
    },

    toy_story_land: {
      adjacent: ["star_wars_galaxys_edge", "animation_courtyard"],
      nearby: ["grand_avenue", "echo_lake"],
    },

    animation_courtyard: {
      adjacent: ["toy_story_land", "sunset_boulevard", "hollywood_boulevard"],
      nearby: ["echo_lake", "commissary_lane"],
    },
  },

  animal_kingdom: {
    // Animal Kingdom is walking-heavy and heat-sensitive.
    // Discovery Island is the central connector.
    // Pandora and Africa are natural left-side flows.
    // Asia is a meaningful move from Pandora/Africa unless the family is already looping that way.
    // Rafiki's Planet Watch is a time-block destination, not a quick nearby move.
    // Tropical Americas is a construction/future land placeholder and should not be treated
    // as an active recommendation area yet.
    oasis: {
      adjacent: ["discovery_island"],
      nearby: ["pandora", "africa"],
    },

    discovery_island: {
      adjacent: ["oasis", "pandora", "africa", "asia"],
      nearby: ["rafikis_planet_watch", "tropical_americas_construction"],
    },

    pandora: {
      adjacent: ["discovery_island", "africa"],
      nearby: ["oasis"],
    },

    africa: {
      adjacent: ["discovery_island", "pandora", "asia", "rafikis_planet_watch"],
      nearby: ["oasis"],
    },

    asia: {
      adjacent: ["discovery_island", "africa"],
      nearby: ["pandora", "tropical_americas_construction"],
    },

    rafikis_planet_watch: {
      adjacent: ["africa"],
      nearby: ["discovery_island"],
    },

    tropical_americas_construction: {
      adjacent: ["discovery_island", "asia"],
      nearby: ["africa"],
    },
  },

  // Future parks: universal_studios, islands_of_adventure, epic_universe
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

    case "gps": {
      const detectedParkId =
        locationContext.detectedLocation?.parkId || locationContext.parkId;

      if (detectedParkId && detectedParkId !== parkId) return null;

      const land =
        locationContext.landKey ||
        locationContext.detectedLocation?.landKey ||
        locationContext.land;

      if (!land || land === "not_sure") return null;
      return land;
    }

    case "last_seen": {
      const land = locationContext.landKey || locationContext.land;
      if (!land || land === "not_sure") return null;
      return land;
    }

    // case "ble_beacon":
    //   return beaconToLand(parkId, locationContext.beaconId);

    default: {
      // App.jsx now sends richer locationContextForDecisions objects. If a
      // caller passes one without a recognized type, still try to resolve the
      // land safely instead of throwing away useful context.
      const land =
        locationContext.landKey ||
        locationContext.detectedLocation?.landKey ||
        locationContext.land;

      if (!land || land === "not_sure") return null;
      return land;
    }
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
