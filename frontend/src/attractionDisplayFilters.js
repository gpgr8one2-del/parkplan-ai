/**
 * ParkPlan AI — Attraction Display Filters
 *
 * Filters raw Queue-Times feed entries for guest-facing UI.
 *
 * Important:
 * Do not let raw feed entries decide the product experience.
 * Some entries are useful operationally, but make the wait-time list feel dumb:
 * galleries, passive exhibits, Kidcot stops, Single Rider variants, and venue names.
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
