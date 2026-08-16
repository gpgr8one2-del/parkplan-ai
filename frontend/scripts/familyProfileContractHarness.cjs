#!/usr/bin/env node

// Profile Decision Authority — Contract Harness.
//
// Permanent behavioural protection for the family-profile data pipeline, added
// BEFORE any phase removes a misleading setup input or changes storm-related
// recommendation behaviour. Nothing here changes application behaviour: this
// phase adds assertions only.
//
// ---------------------------------------------------------------------------
// CLASSIFICATION — stated plainly so no count below can be misread
// ---------------------------------------------------------------------------
//
//   FEATURE-DISCRIMINATING assertions: ZERO. This phase ships no feature, so
//   nothing here can or should fail against the pinned pre-phase baseline.
//   Do not add a feature assertion to this file without a phase that has one.
//
//   INVARIANT assertions: protect data-pipeline behaviour that later phases
//   must not break. These are expected to pass against BOTH the pinned baseline
//   source and the working tree. That symmetry is the point — an invariant that
//   only passes in one tree is not an invariant.
//
//   LOAD/MODULE checks: counted and reported separately. They establish that
//   the real modules were resolved and that the real exports exist. They prove
//   wiring, not behaviour, so they never count toward the invariant total.
//
// ---------------------------------------------------------------------------
// HOW THIS HARNESS ESTABLISHES ITS CLAIMS
// ---------------------------------------------------------------------------
//
// Every assertion executes REAL project code. No production logic is copied,
// re-implemented, or approximated here:
//
//   * `normalizeFamilyProfile` and `buildFamilyProfileSummary` are loaded from
//     `src/utils/familyProfile.js` and called directly. The harness supplies
//     inputs and reads outputs; it never re-derives a mapping itself. There is
//     no local copy of the pace table, the mobility normalizer, or the summary
//     builder anywhere in this file.
//
//   * The walking-tolerance/distance invariants call the real public
//     recommendation API, `getNextBestRides` from `src/rideRecommendations.js`,
//     with controlled inputs, and compare its real output between two runs.
//     None of the scoring formulas, proximity buckets or cross-park caps are
//     reproduced here. The harness does not know what -10 means; it only
//     asserts the RELATIONSHIP between two real results.
//
//   * Scoring magnitudes are deliberately NOT pinned. CLAUDE.md reserves
//     scoring values, caps and floors for changes Gabe explicitly asks for, so
//     pinning a number here would convert an authorized retune into a harness
//     failure. The ordering IS pinned, because the ordering is the product
//     contract: low walking tolerance must resist a far move more than high.
//
// No assertion in this file is a source-text search. Reading source can support
// a diagnostic, but it cannot establish a behavioural claim, so it is not used
// for one here.
//
// ---------------------------------------------------------------------------
// SOURCE ROOT
// ---------------------------------------------------------------------------
//
// The tree whose `src/` is exercised is selectable, so this one harness file can
// run against an exported baseline commit as well as the working tree:
//
//   node scripts/familyProfileContractHarness.cjs
//   node scripts/familyProfileContractHarness.cjs /tmp/baseline/frontend
//   node scripts/familyProfileContractHarness.cjs --source-root=/tmp/base/frontend
//
// The baseline export does NOT need to contain this file, and does NOT need
// node_modules: the harness always resolves its own dev dependencies (Babel)
// from the tree it physically lives in, and only the `src/` under test comes
// from the selected source root. That separation is what lets a brand-new
// harness be pointed at an older commit.
//
// Uses the existing repository loader pattern (Babel module transform + vm),
// the same approach `scripts/recommendationWeatherHarness.cjs` already uses.
// No dependency is added and no package file is touched.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

/* -------------------------------------------------------------------------- */
/* Source root selection                                                      */
/* -------------------------------------------------------------------------- */

