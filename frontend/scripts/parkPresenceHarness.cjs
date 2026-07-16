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

function loadModule(relativePath) {
  const filename = path.join(frontendRoot, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { code } = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });

  const moduleShim = { exports: {} };

  vm.runInNewContext(
    code,
    {
      module: moduleShim,
      exports: moduleShim.exports,
      require: frontendRequire,
      console,
      Date,
    },
    { filename }
  );

  return moduleShim.exports;
}

const {
  getTodaysPlannedParks,
  createInitialParkPresence,
  canConfirmParkPresence,
  shouldPromptForManualParkChange,
  shouldPromptForDetectedPark,
  selectBrowsedPark,
  registerDetectedPark,
  confirmActivePark,
  dismissParkPresencePrompt,
  deriveRecommendationPark,
  deriveBrowsedPark,
  isBrowsingAnotherPark,
  restoreParkPresence,
} = loadModule("src/utils/parkPresence.js");

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

const SINGLE_PARK_DAY = {
  scheduledParkForToday: { parkId: "magic_kingdom", secondaryParkId: "" },
  planningPark: "magic_kingdom",
  dateString: "2026-07-15",
};

const HOPPER_DAY = {
  scheduledParkForToday: { parkId: "magic_kingdom", secondaryParkId: "epcot" },
  planningPark: "magic_kingdom",
  dateString: "2026-07-15",
};

console.log("1. Single-park day initializes the planned park as active");
{
  const presence = createInitialParkPresence(SINGLE_PARK_DAY);
  check("confirmed park", presence.confirmedActivePark, "magic_kingdom");
  check("browsed park", presence.browsedPark, "magic_kingdom");
  check("planned set", presence.plannedParkIds.join(","), "magic_kingdom");
  check("no prompt", presence.prompt, null);
}

console.log("2. Park-hopper day initializes the first scheduled park as active");
{
  const presence = createInitialParkPresence(HOPPER_DAY);
  check("confirmed park", presence.confirmedActivePark, "magic_kingdom");
  check("planned set", presence.plannedParkIds.join(","), "magic_kingdom,epcot");
  check(
    "planned parks helper",
    getTodaysPlannedParks(HOPPER_DAY).join(","),
    "magic_kingdom,epcot"
  );
}

console.log("3. Selecting the scheduled second park changes browsed park only");
{
  const presence = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  check("browsed park", presence.browsedPark, "epcot");
  check("confirmed park unchanged", presence.confirmedActivePark, "magic_kingdom");
  check("prompt raised", presence.prompt?.type, "manual_hop");
  check("prompt park", presence.prompt?.parkId, "epcot");
  check("recommendation park stays confirmed", deriveRecommendationPark(presence), "magic_kingdom");
  check("browsing flag", isBrowsingAnotherPark(presence, "epcot"), true);
}

console.log("4. Manual “I’m here now” confirms the scheduled second park");
{
  const browsing = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  const confirmed = confirmActivePark(browsing, "epcot");
  check("confirmed park", confirmed.confirmedActivePark, "epcot");
  check("browsed park follows", confirmed.browsedPark, "epcot");
  check("prompt cleared", confirmed.prompt, null);
  check("recommendation park", deriveRecommendationPark(confirmed), "epcot");
  check("no longer browsing", isBrowsingAnotherPark(confirmed, "epcot"), false);
}

console.log("5. “Just checking” preserves the first active park");
{
  const browsing = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  const dismissed = dismissParkPresencePrompt(browsing);
  check("confirmed park unchanged", dismissed.confirmedActivePark, "magic_kingdom");
  check("still browsing epcot", dismissed.browsedPark, "epcot");
  check("prompt cleared", dismissed.prompt, null);
  check("dismissal recorded", dismissed.dismissedPrompts.includes("manual_hop:epcot"), true);
  check(
    "no immediate re-prompt while still browsing",
    shouldPromptForManualParkChange(dismissed, "epcot"),
    false
  );
  const backToFirst = selectBrowsedPark(dismissed, "magic_kingdom");
  const reselected = selectBrowsedPark(backToFirst, "epcot");
  check("re-selecting later prompts again", reselected.prompt?.type, "manual_hop");
}

console.log("6. Selecting an unplanned park remains browse-only");
{
  const presence = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "hollywood");
  check("browsed park", presence.browsedPark, "hollywood");
  check("confirmed park unchanged", presence.confirmedActivePark, "magic_kingdom");
  check("no prompt", presence.prompt, null);
  check("recommendation park stays confirmed", deriveRecommendationPark(presence), "magic_kingdom");
}

console.log("7. Unplanned park cannot be confirmed");
{
  const presence = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "hollywood");
  check("cannot confirm", canConfirmParkPresence(presence, "hollywood"), false);
  const attempted = confirmActivePark(presence, "hollywood");
  check("confirm is refused", attempted.confirmedActivePark, "magic_kingdom");
  check("presence object returned unchanged", attempted, presence);
}

