#!/usr/bin/env node

// Storm Preference Recommendation Authority.
//
// The guest's stored `familyProfile.stormTolerance` answer now materially affects
// ride recommendations — but only when the engine's own structured weather
// interpretation already indicates rain or storm concern.
//
// ---------------------------------------------------------------------------
// CLASSIFICATION
// ---------------------------------------------------------------------------
//
//   FEATURE-DISCRIMINATING — behaviour this phase adds. Every one must fail
//   against the pinned pre-phase baseline.
//
//     Four of them are FIELD-INDEPENDENT: the two score orderings and the two
//     score deltas read only `recommendationScore`, which exists at baseline.
//     They therefore distinguish baseline from implementation on behaviour
//     alone, with no reliance on the new debug field being absent. That matters:
//     a test is not feature-discriminating merely because a new field is missing.
//
//     The six exact-value assertions additionally inspect the exposed
//     `stormPreferenceModifier`. They are reported separately below so the
//     field-independent evidence is never obscured by the field-dependent kind.
//
//   INVARIANT — behaviour this phase must NOT change. Passes against both the
//   baseline source and the working tree. Includes every safety-precedence and
//   clear-weather-neutrality claim, because all of those are true before AND
//   after this phase and would be meaningless as "features".
//
//   LOAD/MODULE — real modules resolved, real exports present. Wiring, not
//   behaviour; never counted toward behavioural totals.
//
// ---------------------------------------------------------------------------
// HOW CLAIMS ARE ESTABLISHED
// ---------------------------------------------------------------------------
//
//   * Every behavioural assertion calls the REAL public API, `getNextBestRides`,
//     with controlled inputs, and reads its REAL output. No scoring formula is
//     copied or re-implemented here. The harness does not know what +8 means; it
//     compares real results and reads the value the engine exposes.
//
//   * The weather-gate assertions call the REAL exported
//     `getRecommendationWeatherState` — the same structured determination the
//     engine itself uses for the gate, already covered by
//     `recommendationWeatherHarness.cjs`.
//
//   * Attractions are REAL entries from `rideMetadata.js`, chosen for their real
//     `environment` / `hasAC` / `closesInRain` values. Nothing is fabricated.
//
//   * No assertion is a source-text search. Source inspection cannot establish a
//     behavioural claim and is not used for one anywhere in this file.
//
//   * PROFILES ARE PASSED RAW, not through `buildFamilyProfileSummary`. This is
//     deliberate and important: the normalizer substitutes the default
//     `brief_outdoor_ok` for a missing value, so a normalized profile can never
//     exercise the engine's own missing-value handling. Passing raw profiles
//     tests the engine boundary, which is what this phase changed, and matches
//     how `src/__tests__/fixtures/testHelpers.js` already builds profiles.
//
// ---------------------------------------------------------------------------
// SOURCE ROOT
// ---------------------------------------------------------------------------
//
//   node scripts/stormPreferenceRecommendationHarness.cjs
//   node scripts/stormPreferenceRecommendationHarness.cjs /tmp/baseline/frontend
//   node scripts/stormPreferenceRecommendationHarness.cjs --source-root=/tmp/b/frontend
//
// Dev dependencies always resolve from the tree this file lives in; only the
// `src/` under test comes from the selected source root, so a baseline export
// needs neither this file nor node_modules.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

/* -------------------------------------------------------------------------- */
/* Source root selection                                                      */
/* -------------------------------------------------------------------------- */

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
  if (fs.existsSync(path.join(candidate, "src", "rideRecommendations.js"))) return candidate;
  const nested = path.join(candidate, "frontend");
  if (fs.existsSync(path.join(nested, "src", "rideRecommendations.js"))) return nested;
  throw new Error(`Source root does not contain src/rideRecommendations.js: ${candidate}`);
}

const sourceRoot = resolveSourceRoot(readSourceRootArg(process.argv.slice(2)));
const isBaselineRun = path.resolve(sourceRoot) !== path.resolve(harnessFrontendRoot);

/* -------------------------------------------------------------------------- */
/* Module loader — existing repository pattern                                 */
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
  for (const candidate of [
    "@babel/plugin-transform-modules-commonjs",
    "@babel/plugin-transform-modules-amd",
  ]) {
    try {
      return depsRequire.resolve(candidate);
    } catch {
      // try next
    }
  }
  throw new Error("Could not find a Babel module transform plugin in frontend dependencies.");
}

