export const PARKS = [
  { id: "magic_kingdom", name: "Magic Kingdom" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood", name: "Hollywood Studios" },
  { id: "animal_kingdom", name: "Animal Kingdom" },
  { id: "universal_sf", name: "Universal Studios Florida" },
  { id: "islands", name: "Islands of Adventure" },
  { id: "epic_universe", name: "Epic Universe" },
];

export const LAND_OPTIONS = {
  magic_kingdom: [
    {
      value: "main_street",
      label: "Main Street / near entrance, shops, castle hub",
    },
    {
      value: "adventureland",
      label: "Adventureland / near Pirates, Jungle Cruise, Aladdin",
    },
    {
      value: "frontierland",
      label: "Frontierland / near Big Thunder, Tiana’s, Country Bears",
    },
    {
      value: "liberty_square",
      label: "Liberty Square / near Haunted Mansion, Hall of Presidents",
    },
    {
      value: "fantasyland",
      label: "Fantasyland / near Peter Pan, Small World, Seven Dwarfs, Little Mermaid",
    },
    {
      value: "tomorrowland",
      label: "Tomorrowland / near Space Mountain, TRON, Buzz, PeopleMover",
    },
  ],

  epcot: [
    {
      value: "world_celebration",
      label: "World Celebration / near Spaceship Earth, Connections, Creations",
    },
    {
      value: "world_discovery",
      label: "World Discovery / near Guardians, Test Track, Mission: SPACE",
    },
    {
      value: "world_nature",
      label: "World Nature / near Soarin’, The Land, The Seas, Moana",
    },
    {
      value: "world_showcase_west",
      label: "World Showcase West / near Remy, France, UK, Canada",
    },
    {
      value: "world_showcase_center",
      label: "World Showcase Center / near America, Japan, Italy, Morocco",
    },
    {
      value: "world_showcase_east",
      label: "World Showcase East / near Frozen, Mexico, Norway, China",
    },
  ],

  hollywood: [
    {
      value: "hollywood_boulevard",
      label: "Hollywood Boulevard / near Mickey & Minnie’s Runaway Railway",
    },
    {
      value: "sunset_boulevard",
      label: "Sunset Boulevard / near Tower of Terror, Rock ’n’ Roller",
    },
    {
      value: "echo_lake",
      label: "Echo Lake / near Star Tours, Frozen Sing-Along, Backlot Express",
    },
    {
      value: "grand_avenue",
      label: "Grand Avenue / near BaseLine, ABC Commissary side",
    },
    {
      value: "star_wars_galaxys_edge",
      label: "Galaxy’s Edge / near Rise, Falcon, Docking Bay 7",
    },
    {
      value: "toy_story_land",
      label: "Toy Story Land / near Slinky, Toy Story Mania, Alien Saucers",
    },
    {
      value: "animation_courtyard",
      label: "Animation Courtyard / near Disney Junior, Walt Disney Presents area",
    },
    {
      value: "commissary_lane",
      label: "Commissary Lane / near ABC Commissary, Sci-Fi Dine-In",
    },
  ],

  animal_kingdom: [
    {
      value: "oasis",
      label: "Oasis / near front entrance, ticket tapstiles, Oasis trails",
    },
    {
      value: "discovery_island",
      label: "Discovery Island / near Tree of Life, Zootopia, Nemo, Adventurers Outpost, Flame Tree",
    },
    {
      value: "pandora",
      label: "Pandora / near Flight of Passage, Na’vi River Journey, Satu’li Canteen",
    },
    {
      value: "africa",
      label: "Africa / near Kilimanjaro Safaris, Festival of the Lion King, Gorilla Falls, Harambe",
    },
    {
      value: "asia",
      label: "Asia / near Expedition Everest, Kali River Rapids, Maharajah Jungle Trek, Yak & Yeti",
    },
    {
      value: "rafikis_planet_watch",
      label: "Rafiki’s Planet Watch / near Bluey’s Wild World, Animation Experience, Affection Section",
    },
    {
      value: "tropical_americas_construction",
      label: "Tropical Americas construction / former DinoLand side, near Nemo theater path",
    },
  ],
};

export function getDefaultLandForPark(parkId) {
  return LAND_OPTIONS[parkId]?.[0]?.value || "";
}

export function getSafeLandForPark(parkId, land) {
  const options = LAND_OPTIONS[parkId] || [];
  const hasLand = options.some((option) => option.value === land);

  return hasLand ? land : getDefaultLandForPark(parkId);
}

export function formatLandLabel(parkId, land) {
  const labels = {
    magic_kingdom: {
      main_street: "Main Street, U.S.A.",
      adventureland: "Adventureland",
      frontierland: "Frontierland",
      liberty_square: "Liberty Square",
      fantasyland: "Fantasyland",
      tomorrowland: "Tomorrowland",
    },

    epcot: {
      world_celebration: "World Celebration",
      world_discovery: "World Discovery",
      world_nature: "World Nature",
      world_showcase_west: "World Showcase West / France-UK-Canada",
      world_showcase_center: "World Showcase Center / America-Japan-Italy",
      world_showcase_east: "World Showcase East / Mexico-Norway-China",
      world_showcase: "World Showcase",
      "American Adventure Pavilion": "American Adventure Pavilion",
    },

    hollywood: {
      hollywood_boulevard: "Hollywood Boulevard",
      sunset_boulevard: "Sunset Boulevard",
      echo_lake: "Echo Lake",
      grand_avenue: "Grand Avenue",
      star_wars_galaxys_edge: "Star Wars: Galaxy’s Edge",
      toy_story_land: "Toy Story Land",
      animation_courtyard: "Animation Courtyard",
      commissary_lane: "Commissary Lane",
    },

    animal_kingdom: {
      oasis: "Oasis",
      discovery_island: "Discovery Island",
      pandora: "Pandora",
      africa: "Africa",
      asia: "Asia",
      rafikis_planet_watch: "Rafiki’s Planet Watch",
      tropical_americas_construction: "Tropical Americas Construction",
    },
  };

  return labels[parkId]?.[land] || land || "Unknown area";
}
