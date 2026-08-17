#!/usr/bin/env node

// Profile Input Honesty — Walking, Mobility, and Privacy.
//
// Two connected changes, both proved here by executing real code:
//
//   1. Onboarding now describes what walking and mobility answers actually do,
//      and the free-text mobility-notes input is gone. Nothing read that field,
//      and its placeholder invited guests to describe real constraints TOHI then
//      ignored.
//
//   2. Any mobility note a guest saved BEFORE this phase stops leaving the
//      device: the real chat-session sanitizer strips it from the outbound
//      payload without mutating the stored profile.
//
// ---------------------------------------------------------------------------
// CLASSIFICATION
// ---------------------------------------------------------------------------
//
//   FEATURE-DISCRIMINATING — the behaviour this phase adds. Every one MUST fail
//   against the pinned pre-phase baseline. None of them is called
//   feature-discriminating merely because this harness file is new: each is
//   checked against real baseline source, and the baseline run is expected to
//   report them as failures.
//
//   INVARIANT — behaviour this phase must NOT change. Expected to pass against
//   both the baseline source and the working tree.
//
//   SKIPPED — an invariant that cannot be evaluated in the selected source tree
//   because the code path it needs does not exist there. Reported separately and
//   never counted as a pass. The sanitizer invariants land here at baseline,
//   because the sanitizer is not exported before this phase.
//
//   LOAD/MODULE — establishes that real modules resolved and real exports exist.
//   Wiring, not behaviour, so never counted toward the behavioural totals.
//
// ---------------------------------------------------------------------------
// HOW CLAIMS ARE ESTABLISHED
// ---------------------------------------------------------------------------
//
//   * The onboarding assertions render the REAL `OnboardingFlow` component
//     through `react-dom/server`, with props built from the REAL helpers
//     (`buildFamilyProfileSummary`, `getFamilyProfileCompletion`, `getParkLabel`,
//     `getResortOptions`, the real option constants). Assertions run against the
//     RENDERED MARKUP, not against the source text. A source-text search cannot
//     establish a behavioural claim and is not used for one anywhere here.
//
//   * The privacy assertions call the REAL `sanitizeChatSessionData` exported
//     from `src/api.js` — the same function `sendChatMessage` calls in
//     production — with controlled nested data, and inspect the real return
//     value and the real input object.
//
// No production logic is copied or re-implemented in this file.
//
// ---------------------------------------------------------------------------
// SOURCE ROOT
// ---------------------------------------------------------------------------
//
//   node scripts/profileInputHonestyHarness.cjs
//   node scripts/profileInputHonestyHarness.cjs /tmp/baseline/frontend
//   node scripts/profileInputHonestyHarness.cjs --source-root=/tmp/base/frontend
//
// Dev dependencies always resolve from the tree this file lives in; only the
// `src/` under test comes from the selected source root. The baseline export
// therefore needs neither this file nor node_modules.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

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

  if (fs.existsSync(path.join(candidate, "src", "components", "OnboardingFlow.jsx"))) {
    return candidate;
  }

  const nested = path.join(candidate, "frontend");
  if (fs.existsSync(path.join(nested, "src", "components", "OnboardingFlow.jsx"))) {
    return nested;
  }

  throw new Error(
    `Source root does not contain src/components/OnboardingFlow.jsx: ${candidate}`
  );
}

const sourceRoot = resolveSourceRoot(readSourceRootArg(process.argv.slice(2)));
const isBaselineRun = path.resolve(sourceRoot) !== path.resolve(harnessFrontendRoot);

/* -------------------------------------------------------------------------- */
/* Module loader — existing repository pattern, extended for JSX              */
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

const babel = getBabel();

function getReactAppPreset() {
  try {
    return depsRequire.resolve("babel-preset-react-app");
  } catch {
    throw new Error("Could not resolve babel-preset-react-app from frontend dependencies.");
  }
}

