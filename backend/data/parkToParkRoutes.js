/**
 * Walt Disney World park-to-park transportation routes (64C-3B).
 *
 * Structured, audited route data for travel BETWEEN the four Walt Disney World
 * theme parks. This is deliberately a data module, not prose inside the system
 * prompt: routes need to be diffed, reviewed, executed by a harness, and dated,
 * and none of that is possible once they are sentences in an instruction block.
 *
 * WHY THIS EXISTS
 *
 * TOHI previously refused every park-to-park question, because the only
 * structured transportation data it had covered the current park to the guest's
 * selected resort. That refusal was correct — inventing a route is the failure
 * this whole sequence exists to prevent — but it left a real gap. This module
 * closes the gap with verified data rather than by relaxing the rule.
 *
 * SCOPE OF THIS PHASE
 *
 * Data and resolver only. Nothing here is wired into aiService.js yet, and this
 * module deliberately contains no natural-language parsing: the resolver takes
 * exact canonical park IDs and never inspects a user sentence. Deciding which
 * parks a question is about is a separate concern for a later phase.
 *
 * WHAT IS NOT RECORDED, ON PURPOSE
 *
 * No travel-time estimates, bus intervals, operating hours, or first/last
 * departure times. No fastest/quickest/best ranking. No walking, Minnie Van,
 * rideshare, driving or parking guidance. None of that is verifiable from the
 * sources below, and a stale number is worse than no number.
 *
 * "Direct" means no vehicle change. A vehicle that makes intermediate stops is
 * still direct; only a change of vehicle is a transfer.
 */

const VERIFIED_ON = "2026-08-16";

// Routes, hours and service genuinely do change, so every entry carries this.
// It states no hours and no timings of its own.
const OPERATIONAL_CAVEAT =
  "Routes, operating hours and service can change with weather, maintenance and daily conditions. " +
  "Confirm current operation in the My Disney Experience app or with posted transportation signage.";

// Source authority, recorded as audit metadata only. Nothing here is fetched at
// runtime. The `type` field matters: planDisney is Disney-hosted guidance rather
// than the core transportation FAQ, and that difference is recorded honestly so
// a reviewer can weigh it rather than discover it later.
const SOURCES = {
  transportationFaq: {
    id: "wdw_transportation_faq",
    type: "first_party_faq",
    label: "Walt Disney World — Getting Around Disney World (transportation FAQ)",
    url: "https://disneyworld.disney.go.com/faq/transportation/getting-around-disney-world/",
  },
  monorail: {
    id: "wdw_monorail",
    type: "first_party_guest_services",
    label: "Walt Disney World — Disney Monorail Transportation",
    url: "https://disneyworld.disney.go.com/guest-services/monorail-transportation/",
  },
  skyliner: {
    id: "wdw_skyliner",
    type: "first_party_guest_services",
    label: "Walt Disney World — Disney Skyliner",
    url: "https://disneyworld.disney.go.com/guest-services/disney-skyliner/",
  },
  bus: {
    id: "wdw_bus",
    type: "first_party_guest_services",
    label: "Walt Disney World — Disney Bus Transportation",
    url: "https://disneyworld.disney.go.com/guest-services/bus-transportation/",
  },
  // Disney-hosted planDisney guidance. Weaker than the core FAQ and labelled as
  // such: it is what confirms the Magic Kingdom <-> Hollywood Studios bus pair
  // specifically, which the transportation FAQ does not spell out pair by pair.
  planDisneyMkHs: {
    id: "plandisney_mk_hs_route",
    type: "disney_hosted_plandisney",
    label: "planDisney (Disney-hosted) — Magic Kingdom to Hollywood Studios transportation",
    url: "https://plandisney.disney.go.com/question/mk-hs-618892/",
  },
  planDisneyMkHsBus: {
    id: "plandisney_mk_hs_bus",
    type: "disney_hosted_plandisney",
    label: "planDisney (Disney-hosted) — bus service between Magic Kingdom and Hollywood Studios",
    url:
      "https://plandisney.disney.go.com/question/time-last-bus-leave-go-magic-kingdom-hollywood-studios-637072/",
  },
};

