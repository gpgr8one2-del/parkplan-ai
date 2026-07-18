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
    { module: moduleShim, exports: moduleShim.exports, require: frontendRequire, console, Date },
    { filename }
  );

  return moduleShim.exports;
}

const clarification = loadModule("src/utils/tohiPickClarification.js");
const tohiPick = loadModule("src/utils/tohiPick.js");

const {
  evaluateTohiPickClarification,
  buildTohiPickClarificationSignature,
  resolveTohiPickClarificationAnswer,
  storeTohiPickClarificationResult,
  getCachedTohiPickClarificationResult,
  selectTohiPickClarificationForSignature,
  TOHI_PICK_CLARIFICATION_ANSWERS,
  TOHI_PICK_CLARIFICATION_STATUSES,
} = clarification;

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

const ELIGIBLE = { eligible: true, reasons: [], missing: [], warnings: [] };

function buildShortlist({
  currentArea = "fantasyland",
  bestMove = { id: "r1", name: "Peter Pan's Flight", waitTime: 15, area: "fantasyland" },
  worthTheWalk = {
    id: "r4",
    name: "Big Thunder Mountain",
    waitTime: 30,
    area: "frontierland",
    proximityDistance: 1.2,
    waitValueStatus: { status: "good_value" },
  },
  mustDos = [{ id: "r4", name: "Big Thunder Mountain" }],
} = {}) {
  return tohiPick.buildTohiPickCandidates({
    activePark: "magic_kingdom",
    currentArea,
    recommendations: { bestMove, worthTheWalk },
    mustDos,
  }).candidates;
}

function buildContext(overrides = {}) {
  return {
    isPlanTabActive: true,
    browsingAnotherPark: false,
    presencePromptActive: false,
    confirmedActivePark: "magic_kingdom",
    currentLand: "fantasyland",
    currentActivity: null,
    dateString: "2026-07-17",
    ...overrides,
  };
}

function evaluate({ candidates, decision, context } = {}) {
  const shortlist = candidates || buildShortlist();
  const finalDecision =
    decision ||
    tohiPick.evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates: shortlist });

  return evaluateTohiPickClarification({
    decision: finalDecision,
    candidates: shortlist,
    ...buildContext(context),
  });
}

console.log("1. Strong 60A pick prevents clarification");
{
  const strongShortlist = buildShortlist({
    bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 15, area: "fantasyland" },
    mustDos: [{ id: "r1", name: "Peter Pan's Flight" }],
  });
  const decision = tohiPick.evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: strongShortlist,
  });
  check("60A confirmed", decision.showPick, true);
  const result = evaluate({ candidates: strongShortlist, decision });
  check("status", result.status, "clarification_not_needed");
  check("not eligible", result.eligible, false);
}

console.log("2. Nearby + farther must-do creates the supported question");
{
  const shortlist = buildShortlist();
  const decision = tohiPick.evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: shortlist,
  });
  check("60A did not confirm", decision.showPick, false);
  const result = evaluate({ candidates: shortlist, decision });
  check("status", result.status, "clarification_available");
  check("question type", result.questionType, "proximity_vs_must_do");
  check("nearby candidate", result.nearbyCandidate?.rideId, "r1");
  check("must-do candidate", result.mustDoCandidate?.rideId, "r4");
  check("signature exists", Boolean(result.signature), true);
}

console.log("3. Missing nearby candidate prevents clarification");
{
  const result = evaluate({ context: { currentLand: "liberty-square" }, candidates: buildShortlist({ currentArea: "liberty-square" }) });
  check("status", result.status, "clarification_not_supported");
  check("reason", result.reasonUnavailable, "no_nearby_candidate");
}

console.log("4. Missing must-do candidate prevents clarification");
{
  const result = evaluate({ candidates: buildShortlist({ mustDos: [] }) });
  check("status", result.status, "clarification_not_supported");
  check("reason", result.reasonUnavailable, "no_supported_must_do");
}

