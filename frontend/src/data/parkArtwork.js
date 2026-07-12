import {
  TOHI_THEME_COLORS,
  TOHI_THEME_GRADIENTS,
} from "../theme/tohiTheme";

export const TOHI_ARTWORK_TYPES = {
  PARK: "park",
  AREA: "area",
  HEADLINER: "headliner",
  DEFAULT: "default",
};

export const TOHI_PARK_ARTWORK = {
  magic_kingdom: {
    id: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.PARK,
    name: "Magic Kingdom",
    shortName: "Magic Kingdom",
    visualKey: "castle_sunset",
    icon: "castle",
    landmark: "castle",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    heroGradient: TOHI_THEME_GRADIENTS.heroDay,
    nightGradient: TOHI_THEME_GRADIENTS.heroNight,
    mood: "classic, warm, magical, storybook",
    altText: "Warm illustrated Magic Kingdom-inspired park scene with a castle silhouette and soft sunset glow.",
  },
  epcot: {
    id: "epcot",
    type: TOHI_ARTWORK_TYPES.PARK,
    name: "EPCOT",
    shortName: "EPCOT",
    visualKey: "spaceship_earth_glow",
    icon: "sphere",
    landmark: "geosphere",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    heroGradient: "linear-gradient(135deg, #E0F2FE 0%, #F3E8FF 52%, #FFF7ED 100%)",
    nightGradient: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 52%, #312E81 100%)",
    mood: "bright, global, futuristic, open-air",
    altText: "Warm EPCOT-inspired park scene with a glowing geosphere shape and soft sky tones.",
  },
  hollywood: {
    id: "hollywood",
    type: TOHI_ARTWORK_TYPES.PARK,
    name: "Hollywood Studios",
    shortName: "Hollywood",
    visualKey: "studio_lights",
    icon: "spotlight",
    landmark: "studio lights",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    heroGradient: "linear-gradient(135deg, #FFE4E6 0%, #FEF3C7 48%, #FFF7ED 100%)",
    nightGradient: "linear-gradient(135deg, #111827 0%, #4C1D95 50%, #7F1D1D 100%)",
    mood: "cinematic, energetic, bold, nighttime glow",
    altText: "Warm Hollywood Studios-inspired scene with soft spotlights and cinematic sunset colors.",
  },
  animal_kingdom: {
    id: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.PARK,
    name: "Animal Kingdom",
    shortName: "Animal Kingdom",
    visualKey: "tree_canopy",
    icon: "tree",
    landmark: "tree canopy",
    accentColor: TOHI_THEME_COLORS.success,
    softColor: TOHI_THEME_COLORS.successSoft,
    heroGradient: "linear-gradient(135deg, #D1FAE5 0%, #FEF3C7 52%, #FFF7ED 100%)",
    nightGradient: "linear-gradient(135deg, #052E16 0%, #14532D 55%, #422006 100%)",
    mood: "lush, adventurous, shaded, natural",
    altText: "Warm Animal Kingdom-inspired scene with layered greenery and a soft golden park-day glow.",
  },
};