// The tree this file physically lives in. Dev dependencies always come from
// here, never from the source root under test.
const harnessFrontendRoot = path.resolve(__dirname, "..");

function readSourceRootArg(argv) {
  const flagged = argv.find((arg) => arg.startsWith("--source-root="));
  if (flagged) return flagged.slice("--source-root=".length);

  const positional = argv.find((arg) => !arg.startsWith("-"));
  return positional || null;
}

function resolveSourceRoot(rawArg) {
  if (!rawArg) return harnessFrontendRoot;

  const candidate = path.resolve(rawArg);

  // Accept either the frontend directory itself or a repository root that
  // contains one, so callers can pass whichever they exported.
  if (fs.existsSync(path.join(candidate, "src", "utils", "familyProfile.js"))) {
    return candidate;
  }

  const nested = path.join(candidate, "frontend");
  if (fs.existsSync(path.join(nested, "src", "utils", "familyProfile.js"))) {
    return nested;
  }

  throw new Error(
    `Source root does not contain src/utils/familyProfile.js: ${candidate}`
  );
}

const sourceRootArg = readSourceRootArg(process.argv.slice(2));
const sourceRoot = resolveSourceRoot(sourceRootArg);
const isBaselineRun = path.resolve(sourceRoot) !== path.resolve(harnessFrontendRoot);

/* -------------------------------------------------------------------------- */
/* Module loader — existing repository pattern                                */
/* -------------------------------------------------------------------------- */

const depsRequire = createRequire(path.join(harnessFrontendRoot, "package.json"));
const moduleCache = new Map();

function getBabel() {
  try {
    return depsRequire("@babel/core");
  } catch {
    throw new Error(
      "Could not load @babel/core from frontend dependencies. Run npm install in frontend before this harness."
    );
  }
}

