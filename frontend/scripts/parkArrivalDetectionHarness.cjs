#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

const frontendRoot = path.resolve(__dirname, "..");
const frontendRequire = createRequire(path.join(frontendRoot, "package.json"));
const babel = frontendRequire("@babel/core");
const moduleTransformPlugin = frontendRequire.resolve(
  "@babel/plugin-transform-modules-commonjs"
);
const moduleCache = new Map();

function resolveExistingPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    path.join(basePath, "index.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  throw new Error(`Could not resolve local module: ${basePath}`);
}

function loadModule(filename) {
  const resolvedFilename = path.resolve(filename);

  if (moduleCache.has(resolvedFilename)) {
    return moduleCache.get(resolvedFilename).exports;
  }

  const source = fs.readFileSync(resolvedFilename, "utf8");
  const { code } = babel.transformSync(source, {
    filename: resolvedFilename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });
  const moduleShim = { exports: {} };
  moduleCache.set(resolvedFilename, moduleShim);
  const dirname = path.dirname(resolvedFilename);

  function localRequire(request) {
    if (request.startsWith(".")) {
      return loadModule(resolveExistingPath(path.resolve(dirname, request)));
    }
    return frontendRequire(request);
  }

  const wrapped = `(function(require, module, exports, __filename, __dirname) {\n${code}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: resolvedFilename });
  fn(localRequire, moduleShim, moduleShim.exports, resolvedFilename, dirname);

  return moduleShim.exports;
}

const arrival = loadModule(path.join(frontendRoot, "src", "utils", "parkArrivalDetection.js"));
const presenceModule = loadModule(path.join(frontendRoot, "src", "utils", "parkPresence.js"));
const { PARK_LOCATION_ANCHORS } = loadModule(
  path.join(frontendRoot, "src", "parkLocationAnchors.js")
);

const {
  PARK_ARRIVAL_THRESHOLDS,
  classifyDetectedPark,
  evaluateParkLocationSample,
  createParkArrivalTracker,
  resetParkArrivalTracker,
  updateParkArrivalTracker,
  hasStableParkArrivalEvidence,
  suppressParkArrivalPrompt,
  acknowledgeParkArrivalDeparture,
} = arrival;

const {
  createInitialParkPresence,
  registerDetectedPark,
  shouldPromptForDetectedPark,
  dismissParkPresencePrompt,
  confirmActivePark,
  clearDetectedParkDismissal,
} = presenceModule;

let passCount = 0;
let failCount = 0;

function check(label, actual, expected) {
  const ok = actual === expected;

  if (ok) {
    passCount += 1;
    console.log(`  PASS ${label}`);
  } else {
    failCount += 1;
    console.log(`  FAIL ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function firstAnchorOf(parkId) {
  for (const zone of Object.values(PARK_LOCATION_ANCHORS[parkId] || {})) {
    for (const anchor of zone.anchors || []) {
      return { lat: Number(anchor.lat), lng: Number(anchor.lng) };
    }
  }
  throw new Error(`No anchors for ${parkId}`);
}

const IN_MK = firstAnchorOf("magic_kingdom");
const IN_EPCOT = firstAnchorOf("epcot");
const IN_HOLLYWOOD = firstAnchorOf("hollywood");
const FAR_AWAY = { lat: IN_MK.lat + 0.09, lng: IN_MK.lng };

const HOPPER = {
  confirmedActivePark: "magic_kingdom",
  plannedParkIds: ["magic_kingdom", "epcot"],
};
const SINGLE = {
  confirmedActivePark: "magic_kingdom",
  plannedParkIds: ["magic_kingdom"],
};

const T0 = 1_800_000_000_000;
const SPACING = PARK_ARRIVAL_THRESHOLDS.MIN_SAMPLE_SPACING_MS + 5000;

function goodPosition(point, at, accuracy = 20) {
  return { lat: point.lat, lng: point.lng, accuracyMeters: accuracy, timestamp: at };
}

function feed(tracker, point, at, context = HOPPER, accuracy = 20) {
  return updateParkArrivalTracker(tracker, {
    position: point ? goodPosition(point, at, accuracy) : null,
    now: at,
    ...context,
  });
}

console.log("1. Missing position produces no classification");
{
  const t = feed(createParkArrivalTracker(), null, T0);
  check("rejection", t.lastSample.rejectionReason, "missing_position");
  check("no candidate", t.candidateParkId, null);
}

console.log("2. Stale position is rejected");
{
  const t = updateParkArrivalTracker(createParkArrivalTracker(), {
    position: { ...IN_EPCOT, accuracyMeters: 20, timestamp: T0 - 120000 },
    now: T0,
    ...HOPPER,
  });
  check("rejection", t.lastSample.rejectionReason, "stale");
}

console.log("3. Poor-accuracy position is rejected");
{
  const t = feed(createParkArrivalTracker(), IN_EPCOT, T0, HOPPER, 200);
  check("rejection", t.lastSample.rejectionReason, "inaccurate");
}

console.log("4. Position inside the confirmed active park creates no arrival candidate");
{
  const t = feed(createParkArrivalTracker(), IN_MK, T0);
  check("rejection", t.lastSample.rejectionReason, "active_park");
  check("no candidate", t.candidateParkId, null);
}

console.log("5. One qualifying second-park sample is insufficient");
{
  const t = feed(createParkArrivalTracker(), IN_EPCOT, T0);
  check("candidate started", t.candidateParkId, "epcot");
  check("count", t.qualifyingCount, 1);
  check("not stable", hasStableParkArrivalEvidence(t), false);
}

console.log("6. Required consecutive consistent samples establish stable evidence");
{
  let t = createParkArrivalTracker();
  t = feed(t, IN_EPCOT, T0);
  t = feed(t, IN_EPCOT, T0 + SPACING);
  check("still not stable at 2", hasStableParkArrivalEvidence(t), false);
  t = feed(t, IN_EPCOT, T0 + 2 * SPACING);
  check("stable at 3", hasStableParkArrivalEvidence(t), true);
  check("candidate", t.candidateParkId, "epcot");

  let burst = createParkArrivalTracker();
  burst = feed(burst, IN_EPCOT, T0);
  burst = feed(burst, IN_EPCOT, T0 + 1000);
  burst = feed(burst, IN_EPCOT, T0 + 2000);
  check("rapid burst does not count as consecutive evidence", burst.qualifyingCount, 1);
}

console.log("7. Conflicting confident sample resets the sequence");
{
  let t = createParkArrivalTracker();
  t = feed(t, IN_EPCOT, T0);
  t = feed(t, IN_EPCOT, T0 + SPACING);
  t = feed(t, IN_MK, T0 + 2 * SPACING);
  check("candidate cleared by confirmed-park reading", t.candidateParkId, null);

  let u = createParkArrivalTracker();
  u = feed(u, IN_EPCOT, T0);
  u = feed(u, IN_HOLLYWOOD, T0 + SPACING);
  check("candidate cleared by unplanned-park reading", u.candidateParkId, null);

  let weak = createParkArrivalTracker();
  weak = feed(weak, IN_EPCOT, T0);
  weak = feed(weak, IN_EPCOT, T0 + SPACING, HOPPER, 200);
  check("weak sample does not reset sequence", weak.candidateParkId, "epcot");
  check("weak sample does not add count", weak.qualifyingCount, 1);
}

console.log("8. Ambiguous park result is rejected (synthetic geometry)");
{
  const syntheticAnchors = {
    park_a: { land: { anchors: [{ id: "a", name: "A", lat: 0, lng: 0 }] } },
    park_b: { land: { anchors: [{ id: "b", name: "B", lat: 0.0045, lng: 0 }] } },
  };
  const midpoint = { lat: 0.00225, lng: 0 };
  const result = evaluateParkLocationSample(
    {
      position: { ...midpoint, accuracyMeters: 20, timestamp: T0 },
      now: T0,
      confirmedActivePark: "park_a",
      plannedParkIds: ["park_a", "park_b"],
    },
    syntheticAnchors
  );
  check("rejection", result.rejectionReason, "ambiguous");
}

console.log("9. Position outside trusted park geometry is rejected");
{
  const t = feed(createParkArrivalTracker(), FAR_AWAY, T0);
  check("rejection", t.lastSample.rejectionReason, "outside_trusted_geometry");
  const cls = classifyDetectedPark(FAR_AWAY);
  check("classifier marks outside", cls.outsideTrustedGeometry, true);
}

console.log("10. Scheduled second park becomes a stable detected candidate");
{
  let t = createParkArrivalTracker();
  for (let i = 0; i < 3; i += 1) t = feed(t, IN_EPCOT, T0 + i * SPACING);
  check("stable second-park candidate", t.candidateParkId, "epcot");
  check("stable", t.stable, true);
}

console.log("11. Unplanned park is rejected");
{
  const t = feed(createParkArrivalTracker(), IN_HOLLYWOOD, T0);
  check("rejection", t.lastSample.rejectionReason, "unplanned_park");
  check("no candidate", t.candidateParkId, null);
}

console.log("12. Single-park day cannot produce a park-hop arrival");
{
  const t = feed(createParkArrivalTracker(), IN_EPCOT, T0, SINGLE);
  check("rejection", t.lastSample.rejectionReason, "not_park_hopper_day");
}

console.log("13. Park-hopping disabled cannot produce an arrival");
{
  const presence = createInitialParkPresence({
    scheduledParkForToday: { parkId: "magic_kingdom", secondaryParkId: "" },
    planningPark: "magic_kingdom",
    dateString: "2026-07-16",
  });
  const t = feed(createParkArrivalTracker(), IN_EPCOT, T0, {
    confirmedActivePark: presence.confirmedActivePark,
    plannedParkIds: presence.plannedParkIds,
  });
  check("rejection", t.lastSample.rejectionReason, "not_park_hopper_day");
}

console.log("14. Stable evidence registers a detected_arrival prompt only");
{
  const presence = createInitialParkPresence({
    scheduledParkForToday: { parkId: "magic_kingdom", secondaryParkId: "epcot" },
    planningPark: "magic_kingdom",
    dateString: "2026-07-16",
  });
  const prompted = registerDetectedPark(presence, { parkId: "epcot", confidence: "high" });
  check("prompt type", prompted.prompt?.type, "detected_arrival");
  check("prompt park", prompted.prompt?.parkId, "epcot");

  console.log("15. Stable evidence does not confirm or switch the active park");
  check("confirmed park unchanged", prompted.confirmedActivePark, "magic_kingdom");
  check("browsed park unchanged", prompted.browsedPark, "magic_kingdom");

  console.log("16. “Not yet” prevents immediate repeated prompts");
  const dismissed = dismissParkPresencePrompt(prompted);
  check("prompt cleared", dismissed.prompt, null);
  check(
    "re-registration blocked while dismissed",
    registerDetectedPark(dismissed, { parkId: "epcot", confidence: "high" }).prompt,
    null
  );

  console.log("17. Continued samples during the same episode remain suppressed");
  let t = suppressParkArrivalPrompt(createParkArrivalTracker(), "epcot");
  for (let i = 0; i < 4; i += 1) t = feed(t, IN_EPCOT, T0 + i * SPACING);
  check("no candidate rebuilds while suppressed", t.candidateParkId, null);
  check("not stable", hasStableParkArrivalEvidence(t), false);

  console.log("18. Leaving and later returning allows a future prompt");
  t = feed(t, IN_MK, T0 + 10 * SPACING);
  check("one departure sample is not enough", t.departedParkId, null);
  t = feed(t, IN_MK, T0 + 11 * SPACING);
  check("departure episode ends", t.departedParkId, "epcot");
  check("suppression cleared", t.suppressedParkId, null);
  t = acknowledgeParkArrivalDeparture(t);
  check("departure acknowledged", t.departedParkId, null);

  const cleared = clearDetectedParkDismissal(dismissed, "epcot");
  check(
    "dismissal cleared after departure",
    shouldPromptForDetectedPark(cleared, { parkId: "epcot", confidence: "high" }),
    true
  );
  for (let i = 20; i < 23; i += 1) t = feed(t, IN_EPCOT, T0 + i * SPACING);
  check("return builds stable evidence again", hasStableParkArrivalEvidence(t), true);
  check(
    "return re-prompts",
    registerDetectedPark(cleared, { parkId: "epcot", confidence: "high" }).prompt?.type,
    "detected_arrival"
  );

  console.log("19. Confirming the prompt moves the active park through 60C");
  const confirmed = confirmActivePark(prompted, "epcot");
  check("confirmed park", confirmed.confirmedActivePark, "epcot");
  check("prompt cleared", confirmed.prompt, null);

  console.log("20. Current land remains unchanged before confirmation");
  check("prompted presence carries no land", "currentLand" in prompted, false);
  check("tracker carries no land", "currentLand" in createParkArrivalTracker(), false);

  console.log("21/22. Land reset and activity survival are owned by existing 60C paths");
  check("confirm clears detected evidence", confirmed.detectedPark, null);
  check("presence never references activity", "activityLog" in confirmed, false);
}

console.log("23. Date or plan change resets the tracker");
{
  let t = createParkArrivalTracker({ dateString: "2026-07-16", planKey: "mk,epcot" });
  for (let i = 0; i < 3; i += 1) t = feed(t, IN_EPCOT, T0 + i * SPACING);
  check("stable before reset", t.stable, true);
  const reset = resetParkArrivalTracker({ dateString: "2026-07-17", planKey: "mk" });
  check("candidate cleared", reset.candidateParkId, null);
  check("stable cleared", reset.stable, false);
  check("suppression cleared", reset.suppressedParkId, null);
}

console.log("24. App integration (static source checks)");
{
  const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
  const ingestCallSites = (appSource.match(/ingestParkArrivalSample\(position\);/g) || []).length;

  check("samples ingested from watch and manual location", ingestCallSites >= 2, true);

  const effectStart = appSource.indexOf("// GPS is evidence only");
  const effectEnd = appSource.indexOf("const parkArrivalPlanKey");
  const arrivalEffect = appSource.slice(effectStart, effectEnd);

  check("arrival effect exists", effectStart > 0 && effectEnd > effectStart, true);
  check("arrival effect never sets active park", arrivalEffect.includes("setActivePark("), false);
  check(
    "arrival effect never confirms the park itself",
    arrivalEffect.includes("confirmActivePark("),
    false
  );
  check(
    "arrival effect registers through 60C",
    arrivalEffect.includes("registerDetectedPark(current, { parkId: detectedParkId, confidence: \"high\" })"),
    true
  );
  check(
    "confirm resets the arrival tracker",
    /setParkPresence\(\(current\) => confirmActivePark\(current, parkId\)\);\s*setParkArrivalTracker\(createParkArrivalTracker\(\)\);/.test(appSource),
    true
  );
  check(
    "plan/date change resets the tracker",
    appSource.includes("}, [parkArrivalPlanKey]);"),
    true
  );
  check(
    "departure clears the episode dismissal",
    arrivalEffect.includes("clearDetectedParkDismissal(current, departedParkId)"),
    true
  );
  check(
    "ingest is guarded when GPS/presence unavailable",
    appSource.includes("if (!arrivalContext?.confirmedActivePark || !position?.coords) return;"),
    true
  );
  check(
    "no raw coordinates in debug rows",
    /dbRow\([^)]*latitude/i.test(appSource) || /dbRow\([^)]*\blng\b/.test(appSource),
    false
  );
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