export const TOHI_AREA_ARTWORK = {
  main_street: {
    id: "main_street",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Main Street",
    visualKey: "main_street_warm_arrival",
    icon: "storefront",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "arrival, classic, warm, nostalgic",
  },
  adventureland: {
    id: "adventureland",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Adventureland",
    visualKey: "jungle_market",
    icon: "leaf",
    accentColor: TOHI_THEME_COLORS.success,
    softColor: TOHI_THEME_COLORS.successSoft,
    mood: "jungle, tropical, playful expedition",
  },
  frontierland: {
    id: "frontierland",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Frontierland",
    visualKey: "river_mountain_western",
    icon: "mountain",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "western, riverfront, rustic, big-sky",
  },
  liberty_square: {
    id: "liberty_square",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Liberty Square",
    visualKey: "colonial_lanterns",
    icon: "lantern",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "historic, shaded, calm, lantern-lit",
  },
  fantasyland: {
    id: "fantasyland",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Fantasyland",
    visualKey: "storybook_rooftops",
    icon: "sparkles",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "storybook, whimsical, family-friendly",
  },
  storybook_circus: {
    id: "storybook_circus",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Storybook Circus",
    visualKey: "circus_tents",
    icon: "ticket",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "bright, playful, little-kid friendly",
  },
  tomorrowland: {
    id: "tomorrowland",
    parkId: "magic_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Tomorrowland",
    visualKey: "future_neon_orbit",
    icon: "rocket",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "futuristic, kinetic, bright, high-energy",
  },
  world_discovery: {
    id: "world_discovery",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Discovery",
    visualKey: "cosmic_launch",
    icon: "rocket",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "space, motion, science, thrill",
  },
  world_nature: {
    id: "world_nature",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Nature",
    visualKey: "gardens_water",
    icon: "leaf",
    accentColor: TOHI_THEME_COLORS.success,
    softColor: TOHI_THEME_COLORS.successSoft,
    mood: "calm, green, refreshing, restorative",
  },
  world_celebration: {
    id: "world_celebration",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Celebration",
    visualKey: "central_plaza",
    icon: "sparkles",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "open, central, polished, welcoming",
  },
  world_showcase: {
    id: "world_showcase",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Showcase",
    visualKey: "lagoon_pavilions",
    icon: "globe",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "global, scenic, strolling, lagoon views",
  },
  world_showcase_west: {
    id: "world_showcase_west",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Showcase West",
    visualKey: "france_uk_canada_lagoon",
    icon: "globe",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "scenic, charming, food-forward, lagoon-side",
  },
  world_showcase_center: {
    id: "world_showcase_center",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Showcase Center",
    visualKey: "america_japan_italy_lagoon",
    icon: "globe",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "open, central, cultural, evening-friendly",
  },
  world_showcase_east: {
    id: "world_showcase_east",
    parkId: "epcot",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "World Showcase East",
    visualKey: "mexico_norway_china_lagoon",
    icon: "globe",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "lively, colorful, water-side, family stops",
  },
  hollywood_boulevard: {
    id: "hollywood_boulevard",
    parkId: "hollywood",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Hollywood Boulevard",
    visualKey: "red_carpet_arrival",
    icon: "spotlight",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "arrival, cinematic, energetic",
  },
  toy_story_land: {
    id: "toy_story_land",
    parkId: "hollywood",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Toy Story Land",
    visualKey: "backyard_playset",
    icon: "star",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "playful, colorful, family-energy",
  },
  star_wars_galaxys_edge: {
    id: "star_wars_galaxys_edge",
    parkId: "hollywood",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Star Wars: Galaxy’s Edge",
    visualKey: "galaxy_outpost",
    icon: "orbit",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "immersive, rugged, cinematic, otherworldly",
  },
  sunset_boulevard: {
    id: "sunset_boulevard",
    parkId: "hollywood",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Sunset Boulevard",
    visualKey: "sunset_neon_tower",
    icon: "neon",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "classic Hollywood, thrill, neon, evening glow",
  },
  oasis: {
    id: "oasis",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Oasis",
    visualKey: "lush_entry_paths",
    icon: "leaf",
    accentColor: TOHI_THEME_COLORS.success,
    softColor: TOHI_THEME_COLORS.successSoft,
    mood: "arrival, shaded, calm, green",
  },
  discovery_island: {
    id: "discovery_island",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Discovery Island",
    visualKey: "tree_of_life_paths",
    icon: "tree",
    accentColor: TOHI_THEME_COLORS.success,
    softColor: TOHI_THEME_COLORS.successSoft,
    mood: "central, lush, scenic, animal trails",
  },
  pandora: {
    id: "pandora",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Pandora",
    visualKey: "floating_mountains",
    icon: "mountain",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "bioluminescent, immersive, dramatic, scenic",
  },
  asia: {
    id: "asia",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Asia",
    visualKey: "mountain_river_expedition",
    icon: "mountain",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "adventure, mountain, river, shaded paths",
  },
  africa: {
    id: "africa",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "Africa",
    visualKey: "village_savanna",
    icon: "sun",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "warm, lively, scenic, safari energy",
  },
  dinoland: {
    id: "dinoland",
    parkId: "animal_kingdom",
    type: TOHI_ARTWORK_TYPES.AREA,
    name: "DinoLand",
    visualKey: "retro_dino_play",
    icon: "bone",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "retro, playful, sunny, quirky",
  },
};

