/**
 * ParkPlan AI — Ride Metadata (V1)
 *
 * Single source of truth for ride attributes.
 *
 * Keys are queue-times.com ride IDs (as strings) so this file can be joined
 * directly with live wait-time data from the backend without any name
 * normalization. Display names are stored on each entry for UI use.
 *
 * Schema (all fields required for V1):
 *   displayName       string   Human-readable name (matches queue-times exactly)
 *   land              string   Land/area within the park (snake_case)
 *   minHeightInches   number   Minimum rider height in inches; 0 = no requirement
 *   environment       enum     "outdoor" | "indoor" | "mixed"
 *   hasAC             boolean  True if queue AND ride are climate-controlled
 *   getsWet           boolean  Riders may get wet
 *   closesInRain      boolean  Closed in lightning / heavy rain
 *   intensity         number   1 (gentle) -> 5 (extreme thrill)
 *   popularity        number   1-100 baseline desirability
 *   tags              string[] Free-form filter labels
 */

export const RIDE_METADATA = {
  magic_kingdom: {
    // ---------- Adventureland ----------
    "134": {
      displayName: "Jungle Cruise",
      land: "adventureland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 76,
      tags: ["classic", "boat", "family"],
    },
    "137": {
      displayName: "Pirates of the Caribbean",
      land: "adventureland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 78,
      tags: ["classic", "boat", "family"],
    },
    "141": {
      displayName: "The Magic Carpets of Aladdin",
      land: "adventureland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 40,
      tags: ["spinner", "toddler", "family"],
    },
    "334": {
      displayName: "Walt Disney's Enchanted Tiki Room",
      land: "adventureland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 35,
      tags: ["classic", "show", "recovery"],
    },

    // ---------- Fantasyland ----------
    "126": {
      displayName: "The Barnstormer",
      land: "fantasyland",
      minHeightInches: 35,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 45,
      tags: ["coaster", "kid-coaster", "family"],
    },
    "127": {
      displayName: "Under the Sea - Journey of The Little Mermaid",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 63,
      tags: ["dark-ride", "toddler", "family"],
    },
    "128": {
      displayName: "Enchanted Tales with Belle",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 50,
      tags: ["show", "interactive", "kids"],
    },
    "129": {
      displayName: "Seven Dwarfs Mine Train",
      land: "fantasyland",
      minHeightInches: 38,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 3,
      popularity: 96,
      tags: ["headliner", "coaster", "family"],
    },
    "132": {
      displayName: "Dumbo the Flying Elephant",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 50,
      tags: ["spinner", "toddler", "family"],
    },
    "133": {
      displayName: "\"it's a small world\"",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 48,
      tags: ["classic", "boat", "toddler", "recovery"],
    },
    "135": {
      displayName: "Mad Tea Party",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 42,
      tags: ["spinner", "motion-sickness", "family"],
    },
    "136": {
      displayName: "Peter Pan's Flight",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 89,
      tags: ["classic", "dark-ride", "family"],
    },
    "142": {
      displayName: "The Many Adventures of Winnie the Pooh",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 65,
      tags: ["dark-ride", "toddler", "family"],
    },
    "161": {
      displayName: "Prince Charming Regal Carrousel",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 38,
      tags: ["classic", "toddler", "family"],
    },
    "171": {
      displayName: "Mickey's PhilharMagic",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 52,
      tags: ["show", "recovery", "family"],
    },

    // ---------- Frontierland ----------
    "130": {
      displayName: "Big Thunder Mountain Railroad",
      land: "frontierland",
      minHeightInches: 40,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 3,
      popularity: 85,
      tags: ["coaster", "family"],
    },
    "1214": {
      displayName: "Country Bear Musical Jamboree",
      land: "frontierland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 34,
      tags: ["classic", "show", "recovery"],
    },
    "13630": {
      displayName: "Tiana's Bayou Adventure",
      land: "frontierland",
      minHeightInches: 40,
      environment: "mixed",
      hasAC: false,
      getsWet: true,
      closesInRain: true,
      intensity: 3,
      popularity: 92,
      tags: ["headliner", "water", "family"],
    },

    // ---------- Liberty Square ----------
    "140": {
      displayName: "Haunted Mansion",
      land: "liberty_square",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 84,
      tags: ["classic", "dark-ride", "spooky"],
    },
    "356": {
      displayName: "The Hall of Presidents",
      land: "liberty_square",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 30,
      tags: ["show", "recovery"],
    },

    // ---------- Tomorrowland ----------
    "125": {
      displayName: "Monsters Inc. Laugh Floor",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 40,
      tags: ["show", "interactive", "recovery"],
    },
    "131": {
      displayName: "Buzz Lightyear's Space Ranger Spin",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 75,
      tags: ["interactive", "dark-ride", "family"],
    },
    "138": {
      displayName: "Space Mountain",
      land: "tomorrowland",
      minHeightInches: 44,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 4,
      popularity: 88,
      tags: ["coaster", "thrill", "dark-ride"],
    },
    "143": {
      displayName: "Tomorrowland Speedway",
      land: "tomorrowland",
      minHeightInches: 32,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 38,
      tags: ["family", "kids"],
    },
    "248": {
      displayName: "Astro Orbiter",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 36,
      tags: ["spinner", "family"],
    },
    "457": {
      displayName: "Walt Disney's Carousel of Progress",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 55,
      tags: ["classic", "show", "recovery"],
    },
    "1190": {
      displayName: "Tomorrowland Transit Authority PeopleMover",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 75,
      tags: ["classic", "relaxing", "low-wait"],
    },
    "11527": {
      displayName: "TRON Lightcycle / Run",
      land: "tomorrowland",
      minHeightInches: 48,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 5,
      popularity: 98,
      tags: ["headliner", "coaster", "thrill"],
    },
  },

  // Future parks: epcot, hollywood_studios, animal_kingdom,
  // universal_studios, islands_of_adventure, epic_universe
};

