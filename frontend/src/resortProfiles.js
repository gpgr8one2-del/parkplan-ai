/**
 * ParkPlan AI — Disney Resort Profiles
 *
 * Resort context is used for break planning, rope-drop advice,
 * transportation realism, and AI chat guidance.
 *
 * Important:
 * Do not assume a resort is a quick break option just because it has a
 * transportation mode somewhere on property. Direct park access matters.
 */

export const DISNEY_RESORT_PROFILES = [
  // ---------------------------------------------------------------------------
  // Magic Kingdom Resort Area
  // ---------------------------------------------------------------------------
  {
    id: "contemporary",
    name: "Disney’s Contemporary Resort / Bay Lake Tower",
    area: "magic_kingdom_resort_area",
    areaLabel: "Magic Kingdom Resort Area",
    coordinates: { lat: 28.4185, lng: -81.5745 },
    nearestParks: ["magic_kingdom"],
    transportation: ["monorail", "water_taxi", "walking", "bus"],
    directAccess: {
      magic_kingdom: ["walking", "monorail"],
      epcot: ["monorail_transfer"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      magic_kingdom:
        "Excellent resort-break option from Magic Kingdom. Walking path and monorail access make this one of the easiest midday resets.",
      epcot:
        "Possible by monorail transfer, but not a quick casual break unless the family planned for the time.",
      hollywood:
        "Not a quick break from Hollywood Studios. Use in-park recovery unless the family is intentionally leaving.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom. Use in-park recovery unless the family is leaving for a longer reset.",
    },
  },
  {
    id: "grand_floridian",
    name: "Disney’s Grand Floridian Resort & Spa",
    area: "magic_kingdom_resort_area",
    areaLabel: "Magic Kingdom Resort Area",
    coordinates: { lat: 28.4111, lng: -81.5878 },
    nearestParks: ["magic_kingdom"],
    transportation: ["monorail", "water_taxi", "walking", "bus"],
    directAccess: {
      magic_kingdom: ["walking", "monorail", "water_taxi"],
      epcot: ["monorail_transfer"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      magic_kingdom:
        "Excellent resort-break option from Magic Kingdom. Great for a calmer reset, meal, or pool break.",
      epcot:
        "Possible by monorail transfer, but not a quick recovery move from inside EPCOT.",
      hollywood:
        "Not a quick break from Hollywood Studios.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "polynesian",
    name: "Disney’s Polynesian Village Resort",
    area: "magic_kingdom_resort_area",
    areaLabel: "Magic Kingdom Resort Area",
    coordinates: { lat: 28.4057, lng: -81.5843 },
    nearestParks: ["magic_kingdom"],
    transportation: ["monorail", "water_taxi", "walking", "bus"],
    directAccess: {
      magic_kingdom: ["monorail", "water_taxi", "walking_to_ttc"],
      epcot: ["monorail_transfer"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      magic_kingdom:
        "Strong resort-break option from Magic Kingdom. Monorail, boat, and TTC proximity make it realistic.",
      epcot:
        "More realistic than most Magic Kingdom resorts because of TTC/EPCOT monorail access, but still not a tiny break.",
      hollywood:
        "Not a quick break from Hollywood Studios.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "wilderness_lodge",
    name: "Disney’s Wilderness Lodge",
    area: "magic_kingdom_resort_area",
    areaLabel: "Magic Kingdom Resort Area",
    coordinates: { lat: 28.4081, lng: -81.5723 },
    nearestParks: ["magic_kingdom"],
    transportation: ["water_taxi", "bus"],
    directAccess: {
      magic_kingdom: ["water_taxi"],
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      magic_kingdom:
        "Excellent nearby resort-break option from Magic Kingdom by water taxi. Good lunch, AC, or pool reset option.",
      epcot:
        "Not a quick break from EPCOT.",
      hollywood:
        "Not a quick break from Hollywood Studios.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "fort_wilderness",
    name: "Disney’s Fort Wilderness Resort & Campground",
    area: "magic_kingdom_resort_area",
    areaLabel: "Magic Kingdom Resort Area",
    coordinates: { lat: 28.4054, lng: -81.5540 },
    nearestParks: ["magic_kingdom"],
    transportation: ["water_taxi", "bus"],
    directAccess: {
      magic_kingdom: ["water_taxi"],
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      magic_kingdom:
        "Realistic from Magic Kingdom by boat, but internal Fort Wilderness transportation can add time. Better for a planned break than a fast reset.",
      epcot:
        "Not a quick break from EPCOT.",
      hollywood:
        "Not a quick break from Hollywood Studios.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },

  // ---------------------------------------------------------------------------
  // EPCOT / Hollywood Studios Resort Area
  // ---------------------------------------------------------------------------
  {
    id: "beach_club",
    name: "Disney’s Beach Club Resort / Villas",
    area: "epcot_hollywood_resort_area",
    areaLabel: "EPCOT / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3712, lng: -81.5562 },
    nearestParks: ["epcot", "hollywood"],
    transportation: ["walking", "water_taxi", "bus", "skyliner_via_epcot"],
    directAccess: {
      epcot: ["walking"],
      hollywood: ["walking", "water_taxi"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      epcot:
        "Excellent break option from EPCOT International Gateway. One of the easiest resort resets on property.",
      hollywood:
        "Realistic break option from Hollywood Studios by walking path or boat, but walking can feel long in heat.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "yacht_club",
    name: "Disney’s Yacht Club Resort",
    area: "epcot_hollywood_resort_area",
    areaLabel: "EPCOT / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3703, lng: -81.5586 },
    nearestParks: ["epcot", "hollywood"],
    transportation: ["walking", "water_taxi", "bus", "skyliner_via_epcot"],
    directAccess: {
      epcot: ["walking"],
      hollywood: ["walking", "water_taxi"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      epcot:
        "Excellent break option from EPCOT International Gateway.",
      hollywood:
        "Realistic by walking path or boat, but not as instant as it looks on a map in peak heat.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "boardwalk",
    name: "Disney’s BoardWalk Inn / Villas",
    area: "epcot_hollywood_resort_area",
    areaLabel: "EPCOT / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3664, lng: -81.5562 },
    nearestParks: ["epcot", "hollywood"],
    transportation: ["walking", "water_taxi", "bus", "skyliner_via_epcot"],
    directAccess: {
      epcot: ["walking"],
      hollywood: ["walking", "water_taxi"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      epcot:
        "Excellent break option from EPCOT International Gateway.",
      hollywood:
        "Realistic by walking path or boat. Good if the family can handle the walk or wants a longer reset.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "riviera",
    name: "Disney’s Riviera Resort",
    area: "epcot_hollywood_resort_area",
    areaLabel: "EPCOT / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3619, lng: -81.5434 },
    nearestParks: ["epcot", "hollywood"],
    transportation: ["skyliner", "bus"],
    directAccess: {
      epcot: ["skyliner"],
      hollywood: ["skyliner"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      epcot:
        "Realistic Skyliner break from EPCOT, especially from International Gateway.",
      hollywood:
        "Realistic Skyliner break from Hollywood Studios.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom. Do not suggest as a casual lunch reset from MK.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "caribbean_beach",
    name: "Disney’s Caribbean Beach Resort",
    area: "epcot_hollywood_resort_area",
    areaLabel: "EPCOT / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3614, lng: -81.5414 },
    nearestParks: ["epcot", "hollywood"],
    transportation: ["skyliner", "bus"],
    directAccess: {
      epcot: ["skyliner"],
      hollywood: ["skyliner"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      epcot:
        "Realistic Skyliner break from EPCOT, especially if near International Gateway.",
      hollywood:
        "Realistic Skyliner break from Hollywood Studios.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },

  // ---------------------------------------------------------------------------
  // Animal Kingdom Resort Area
  // ---------------------------------------------------------------------------
  {
    id: "animal_kingdom_lodge",
    name: "Disney’s Animal Kingdom Lodge / Kidani Village",
    area: "animal_kingdom_resort_area",
    areaLabel: "Animal Kingdom Resort Area",
    coordinates: { lat: 28.3529, lng: -81.6026 },
    nearestParks: ["animal_kingdom"],
    transportation: ["bus"],
    directAccess: {
      animal_kingdom: ["bus"],
      magic_kingdom: ["bus"],
      epcot: ["bus"],
      hollywood: ["bus"],
    },
    breakStrategy: {
      animal_kingdom:
        "Best resort-break fit from Animal Kingdom, but still bus-based. Good for a longer midday reset, not a quick pop-out.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
      epcot:
        "Not a quick break from EPCOT.",
      hollywood:
        "Not a quick break from Hollywood Studios.",
    },
  },
  {
    id: "coronado_springs",
    name: "Disney’s Coronado Springs Resort / Gran Destino Tower",
    area: "animal_kingdom_resort_area",
    areaLabel: "Animal Kingdom / Hollywood Studios Resort Area",
    coordinates: { lat: 28.3627, lng: -81.5750 },
    nearestParks: ["animal_kingdom", "hollywood"],
    transportation: ["bus"],
    directAccess: {
      animal_kingdom: ["bus"],
      hollywood: ["bus"],
      epcot: ["bus"],
      magic_kingdom: ["bus"],
    },
    breakStrategy: {
      animal_kingdom:
        "Reasonable bus-based break from Animal Kingdom if the family needs a true reset.",
      hollywood:
        "Reasonable bus-based break from Hollywood Studios, but not instant.",
      epcot:
        "Not a quick break from EPCOT.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
    },
  },
  {
    id: "all_star_movies",
    name: "Disney’s All-Star Movies Resort",
    area: "animal_kingdom_resort_area",
    areaLabel: "Animal Kingdom Resort Area",
    coordinates: { lat: 28.3371, lng: -81.5724 },
    nearestParks: ["animal_kingdom"],
    transportation: ["bus"],
    directAccess: {
      animal_kingdom: ["bus"],
      hollywood: ["bus"],
      epcot: ["bus"],
      magic_kingdom: ["bus"],
    },
    breakStrategy: {
      animal_kingdom:
        "Bus-based break option from Animal Kingdom. Better for a planned midday reset than a quick escape.",
      hollywood:
        "Possible by bus, but not a quick casual break.",
      epcot:
        "Not a quick break from EPCOT.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
    },
  },
  {
    id: "all_star_music",
    name: "Disney’s All-Star Music Resort",
    area: "animal_kingdom_resort_area",
    areaLabel: "Animal Kingdom Resort Area",
    coordinates: { lat: 28.3392, lng: -81.5735 },
    nearestParks: ["animal_kingdom"],
    transportation: ["bus"],
    directAccess: {
      animal_kingdom: ["bus"],
      hollywood: ["bus"],
      epcot: ["bus"],
      magic_kingdom: ["bus"],
    },
    breakStrategy: {
      animal_kingdom:
        "Bus-based break option from Animal Kingdom. Better for a planned reset than a quick escape.",
      hollywood:
        "Possible by bus, but not a quick casual break.",
      epcot:
        "Not a quick break from EPCOT.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
    },
  },
  {
    id: "all_star_sports",
    name: "Disney’s All-Star Sports Resort",
    area: "animal_kingdom_resort_area",
    areaLabel: "Animal Kingdom Resort Area",
    coordinates: { lat: 28.3424, lng: -81.5744 },
    nearestParks: ["animal_kingdom"],
    transportation: ["bus"],
    directAccess: {
      animal_kingdom: ["bus"],
      hollywood: ["bus"],
      epcot: ["bus"],
      magic_kingdom: ["bus"],
    },
    breakStrategy: {
      animal_kingdom:
        "Bus-based break option from Animal Kingdom. Better for a planned reset than a quick escape.",
      hollywood:
        "Possible by bus, but not a quick casual break.",
      epcot:
        "Not a quick break from EPCOT.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom.",
    },
  },

  // ---------------------------------------------------------------------------
  // Value / Disney Springs / Wide World Area
  // ---------------------------------------------------------------------------
  {
    id: "art_of_animation",
    name: "Disney’s Art of Animation Resort",
    area: "value_springs_area",
    areaLabel: "Skyliner / Value Resort Area",
    coordinates: { lat: 28.3496, lng: -81.5438 },
    nearestParks: ["hollywood", "epcot"],
    transportation: ["skyliner", "bus"],
    directAccess: {
      hollywood: ["skyliner"],
      epcot: ["skyliner"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      hollywood:
        "Realistic Skyliner break from Hollywood Studios.",
      epcot:
        "Realistic Skyliner break from EPCOT, especially from International Gateway.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom. Skyliner does not help from MK.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "pop_century",
    name: "Disney’s Pop Century Resort",
    area: "value_springs_area",
    areaLabel: "Skyliner / Value Resort Area",
    coordinates: { lat: 28.3512, lng: -81.5435 },
    nearestParks: ["hollywood", "epcot"],
    transportation: ["skyliner", "bus"],
    directAccess: {
      hollywood: ["skyliner"],
      epcot: ["skyliner"],
      magic_kingdom: ["bus"],
      animal_kingdom: ["bus"],
    },
    breakStrategy: {
      hollywood:
        "Realistic Skyliner break from Hollywood Studios.",
      epcot:
        "Realistic Skyliner break from EPCOT, especially from International Gateway.",
      magic_kingdom:
        "Not a quick break from Magic Kingdom. Do not suggest this as an easy Skyliner lunch reset from MK.",
      animal_kingdom:
        "Not a quick break from Animal Kingdom.",
    },
  },
  {
    id: "port_orleans_french_quarter",
    name: "Disney’s Port Orleans Resort – French Quarter",
    area: "disney_springs_area",
    areaLabel: "Disney Springs Resort Area",
    coordinates: { lat: 28.3792, lng: -81.5367 },
    nearestParks: ["epcot"],
    transportation: ["water_taxi_to_disney_springs", "bus"],
    directAccess: {
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
      magic_kingdom: ["bus"],
      disney_springs: ["water_taxi"],
    },
    breakStrategy: {
      epcot:
        "Bus-based break only. Not a quick casual EPCOT reset despite being relatively nearby.",
      hollywood:
        "Bus-based break only. Not quick.",
      animal_kingdom:
        "Bus-based break only. Not quick.",
      magic_kingdom:
        "Bus-based break only. Not quick.",
    },
  },
  {
    id: "port_orleans_riverside",
    name: "Disney’s Port Orleans Resort – Riverside",
    area: "disney_springs_area",
    areaLabel: "Disney Springs Resort Area",
    coordinates: { lat: 28.3846, lng: -81.5360 },
    nearestParks: ["epcot"],
    transportation: ["water_taxi_to_disney_springs", "bus"],
    directAccess: {
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
      magic_kingdom: ["bus"],
      disney_springs: ["water_taxi"],
    },
    breakStrategy: {
      epcot:
        "Bus-based break only. Not a quick casual EPCOT reset.",
      hollywood:
        "Bus-based break only. Not quick.",
      animal_kingdom:
        "Bus-based break only. Not quick.",
      magic_kingdom:
        "Bus-based break only. Not quick.",
    },
  },
  {
    id: "old_key_west",
    name: "Disney’s Old Key West Resort",
    area: "disney_springs_area",
    areaLabel: "Disney Springs Resort Area",
    coordinates: { lat: 28.3761, lng: -81.5367 },
    nearestParks: ["epcot"],
    transportation: ["water_taxi_to_disney_springs", "bus"],
    directAccess: {
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
      magic_kingdom: ["bus"],
      disney_springs: ["water_taxi"],
    },
    breakStrategy: {
      epcot:
        "Bus-based break only. Not a quick casual EPCOT reset.",
      hollywood:
        "Bus-based break only. Not quick.",
      animal_kingdom:
        "Bus-based break only. Not quick.",
      magic_kingdom:
        "Bus-based break only. Not quick.",
    },
  },
  {
    id: "saratoga_springs",
    name: "Disney’s Saratoga Springs Resort & Spa",
    area: "disney_springs_area",
    areaLabel: "Disney Springs Resort Area",
    coordinates: { lat: 28.3754, lng: -81.5209 },
    nearestParks: ["disney_springs"],
    transportation: ["water_taxi_to_disney_springs", "walking_to_disney_springs", "bus"],
    directAccess: {
      epcot: ["bus"],
      hollywood: ["bus"],
      animal_kingdom: ["bus"],
      magic_kingdom: ["bus"],
      disney_springs: ["walking", "water_taxi"],
    },
    breakStrategy: {
      epcot:
        "Bus-based break only. Not a quick casual EPCOT reset.",
      hollywood:
        "Bus-based break only. Not quick.",
      animal_kingdom:
        "Bus-based break only. Not quick.",
      magic_kingdom:
        "Bus-based break only. Not quick.",
    },
  },
];

export function getResortProfile(resortId) {
  if (!resortId) return null;

  return DISNEY_RESORT_PROFILES.find((resort) => resort.id === resortId) || null;
}

export function getResortOptions() {
  return DISNEY_RESORT_PROFILES.map((resort) => ({
    value: resort.id,
    label: resort.name,
    areaLabel: resort.areaLabel,
  }));
}