console.log("5. Same candidate for both outcomes prevents clarification");
{
  const shortlist = buildShortlist({
    mustDos: [{ id: "r1", name: "Peter Pan's Flight" }],
    worthTheWalk: {
      id: "r4",
      name: "Big Thunder Mountain",
      waitTime: 30,
      area: "frontierland",
      proximityDistance: 1.2,
    },
  });
  const decision = tohiPick.evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates: shortlist });
  const result = evaluate({ candidates: shortlist, decision });
  check("no question when answers collapse", result.status === "clarification_available", false);
}

console.log("6/7. Candidates outside the shortlist are rejected");
{
  const result = evaluate({
    candidates: buildShortlist({ mustDos: [{ id: "r99", name: "Some Other Ride" }] }),
  });
  check("must-do outside shortlist rejected", result.reasonUnavailable, "no_supported_must_do");
  const noNearby = evaluate({
    candidates: buildShortlist({
      currentArea: "liberty-square",
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 15, area: "fantasyland" },
    }),
    context: { currentLand: "liberty-square" },
  });
  check("nearby outside supported evidence rejected", noNearby.reasonUnavailable, "no_nearby_candidate");
}

console.log("8. Unknown nearby wait prevents clarification");
{
  const result = evaluate({
    candidates: buildShortlist({
      bestMove: { id: "r1", name: "Peter Pan's Flight", area: "fantasyland" },
    }),
  });
  check("reason", result.reasonUnavailable, "no_nearby_candidate");
}

console.log("9. Unknown must-do wait prevents clarification");
{
  const result = evaluate({
    candidates: buildShortlist({
      worthTheWalk: {
        id: "r4",
        name: "Big Thunder Mountain",
        area: "frontierland",
        proximityDistance: 1.2,
        waitValueStatus: { status: "good_value" },
      },
    }),
  });
  check("reason", result.reasonUnavailable, "no_supported_must_do");
}

console.log("10. Poor/unsupported must-do wait value prevents clarification");
{
  const badValue = evaluate({
    candidates: buildShortlist({
      worthTheWalk: {
        id: "r4",
        name: "Big Thunder Mountain",
        waitTime: 30,
        area: "frontierland",
        proximityDistance: 1.2,
        waitValueStatus: { status: "bad_value" },
      },
    }),
  });
  check("bad_value rejected", badValue.reasonUnavailable, "no_supported_must_do");
  const noValue = evaluate({
    candidates: buildShortlist({
      worthTheWalk: {
        id: "r4",
        name: "Big Thunder Mountain",
        waitTime: 30,
        area: "frontierland",
        proximityDistance: 1.2,
      },
    }),
  });
  check("missing value rejected", noValue.reasonUnavailable, "no_supported_must_do");
}

console.log("11. Location uncertainty prevents clarification");
{
  const result = evaluate({ context: { currentLand: null } });
  check("reason", result.reasonUnavailable, "location_unknown");
}

console.log("12. Browsing another park prevents clarification");
{
  const result = evaluate({ context: { browsingAnotherPark: true } });
  check("reason", result.reasonUnavailable, "browsing_other_park");
}

console.log("13. Invalid park context prevents clarification");
{
  const result = evaluate({ context: { confirmedActivePark: "" } });
  check("reason", result.reasonUnavailable, "park_context_invalid");
  const inLine = evaluate({ context: { currentActivity: { type: "in_line", rideName: "X" } } });
  check("in-line state also suppresses", inLine.reasonUnavailable, "currently_in_line");
  const planInactive = evaluate({ context: { isPlanTabActive: false } });
  check("plan inactive suppresses", planInactive.reasonUnavailable, "plan_inactive");
  const promptOpen = evaluate({ context: { presencePromptActive: true } });
  check("presence prompt suppresses", promptOpen.reasonUnavailable, "park_presence_ambiguous");
}