export const TOHI_HEADLINER_ARTWORK = {
  "Space Mountain": {
    id: "space_mountain",
    parkId: "magic_kingdom",
    areaId: "tomorrowland",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Space Mountain",
    visualKey: "space_mountain_orbit",
    icon: "rocket",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "classic thrill, indoor, space, high-energy",
  },
  "TRON Lightcycle / Run": {
    id: "tron_lightcycle_run",
    parkId: "magic_kingdom",
    areaId: "tomorrowland",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "TRON Lightcycle / Run",
    visualKey: "digital_light_grid",
    icon: "bolt",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "fast, neon, futuristic, premium thrill",
  },
  "Seven Dwarfs Mine Train": {
    id: "seven_dwarfs_mine_train",
    parkId: "magic_kingdom",
    areaId: "fantasyland",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Seven Dwarfs Mine Train",
    visualKey: "storybook_mine",
    icon: "gem",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "storybook thrill, family coaster, gem-lit",
  },
  "Guardians of the Galaxy: Cosmic Rewind": {
    id: "guardians_cosmic_rewind",
    parkId: "epcot",
    areaId: "world_discovery",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Guardians of the Galaxy: Cosmic Rewind",
    visualKey: "cosmic_spin",
    icon: "orbit",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "cosmic, indoor, energetic, music-driven",
  },
  "Test Track": {
    id: "test_track",
    parkId: "epcot",
    areaId: "world_discovery",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Test Track",
    visualKey: "speed_lines",
    icon: "gauge",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "speed, tech, motion, sleek",
  },
  "Remy’s Ratatouille Adventure": {
    id: "remys_ratatouille_adventure",
    parkId: "epcot",
    areaId: "world_showcase_west",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Remy’s Ratatouille Adventure",
    visualKey: "paris_kitchen",
    icon: "chef",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "playful, Paris, family-friendly, indoor",
  },
  "Rise of the Resistance": {
    id: "rise_of_the_resistance",
    parkId: "hollywood",
    areaId: "star_wars_galaxys_edge",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Rise of the Resistance",
    visualKey: "galaxy_hangar",
    icon: "orbit",
    accentColor: TOHI_THEME_COLORS.purple,
    softColor: TOHI_THEME_COLORS.purpleSoft,
    mood: "cinematic, immersive, must-do, indoor",
  },
  "Slinky Dog Dash": {
    id: "slinky_dog_dash",
    parkId: "hollywood",
    areaId: "toy_story_land",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Slinky Dog Dash",
    visualKey: "toy_coaster_tracks",
    icon: "star",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "bright, family coaster, playful, sunny",
  },
  "Tower of Terror": {
    id: "tower_of_terror",
    parkId: "hollywood",
    areaId: "sunset_boulevard",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Tower of Terror",
    visualKey: "haunted_hotel_neon",
    icon: "hotel",
    accentColor: TOHI_THEME_COLORS.coral,
    softColor: TOHI_THEME_COLORS.coralSoft,
    mood: "classic thrill, moody, cinematic, indoor",
  },
  "Avatar Flight of Passage": {
    id: "avatar_flight_of_passage",
    parkId: "animal_kingdom",
    areaId: "pandora",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Avatar Flight of Passage",
    visualKey: "floating_mountains_flight",
    icon: "mountain",
    accentColor: TOHI_THEME_COLORS.sky,
    softColor: TOHI_THEME_COLORS.skySoft,
    mood: "immersive, scenic, major headliner, indoor",
  },
  "Expedition Everest": {
    id: "expedition_everest",
    parkId: "animal_kingdom",
    areaId: "asia",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Expedition Everest",
    visualKey: "everest_peak",
    icon: "mountain",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "mountain thrill, adventure, outdoor coaster",
  },
  "Kilimanjaro Safaris": {
    id: "kilimanjaro_safaris",
    parkId: "animal_kingdom",
    areaId: "africa",
    type: TOHI_ARTWORK_TYPES.HEADLINER,
    name: "Kilimanjaro Safaris",
    visualKey: "savanna_sunrise",
    icon: "sun",
    accentColor: TOHI_THEME_COLORS.amber,
    softColor: TOHI_THEME_COLORS.amberSoft,
    mood: "savanna, open-air, family classic, scenic",
  },
};