function getModuleTransformPlugin() {
  const candidates = [
    "@babel/plugin-transform-modules-commonjs",
    "@babel/plugin-transform-modules-amd",
  ];

  for (const candidate of candidates) {
    try {
      return depsRequire.resolve(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Could not find a Babel module transform plugin in frontend dependencies.");
}

const babel = getBabel();
const moduleTransformPlugin = getModuleTransformPlugin();

function resolveExistingPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve local module: ${basePath}`);
}

function resolveLocalRequest(request, parentDir) {
  if (request.startsWith("src/")) {
    return resolveExistingPath(path.join(sourceRoot, request));
  }

  if (request.startsWith("@/")) {
    return resolveExistingPath(path.join(sourceRoot, "src", request.slice(2)));
  }

  if (request.startsWith(".")) {
    return resolveExistingPath(path.resolve(parentDir, request));
  }

  return null;
}

function transformSource(filename, source) {
  const result = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });

  if (!result || !result.code) {
    throw new Error(`Babel did not return code for ${filename}`);
  }

  return result.code;
}

function loadModule(filename) {
  const resolvedFilename = path.resolve(filename);

  if (moduleCache.has(resolvedFilename)) {
    return moduleCache.get(resolvedFilename).exports;
  }

  if (resolvedFilename.endsWith(".json")) {
    const jsonModule = { exports: JSON.parse(fs.readFileSync(resolvedFilename, "utf8")) };
    moduleCache.set(resolvedFilename, jsonModule);
    return jsonModule.exports;
  }

  // Artwork and stylesheets are irrelevant to a data-contract harness. Stub them
  // the same deterministic way the existing render harnesses do.
  if (/\.(css|scss|sass|png|jpe?g|svg|webp|gif|avif)$/i.test(resolvedFilename)) {
    const assetModule = { exports: {} };
    moduleCache.set(resolvedFilename, assetModule);
    return assetModule.exports;
  }

  const source = fs.readFileSync(resolvedFilename, "utf8");
  const code = transformSource(resolvedFilename, source);
  const module = { exports: {} };
  moduleCache.set(resolvedFilename, module);

  const dirname = path.dirname(resolvedFilename);

  function localRequire(request) {
    const localPath = resolveLocalRequest(request, dirname);
    if (localPath) return loadModule(localPath);
    return depsRequire(request);
  }

  const wrapped = `(function(require, module, exports, __filename, __dirname) {
${code}
})`;

  const fn = vm.runInThisContext(wrapped, { filename: resolvedFilename });
  fn(localRequire, module, module.exports, resolvedFilename, dirname);

  return module.exports;
}

/* -------------------------------------------------------------------------- */
/* Result accounting — three separate ledgers, never merged                   */
/* -------------------------------------------------------------------------- */

let loadPass = 0;
let loadFail = 0;
let invariantPass = 0;
let invariantFail = 0;

// This phase ships no feature. The counter exists so the report can state a
// real zero rather than an omission.
const featurePass = 0;
const featureFail = 0;

function report(kind, label, ok, detail) {
  if (ok) {
    console.log(`  PASS [${kind}] ${label}`);
    return;
  }
  console.log(`  FAIL [${kind}] ${label}${detail ? ` — ${detail}` : ""}`);
}

function loadCheck(label, ok, detail) {
  if (ok) loadPass += 1;
  else loadFail += 1;
  report("LOAD", label, ok, detail);
}

function invariantCheck(label, ok, detail) {
  if (ok) invariantPass += 1;
  else invariantFail += 1;
  report("INVARIANT", label, ok, detail);
}

function equalityDetail(actual, expected) {
  return `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

/* -------------------------------------------------------------------------- */
/* Load the real modules                                                      */
/* -------------------------------------------------------------------------- */

console.log("Profile Decision Authority — Contract Harness");
console.log(`  harness tree : ${harnessFrontendRoot}`);
console.log(`  source root  : ${sourceRoot}`);
console.log(`  mode         : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log("");
console.log("LOAD / MODULE CHECKS");

const familyProfilePath = path.join(sourceRoot, "src", "utils", "familyProfile.js");
const recommendationsPath = path.join(sourceRoot, "src", "rideRecommendations.js");

let familyProfileModule = null;
let recommendationsModule = null;

try {
  familyProfileModule = loadModule(familyProfilePath);
  loadCheck("src/utils/familyProfile.js loads from the selected source root", true);
} catch (err) {
  loadCheck("src/utils/familyProfile.js loads from the selected source root", false, err.message);
}

try {
  recommendationsModule = loadModule(recommendationsPath);
  loadCheck("src/rideRecommendations.js loads from the selected source root", true);
} catch (err) {
  loadCheck("src/rideRecommendations.js loads from the selected source root", false, err.message);
}

const normalizeFamilyProfile = familyProfileModule && familyProfileModule.normalizeFamilyProfile;
const buildFamilyProfileSummary =
  familyProfileModule && familyProfileModule.buildFamilyProfileSummary;
const getNextBestRides = recommendationsModule && recommendationsModule.getNextBestRides;

loadCheck(
  "real normalizeFamilyProfile export is a function",
  typeof normalizeFamilyProfile === "function"
);
loadCheck(
  "real buildFamilyProfileSummary export is a function",
  typeof buildFamilyProfileSummary === "function"
);
loadCheck("real getNextBestRides export is a function", typeof getNextBestRides === "function");

if (
  typeof normalizeFamilyProfile !== "function" ||
  typeof buildFamilyProfileSummary !== "function" ||
  typeof getNextBestRides !== "function"
) {
  console.log("");
  console.log("Aborting: the real project helpers could not be loaded, so no");
  console.log("behavioural claim can be made. This is a load failure, not an");
  console.log("invariant failure.");
  console.log("");
  console.log(`LOAD      : ${loadPass} passed, ${loadFail} failed`);
  console.log(`INVARIANT : 0 passed, 0 failed (not reached)`);
  console.log(`FEATURE   : 0 passed, 0 failed (this phase ships no feature)`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Invariants                                                                 */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("INVARIANT ASSERTIONS");

/* --- 1. Canonical pace -> walking tolerance ------------------------------- */
//
// The canonical vocabulary is what onboarding offers today. `walkingTolerance`
// is described in the schema as a deprecated alias, but it is the value the
// recommendation engine actually reads, so this mapping is load-bearing and a
// later phase must not quietly drop it.

const CANONICAL_PACE_TO_WALKING = [
  ["leisurely", "low"],
  ["balanced", "medium"],
  ["energetic", "high"],
];

CANONICAL_PACE_TO_WALKING.forEach(([pace, expectedWalking]) => {
  const normalized = normalizeFamilyProfile({ pace });
  invariantCheck(
    `canonical pace "${pace}" normalizes to walkingTolerance "${expectedWalking}"`,
    normalized.pace === pace && normalized.walkingTolerance === expectedWalking,
    equalityDetail(
      { pace: normalized.pace, walkingTolerance: normalized.walkingTolerance },
      { pace, walkingTolerance: expectedWalking }
    )
  );
});

/* --- 2. Legacy pace values still migrate --------------------------------- */
//
// Scope note, so this is not misread: these assertions cover the NORMALIZER's
// live migration of stored legacy values, which is real, current behaviour that
// protects previously-saved profiles. They deliberately say nothing about the
// separate, unreachable `pace === "relaxed"` / `"maximize"` branches inside the
// scoring engine. Known-broken behaviour is not pinned here.

const LEGACY_PACE_MIGRATION = [
  ["relaxed", "leisurely", "low"],
  ["maximize", "energetic", "high"],
];

LEGACY_PACE_MIGRATION.forEach(([legacyPace, expectedPace, expectedWalking]) => {
  const normalized = normalizeFamilyProfile({ pace: legacyPace });
  invariantCheck(
    `legacy pace "${legacyPace}" migrates to canonical "${expectedPace}" / walkingTolerance "${expectedWalking}"`,
    normalized.pace === expectedPace && normalized.walkingTolerance === expectedWalking,
    equalityDetail(
      { pace: normalized.pace, walkingTolerance: normalized.walkingTolerance },
      { pace: expectedPace, walkingTolerance: expectedWalking }
    )
  );
});

/* --- 3. Walking tolerance survives into the real summary ------------------ */
//
// `buildFamilyProfileSummary` is the object App hands to the engine, to Plan
// and to the AI payload. A mapping that survives normalization but is lost in
// the summary would be invisible everywhere that matters.

[...CANONICAL_PACE_TO_WALKING, ...LEGACY_PACE_MIGRATION.map(([legacy, , walking]) => [legacy, walking])].forEach(
  ([pace, expectedWalking]) => {
    const summary = buildFamilyProfileSummary({ pace });
    invariantCheck(
      `real family-profile summary carries walkingTolerance "${expectedWalking}" for pace "${pace}"`,
      summary.walkingTolerance === expectedWalking,
      equalityDetail(summary.walkingTolerance, expectedWalking)
    );
  }
);

/* --- 4/5/6. Mobility values survive normalization ------------------------- */
//
// Deliberate scope limits:
//
//   * This asserts that stored values are PRESERVED. It asserts nothing about
//     whether any of them influences a recommendation. Wheelchair use currently
//     has no recommendation effect; that is a known gap under review and is NOT
//     pinned here, in either direction.
//
//   * `mobilityNotes` is covered for backward compatibility only. Preserving a
//     stored value is not authorization to display, transmit or consume it.
//
//   * The mobility object's KEY COUNT is intentionally not asserted. A future
//     approved phase may extend this object with a structured device question,
//     and a shape assertion would block that work for no safety benefit.

const MOBILITY_INPUT = {
  usesStroller: true,
  usesWheelchair: true,
  mobilityNotes: "avoid long backtracking; shaded breaks after 2 PM",
};

const normalizedMobility = normalizeFamilyProfile({
  mobilityAccessibility: { ...MOBILITY_INPUT },
}).mobilityAccessibility;

invariantCheck(
  "stored usesStroller: true survives normalization",
  normalizedMobility.usesStroller === true,
  equalityDetail(normalizedMobility.usesStroller, true)
);

invariantCheck(
  "stored usesWheelchair: true survives normalization",
  normalizedMobility.usesWheelchair === true,
  equalityDetail(normalizedMobility.usesWheelchair, true)
);

invariantCheck(
  "stored mobilityNotes survive normalization (backward compatibility only)",
  normalizedMobility.mobilityNotes === MOBILITY_INPUT.mobilityNotes,
  equalityDetail(normalizedMobility.mobilityNotes, MOBILITY_INPUT.mobilityNotes)
);

const normalizedMobilityFalse = normalizeFamilyProfile({
  mobilityAccessibility: { usesStroller: false, usesWheelchair: false, mobilityNotes: "" },
}).mobilityAccessibility;

invariantCheck(
  "stored false mobility flags survive normalization as false, not as undefined",
  normalizedMobilityFalse.usesStroller === false &&
    normalizedMobilityFalse.usesWheelchair === false,
  equalityDetail(
    {
      usesStroller: normalizedMobilityFalse.usesStroller,
      usesWheelchair: normalizedMobilityFalse.usesWheelchair,
    },
    { usesStroller: false, usesWheelchair: false }
  )
);

/* --- 8/9. Storm tolerance survives normalization and the summary ---------- */
//
// Scope note: these assert only that the guest's stored answer is preserved
// through the real pipeline. They assert nothing about what storm comfort does
// or does not influence today. Storm comfort's current lack of recommendation
// effect is under product review and must not be frozen by this harness.

const CANONICAL_STORM_VALUES = ["indoor_only", "brief_outdoor_ok", "we_handle_it"];

CANONICAL_STORM_VALUES.forEach((stormTolerance) => {
  const normalized = normalizeFamilyProfile({ stormTolerance });
  invariantCheck(
    `canonical stormTolerance "${stormTolerance}" survives normalization`,
    normalized.stormTolerance === stormTolerance,
    equalityDetail(normalized.stormTolerance, stormTolerance)
  );
});

CANONICAL_STORM_VALUES.forEach((stormTolerance) => {
  const summary = buildFamilyProfileSummary({ stormTolerance });
  invariantCheck(
    `real family-profile summary retains stormTolerance "${stormTolerance}"`,
    summary.stormTolerance === stormTolerance,
    equalityDetail(summary.stormTolerance, stormTolerance)
  );
});

/* --- 12. Shapes the engine and TOHI consumers depend on ------------------- */
//
// Height, heat sensitivity, priorities and resort data all cross from the
// profile into scoring, Plan guidance and the AI payload. These assert the real
// summary still produces them in the shape those consumers read.

const richSummary = buildFamilyProfileSummary({
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "c1", label: "Child 1", age: 5, heightInches: 40 },
    { id: "c2", label: "Child 2", age: 8, heightInches: 52 },
  ],
  heatSensitivity: "high",
  thrillTolerance: "low",
  priorities: ["low_stress", "characters"],
  resortContext: { stayingOnProperty: "yes", resortId: "grand_floridian", resortName: "" },
});

invariantCheck(
  "summary derives shortestHeightInches from the shortest real child height",
  richSummary.shortestHeightInches === 40,
  equalityDetail(richSummary.shortestHeightInches, 40)
);

invariantCheck(
  "summary derives hasHeightLimitedRiders from that height",
  richSummary.hasHeightLimitedRiders === true,
  equalityDetail(richSummary.hasHeightLimitedRiders, true)
);

invariantCheck(
  "summary derives the ageSummary shape the engine and AI payload read",
  richSummary.ageSummary &&
    richSummary.ageSummary.under3Count === 0 &&
    richSummary.ageSummary.childCount === 2 &&
    richSummary.ageSummary.disneyAdultCount === 2 &&
    richSummary.hasSmallChildren === true,
  equalityDetail(
    { ageSummary: richSummary.ageSummary, hasSmallChildren: richSummary.hasSmallChildren },
    {
      ageSummary: { under3Count: 0, childCount: 2, disneyAdultCount: 2 },
      hasSmallChildren: true,
    }
  )
);

invariantCheck(
  "summary preserves heatSensitivity and thrillTolerance as the engine reads them",
  richSummary.heatSensitivity === "high" && richSummary.thrillTolerance === "low",
  equalityDetail(
    { heatSensitivity: richSummary.heatSensitivity, thrillTolerance: richSummary.thrillTolerance },
    { heatSensitivity: "high", thrillTolerance: "low" }
  )
);

invariantCheck(
  "summary preserves current-vocabulary priorities as an array",
  Array.isArray(richSummary.priorities) &&
    richSummary.priorities.includes("low_stress") &&
    richSummary.priorities.includes("characters"),
  equalityDetail(richSummary.priorities, ["low_stress", "characters"])
);

invariantCheck(
  "summary resolves a real resortProfile with the name and transportation array consumers read",
  Boolean(richSummary.resortProfile) &&
    typeof richSummary.resortProfile.name === "string" &&
    richSummary.resortProfile.name.length > 0 &&
    Array.isArray(richSummary.resortProfile.transportation) &&
    richSummary.resortProfile.transportation.length > 0,
  equalityDetail(
    richSummary.resortProfile && {
      name: richSummary.resortProfile.name,
      transportation: richSummary.resortProfile.transportation,
    },
    "a resort profile with a non-empty name and non-empty transportation array"
  )
);

invariantCheck(
  "summary computes partySize from the real adult and child counts",
  richSummary.partySize === 4,
  equalityDetail(richSummary.partySize, 4)
);

/* --- 13. Legacy compatibility fields that are still consumed -------------- */
//
// Only fields that can be exercised reliably through the real helpers are
// covered. Each one below has at least one live consumer today, so silent
// clearing by a future normalizer change would be a real regression rather than
// a cosmetic one.

const legacyNormalized = normalizeFamilyProfile({
  wholeGroupRidesTogether: "yes",
  lightningLanePreference: "multi_pass",
  tripContext: {
    parkSelectionIds: ["epcot", "hollywood"],
    firstParkId: "epcot",
    mostImportantParkId: "hollywood",
  },
});

invariantCheck(
  "legacy wholeGroupRidesTogether is preserved (still read by the recommendation engine)",
  legacyNormalized.wholeGroupRidesTogether === "yes",
  equalityDetail(legacyNormalized.wholeGroupRidesTogether, "yes")
);

invariantCheck(
  "legacy lightningLanePreference is preserved and still wins over the newer paidQueueStrategy default",
  legacyNormalized.lightningLanePreference === "multi_pass" &&
    legacyNormalized.paidQueueStrategy === "multi_pass",
  equalityDetail(
    {
      lightningLanePreference: legacyNormalized.lightningLanePreference,
      paidQueueStrategy: legacyNormalized.paidQueueStrategy,
    },
    { lightningLanePreference: "multi_pass", paidQueueStrategy: "multi_pass" }
  )
);

invariantCheck(
  "legacy tripContext aliases selectedParks / firstPark / priorityPark stay in sync with the canonical ids",
  Array.isArray(legacyNormalized.tripContext.selectedParks) &&
    legacyNormalized.tripContext.selectedParks.join(",") === "epcot,hollywood" &&
    legacyNormalized.tripContext.firstPark === "epcot" &&
    legacyNormalized.tripContext.priorityPark === "hollywood",
  equalityDetail(
    {
      selectedParks: legacyNormalized.tripContext.selectedParks,
      firstPark: legacyNormalized.tripContext.firstPark,
      priorityPark: legacyNormalized.tripContext.priorityPark,
    },
    { selectedParks: ["epcot", "hollywood"], firstPark: "epcot", priorityPark: "hollywood" }
  )
);

/* --- 10/11. Walking tolerance really changes distance behaviour ----------- */
//
// This calls the REAL public recommendation API twice. Every input is identical
// between the two runs except the family's pace, which the real normalizer turns
// into the walkingTolerance the engine reads. The harness then compares the real
// output for the same far attraction.
//
// Magnitudes are not asserted. The ORDERING is, because the ordering is the
// product contract this phase exists to protect.
//
// The clock is pinned for the duration of these two calls only. `getNextBestRides`
// reads the wall clock internally to decide pre-open gating, and a permanent
// harness must not pass at noon and fail at 8am. The real Date is restored in a
// `finally`, so nothing else in this process is affected.

const NEAR_RIDE_ID = "harness_near_ride";
const FAR_RIDE_ID = "harness_far_ride";

// Real Magic Kingdom attractions in two real lands that the real proximity graph
// classifies as far apart. Names must match rideMetadata displayName so the real
// metadata resolver finds them.
const CONTROLLED_RIDES = [
  {
    id: NEAR_RIDE_ID,
    name: "Tomorrowland Transit Authority PeopleMover",
    land: "tomorrowland",
    waitTime: 10,
    isOpen: true,
  },
  {
    id: FAR_RIDE_ID,
    name: "Big Thunder Mountain Railroad",
    land: "frontierland",
    waitTime: 15,
    isOpen: true,
  },
];

const CONTROLLED_WEATHER = {
  tempF: 78,
  feelsLikeF: 78,
  humidity: 55,
  summary: "Partly cloudy",
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
};

const CONTROLLED_LOCATION = {
  type: "manual_land",
  land: "tomorrowland",
  landKey: "tomorrowland",
  source: "manual",
};

const CONTROLLED_TIME_CONTEXT = {
  dayPhase: "midday",
  orlandoTotalMinutes: 13 * 60,
  aiAccess: { shouldAllowAi: true, reason: "in trip" },
};

// Mid-afternoon on a date the real park-hours module reports as open, so the
// pre-open gate is not what this scenario is measuring.
const PINNED_NOW = new Date("2026-01-15T13:00:00-05:00");

function runRecommendationsForPace(pace) {
  return getNextBestRides({
    parkId: "magic_kingdom",
    rides: CONTROLLED_RIDES,
    weather: CONTROLLED_WEATHER,
    locationContext: CONTROLLED_LOCATION,
    // Built by the REAL summary builder, so the pace -> walkingTolerance mapping
    // under test is the one production uses, not one the harness supplies.
    familyProfile: buildFamilyProfileSummary({
      adultCount: 2,
      childCount: 0,
      thrillTolerance: "mixed",
      heatSensitivity: "medium",
      waterRidePreference: "depends",
      pace,
    }),
    timeContext: CONTROLLED_TIME_CONTEXT,
  });
}

function findScoredRide(recommendations, rideId) {
  const slots = ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"];
  for (const slot of slots) {
    const candidate = recommendations[slot];
    if (candidate && String(candidate.id) === rideId) return candidate;
  }
  return null;
}

const RealDate = Date;
let lowWalkingRecs = null;
let highWalkingRecs = null;

try {
  class PinnedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(PINNED_NOW.getTime());
        return;
      }
      super(...args);
    }
    static now() {
      return PINNED_NOW.getTime();
    }
  }

  global.Date = PinnedDate;

  lowWalkingRecs = runRecommendationsForPace("leisurely");
  highWalkingRecs = runRecommendationsForPace("energetic");
} finally {
  global.Date = RealDate;
}

const lowFar = findScoredRide(lowWalkingRecs, FAR_RIDE_ID);
const highFar = findScoredRide(highWalkingRecs, FAR_RIDE_ID);
const lowNear = findScoredRide(lowWalkingRecs, NEAR_RIDE_ID);
const highNear = findScoredRide(highWalkingRecs, NEAR_RIDE_ID);

// Guard, not a behavioural claim: if the scenario stops exercising a real far
// attraction the comparisons below would be vacuous, so fail loudly instead.
invariantCheck(
  "the controlled scenario really exercises a far attraction under both walking tolerances",
  Boolean(lowFar) &&
    Boolean(highFar) &&
    lowFar.proximityDistance === "far" &&
    highFar.proximityDistance === "far" &&
    lowWalkingRecs.needsLocation === false &&
    highWalkingRecs.needsLocation === false &&
    lowWalkingRecs.parkOpenStatus.shouldBlockGoNow === false,
  equalityDetail(
    {
      lowFarFound: Boolean(lowFar),
      highFarFound: Boolean(highFar),
      lowProximity: lowFar && lowFar.proximityDistance,
      highProximity: highFar && highFar.proximityDistance,
      needsLocation: lowWalkingRecs.needsLocation,
      shouldBlockGoNow: lowWalkingRecs.parkOpenStatus.shouldBlockGoNow,
    },
    "a far-classified attraction present in both runs, with location known and go-now not gated"
  )
);

invariantCheck(
  "low walking tolerance resists a far attraction more than high walking tolerance (real cross-area modifier)",
  Boolean(lowFar) &&
    Boolean(highFar) &&
    typeof lowFar.crossParkRealityModifier === "number" &&
    typeof highFar.crossParkRealityModifier === "number" &&
    lowFar.crossParkRealityModifier < highFar.crossParkRealityModifier,
  equalityDetail(
    {
      lowWalkingCrossArea: lowFar && lowFar.crossParkRealityModifier,
      highWalkingCrossArea: highFar && highFar.crossParkRealityModifier,
    },
    "low strictly more negative than high"
  )
);

invariantCheck(
  "that resistance reaches the real recommendation score for the far attraction",
  Boolean(lowFar) &&
    Boolean(highFar) &&
    lowFar.recommendationScore < highFar.recommendationScore,
  equalityDetail(
    {
      lowWalkingScore: lowFar && lowFar.recommendationScore,
      highWalkingScore: highFar && highFar.recommendationScore,
    },
    "low strictly lower than high"
  )
);

// Control. Without this, a blanket score shift would satisfy the two assertions
// above without any distance-specific behaviour existing at all.
invariantCheck(
  "the same-land attraction is unaffected, so the difference is distance-specific rather than a blanket shift",
  Boolean(lowNear) &&
    Boolean(highNear) &&
    lowNear.proximityDistance === "same" &&
    highNear.proximityDistance === "same" &&
    lowNear.recommendationScore === highNear.recommendationScore,
  equalityDetail(
    {
      lowNearScore: lowNear && lowNear.recommendationScore,
      highNearScore: highNear && highNear.recommendationScore,
      lowNearProximity: lowNear && lowNear.proximityDistance,
    },
    "identical same-land scores under both walking tolerances"
  )
);

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("SUMMARY");
console.log(`  source root : ${sourceRoot}`);
console.log(`  mode        : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log(`  LOAD        : ${loadPass} passed, ${loadFail} failed`);
console.log(`  INVARIANT   : ${invariantPass} passed, ${invariantFail} failed`);
console.log(
  `  FEATURE     : ${featurePass} passed, ${featureFail} failed (invariant-only phase; zero by design)`
);

const failed = loadFail + invariantFail + featureFail;

if (failed > 0) {
  console.log("");
  console.log(`RESULT: FAIL (${failed} failing check${failed === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("");
console.log("RESULT: PASS");