console.log("14/15. Hard-blocked candidates can never be outcomes");
{
  const shortlist = buildShortlist();
  const blockedNearby = shortlist.map((candidate) =>
    candidate.rideId === "r1"
      ? { ...candidate, eligibleForTohiPick: false, exclusionReasons: ["completed"] }
      : candidate
  );
  const decision = tohiPick.evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates: blockedNearby });
  const nearbyBlocked = evaluate({ candidates: blockedNearby, decision });
  check("blocked nearby rejected", nearbyBlocked.status === "clarification_available", false);

  const blockedMustDo = shortlist.map((candidate) =>
    candidate.rideId === "r4"
      ? { ...candidate, activityState: { ...candidate.activityState, reported: true } }
      : candidate
  );
  const mustDoBlocked = evaluate({ candidates: blockedMustDo });
  check("blocked must-do rejected", mustDoBlocked.status, "clarification_not_supported");
  check("blocked must-do never selected", mustDoBlocked.mustDoCandidate, null);

  const threeCandidates = tohiPick.buildTohiPickCandidates({
    activePark: "magic_kingdom",
    currentArea: "fantasyland",
    recommendations: {
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 15, area: "fantasyland" },
      backup: { id: "r2", name: "Haunted Mansion", waitTime: 20, area: "liberty-square" },
      worthTheWalk: {
        id: "r4",
        name: "Big Thunder Mountain",
        waitTime: 30,
        area: "frontierland",
        proximityDistance: 1.2,
        waitValueStatus: { status: "good_value" },
      },
    },
    mustDos: [{ id: "r4", name: "Big Thunder Mountain" }],
  }).candidates;
  const blockedInThree = threeCandidates.map((candidate) =>
    candidate.rideId === "r4"
      ? { ...candidate, activityState: { ...candidate.activityState, reported: true } }
      : candidate
  );
  const stillUsableShortlist = evaluate({ candidates: blockedInThree });
  check(
    "blocked must-do with usable shortlist reports no_supported_must_do",
    stillUsableShortlist.reasonUnavailable,
    "no_supported_must_do"
  );
}

console.log("16–19. Answers return exactly the predetermined candidates");
{
  const shortlist = buildShortlist();
  const evaluation = evaluate({ candidates: shortlist });
  const nearby = resolveTohiPickClarificationAnswer(
    evaluation,
    TOHI_PICK_CLARIFICATION_ANSWERS.STAY_NEARBY
  );
  check("stay nearby returns nearby candidate", nearby.candidate === evaluation.nearbyCandidate, true);
  check("stay nearby status", nearby.status, "pick_confirmed_clarification_nearby");
  const mustDo = resolveTohiPickClarificationAnswer(
    evaluation,
    TOHI_PICK_CLARIFICATION_ANSWERS.GO_MUST_DO
  );
  check("go must-do returns must-do candidate", mustDo.candidate === evaluation.mustDoCandidate, true);
  check("go must-do status", mustDo.status, "pick_confirmed_clarification_must_do");
  check(
    "answers never return other shortlist members",
    [nearby.candidate, mustDo.candidate].every((candidate) =>
      shortlist.includes(candidate)
    ),
    true
  );
  check("unknown answer returns nothing", resolveTohiPickClarificationAnswer(evaluation, "walk_anywhere"), null);
  check(
    "ineligible evaluation cannot resolve",
    resolveTohiPickClarificationAnswer({ eligible: false }, TOHI_PICK_CLARIFICATION_ANSWERS.STAY_NEARBY),
    null
  );
}