// The canonical IDs the rest of the app already uses. "hollywood" is the app's
// identifier for Disney's Hollywood Studios; "hollywood_studios" is only an
// input alias normalised elsewhere, and must never appear as a key here.
const PARK_TO_PARK_PARK_IDS = ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"];

const RECOGNIZED_MODES = ["bus", "monorail", "boat", "skyliner"];

const TTC = "Transportation and Ticket Center (TTC)";
const CARIBBEAN_BEACH_HUB = "Caribbean Beach Resort Skyliner hub";

function busRoute(boardingDetail) {
  const route = {
    mode: "bus",
    label: "Direct Disney bus",
    transferRequired: false,
  };
  if (boardingDetail) route.boardingDetail = boardingDetail;
  return route;
}

const PARK_TO_PARK_ROUTES = [
  // --- Magic Kingdom <-> EPCOT: monorail, TTC transfer in both directions ----
  // The monorail services are separate lines that both originate at the TTC, so
  // this journey is a vehicle change, not a through ride.
  {
    originPark: "magic_kingdom",
    destinationPark: "epcot",
    routes: [
      {
        mode: "monorail",
        label: "Monorail via the Transportation and Ticket Center",
        transferRequired: true,
        transferLocation: TTC,
        boardingDetail:
          "Board the monorail at the Magic Kingdom station, travel to the Transportation and Ticket Center, then change to the EPCOT Monorail line.",
      },
    ],
    sources: [SOURCES.transportationFaq, SOURCES.monorail],
  },
  {
    originPark: "epcot",
    destinationPark: "magic_kingdom",
    routes: [
      {
        mode: "monorail",
        label: "Monorail via the Transportation and Ticket Center",
        transferRequired: true,
        transferLocation: TTC,
        boardingDetail:
          "Board the EPCOT Monorail at EPCOT, travel to the Transportation and Ticket Center, then change to the Magic Kingdom Monorail service.",
      },
    ],
    sources: [SOURCES.transportationFaq, SOURCES.monorail],
  },

  // --- Magic Kingdom <-> Hollywood Studios: direct bus -----------------------
  // Confirmed by Disney-hosted planDisney guidance rather than the core FAQ,
  // which is why both planDisney references are attached.
  {
    originPark: "magic_kingdom",
    destinationPark: "hollywood",
    routes: [
      busRoute(
        "Board at the signed bus transportation area outside Magic Kingdom."
      ),
    ],
    sources: [SOURCES.bus, SOURCES.planDisneyMkHs, SOURCES.planDisneyMkHsBus],
  },
  {
    originPark: "hollywood",
    destinationPark: "magic_kingdom",
    routes: [
      busRoute(
        "Board at the signed bus transportation area outside Disney's Hollywood Studios."
      ),
    ],
    sources: [SOURCES.bus, SOURCES.planDisneyMkHs, SOURCES.planDisneyMkHsBus],
  },

  // --- Magic Kingdom <-> Animal Kingdom: direct bus --------------------------
  {
    originPark: "magic_kingdom",
    destinationPark: "animal_kingdom",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },
  {
    originPark: "animal_kingdom",
    destinationPark: "magic_kingdom",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },

  // --- EPCOT <-> Hollywood Studios: boat AND Skyliner ------------------------
  // Both officially supported options are kept in both directions. The boat is
  // a single vehicle; the Skyliner is two lines meeting at the Caribbean Beach
  // hub, so only the Skyliner carries a transfer.
  {
    originPark: "epcot",
    destinationPark: "hollywood",
    routes: [
      {
        mode: "boat",
        label: "Friendship Boat water transportation",
        transferRequired: false,
        boardingDetail:
          "Board at the water transportation dock by the EPCOT International Gateway.",
      },
      {
        mode: "skyliner",
        label: "Disney Skyliner via the Caribbean Beach hub",
        transferRequired: true,
        transferLocation: CARIBBEAN_BEACH_HUB,
        boardingDetail:
          "Board at the EPCOT International Gateway Skyliner station, then change at the Caribbean Beach Resort hub to the Disney's Hollywood Studios line.",
      },
    ],
    sources: [SOURCES.transportationFaq, SOURCES.skyliner],
  },
  {
    originPark: "hollywood",
    destinationPark: "epcot",
    routes: [
      {
        mode: "boat",
        label: "Friendship Boat water transportation",
        transferRequired: false,
        boardingDetail:
          "Board at the Disney's Hollywood Studios water transportation dock; arrives at the EPCOT International Gateway.",
      },
      {
        mode: "skyliner",
        label: "Disney Skyliner via the Caribbean Beach hub",
        transferRequired: true,
        transferLocation: CARIBBEAN_BEACH_HUB,
        boardingDetail:
          "Board at the Disney's Hollywood Studios Skyliner station, then change at the Caribbean Beach Resort hub to the EPCOT line, arriving at the International Gateway.",
      },
    ],
    sources: [SOURCES.transportationFaq, SOURCES.skyliner],
  },

  // --- EPCOT <-> Animal Kingdom: direct bus ----------------------------------
  {
    originPark: "epcot",
    destinationPark: "animal_kingdom",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },
  {
    originPark: "animal_kingdom",
    destinationPark: "epcot",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },

  // --- Hollywood Studios <-> Animal Kingdom: direct bus ----------------------
  {
    originPark: "hollywood",
    destinationPark: "animal_kingdom",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },
  {
    originPark: "animal_kingdom",
    destinationPark: "hollywood",
    routes: [busRoute()],
    sources: [SOURCES.transportationFaq, SOURCES.bus],
  },
].map((entry) => ({
  ...entry,
  verifiedOn: VERIFIED_ON,
  operationalCaveat: OPERATIONAL_CAVEAT,
}));