console.log("8. Trusted detection of the scheduled second park prompts, never switches");
{
  const presence = createInitialParkPresence(HOPPER_DAY);
  const detected = registerDetectedPark(presence, { parkId: "epcot", confidence: "high" });
  check("prompt raised", detected.prompt?.type, "detected_arrival");
  check("prompt park", detected.prompt?.parkId, "epcot");
  check("confirmed park NOT switched", detected.confirmedActivePark, "magic_kingdom");
  check("detected park recorded", detected.detectedPark, "epcot");
  const lowConfidence = registerDetectedPark(presence, { parkId: "epcot", confidence: "medium" });
  check("low confidence never prompts", lowConfidence.prompt, null);
}

console.log("9. “Not yet” preserves the current active park");
{
  const detected = registerDetectedPark(createInitialParkPresence(HOPPER_DAY), {
    parkId: "epcot",
    confidence: "high",
  });
  const dismissed = dismissParkPresencePrompt(detected);
  check("confirmed park unchanged", dismissed.confirmedActivePark, "magic_kingdom");
  check("prompt cleared", dismissed.prompt, null);
  check(
    "detected prompt is one-time for the day",
    shouldPromptForDetectedPark(dismissed, { parkId: "epcot", confidence: "high" }),
    false
  );
}

console.log("10. Confirming a detected scheduled park changes active park");
{
  const detected = registerDetectedPark(createInitialParkPresence(HOPPER_DAY), {
    parkId: "epcot",
    confidence: "high",
  });
  const confirmed = confirmActivePark(detected, "epcot");
  check("confirmed park", confirmed.confirmedActivePark, "epcot");
  check("prompt cleared", confirmed.prompt, null);
  check("detected park cleared", confirmed.detectedPark, null);
}

console.log("11. Detection of the already-active park creates no prompt");
{
  const presence = createInitialParkPresence(HOPPER_DAY);
  const result = registerDetectedPark(presence, { parkId: "magic_kingdom", confidence: "high" });
  check("no prompt", result.prompt, null);
  check("presence unchanged", result, presence);
}

console.log("12. Detection of an unplanned park creates no transition prompt");
{
  const presence = createInitialParkPresence(HOPPER_DAY);
  const result = registerDetectedPark(presence, { parkId: "animal_kingdom", confidence: "high" });
  check("no prompt", result.prompt, null);
  check("confirmed park unchanged", result.confirmedActivePark, "magic_kingdom");
}

console.log("13. Confirmed hop clears stale current-land context (helper side)");
{
  // The App's existing per-park restore effect owns land state; the presence
  // helpers must never carry land or location data that could survive a hop.
  const browsing = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  const confirmed = confirmActivePark(browsing, "epcot");
  check("presence carries no land field", "currentLand" in confirmed, false);
  check("presence carries no location field", "location" in confirmed, false);
  check("detected evidence cleared on confirm", confirmed.detectedPark, null);
}

console.log("14. Same-day completed activity data is not modified by presence helpers");
{
  const activityLog = [{ type: "completed_ride", rideId: "r1", rideName: "Peter Pan's Flight" }];
  Object.freeze(activityLog);
  Object.freeze(activityLog[0]);
  const before = JSON.stringify(activityLog);

  let presence = createInitialParkPresence(HOPPER_DAY);
  presence = selectBrowsedPark(presence, "epcot");
  presence = confirmActivePark(presence, "epcot");
  presence = dismissParkPresencePrompt(presence);

  check("activity log untouched", JSON.stringify(activityLog), before);
  check("presence never references activity", "activityLog" in presence, false);
}

console.log("15. Recommendation park derives from confirmed active park, not browsed park");
{
  const browsing = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  check("recommendation park", deriveRecommendationPark(browsing), "magic_kingdom");
  check("browsed park", deriveBrowsedPark(browsing), "epcot");
}

console.log("16. Browsing another park does not make TOHI Pick eligible there");
{
  const tohiPick = loadModule("src/utils/tohiPick.js");
  const browsing = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  const eligibility = tohiPick.evaluateTohiPickEligibility({
    profileComplete: true,
    activePark: "epcot",
    currentArea: "world-showcase",
    waits: [{ id: "r1", name: "Test Ride", waitTime: 10 }],
    weather: { summary: "Sunny" },
    recommendations: {
      bestMove: { id: "r1", name: "Test Ride", waitTime: 10, area: "world-showcase" },
    },
    blockingAmbiguity: isBrowsingAnotherPark(browsing, "epcot"),
  });
  check("eligibility blocked while browsing", eligibility.eligible, false);
  check(
    "blocked for ambiguity",
    eligibility.reasons.includes("blocking_ambiguity"),
    true
  );
  const decision = tohiPick.evaluateTohiPickFinalDecision({
    eligibility,
    candidates: [],
  });
  check("60A decision shows no pick", decision.showPick, false);
}