console.log("20/21. Dismissal produces no pick and does not prompt again");
{
  const cache = new Map();
  const evaluation = evaluate({});
  const dismissed = resolveTohiPickClarificationAnswer(
    evaluation,
    TOHI_PICK_CLARIFICATION_ANSWERS.NOT_RIGHT_NOW
  );
  check("dismissal has no candidate", dismissed.candidate, null);
  check("dismissal status", dismissed.status, "clarification_dismissed");
  storeTohiPickClarificationResult(cache, evaluation.signature, dismissed);
  const selected = selectTohiPickClarificationForSignature({ evaluation, cache });
  check("dismissed signature does not prompt again", selected.status, "clarification_dismissed");
  check("no pick from dismissal", selected.candidate, null);
}

console.log("22. Answered signature restores its clarified pick");
{
  const cache = new Map();
  const evaluation = evaluate({});
  storeTohiPickClarificationResult(
    cache,
    evaluation.signature,
    resolveTohiPickClarificationAnswer(evaluation, TOHI_PICK_CLARIFICATION_ANSWERS.GO_MUST_DO)
  );
  const restored = selectTohiPickClarificationForSignature({ evaluation, cache });
  check("status restored", restored.status, "pick_confirmed_clarification_must_do");
  check("candidate re-derived from current shortlist", restored.candidate === evaluation.mustDoCandidate, true);
  check("explanation", restored.explanation, "You chose to prioritize a must-do.");
}

console.log("23/32. Stale answers are ignored; new context may ask again");
{
  const cache = new Map();
  const evaluationA = evaluate({});
  storeTohiPickClarificationResult(
    cache,
    evaluationA.signature,
    resolveTohiPickClarificationAnswer(evaluationA, TOHI_PICK_CLARIFICATION_ANSWERS.STAY_NEARBY)
  );
  const shortlistB = buildShortlist({
    bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 45, area: "fantasyland" },
  });
  const evaluationB = evaluate({ candidates: shortlistB });
  check("signatures differ", evaluationA.signature !== evaluationB.signature, true);
  const selectedB = selectTohiPickClarificationForSignature({ evaluation: evaluationB, cache });
  check("stale answer ignored — question asked again", selectedB.status, "clarification_available");
}

console.log("24–30. Signature semantics");
{
  const base = evaluate({});
  const differentMustDo = evaluate({
    candidates: buildShortlist({
      worthTheWalk: {
        id: "r5",
        name: "Splash Mountain",
        waitTime: 30,
        area: "frontierland",
        proximityDistance: 1.2,
        waitValueStatus: { status: "good_value" },
      },
      mustDos: [{ id: "r5", name: "Splash Mountain" }],
    }),
  });
  check("candidate change changes signature", base.signature !== differentMustDo.signature, true);

  const differentPark = evaluate({ context: { confirmedActivePark: "epcot" } });
  check("park change changes signature", base.signature !== differentPark.signature, true);

  const differentLand = evaluate({ context: { currentLand: "adventureland" } });
  check("land change changes signature", base.signature !== differentLand.signature, true);

  const sameBand = evaluate({
    candidates: buildShortlist({
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 18, area: "fantasyland" },
    }),
  });
  check("same wait band preserves signature", base.signature, sameBand.signature);

  const bandCrossed = evaluate({
    candidates: buildShortlist({
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 25, area: "fantasyland" },
    }),
  });
  check("band crossing changes signature", base.signature !== bandCrossed.signature, true);

  const shortlist = buildShortlist();
  const reordered = [...shortlist].reverse();
  const sigOrdered = buildTohiPickClarificationSignature({
    confirmedActivePark: "magic_kingdom",
    currentLand: "fantasyland",
    dateString: "2026-07-17",
    nearbyCandidate: shortlist[0],
    mustDoCandidate: shortlist[1],
    candidates: shortlist,
    browsingAnotherPark: false,
  });
  const sigReordered = buildTohiPickClarificationSignature({
    confirmedActivePark: "magic_kingdom",
    currentLand: "fantasyland",
    dateString: "2026-07-17",
    nearbyCandidate: shortlist[0],
    mustDoCandidate: shortlist[1],
    candidates: reordered,
    browsingAnotherPark: false,
  });
  check("shortlist-order change changes signature", sigOrdered !== sigReordered, true);

  const keyReorderedCandidate = JSON.parse(JSON.stringify(shortlist[0]));
  const sigKeyOrder = buildTohiPickClarificationSignature({
    browsingAnotherPark: false,
    candidates: shortlist,
    mustDoCandidate: shortlist[1],
    nearbyCandidate: keyReorderedCandidate,
    dateString: "2026-07-17",
    currentLand: "fantasyland",
    confirmedActivePark: "magic_kingdom",
  });
  check("object-key order does not change signature", sigOrdered, sigKeyOrder);
}

