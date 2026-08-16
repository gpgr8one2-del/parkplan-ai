#!/usr/bin/env node

// Walt Disney World park-to-park route data and resolver (64C-3B).
//
// TOHI refused every park-to-park question because its only structured
// transportation data covered the current park to the guest's selected resort.
// That refusal was right — inventing a route is the failure this whole sequence
// exists to prevent — but it left a real gap. 64C-3B closes it with audited data
// rather than by relaxing the rule.
//
// HOW THESE CLAIMS ARE ESTABLISHED
//
// The real module is REQUIRED and EXECUTED: the exported dataset is inspected as
// data and the exported resolver is called. Nothing here matches source text.
// The module is dependency-free CommonJS, so it loads directly even though the
// backend's node_modules are not installed in this workspace.
//
// The mutation check is a genuine attempt to corrupt the dataset through a
// resolved result, not a grep for Object.freeze. A freeze can be present and
// still be shallow.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-phase
// baseline, where the module does not exist. INVARIANT REGRESSION GUARDS are
// repository truths that hold on both sides; they are NOT padded with checks
// that merely happen to pass.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const MODULE_PATH = path.join(repoRoot, "backend", "data", "parkToParkRoutes.js");

const EXPECTED_PARKS = ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"];
const EXPECTED_VERIFIED_ON = "2026-08-16";