// Frozen so nothing downstream can edit the audited table in place. The resolver
// additionally hands back a copy, so a caller mutating what it received cannot
// reach this data either.
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

deepFreeze(PARK_TO_PARK_ROUTES);
deepFreeze(PARK_TO_PARK_PARK_IDS);
deepFreeze(RECOGNIZED_MODES);
deepFreeze(SOURCES);

function deepCopy(value) {
  if (Array.isArray(value)) return value.map(deepCopy);
  if (value && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = deepCopy(value[key]);
    return copy;
  }
  return value;
}

const ROUTE_INDEX = new Map(
  PARK_TO_PARK_ROUTES.map((entry) => [`${entry.originPark}>${entry.destinationPark}`, entry])
);

/**
 * Resolve a verified park-to-park route.
 *
 * Exact canonical park IDs only — this never inspects a sentence, and never
 * guesses. Anything it cannot verify returns null, and null means "say it is not
 * verified", never "assume a bus".
 */
function resolveParkToParkRoute(originPark, destinationPark) {
  if (typeof originPark !== "string" || typeof destinationPark !== "string") return null;

  const origin = originPark.trim();
  const destination = destinationPark.trim();

  if (!PARK_TO_PARK_PARK_IDS.includes(origin)) return null;
  if (!PARK_TO_PARK_PARK_IDS.includes(destination)) return null;
  if (origin === destination) return null;

  const entry = ROUTE_INDEX.get(`${origin}>${destination}`);
  if (!entry) return null;

  // A copy, so a caller that mutates the result cannot corrupt the dataset.
  return deepCopy(entry);
}

module.exports = {
  PARK_TO_PARK_PARK_IDS,
  RECOGNIZED_MODES,
  PARK_TO_PARK_ROUTES,
  PARK_TO_PARK_SOURCES: SOURCES,
  PARK_TO_PARK_OPERATIONAL_CAVEAT: OPERATIONAL_CAVEAT,
  PARK_TO_PARK_VERIFIED_ON: VERIFIED_ON,
  resolveParkToParkRoute,
};