console.log("17. Persistence restores only for the same trip day and planned park set");
{
  const context = HOPPER_DAY;
  const stored = confirmActivePark(
    selectBrowsedPark(createInitialParkPresence(context), "epcot"),
    "epcot"
  );
  const restored = restoreParkPresence(stored, context);
  check("same-day restore keeps confirmed hop", restored.confirmedActivePark, "epcot");
  check("restore keeps planned set", restored.plannedParkIds.join(","), "magic_kingdom,epcot");

  const differentPlan = restoreParkPresence(stored, {
    ...context,
    scheduledParkForToday: { parkId: "magic_kingdom", secondaryParkId: "animal_kingdom" },
  });
  check("changed plan resets presence", differentPlan.confirmedActivePark, "magic_kingdom");
}

console.log("18. Stale prior-day persistence is rejected");
{
  const yesterday = confirmActivePark(
    selectBrowsedPark(createInitialParkPresence({ ...HOPPER_DAY, dateString: "2026-07-14" }), "epcot"),
    "epcot"
  );
  const restored = restoreParkPresence(yesterday, HOPPER_DAY);
  check("prior-day confirmed park does not leak", restored.confirmedActivePark, "magic_kingdom");
  check("fresh date", restored.dateString, "2026-07-15");
  check("dismissals reset", restored.dismissedPrompts.length, 0);
}

console.log("19. Same-day reload restores confirmed park as both confirmed and browsed");
{
  const stored = selectBrowsedPark(
    confirmActivePark(
      selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot"),
      "epcot"
    ),
    "magic_kingdom"
  );
  check("pre-reload was browsing away from confirmed", stored.browsedPark, "magic_kingdom");
  const restored = restoreParkPresence(stored, HOPPER_DAY);
  check("confirmed park restored", restored.confirmedActivePark, "epcot");
  check("browsed park re-anchored to confirmed", restored.browsedPark, "epcot");
  check("no false browsing state after reload", isBrowsingAnotherPark(restored, restored.browsedPark), false);
}

console.log("20. Same-day reload does not create a false manual-hop prompt");
{
  const stored = selectBrowsedPark(createInitialParkPresence(HOPPER_DAY), "epcot");
  check("pre-reload prompt existed", stored.prompt?.type, "manual_hop");
  const restored = restoreParkPresence(stored, HOPPER_DAY);
  check("prompt not resurrected", restored.prompt, null);
  check("browsed re-anchored", restored.browsedPark, "magic_kingdom");
}

console.log("21. Restoration is loop-safe at the state level");
{
  const presence = createInitialParkPresence(HOPPER_DAY);
  check(
    "selecting the already-browsed park returns the same object",
    selectBrowsedPark(presence, presence.browsedPark),
    presence
  );
  const restoredTwice = restoreParkPresence(
    restoreParkPresence(presence, HOPPER_DAY),
    HOPPER_DAY
  );
  check("double restore is stable", restoredTwice.confirmedActivePark, presence.confirmedActivePark);
  check("double restore keeps browsed anchored", restoredTwice.browsedPark, presence.browsedPark);
}

console.log("22. App integration (static source checks)");
{
  const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");

  check(
    "park selector browses via handleSelectPark",
    appSource.includes("onClick={() => handleSelectPark(park.id)}"),
    true
  );
  check(
    "selector no longer switches active park directly",
    /PARKS\.map\(\(park\) => \([\s\S]{0,600}setActivePark\(park\.id\)/.test(appSource),
    false
  );
  check(
    "confirmed park is the only driver of activePark",
    appSource.includes("if (confirmedPark && activePark !== confirmedPark)"),
    true
  );
  check(
    "recommendations anchored to activePark (confirmed)",
    /getNextBestRides\(\{\s*parkId: activePark/.test(appSource),
    true
  );
  check(
    "personalized weather fetch anchored to activePark (confirmed)",
    appSource.includes("fetchWeather({ parkId: activePark"),
    true
  );
  check(
    "TOHI Pick input anchored to activePark (confirmed)",
    /tohiPickDebugPreview = useMemo\(\(\) => \{\s*const input = \{[\s\S]{0,400}activePark,/.test(appSource),
    true
  );
  check(
    "AI chat context anchored to activePark (confirmed)",
    /sendChatMessage\(trimmed, \{\s*activePark,/.test(appSource),
    true
  );
  check(
    "wait list uses browsed-park data",
    appSource.includes("waitListParkData?.rides"),
    true
  );
  check(
    "wait list park id derives from browsing state",
    appSource.includes("browsingAnotherPark ? browsedParkId : activePark"),
    true
  );
  check(
    "browsed data never replaces confirmed parkData",
    appSource.includes("setBrowsedParkData"),
    true
  );
  check(
    "per-park activity persistence effect unchanged",
    appSource.includes("writeStoredParkState(activePark, {"),
    true
  );
  check(
    "prompt card rendered adjacent to park selector",
    /parkPresencePrompt && \([\s\S]{0,4200}PARKS\.map/.test(appSource),
    true
  );
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