console.log("31. Cache is bounded");
{
  const cache = new Map();
  for (let i = 0; i < 25; i += 1) {
    storeTohiPickClarificationResult(cache, `sig-${i}`, {
      status: "clarification_dismissed",
      answer: "not_right_now",
    });
  }
  check("cache bounded to 20", cache.size, 20);
  check("oldest evicted", getCachedTohiPickClarificationResult(cache, "sig-0"), null);
  check("newest retained", Boolean(getCachedTohiPickClarificationResult(cache, "sig-24")), true);
  storeTohiPickClarificationResult(cache, "sig-open", { status: "clarification_available" });
  check("non-terminal states never cached", getCachedTohiPickClarificationResult(cache, "sig-open"), null);
}

console.log("33. Normal recommendation data is not mutated");
{
  const shortlist = buildShortlist();
  shortlist.forEach(Object.freeze);
  Object.freeze(shortlist);
  const before = JSON.stringify(shortlist);
  const evaluation = evaluate({ candidates: shortlist });
  resolveTohiPickClarificationAnswer(evaluation, TOHI_PICK_CLARIFICATION_ANSWERS.STAY_NEARBY);
  resolveTohiPickClarificationAnswer(evaluation, TOHI_PICK_CLARIFICATION_ANSWERS.GO_MUST_DO);
  check("shortlist unchanged", JSON.stringify(shortlist), before);
}

console.log("34. No network/API helper is introduced");
{
  const helperSource = fs.readFileSync(
    path.join(frontendRoot, "src", "utils", "tohiPickClarification.js"),
    "utf8"
  );
  check("helper has no fetch", helperSource.includes("fetch("), false);
  check("helper has no api import", helperSource.includes('from "../api"'), false);
  check("helper has no timers", helperSource.includes("setTimeout"), false);
  const apiSource = fs.readFileSync(path.join(frontendRoot, "src", "api.js"), "utf8");
  check("api.js gained no clarification endpoint", apiSource.includes("clarification"), false);
}

console.log("35–37. App integration (static source checks)");
{
  const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");

  check(
    "question copy exists exactly once",
    (appSource.match(/HELP TOHI CHOOSE/g) || []).length,
    1
  );
  check(
    "question gated on plan-tab evaluation",
    appSource.includes('isPlanTabActive: activeTab === "plan"'),
    true
  );
  const questionIndex = appSource.indexOf("HELP TOHI CHOOSE");
  const recommendationAfter = appSource.indexOf("<RecommendationCard", questionIndex);
  check("normal recommendation cards remain rendered beneath", recommendationAfter > questionIndex, true);
  check(
    "clarified candidate comes from helper result",
    appSource.includes("? tohiPickClarification.candidate"),
    true
  );
  check(
    "display candidate prefers deterministic pick",
    appSource.includes("const tohiPickDisplayCandidate = tohiPickMvpCandidate || clarifiedTohiPickCandidate;"),
    true
  );
  check(
    "clarification source exposed in debug",
    appSource.includes('dbRow("tohiPickDisplaySource", tohiPickDisplaySource)'),
    true
  );
  check(
    "no clarification network call in App",
    /sendTohiPickClarification|fetch\([^)]*clarification/i.test(appSource),
    false
  );
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