let passCount = 0;
let failCount = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    passCount += 1;
    console.log(`  PASS ${label}`);
  } else {
    failCount += 1;
    console.log(
      `  FAIL ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}
function featureCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) featureFail += 1;
  else featurePass += 1;
}
function invariantCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) invariantFail += 1;
  else invariantPass += 1;
}

/* ------------------------------------------------------- the real module -- */

const DATA = (() => {
  if (!fs.existsSync(MODULE_PATH)) return null;
  try {
    return require(MODULE_PATH);
  } catch (err) {
    console.log(`       module failed to load: ${err.message}`);
    return null;
  }
})();

console.log("TOHI park-to-park route data (64C-3B) — FEATURE-DISCRIMINATING");

check("the real route module loaded and was executed", DATA !== null, true);

const ROUTES = DATA?.PARK_TO_PARK_ROUTES || [];
const resolve = DATA?.resolveParkToParkRoute || (() => null);

const entryFor = (origin, destination) =>
  ROUTES.find((e) => e.originPark === origin && e.destinationPark === destination) || null;

const modesFor = (origin, destination) =>
  (entryFor(origin, destination)?.routes || []).map((r) => r.mode);

const routeOf = (origin, destination, mode) =>
  (entryFor(origin, destination)?.routes || []).find((r) => r.mode === mode) || null;

// Every ordered pair of distinct parks — the 12 journeys this phase must cover.
const ORDERED_PAIRS = EXPECTED_PARKS.flatMap((origin) =>
  EXPECTED_PARKS.filter((d) => d !== origin).map((destination) => [origin, destination])
);

/* --------------------------------------------------------- 1-6. structure -- */

featureCheck(
  "1. exactly four canonical park IDs, using 'hollywood' not 'hollywood_studios'",
  Array.isArray(DATA?.PARK_TO_PARK_PARK_IDS) &&
    DATA.PARK_TO_PARK_PARK_IDS.length === 4 &&
    EXPECTED_PARKS.every((p) => DATA.PARK_TO_PARK_PARK_IDS.includes(p)) &&
    !DATA.PARK_TO_PARK_PARK_IDS.includes("hollywood_studios"),
  true
);

featureCheck("2. exactly 12 directional pairs", ROUTES.length, 12);

featureCheck(
  "3. every possible ordered pair exists exactly once",
  ORDERED_PAIRS.length === 12 &&
    ORDERED_PAIRS.every(
      ([o, d]) =>
        ROUTES.filter((e) => e.originPark === o && e.destinationPark === d).length === 1
    ),
  true
);

featureCheck(
  "4. no self-routes",
  ROUTES.length > 0 && ROUTES.every((e) => e.originPark !== e.destinationPark),
  true
);

featureCheck(
  "5. no duplicate pairs",
  ROUTES.length > 0 &&
    new Set(ROUTES.map((e) => `${e.originPark}>${e.destinationPark}`)).size === ROUTES.length,
  true
);

featureCheck(
  "6. every pair has at least one route option",
  ROUTES.length > 0 && ROUTES.every((e) => Array.isArray(e.routes) && e.routes.length > 0),
  true
);

/* ------------------------------------------------- 7-12. the route matrix -- */

featureCheck(
  "7. EPCOT -> Hollywood Studios offers BOTH boat and Skyliner",
  modesFor("epcot", "hollywood").includes("boat") &&
    modesFor("epcot", "hollywood").includes("skyliner"),
  true
);

featureCheck(
  "8. Hollywood Studios -> EPCOT offers BOTH boat and Skyliner",
  modesFor("hollywood", "epcot").includes("boat") &&
    modesFor("hollywood", "epcot").includes("skyliner"),
  true
);

featureCheck(
  "9. both Skyliner directions require the Caribbean Beach transfer",
  ["epcot>hollywood", "hollywood>epcot"].every((pair) => {
    const [o, d] = pair.split(">");
    const sky = routeOf(o, d, "skyliner");
    return (
      sky &&
      sky.transferRequired === true &&
      /Caribbean Beach/i.test(sky.transferLocation || "")
    );
  }),
  true
);

featureCheck(
  "10. both Magic Kingdom <-> EPCOT directions require the TTC monorail transfer",
  ["magic_kingdom>epcot", "epcot>magic_kingdom"].every((pair) => {
    const [o, d] = pair.split(">");
    const mono = routeOf(o, d, "monorail");
    return (
      mono &&
      mono.transferRequired === true &&
      /Transportation and Ticket Center/i.test(mono.transferLocation || "")
    );
  }),
  true
);

featureCheck(
  "11. every Animal Kingdom pair is direct bus with no transfer",
  (() => {
    const akPairs = ORDERED_PAIRS.filter(
      ([o, d]) => o === "animal_kingdom" || d === "animal_kingdom"
    );
    if (akPairs.length !== 6) return false;
    return akPairs.every(([o, d]) => {
      const entry = entryFor(o, d);
      return (
        entry &&
        entry.routes.length === 1 &&
        entry.routes[0].mode === "bus" &&
        entry.routes[0].transferRequired === false
      );
    });
  })(),
  true
);

featureCheck(
  "12. both Magic Kingdom <-> Hollywood Studios directions are direct bus, no transfer",
  ["magic_kingdom>hollywood", "hollywood>magic_kingdom"].every((pair) => {
    const [o, d] = pair.split(">");
    const entry = entryFor(o, d);
    return (
      entry &&
      entry.routes.length === 1 &&
      entry.routes[0].mode === "bus" &&
      entry.routes[0].transferRequired === false
    );
  }),
  true
);

/* ------------------------------------------------ 13-17. per-route rigour -- */

featureCheck(
  "13. every route has a recognized mode and a non-empty label",
  ROUTES.length > 0 &&
    Array.isArray(DATA?.RECOGNIZED_MODES) &&
    ROUTES.every((e) =>
      e.routes.every(
        (r) =>
          DATA.RECOGNIZED_MODES.includes(r.mode) &&
          typeof r.label === "string" &&
          r.label.trim().length > 0
      )
    ),
  true
);

featureCheck(
  "14. transferLocation exists exactly when transferRequired is true",
  ROUTES.length > 0 &&
    ROUTES.every((e) =>
      e.routes.every((r) => {
        const hasLocation =
          typeof r.transferLocation === "string" && r.transferLocation.trim().length > 0;
        return r.transferRequired === true ? hasLocation : !hasLocation;
      })
    ),
  true
);

featureCheck(
  "15. no direct route contains transfer wording anywhere in its text",
  // A direct option that says "transfer" would teach the model the opposite of
  // what the flag means, so the prose is checked, not just the boolean.
  ROUTES.length > 0 &&
    ROUTES.every((e) =>
      e.routes.every((r) => {
        if (r.transferRequired) return true;
        const text = `${r.label} ${r.boardingDetail || ""}`;
        return !/transfer|change to|change at/i.test(text);
      })
    ),
  true
);

featureCheck(
  "16. every entry carries source metadata and verifiedOn 2026-08-16",
  ROUTES.length > 0 &&
    ROUTES.every(
      (e) =>
        e.verifiedOn === EXPECTED_VERIFIED_ON &&
        Array.isArray(e.sources) &&
        e.sources.length > 0 &&
        e.sources.every(
          (s) =>
            typeof s.url === "string" &&
            /^https:\/\//.test(s.url) &&
            typeof s.type === "string" &&
            s.type.length > 0 &&
            typeof s.label === "string" &&
            s.label.length > 0
        )
    ),
  true
);

featureCheck(
  "17. every entry carries the operational-verification caveat",
  ROUTES.length > 0 &&
    ROUTES.every(
      (e) =>
        typeof e.operationalCaveat === "string" &&
        /My Disney Experience/i.test(e.operationalCaveat) &&
        /signage/i.test(e.operationalCaveat) &&
        /can change/i.test(e.operationalCaveat)
    ),
  true
);

/* ------------------------------------------------------- 18-21. resolver -- */

featureCheck(
  "18. the resolver returns every valid pair correctly",
  ORDERED_PAIRS.every(([o, d]) => {
    const resolved = resolve(o, d);
    const entry = entryFor(o, d);
    return (
      resolved &&
      resolved.originPark === o &&
      resolved.destinationPark === d &&
      JSON.stringify(resolved.routes) === JSON.stringify(entry.routes)
    );
  }),
  true
);

featureCheck(
  "19. the resolver returns null for self-routes, missing values and unknown IDs",
  // Paired with a positive: a resolver that does not exist returns null for
  // everything, so "returns null for bad input" alone would pass vacuously at
  // the baseline. It must REJECT these AND still resolve a real pair.
  DATA !== null &&
    resolve("epcot", "hollywood") !== null &&
    [
    ["epcot", "epcot"],
    ["magic_kingdom", "magic_kingdom"],
    [undefined, undefined],
    [null, "epcot"],
    ["epcot", null],
    ["", ""],
    ["hollywood_studios", "epcot"],
    ["epcot", "hollywood_studios"],
    ["disney_springs", "epcot"],
    ["epcot", "universal_studios"],
    [123, "epcot"],
    [{ originPark: "epcot" }, "hollywood"],
  ].every(([o, d]) => resolve(o, d) === null),
  true
);

featureCheck(
  "20. the resolver never supplies a bus fallback for an invalid or missing pair",
  // Same pairing, and the positive half also proves a real bus pair still
  // resolves — so "no bus fallback" cannot be satisfied by returning nothing.
  DATA !== null &&
    resolve("animal_kingdom", "epcot")?.routes?.[0]?.mode === "bus" &&
    [
    ["epcot", "epcot"],
    ["hollywood_studios", "epcot"],
    ["disney_springs", "animal_kingdom"],
    [undefined, undefined],
  ].every((args) => {
    const resolved = resolve(...args);
    return resolved === null && !JSON.stringify(resolved).includes("bus");
  }),
  true
);

featureCheck(
  "21. a resolved result cannot be mutated in a way that corrupts the dataset",
  (() => {
    const before = JSON.stringify(ROUTES);
    const resolved = resolve("magic_kingdom", "epcot");
    if (!resolved) return false;

    // Genuinely attempt the corruption rather than asserting a freeze exists.
    try {
      resolved.routes[0].mode = "bus";
      resolved.routes[0].transferRequired = false;
      resolved.routes.push({ mode: "bus", label: "injected", transferRequired: false });
      resolved.originPark = "tampered";
      resolved.sources.length = 0;
    } catch (err) {
      // A throw is an acceptable defence too.
    }

    const after = JSON.stringify(ROUTES);
    const fresh = resolve("magic_kingdom", "epcot");
    return (
      before === after &&
      fresh.routes.length === 1 &&
      fresh.routes[0].mode === "monorail" &&
      fresh.routes[0].transferRequired === true &&
      fresh.originPark === "magic_kingdom"
    );
  })(),
  true
);

/* -------------------------------------------------- 22-23. purity and copy -- */

featureCheck(
  "22. the module uses no network, clock, storage, randomness or environment",
  (() => {
    if (!fs.existsSync(MODULE_PATH)) return false;
    const source = fs
      .readFileSync(MODULE_PATH, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    return !/require\(['"](?!\.)|fetch\(|https?\.|axios|new Date|Date\.now|Math\.random|process\.env|localStorage|sessionStorage|readFile|writeFile/.test(
      source
    );
  })(),
  true
);

featureCheck(
  "23. no route claims a speed ranking, travel time, interval or operating hour",
  (() => {
    if (!ROUTES.length) return false;
    // Every piece of guest-facing prose in the dataset.
    const prose = ROUTES.flatMap((e) => [
      e.operationalCaveat,
      ...e.routes.flatMap((r) => [r.label, r.boardingDetail || "", r.transferLocation || ""]),
    ]).join(" \n ");

    const superlatives = /\b(fastest|quickest|shortest|speediest|best|slowest)\b/i;
    // Numeric time claims of any shape: "20 minutes", "every 20", "8:00", "9pm".
    const timings =
      /\b\d+\s*(?:-|to\s)?\s*\d*\s*(?:minute|minutes|min|mins|hour|hours|hr|hrs)\b|\bevery\s+\d|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b/i;

    return !superlatives.test(prose) && !timings.test(prose);
  })(),
  true
);

console.log("Repository invariants — INVARIANT REGRESSION GUARDS");

// These are genuine repository truths that hold at the pinned baseline too.
// They are deliberately few: padding this section with checks that pass anyway
// would inflate the guard count without protecting anything.

invariantCheck(
  "the canonical park IDs still match the app's own selectable trip parks",
  (() => {
    const source = fs.readFileSync(
      path.join(frontendRoot, "src", "utils", "familyProfile.js"),
      "utf8"
    );
    const block = source.slice(
      source.indexOf("const SELECTABLE_TRIP_PARK_IDS = ["),
      source.indexOf("];", source.indexOf("const SELECTABLE_TRIP_PARK_IDS = ["))
    );
    const ids = (block.match(/"([a-z_]+)"/g) || []).map((s) => s.slice(1, -1));
    return (
      ids.length === 4 &&
      EXPECTED_PARKS.every((p) => ids.includes(p)) &&
      !ids.includes("hollywood_studios")
    );
  })(),
  true
);

invariantCheck(
  "the app's hollywood_studios normalization is untouched",
  /function normalizeTripParkId\(parkId\) \{[\s\S]*?hollywood_studios[\s\S]*?return "hollywood";/.test(
    fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8")
  ),
  true
);

invariantCheck(
  "selected-resort transportation remains a separate, resort-scoped concern",
  // 64C-3B adds park-to-park data only. The resort builder must still be the
  // park -> selected-resort block, and must not have been repurposed.
  (() => {
    const ai = fs.readFileSync(
      path.join(repoRoot, "backend", "services", "aiService.js"),
      "utf8"
    );
    return (
      /function buildTransportationContext\(activePark, familyProfile\)/.test(ai) &&
      /route from the CURRENT PARK to the SELECTED RESORT only/.test(ai)
    );
  })(),
  true
);

invariantCheck(
  "the resort dataset is unchanged: 21 resorts with complete park coverage",
  (() => {
    const source = fs
      .readFileSync(path.join(frontendRoot, "src", "resortProfiles.js"), "utf8")
      .replace(/export /g, "");
    const profiles = new Function(`${source}\nreturn DISNEY_RESORT_PROFILES;`)();
    return (
      profiles.length === 21 &&
      profiles.every((p) =>
        EXPECTED_PARKS.every(
          (park) => Array.isArray(p.directAccess?.[park]) && p.directAccess[park].length > 0
        )
      )
    );
  })(),
  true
);

console.log("");
console.log(`  64C-3B feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64C-3B invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