const reactAppPreset = getReactAppPreset();

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
  if (request.startsWith("src/")) return resolveExistingPath(path.join(sourceRoot, request));
  if (request.startsWith("@/")) return resolveExistingPath(path.join(sourceRoot, "src", request.slice(2)));
  if (request.startsWith(".")) return resolveExistingPath(path.resolve(parentDir, request));
  return null;
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

  // Artwork and stylesheets are irrelevant to copy and payload assertions.
  // Stubbed the same deterministic way the existing render harnesses stub them.
  if (/\.(css|scss|sass|png|jpe?g|svg|webp|gif|avif)$/i.test(resolvedFilename)) {
    const assetModule = { exports: {} };
    moduleCache.set(resolvedFilename, assetModule);
    return assetModule.exports;
  }

  const source = fs.readFileSync(resolvedFilename, "utf8");
  const transformed = babel.transformSync(source, {
    filename: resolvedFilename,
    babelrc: false,
    configFile: false,
    presets: [[reactAppPreset, { runtime: "automatic" }]],
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

  const wrapped = `(function(require, module, exports, __filename, __dirname) {
${transformed.code}
})`;

  const fn = vm.runInThisContext(wrapped, { filename: resolvedFilename });
  fn(localRequire, module, module.exports, resolvedFilename, dirname);

  return module.exports;
}

/* -------------------------------------------------------------------------- */
/* Result accounting — four ledgers, never merged                             */
/* -------------------------------------------------------------------------- */

let loadPass = 0;
let loadFail = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;
let skipped = 0;

function line(kind, label, ok, detail) {
  if (ok) {
    console.log(`  PASS [${kind}] ${label}`);
    return;
  }
  console.log(`  FAIL [${kind}] ${label}${detail ? ` — ${detail}` : ""}`);
}

function loadCheck(label, ok, detail) {
  if (ok) loadPass += 1;
  else loadFail += 1;
  line("LOAD", label, ok, detail);
}

function featureCheck(label, ok, detail) {
  if (ok) featurePass += 1;
  else featureFail += 1;
  line("FEATURE", label, ok, detail);
}

function invariantCheck(label, ok, detail) {
  if (ok) invariantPass += 1;
  else invariantFail += 1;
  line("INVARIANT", label, ok, detail);
}

function skipCheck(label, reason) {
  skipped += 1;
  console.log(`  SKIP [INVARIANT] ${label} — ${reason}`);
}

/* -------------------------------------------------------------------------- */
/* Load real modules                                                          */
/* -------------------------------------------------------------------------- */

console.log("Profile Input Honesty — Walking, Mobility, and Privacy");
console.log(`  harness tree : ${harnessFrontendRoot}`);
console.log(`  source root  : ${sourceRoot}`);
console.log(`  mode         : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log("");
console.log("LOAD / MODULE CHECKS");

const React = depsRequire("react");
const { renderToStaticMarkup } = depsRequire("react-dom/server");

let onboardingModule = null;
let familyProfileModule = null;
let resortProfilesModule = null;
let apiModule = null;

function tryLoad(label, relativePath) {
  try {
    const loaded = loadModule(path.join(sourceRoot, relativePath));
    loadCheck(`${relativePath} loads from the selected source root`, true);
    return loaded;
  } catch (err) {
    loadCheck(`${relativePath} loads from the selected source root`, false, err.message);
    return null;
  }
}

onboardingModule = tryLoad("onboarding", "src/components/OnboardingFlow.jsx");
familyProfileModule = tryLoad("familyProfile", "src/utils/familyProfile.js");
resortProfilesModule = tryLoad("resortProfiles", "src/resortProfiles.js");
apiModule = tryLoad("api", "src/api.js");

const OnboardingFlow =
  onboardingModule && (onboardingModule.OnboardingFlow || onboardingModule.default);

loadCheck("real OnboardingFlow export is a component", typeof OnboardingFlow === "function");

const sanitizeChatSessionData = apiModule && apiModule.sanitizeChatSessionData;
const sanitizerAvailable = typeof sanitizeChatSessionData === "function";

// Presence of the export is wiring. Whether it STRIPS the field is behaviour,
// asserted separately below.
loadCheck(
  "src/api.js exposes sanitizeChatSessionData for direct testing",
  sanitizerAvailable,
  sanitizerAvailable ? "" : "export not present in this source tree"
);

if (!familyProfileModule || typeof OnboardingFlow !== "function") {
  console.log("");
  console.log("Aborting: the real onboarding component could not be loaded, so no");
  console.log("behavioural claim can be made. This is a load failure.");
  console.log("");
  console.log(`LOAD      : ${loadPass} passed, ${loadFail} failed`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Render the real OnboardingFlow at step 2                                   */
/* -------------------------------------------------------------------------- */

const {
  buildFamilyProfileSummary,
  getFamilyProfileCompletion,
  getParkLabel,
  getDisneyAgeClass,
  getDisneyAgeLabel,
  DISNEY_PARK_OPTIONS,
  FAMILY_PRIORITY_OPTIONS,
} = familyProfileModule;

const getResortOptions = resortProfilesModule && resortProfilesModule.getResortOptions;

// A realistic in-progress profile: a stored mobility note is present on purpose,
// so the removal assertions are meaningful rather than trivially satisfied by an
// empty value.
const STORED_MOBILITY_NOTE = "avoid long backtracking, stroller naps around 2 PM";

const RAW_PROFILE = {
  adultCount: 2,
  childCount: 1,
  children: [{ id: "child_1", label: "Child 1", age: 6, heightInches: 44 }],
  pace: "balanced",
  thrillTolerance: "mixed",
  heatSensitivity: "medium",
  waterRidePreference: "depends",
  stormTolerance: "brief_outdoor_ok",
  priorities: ["low_stress"],
  mobilityAccessibility: {
    usesStroller: true,
    usesWheelchair: false,
    mobilityNotes: STORED_MOBILITY_NOTE,
  },
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 2,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "epcot",
  },
  resortContext: { stayingOnProperty: "unknown", resortId: "", transportationMode: "unknown" },
};

const summary = buildFamilyProfileSummary(RAW_PROFILE);
const completion = getFamilyProfileCompletion(summary);

const noop = () => {};
const styleStub = {};

let markup = "";
let renderError = null;

try {
  markup = renderToStaticMarkup(
    React.createElement(OnboardingFlow, {
      familyProfileSummary: summary,
      familyProfileStep: 2,
      familyProfile: summary,
      isProfileIncomplete: !completion.isComplete,
      setActiveScreen: noop,
      setFamilyProfileStep: noop,
      setDevPreviewFullApp: noop,
      devPreviewFullApp: false,
      profileCompletion: completion,
      updateFamilyProfile: noop,
      handleAdultCountChange: noop,
      handleChildCountChange: noop,
      handleChildChange: noop,
      handlePriorityToggle: noop,
      handleSelectedParkToggle: noop,
      handleFamilyProfileDone: noop,
      trackAppEvent: noop,
      getDisneyAgeClass,
      getDisneyAgeLabel,
      getParkLabel,
      page: styleStub,
      shell: styleStub,
      card: styleStub,
      button: styleStub,
      actionButton: styleStub,
      premiumHeroCard: styleStub,
      premiumBadge: styleStub,
      DISNEY_PARK_OPTIONS,
      FAMILY_PRIORITY_OPTIONS,
      DEV_ALLOW_FULL_APP_WITHOUT_PROFILE: false,
      resortOptions: getResortOptions ? getResortOptions() : [],
      tripPlan: { preferences: {}, mustDoExperiences: [] },
      mustDoExperienceOptions: [],
      onUpdateTripPreferences: noop,
      onToggleMustDoExperience: noop,
    })
  );
  loadCheck("real OnboardingFlow renders to static markup at step 2", markup.length > 0);
} catch (err) {
  renderError = err;
  loadCheck("real OnboardingFlow renders to static markup at step 2", false, err.message);
}

if (renderError) {
  console.log("");
  console.log(`LOAD : ${loadPass} passed, ${loadFail} failed`);
  process.exit(1);
}

// React escapes text into HTML entities. Decode the handful that appear in the
// approved copy so assertions can be written in the copy's real characters
// rather than in entity form.
function decodeEntities(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&");
}

const rendered = decodeEntities(markup);

function renderedContains(needle) {
  return rendered.includes(needle);
}

/* -------------------------------------------------------------------------- */
/* FEATURE — the approved copy is really rendered                             */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("FEATURE-DISCRIMINATING ASSERTIONS");

featureCheck(
  'rendered onboarding asks "How much walking works for your group?"',
  renderedContains("How much walking works for your group?")
);

[
  "Keep choices nearby",
  "A balanced amount of walking",
  "Comfortable covering more ground",
].forEach((label) => {
  featureCheck(
    `rendered walking option label "${label}" is present`,
    renderedContains(label)
  );
});

featureCheck(
  "rendered walking helper explains the real effect on nearby choices",
  renderedContains("This helps TOHI decide how strongly to favor nearby choices.")
);

featureCheck(
  "rendered section copy describes the real range of effect",
  renderedContains("These details help shape recommendations, pacing, and packing guidance.")
);

featureCheck(
  'rendered mobility section is headed "Stroller & mobility equipment"',
  renderedContains("Stroller & mobility equipment")
);

featureCheck(
  "rendered mobility description points distance at the walking control",
  renderedContains(
    "These details support packing and park logistics. Walking distance is guided by the choice above."
  )
);

featureCheck(
  'rendered stroller checkbox label is "We’ll use a stroller"',
  renderedContains("We’ll use a stroller")
);

featureCheck(
  "rendered mobility-support checkbox label names wheelchair, ECV/scooter or similar",
  renderedContains(
    "Someone will use a wheelchair, ECV/scooter, or similar mobility support"
  )
);

/* --- FEATURE — the removed input is really gone --------------------------- */

featureCheck(
  "rendered onboarding contains no textarea at all (the notes field was the only one)",
  !renderedContains("<textarea")
);

featureCheck(
  'rendered onboarding no longer shows the "Mobility notes optional" label',
  !renderedContains("Mobility notes")
);

featureCheck(
  "rendered onboarding no longer shows the old notes placeholder examples",
  !renderedContains("avoid long backtracking") &&
    !renderedContains("needs shaded breaks") &&
    !renderedContains("stroller naps around 2 PM")
);

featureCheck(
  "a stored mobility note is not echoed anywhere into rendered onboarding",
  !renderedContains(STORED_MOBILITY_NOTE)
);

featureCheck(
  "rendered onboarding no longer claims mobility details stop exhausting recommendations",
  !renderedContains("recommending exhausting moves")
);

featureCheck(
  "rendered onboarding no longer claims these choices directly affect safety",
  !renderedContains("directly affect safety")
);

featureCheck(
  'rendered onboarding no longer uses the vague "Family pace" framing',
  !renderedContains("Family pace")
);

/* -------------------------------------------------------------------------- */
/* INVARIANT — what this phase must not change                                */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("INVARIANT ASSERTIONS");

// Stored values are presentation-independent. Relabelling must not renumber the
// vocabulary the normalizer and the engine share.
["leisurely", "balanced", "energetic"].forEach((value) => {
  invariantCheck(
    `stored walking value "${value}" is still the option value in rendered markup`,
    renderedContains(`value="${value}"`),
    `expected an option carrying value="${value}"`
  );
});

invariantCheck(
  "both mobility checkboxes still render as real checkbox inputs",
  (rendered.match(/type="checkbox"/g) || []).length >= 2,
  `found ${(rendered.match(/type="checkbox"/g) || []).length} checkbox inputs, expected at least 2`
);

invariantCheck(
  "the stroller checkbox still reflects the stored usesStroller: true value",
  /type="checkbox"[^>]*checked=""/.test(rendered),
  "expected at least one checked checkbox for the stored stroller value"
);

invariantCheck(
  "the other step-2 comfort controls are untouched by this phase",
  renderedContains("Ride comfort") &&
    renderedContains("Heat and fatigue") &&
    renderedContains("Water rides") &&
    renderedContains("Storm comfort"),
  "expected Ride comfort, Heat and fatigue, Water rides and Storm comfort to still render"
);

invariantCheck(
  "stored stormTolerance still drives its select value (storm scoring untouched here)",
  renderedContains('value="brief_outdoor_ok"'),
  'expected the stored storm value to still render'
);

/* --- INVARIANT — stored mobility notes still survive normalization --------- */
//
// This phase removes collection and transmission, NOT stored-data
// compatibility. A device that already saved a note must keep it intact locally.

const { normalizeFamilyProfile } = familyProfileModule;

const renormalized = normalizeFamilyProfile({
  mobilityAccessibility: {
    usesStroller: true,
    usesWheelchair: true,
    mobilityNotes: STORED_MOBILITY_NOTE,
  },
});

invariantCheck(
  "a stored mobilityNotes value still survives real normalization untouched",
  renormalized.mobilityAccessibility.mobilityNotes === STORED_MOBILITY_NOTE,
  `expected ${JSON.stringify(STORED_MOBILITY_NOTE)}, got ${JSON.stringify(
    renormalized.mobilityAccessibility.mobilityNotes
  )}`
);

invariantCheck(
  "stored stroller and wheelchair booleans still survive real normalization",
  renormalized.mobilityAccessibility.usesStroller === true &&
    renormalized.mobilityAccessibility.usesWheelchair === true,
  JSON.stringify(renormalized.mobilityAccessibility)
);

/* -------------------------------------------------------------------------- */
/* Chat-session sanitization                                                  */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("CHAT-SESSION SANITIZATION");

function buildSessionData(mobilityAccessibility) {
  return {
    activePark: "magic_kingdom",
    currentLand: "tomorrowland",
    familyProfile: {
      adultCount: 2,
      childCount: 1,
      stormTolerance: "indoor_only",
      heatSensitivity: "high",
      ...(mobilityAccessibility === undefined
        ? {}
        : { mobilityAccessibility }),
    },
  };
}

if (!sanitizerAvailable) {
  featureCheck(
    "sanitized chat payload drops familyProfile.mobilityAccessibility.mobilityNotes",
    false,
    "sanitizeChatSessionData is not exported in this source tree, so the behaviour does not exist here"
  );

  [
    "sanitization leaves the caller's stored profile object unmutated",
    "sanitized chat payload keeps usesStroller",
    "sanitized chat payload keeps usesWheelchair",
    "sanitized chat payload keeps stormTolerance",
    "sanitization tolerates a missing mobilityAccessibility object",
    "sanitization tolerates a null mobilityAccessibility object",
    "sanitization tolerates a partial mobilityAccessibility object",
    "sanitization tolerates a missing familyProfile",
    "sanitization tolerates a null familyProfile",
  ].forEach((label) => {
    skipCheck(label, "sanitizeChatSessionData is not exported in this source tree");
  });
} else {
  /* --- FEATURE — the note is stripped ------------------------------------- */

  const input = buildSessionData({
    usesStroller: true,
    usesWheelchair: true,
    mobilityNotes: STORED_MOBILITY_NOTE,
  });

  // Deep snapshot taken BEFORE the call, so mutation can be detected for real
  // rather than inferred.
  const inputSnapshot = JSON.stringify(input);

  const sanitized = sanitizeChatSessionData(input);
  const sanitizedMobility =
    (sanitized.familyProfile && sanitized.familyProfile.mobilityAccessibility) || {};

  featureCheck(
    "sanitized chat payload drops familyProfile.mobilityAccessibility.mobilityNotes",
    !("mobilityNotes" in sanitizedMobility) &&
      !JSON.stringify(sanitized).includes(STORED_MOBILITY_NOTE),
    `sanitized mobility object was ${JSON.stringify(sanitizedMobility)}`
  );

  /* --- INVARIANT — everything else is untouched --------------------------- */

  invariantCheck(
    "sanitization leaves the caller's stored profile object unmutated",
    JSON.stringify(input) === inputSnapshot &&
      input.familyProfile.mobilityAccessibility.mobilityNotes === STORED_MOBILITY_NOTE,
    "the input session object was modified in place"
  );

  invariantCheck(
    "sanitized chat payload keeps usesStroller",
    sanitizedMobility.usesStroller === true,
    `got ${JSON.stringify(sanitizedMobility.usesStroller)}`
  );

  invariantCheck(
    "sanitized chat payload keeps usesWheelchair",
    sanitizedMobility.usesWheelchair === true,
    `got ${JSON.stringify(sanitizedMobility.usesWheelchair)}`
  );

  invariantCheck(
    "sanitized chat payload keeps stormTolerance",
    sanitized.familyProfile && sanitized.familyProfile.stormTolerance === "indoor_only",
    `got ${JSON.stringify(sanitized.familyProfile && sanitized.familyProfile.stormTolerance)}`
  );

  invariantCheck(
    "sanitized chat payload keeps other authorized profile fields",
    sanitized.familyProfile &&
      sanitized.familyProfile.adultCount === 2 &&
      sanitized.familyProfile.heatSensitivity === "high" &&
      sanitized.activePark === "magic_kingdom",
    JSON.stringify(sanitized.familyProfile)
  );

  /* --- INVARIANT — degenerate shapes do not crash ------------------------- */

  function toleratesShape(label, sessionData, extraCheck) {
    let ok = false;
    let detail = "";
    try {
      const result = sanitizeChatSessionData(sessionData);
      ok = typeof extraCheck === "function" ? Boolean(extraCheck(result)) : true;
      if (!ok) detail = `unexpected result: ${JSON.stringify(result)}`;
    } catch (err) {
      ok = false;
      detail = `threw: ${err.message}`;
    }
    invariantCheck(label, ok, detail);
  }

  toleratesShape(
    "sanitization tolerates a missing mobilityAccessibility object",
    buildSessionData(undefined),
    (result) => result.familyProfile && result.familyProfile.stormTolerance === "indoor_only"
  );

  toleratesShape(
    "sanitization tolerates a null mobilityAccessibility object",
    buildSessionData(null),
    (result) => Boolean(result.familyProfile)
  );

  toleratesShape(
    "sanitization tolerates a partial mobilityAccessibility object",
    buildSessionData({ usesStroller: true }),
    (result) =>
      result.familyProfile &&
      result.familyProfile.mobilityAccessibility &&
      result.familyProfile.mobilityAccessibility.usesStroller === true
  );

  toleratesShape(
    "sanitization tolerates a malformed (non-object) mobilityAccessibility value",
    buildSessionData("not-an-object"),
    (result) => Boolean(result.familyProfile)
  );

  toleratesShape(
    "sanitization tolerates a missing familyProfile",
    { activePark: "epcot" },
    (result) => result.activePark === "epcot"
  );

  toleratesShape("sanitization tolerates a null familyProfile", {
    activePark: "epcot",
    familyProfile: null,
  });

  toleratesShape("sanitization tolerates a notes-only mobility object", buildSessionData({
    mobilityNotes: STORED_MOBILITY_NOTE,
  }), (result) => !JSON.stringify(result).includes(STORED_MOBILITY_NOTE));
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

console.log("");
console.log("SUMMARY");
console.log(`  source root : ${sourceRoot}`);
console.log(`  mode        : ${isBaselineRun ? "BASELINE SOURCE" : "WORKING TREE"}`);
console.log(`  LOAD        : ${loadPass} passed, ${loadFail} failed`);
console.log(`  FEATURE     : ${featurePass} passed, ${featureFail} failed`);
console.log(`  INVARIANT   : ${invariantPass} passed, ${invariantFail} failed`);
console.log(`  SKIPPED     : ${skipped} (not evaluable in this source tree; never counted as passes)`);

const behaviouralFailures = featureFail + invariantFail;

if (isBaselineRun) {
  console.log("");
  console.log("Baseline expectation: FEATURE assertions SHOULD fail here, because the");
  console.log("behaviour they describe does not exist before this phase. INVARIANT");
  console.log("assertions should still pass.");
  console.log("");
  console.log(
    `BASELINE RESULT: ${featureFail} feature failure(s) — ${
      featureFail > 0 ? "correctly discriminating" : "NOT DISCRIMINATING (investigate)"
    }; ${invariantFail} invariant failure(s).`
  );
  process.exit(invariantFail > 0 ? 1 : 0);
}

if (loadFail + behaviouralFailures > 0) {
  console.log("");
  console.log(
    `RESULT: FAIL (${loadFail} load, ${featureFail} feature, ${invariantFail} invariant)`
  );
  process.exit(1);
}

console.log("");
console.log("RESULT: PASS");