export const DEFAULT_TOHI_ARTWORK = {
  id: "tohi_default",
  type: TOHI_ARTWORK_TYPES.DEFAULT,
  name: "TOHI",
  visualKey: "warm_family_park_day",
  icon: "sparkles",
  accentColor: TOHI_THEME_COLORS.purple,
  softColor: TOHI_THEME_COLORS.purpleSoft,
  heroGradient: TOHI_THEME_GRADIENTS.heroDay,
  nightGradient: TOHI_THEME_GRADIENTS.heroNight,
  mood: "warm, calm, premium family park-day companion",
  altText: "Warm premium TOHI park-day scene with soft color, rounded shapes, and calm family travel energy.",
};

export function normalizeArtworkKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findByNormalizedName(collection, value) {
  const normalizedValue = normalizeArtworkKey(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    Object.values(collection).find((item) => {
      return (
        normalizeArtworkKey(item.id) === normalizedValue ||
        normalizeArtworkKey(item.name) === normalizedValue ||
        normalizeArtworkKey(item.shortName) === normalizedValue ||
        normalizeArtworkKey(item.visualKey) === normalizedValue
      );
    }) || null
  );
}

export function getParkArtwork(parkIdOrName) {
  if (!parkIdOrName) {
    return DEFAULT_TOHI_ARTWORK;
  }

  return (
    TOHI_PARK_ARTWORK[parkIdOrName] ||
    TOHI_PARK_ARTWORK[normalizeArtworkKey(parkIdOrName)] ||
    findByNormalizedName(TOHI_PARK_ARTWORK, parkIdOrName) ||
    DEFAULT_TOHI_ARTWORK
  );
}

export function getAreaArtwork(areaIdOrName, parkIdOrName) {
  if (!areaIdOrName) {
    return parkIdOrName ? getParkArtwork(parkIdOrName) : DEFAULT_TOHI_ARTWORK;
  }

  const area =
    TOHI_AREA_ARTWORK[areaIdOrName] ||
    TOHI_AREA_ARTWORK[normalizeArtworkKey(areaIdOrName)] ||
    findByNormalizedName(TOHI_AREA_ARTWORK, areaIdOrName);

  if (!area) {
    return parkIdOrName ? getParkArtwork(parkIdOrName) : DEFAULT_TOHI_ARTWORK;
  }

  return area;
}

export function getHeadlinerArtwork(rideName) {
  if (!rideName) {
    return null;
  }

  return TOHI_HEADLINER_ARTWORK[rideName] || findByNormalizedName(TOHI_HEADLINER_ARTWORK, rideName);
}

export function getTohiArtwork({
  rideName,
  areaId,
  areaName,
  parkId,
  parkName,
} = {}) {
  const headlinerArtwork = getHeadlinerArtwork(rideName);

  if (headlinerArtwork) {
    return headlinerArtwork;
  }

  if (areaId || areaName) {
    return getAreaArtwork(areaId || areaName, parkId || parkName);
  }

  return getParkArtwork(parkId || parkName);
}

export function getArtworkAccent(artwork = DEFAULT_TOHI_ARTWORK) {
  return {
    accentColor: artwork.accentColor || DEFAULT_TOHI_ARTWORK.accentColor,
    softColor: artwork.softColor || DEFAULT_TOHI_ARTWORK.softColor,
    heroGradient: artwork.heroGradient || DEFAULT_TOHI_ARTWORK.heroGradient,
    nightGradient: artwork.nightGradient || DEFAULT_TOHI_ARTWORK.nightGradient,
  };
}

export default {
  TOHI_ARTWORK_TYPES,
  TOHI_PARK_ARTWORK,
  TOHI_AREA_ARTWORK,
  TOHI_HEADLINER_ARTWORK,
  DEFAULT_TOHI_ARTWORK,
  getParkArtwork,
  getAreaArtwork,
  getHeadlinerArtwork,
  getTohiArtwork,
  getArtworkAccent,
  normalizeArtworkKey,
};
