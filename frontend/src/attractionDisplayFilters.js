/**
 * ParkPlan AI — Attraction Display Filters
 *
 * Filters raw Queue-Times feed entries for guest-facing UI.
 *
 * Important:
 * Do not let raw feed entries decide the product experience.
 * Some entries are useful operationally, but make the wait-time list feel dumb:
 * galleries, passive exhibits, Kidcot stops, Single Rider variants, character greetings,
 * venue-name filler entries, landmarks, walking trails, and construction/legacy items.
 */

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const EXACT_HIDE_NAMES_BY_PARK = {
  epcot: new Set(
    [
      "Canada Far and Wide in Circle-Vision 360",
      "Gallery of Arts and History",
      "House of the Whispering Willows",
      "Mexico Folk Art Gallery",
      "Remy's Ratatouille Adventure Single Rider",
      "Stave Church Gallery",
      "Test Track Presented by Chevrolet Single Rider",
      "Project Tomorrow: Inventing the Wonders of the Future",
      "Bijutsu-kan Gallery",
      "American Heritage Gallery",
      "Kidcot Fun Stops",
      "Palais du Cinéma",
    ].map(normalizeName)
  ),

  hollywood: new Set(
    [
      "Meet Ariel at Walt Disney Presents",
      "Meet Disney Stars at Red Carpet Dreams",
      "Meet Olaf at Celebrity Spotlight",
      "Meet Sulley at Walt Disney Presents",
      "Celebrity Spotlight",
      "Red Carpet Dreams",
      "Lightning McQueen's Racing Academy",
      "Vacation Fun - An Original Animated Short with Mickey & Minnie",
      "Walt Disney Presents",
      "Disney Junior Play and Dance!",
      "Star Wars Launch Bay",
      "Meet Darth Vader at Star Wars Launch Bay",
      "Meet BB-8 at Star Wars Launch Bay",
      "Meet Chewbacca at Star Wars Launch Bay",
    ].map(normalizeName)
  ),

  animal_kingdom: new Set(
    [
      // Single-rider / operational variants
      "Expedition Everest - Legend of the Forbidden Mountain Single Rider",

      // Landmarks / context-only / photo spots
      "Tree of Life",

      // Walking trails / exhibits / self-paced areas that should not look like lines
      "Gorilla Falls Exploration Trail",
      "Maharajah Jungle Trek",
      "Discovery Island Trails",
      "The Oasis Exhibits",

      // Wilderness Explorers is an activity program, not a line-based attraction
      "Wilderness Explorers",

      // Character meets should eventually be handled by character/family profile logic,
      // not as normal wait-time ride cards.
      "Meet Favorite Disney Pals at Adventurers Outpost",
      "Meet Moana at Character Landing",

      // Rafiki's / legacy items that should not appear as normal ride waits
      "Animal Care at Conservation Station",
      "Conservation Station",
      "Affection Section",

      // Old / closed / transition items
      "It's Tough to be a Bug!",
      "DINOSAUR",
      "TriceraTop Spin",
      "The Boneyard",
      "Fossil Fun Games",
      "Finding Nemo: The Big Blue... and Beyond! Single Rider",
    ].map(normalizeName)
  ),
};

const GENERIC_HIDE_PATTERNS_BY_PARK = {
  epcot: [
    /single rider/i,
    /single-rider/i,
    /kidcot/i,
    /gallery/i,
    /palais du cinéma/i,
    /palais du cinema/i,
    /project tomorrow/i,
    /house of the whispering willows/i,
    /stave church/i,
  ],

  hollywood: [
    /single rider/i,
    /single-rider/i,
    /lightning lane/i,
    /meet .* at /i,
    /^meet /i,
    /character/i,
    /red carpet dreams/i,
    /celebrity spotlight/i,
    /star wars launch bay/i,
    /walt disney presents/i,
    /vacation fun/i,
    /disney junior/i,
  ],

  animal_kingdom: [
    /single rider/i,
    /single-rider/i,
    /lightning lane/i,
    /^meet /i,
    /meet .* at /i,
    /character landing/i,

    // Trails / exhibits / activities
    /trail/i,
    /trails/i,
    /exhibit/i,
    /exhibits/i,
    /wilderness explorers/i,

    // Context-only / landmark
    /^tree of life$/i,

    // Rafiki's legacy/feed items that are not normal line-based rides
    /animal care/i,
    /conservation station/i,
    /affection section/i,

    // Closed / transition / legacy DinoLand items
    /dinoland/i,
    /dinosaur/i,
    /tricera/i,
    /boneyard/i,
    /fossil/i,
    /primeval/i,
  ],
};

export function shouldShowRideInWaitList(parkId, ride) {
  const name = ride?.name || "";
  const normalizedName = normalizeName(name);

  if (!normalizedName) return false;

  const exactHiddenNames = EXACT_HIDE_NAMES_BY_PARK[parkId];
  if (exactHiddenNames?.has(normalizedName)) return false;

  const genericPatterns = GENERIC_HIDE_PATTERNS_BY_PARK[parkId] || [];
  if (genericPatterns.some((pattern) => pattern.test(name))) return false;

  return true;
}