const babel = getBabel();
const moduleTransformPlugin = getModuleTransformPlugin();

function resolveExistingPath(basePath) {
  for (const candidate of [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Could not resolve local module: ${basePath}`);
}

function resolveLocalRequest(request, parentDir) {
  if (request.startsWith("src/")) return resolveExistingPath(path.join(sourceRoot, request));
  if (request.startsWith("@/")) return resolveExistingPath(path.join(sourceRoot, "src", request.slice(2)));
  if (request.startsWith(".")) return resolveExistingPath(path.resolve(parentDir, request));
  return null;
}

function loadModule(filename) {
  const resolvedFilename = path.resolve(filename);
  if (moduleCache.has(resolvedFilename)) return moduleCache.get(resolvedFilename).exports;

  if (resolvedFilename.endsWith(".json")) {
    const jsonModule = { exports: JSON.parse(fs.readFileSync(resolvedFilename, "utf8")) };
    moduleCache.set(resolvedFilename, jsonModule);
    return jsonModule.exports;
  }

  if (/\.(css|scss|sass|png|jpe?g|svg|webp|gif|avif)$/i.test(resolvedFilename)) {
    const assetModule = { exports: {} };
    moduleCache.set(resolvedFilename, assetModule);
    return assetModule.exports;
  }

  const transformed = babel.transformSync(fs.readFileSync(resolvedFilename, "utf8"), {
    filename: resolvedFilename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });

  if (!transformed || !transformed.code) {
    throw new Error(`Babel did not return code for ${resolvedFilename}`);
  }

  const module = { exports: {} };
  moduleCache.set(resolvedFilename, module);
  const dirname = path.dirname(resolvedFilename);

  function localRequire(request) {
    const localPath = resolveLocalRequest(request, dirname);
    if (localPath) return loadModule(localPath);
    return depsRequire(request);
  }

  const fn = vm.runInThisContext(
    `(function(require, module, exports, __filename, __dirname) {\n${transformed.code}\n})`,
    { filename: resolvedFilename }
  );
  fn(localRequire, module, module.exports, resolvedFilename, dirname);
  return module.exports;
}

/* -------------------------------------------------------------------------- */
/* Result accounting — separate ledgers                                       */
/* -------------------------------------------------------------------------- */

let loadPass = 0;
let loadFail = 0;
let featurePass = 0;
let featureFail = 0;
let featureFieldIndependentPass = 0;
let featureFieldIndependentFail = 0;
let invariantPass = 0;
let invariantFail = 0;

function line(kind, label, ok, detail) {
  if (ok) console.log(`  PASS [${kind}] ${label}`);
  else console.log(`  FAIL [${kind}] ${label}${detail ? ` — ${detail}` : ""}`);
}

function loadCheck(label, ok, detail) {
  if (ok) loadPass += 1;
  else loadFail += 1;
  line("LOAD", label, ok, detail);
}

// `fieldIndependent` marks the assertions that read only recommendationScore.
function featureCheck(label, ok, detail, fieldIndependent = false) {
  if (ok) featurePass += 1;
  else featureFail += 1;
  if (fieldIndependent) {
    if (ok) featureFieldIndependentPass += 1;
    else featureFieldIndependentFail += 1;
  }
  line(fieldIndependent ? "FEATURE*" : "FEATURE", label, ok, detail);
}

function invariantCheck(label, ok, detail) {
  if (ok) invariantPass += 1;
  else invariantFail += 1;
  line("INVARIANT", label, ok, detail);
}

function detailOf(actual, expected) {
  return `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

/* -------------------------------------------------------------------------- */
/* Load                                                                      */
/* -------------------------------------------------------------------------- */

console.log("Storm Preference Recommendation Authority");
console.log(`  harness tree : ${harnessFrontendRoot}`);
console.log(`  source root  : ${sourceRoot}`);
console.log(`  mode         : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log("");
console.log("LOAD / MODULE CHECKS");

let engine = null;
try {
  engine = loadModule(path.join(sourceRoot, "src", "rideRecommendations.js"));
  loadCheck("src/rideRecommendations.js loads from the selected source root", true);
} catch (err) {
  loadCheck("src/rideRecommendations.js loads from the selected source root", false, err.message);
}

const getNextBestRides = engine && engine.getNextBestRides;
const getRecommendationWeatherState = engine && engine.getRecommendationWeatherState;

loadCheck("real getNextBestRides export is a function", typeof getNextBestRides === "function");
loadCheck(
  "real getRecommendationWeatherState export is a function (the reused structured gate)",
  typeof getRecommendationWeatherState === "function"
);

if (typeof getNextBestRides !== "function" || typeof getRecommendationWeatherState !== "function") {
  console.log("");
  console.log("Aborting: the real engine could not be loaded, so no behavioural claim");
  console.log("can be made. This is a load failure.");
  console.log("");
  console.log(`LOAD : ${loadPass} passed, ${loadFail} failed`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Controlled scenarios                                                       */
/* -------------------------------------------------------------------------- */

const PREFERENCES = ["indoor_only", "brief_outdoor_ok", "we_handle_it"];

// Real Magic Kingdom Tomorrowland attraction: environment "indoor", hasAC true,
// closesInRain false. Same land as the guest, so the cross-park cap contributes
// nothing and the lean is cleanly attributable.
const INDOOR_RIDE = {
  id: "harness_indoor_ride",
  name: "Buzz Lightyear's Space Ranger Spin",
  land: "tomorrowland",
  waitTime: 20,
  isOpen: true,
};

// Real Animal Kingdom attraction: environment "outdoor", hasAC false, and
// closesInRain FALSE. That last value matters — every outdoor Tomorrowland
// attraction closes in rain, and a rain-closing attraction is correctly removed
// from the recommendation pool during a storm by existing rules, which would make
// it impossible to observe the lean at all.
const OUTDOOR_RIDE = {
  id: "harness_outdoor_ride",
  name: "Kilimanjaro Safaris",
  land: "africa",
  waitTime: 25,
  isOpen: true,
};

// Real Magic Kingdom Tomorrowland attraction with closesInRain TRUE, used only to
// prove existing rain-closure handling still outranks the preference.
const RAIN_CLOSING_RIDE = {
  id: "harness_rain_closing_ride",
  name: "Astro Orbiter",
  land: "tomorrowland",
  waitTime: 10,
  isOpen: true,
};

const STORM_WEATHER = {
  tempF: 80,
  feelsLikeF: 84,
  humidity: 88,
  summary: "Thunderstorm",
  stormMode: true,
  currentPrecipitation: true,
  rainRisk: 0.9,
  precipitationProbability: 90,
  precipitationIntensityInPerHr: 0.18,
  weatherCode: 8000,
  nextPrecipitationWindow: null,
};

const CLEAR_WEATHER = {
  tempF: 78,
  feelsLikeF: 78,
  humidity: 55,
  summary: "Clear",
  stormMode: false,
  currentPrecipitation: false,
  rainRisk: 0.1,
  precipitationProbability: 0,
  precipitationIntensityInPerHr: 0,
  weatherCode: 1000,
  nextPrecipitationWindow: null,
};

const TIME_CONTEXT = {
  dayPhase: "midday",
  orlandoTotalMinutes: 13 * 60,
  aiAccess: { shouldAllowAi: true, reason: "in trip" },
};

// Raw profile — see the header note on why the normalizer is bypassed.
const OMIT = Symbol("omit");

function buildRawProfile(stormTolerance) {
  const profile = {
    adultCount: 2,
    childCount: 0,
    children: [],
    guests: [],
    thrillTolerance: "mixed",
    walkingTolerance: "medium",
    heatSensitivity: "medium",
    waterRidePreference: "depends",
    pace: "balanced",
    priorities: [],
    shortestHeightInches: null,
    hasSmallChildren: false,
    ageSummary: { under3Count: 0, childCount: 0, disneyAdultCount: 2 },
    tripContext: {},
    resortContext: {},
  };
  if (stormTolerance !== OMIT) profile.stormTolerance = stormTolerance;
  return profile;
}

// The engine reads the wall clock for pre-open gating. A permanent harness must
// not pass at noon and fail at 8am, so the clock is pinned for the duration of
// each call and the real Date is always restored.
const PINNED_NOW = new Date("2026-01-15T13:00:00-05:00");
const RealDate = Date;

function withPinnedClock(fn) {
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
  try {
    return fn();
  } finally {
    global.Date = RealDate;
  }
}

function runScenario({ parkId, land, rides, weather, profile }) {
  return withPinnedClock(() =>
    getNextBestRides({
      parkId,
      rides,
      weather,
      locationContext: { type: "manual_land", land, landKey: land, source: "manual" },
      familyProfile: profile,
      timeContext: TIME_CONTEXT,
    })
  );
}

function findRide(recommendations, rideId) {
  for (const slot of ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"]) {
    const candidate = recommendations[slot];
    if (candidate && String(candidate.id) === rideId) return candidate;
  }
  return null;
}

// Runs one controlled scenario once per preference and returns the observed ride.
function observeAcrossPreferences({ parkId, land, rides, weather, rideId }) {
  const observed = {};
  PREFERENCES.forEach((preference) => {
    const recs = runScenario({
      parkId,
      land,
      rides,
      weather,
      profile: buildRawProfile(preference),
    });
    observed[preference] = findRide(recs, rideId);
  });
  return observed;
}

const indoorStorm = observeAcrossPreferences({
  parkId: "magic_kingdom",
  land: "tomorrowland",
  rides: [INDOOR_RIDE],
  weather: STORM_WEATHER,
  rideId: INDOOR_RIDE.id,
});

const outdoorStorm = observeAcrossPreferences({
  parkId: "animal_kingdom",
  land: "africa",
  rides: [OUTDOOR_RIDE],
  weather: STORM_WEATHER,
  rideId: OUTDOOR_RIDE.id,
});

const indoorClear = observeAcrossPreferences({
  parkId: "magic_kingdom",
  land: "tomorrowland",
  rides: [INDOOR_RIDE],
  weather: CLEAR_WEATHER,
  rideId: INDOOR_RIDE.id,
});

const outdoorClear = observeAcrossPreferences({
  parkId: "animal_kingdom",
  land: "africa",
  rides: [OUTDOOR_RIDE],
  weather: CLEAR_WEATHER,
  rideId: OUTDOOR_RIDE.id,
});

const scoreOf = (ride) => (ride ? ride.recommendationScore : null);
const modifierOf = (ride) => (ride ? ride.stormPreferenceModifier : undefined);

/* -------------------------------------------------------------------------- */
/* INVARIANT — vacuity guards and the structured gate itself                  */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("INVARIANT ASSERTIONS");

const stormState = getRecommendationWeatherState(STORM_WEATHER);
const clearState = getRecommendationWeatherState(CLEAR_WEATHER);

invariantCheck(
  "the structured weather gate is genuinely ACTIVE in the storm scenario",
  Boolean(
    stormState &&
      (stormState.activeStorm ||
        stormState.activeRain ||
        stormState.forecastStormWatch ||
        stormState.forecastRainWatch ||
        stormState.legacyRainActive)
  ),
  JSON.stringify(stormState)
);

invariantCheck(
  "the structured weather gate is genuinely INACTIVE in the clear scenario",
  Boolean(
    clearState &&
      !clearState.activeStorm &&
      !clearState.activeRain &&
      !clearState.forecastStormWatch &&
      !clearState.forecastRainWatch &&
      !clearState.legacyRainActive
  ),
  JSON.stringify(clearState)
);

[
  ["undefined", undefined],
  ["null", null],
  ["empty object", {}],
  ["malformed values", { summary: 42, rainRisk: "abc", stormMode: "yes" }],
].forEach(([label, weather]) => {
  const state = getRecommendationWeatherState(weather);
  invariantCheck(
    `${label} weather does not activate the structured gate (never treated as a storm)`,
    Boolean(
      state &&
        !state.activeStorm &&
        !state.activeRain &&
        !state.forecastStormWatch &&
        !state.forecastRainWatch &&
        !state.legacyRainActive
    ),
    JSON.stringify(state)
  );
});

invariantCheck(
  "the controlled indoor attraction really appears in the storm output under all three preferences",
  PREFERENCES.every((preference) => Boolean(indoorStorm[preference])),
  JSON.stringify(PREFERENCES.map((p) => Boolean(indoorStorm[p])))
);

invariantCheck(
  "the controlled outdoor attraction really appears in the storm output under all three preferences",
  PREFERENCES.every((preference) => Boolean(outdoorStorm[preference])),
  JSON.stringify(PREFERENCES.map((p) => Boolean(outdoorStorm[p])))
);

/* --- INVARIANT — clear weather is untouched ------------------------------- */

invariantCheck(
  "under clear weather the indoor attraction scores identically across all three preferences",
  new Set(PREFERENCES.map((p) => scoreOf(indoorClear[p]))).size === 1 &&
    scoreOf(indoorClear.indoor_only) !== null,
  JSON.stringify(PREFERENCES.map((p) => scoreOf(indoorClear[p])))
);

invariantCheck(
  "under clear weather the outdoor attraction scores identically across all three preferences",
  new Set(PREFERENCES.map((p) => scoreOf(outdoorClear[p]))).size === 1 &&
    scoreOf(outdoorClear.indoor_only) !== null,
  JSON.stringify(PREFERENCES.map((p) => scoreOf(outdoorClear[p])))
);

/* --- INVARIANT — unknown / missing preference values are neutral ---------- */
//
// Compared against `we_handle_it`, the canonical neutral answer. Equality proves
// neutrality without depending on the new field, so this holds at baseline too.

const weHandleItStormScore = scoreOf(indoorStorm.we_handle_it);

[
  ["omitted entirely", OMIT],
  ["undefined", undefined],
  ["null", null],
  ["empty string", ""],
  ["an unrecognised string", "nonsense_value"],
  ["a number", 42],
  ["an object", {}],
].forEach(([label, value]) => {
  const recs = runScenario({
    parkId: "magic_kingdom",
    land: "tomorrowland",
    rides: [INDOOR_RIDE],
    weather: STORM_WEATHER,
    profile: buildRawProfile(value),
  });
  const ride = findRide(recs, INDOOR_RIDE.id);
  invariantCheck(
    `a storm preference ${label} is neutral at the engine boundary`,
    Boolean(ride) && scoreOf(ride) === weHandleItStormScore,
    detailOf(scoreOf(ride), weHandleItStormScore)
  );
});

/* --- INVARIANT — missing / malformed weather is neutral ------------------- */

[
  ["undefined", undefined],
  ["null", null],
  ["empty object", {}],
  ["malformed values", { summary: 42, rainRisk: "abc", stormMode: "yes" }],
].forEach(([label, weather]) => {
  const scores = PREFERENCES.map((preference) => {
    const recs = runScenario({
      parkId: "magic_kingdom",
      land: "tomorrowland",
      rides: [INDOOR_RIDE],
      weather,
      profile: buildRawProfile(preference),
    });
    return scoreOf(findRide(recs, INDOOR_RIDE.id));
  });

  invariantCheck(
    `${label} weather leaves scores identical across all three preferences`,
    new Set(scores).size === 1 && scores[0] !== null,
    JSON.stringify(scores)
  );
});

/* --- INVARIANT — safety and authority precedence ------------------------- */

invariantCheck(
  "a closed attraction stays excluded under every storm preference",
  PREFERENCES.every((preference) => {
    const recs = runScenario({
      parkId: "magic_kingdom",
      land: "tomorrowland",
      rides: [{ ...INDOOR_RIDE, isOpen: false }, RAIN_CLOSING_RIDE],
      weather: STORM_WEATHER,
      profile: buildRawProfile(preference),
    });
    return findRide(recs, INDOOR_RIDE.id) === null;
  }),
  "a closed attraction was surfaced"
);

invariantCheck(
  "existing rain-closure handling still removes a closesInRain attraction during a storm, and we_handle_it cannot reverse it",
  PREFERENCES.every((preference) => {
    const recs = runScenario({
      parkId: "magic_kingdom",
      land: "tomorrowland",
      rides: [INDOOR_RIDE, RAIN_CLOSING_RIDE],
      weather: STORM_WEATHER,
      profile: buildRawProfile(preference),
    });
    return findRide(recs, RAIN_CLOSING_RIDE.id) === null;
  }),
  "a rain-closing attraction was surfaced during an active storm"
);

/* -------------------------------------------------------------------------- */
/* FEATURE — the new behaviour                                                */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("FEATURE-DISCRIMINATING ASSERTIONS  (* = field-independent: reads recommendationScore only)");

featureCheck(
  "under storm, the indoor attraction ranks indoor_only > brief_outdoor_ok > we_handle_it",
  scoreOf(indoorStorm.indoor_only) > scoreOf(indoorStorm.brief_outdoor_ok) &&
    scoreOf(indoorStorm.brief_outdoor_ok) > scoreOf(indoorStorm.we_handle_it),
  JSON.stringify(PREFERENCES.map((p) => scoreOf(indoorStorm[p]))),
  true
);

featureCheck(
  "under storm, the outdoor attraction ranks indoor_only < brief_outdoor_ok < we_handle_it",
  scoreOf(outdoorStorm.indoor_only) < scoreOf(outdoorStorm.brief_outdoor_ok) &&
    scoreOf(outdoorStorm.brief_outdoor_ok) < scoreOf(outdoorStorm.we_handle_it),
  JSON.stringify(PREFERENCES.map((p) => scoreOf(outdoorStorm[p]))),
  true
);

// Magnitude established from real scores alone, so the approved values are proved
// without relying on the new debug field existing.
featureCheck(
  "under storm, the indoor lean is worth exactly 8 points of real score (indoor_only vs we_handle_it)",
  scoreOf(indoorStorm.indoor_only) - scoreOf(indoorStorm.we_handle_it) === 8 &&
    scoreOf(indoorStorm.brief_outdoor_ok) - scoreOf(indoorStorm.we_handle_it) === 3,
  detailOf(
    {
      indoorOnlyDelta: scoreOf(indoorStorm.indoor_only) - scoreOf(indoorStorm.we_handle_it),
      briefDelta: scoreOf(indoorStorm.brief_outdoor_ok) - scoreOf(indoorStorm.we_handle_it),
    },
    { indoorOnlyDelta: 8, briefDelta: 3 }
  ),
  true
);

featureCheck(
  "under storm, the outdoor lean is worth exactly -8 points of real score (indoor_only vs we_handle_it)",
  scoreOf(outdoorStorm.indoor_only) - scoreOf(outdoorStorm.we_handle_it) === -8 &&
    scoreOf(outdoorStorm.brief_outdoor_ok) - scoreOf(outdoorStorm.we_handle_it) === -3,
  detailOf(
    {
      indoorOnlyDelta: scoreOf(outdoorStorm.indoor_only) - scoreOf(outdoorStorm.we_handle_it),
      briefDelta: scoreOf(outdoorStorm.brief_outdoor_ok) - scoreOf(outdoorStorm.we_handle_it),
    },
    { indoorOnlyDelta: -8, briefDelta: -3 }
  ),
  true
);

/* --- FEATURE — the exposed modifier carries the approved values ----------- */

[
  ["indoor_only", 8],
  ["brief_outdoor_ok", 3],
  ["we_handle_it", 0],
].forEach(([preference, expected]) => {
  featureCheck(
    `exposed stormPreferenceModifier is ${expected} for an indoor/AC attraction with "${preference}" under storm`,
    modifierOf(indoorStorm[preference]) === expected,
    detailOf(modifierOf(indoorStorm[preference]), expected)
  );
});

[
  ["indoor_only", -8],
  ["brief_outdoor_ok", -3],
  ["we_handle_it", 0],
].forEach(([preference, expected]) => {
  featureCheck(
    `exposed stormPreferenceModifier is ${expected} for an outdoor/non-AC attraction with "${preference}" under storm`,
    modifierOf(outdoorStorm[preference]) === expected,
    detailOf(modifierOf(outdoorStorm[preference]), expected)
  );
});

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("SUMMARY");
console.log(`  source root : ${sourceRoot}`);
console.log(`  mode        : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log(`  LOAD        : ${loadPass} passed, ${loadFail} failed`);
console.log(`  FEATURE     : ${featurePass} passed, ${featureFail} failed`);
console.log(
  `    of which field-independent (score-only): ${featureFieldIndependentPass} passed, ${featureFieldIndependentFail} failed`
);
console.log(`  INVARIANT   : ${invariantPass} passed, ${invariantFail} failed`);

if (isBaselineRun) {
  console.log("");
  console.log("Baseline expectation: FEATURE assertions SHOULD fail, INVARIANT assertions");
  console.log("should pass. At least one FIELD-INDEPENDENT feature failure is required, so");
  console.log("the discrimination cannot rest on a new debug field merely being absent.");
  console.log("");
  console.log(
    `BASELINE RESULT: ${featureFail} feature failure(s), ${featureFieldIndependentFail} of them field-independent — ${
      featureFieldIndependentFail > 0 ? "correctly discriminating on behaviour" : "NOT BEHAVIOURALLY DISCRIMINATING (investigate)"
    }; ${invariantFail} invariant failure(s).`
  );
  process.exit(invariantFail > 0 || featureFieldIndependentFail === 0 ? 1 : 0);
}

if (loadFail + featureFail + invariantFail > 0) {
  console.log("");
  console.log(`RESULT: FAIL (${loadFail} load, ${featureFail} feature, ${invariantFail} invariant)`);
  process.exit(1);
}

console.log("");
console.log("RESULT: PASS");