/* -------------------------------------------------------------------------- */
/* Lookup helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Get metadata for a single ride.
 *
 * Accepts either a queue-times ride ID (number or string) or a display name.
 * ID lookup is preferred — it's exact. Name fallback exists so older code
 * that only has ride.name still works during the transition.
 */
export function getRideMeta(parkId, rideIdOrName) {
  const park = RIDE_METADATA[parkId];
  if (!park) return null;

  // ID lookup — JS coerces number keys to strings for property access
  if (rideIdOrName != null && park[rideIdOrName]) {
    return park[rideIdOrName];
  }

  // Name fallback
  const match = Object.values(park).find(
    (m) => m.displayName === rideIdOrName
  );
  return match || null;
}

/** Get all rides for a park as [id, meta] pairs. */
export function getParkRides(parkId) {
  const park = RIDE_METADATA[parkId];
  return park ? Object.entries(park) : [];
}

/* -------------------------------------------------------------------------- */
/* Derived properties — compute from metadata, do not store separately        */
/* -------------------------------------------------------------------------- */

/** Suitable for toddlers and young kids. */
export function isKidFriendly(meta) {
  return meta.minHeightInches === 0 && meta.intensity <= 2;
}

/** Good as a sit-down break (AC, indoor, low intensity). */
export function isRecoveryRide(meta) {
  return meta.hasAC && meta.environment === "indoor" && meta.intensity <= 2;
}

/** Won't close and won't soak you in a storm. */
export function isRainSafe(meta) {
  return !meta.closesInRain && !meta.getsWet;
}

/** Good for cooling off on a hot day. */
export function isHeatRelief(meta) {
  return meta.hasAC || meta.getsWet;
}

/** Real thrill ride for adrenaline-seekers. */
export function isThrillRide(meta) {
  return meta.intensity >= 4;
}
