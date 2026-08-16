#!/usr/bin/env node

// TOHI question classification (64C-1).
//
// The defect this phase fixes: "What should we do if storms arrive later?"
// matched the vague phrase "what should" inside isOpenEndedLiveStrategyQuestion
// and was intercepted by the energy QUICK CHECK, so the question never reached
// the AI. The user had to reply "you didn't answer my question" to get an answer.
//
// HOW THESE CLAIMS ARE ESTABLISHED
//
// The classifier is EXECUTED, not pattern-matched. The real predicates are
// extracted verbatim from App.jsx and evaluated, so every routing verdict below
// is the verdict production reaches. Source-text presence would be worthless
// here: a regex can read correctly and still classify the wrong way, which is
// precisely how this defect shipped — every existing harness only ever asserted
// that these functions EXIST.
//
// Extraction rather than import, because App.jsx is a React module with a large
// import graph; these predicates are pure and self-contained, and the harness
// fails loudly if any of them cannot be found.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-fix
// baseline. INVARIANT REGRESSION GUARDS protect what this phase must not touch.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const appPath = path.join(frontendRoot, "src", "App.jsx");
const appSource = fs.readFileSync(appPath, "utf8");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const appCode = strip(appSource);

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

/* ------------------------------------------- the real production classifier -- */

function sliceFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  if (start < 0) return "";
  const end = appSource.indexOf("\n}\n", start);
  return end > start ? appSource.slice(start, end + 2) : "";
}

function sliceArrayConst(name) {
  const start = appSource.indexOf(`const ${name} = [`);
  if (start < 0) return "";
  const end = appSource.indexOf("\n];", start);
  return end > start ? appSource.slice(start, end + 3) : "";
}

// Reads to the statement terminator, not the first newline: these regex
// constants legitimately wrap across lines, and stopping at the newline would
// silently yield "const NAME =" and turn the NEXT piece into its value.
function sliceLineConst(name) {
  const start = appSource.indexOf(`const ${name} =`);
  if (start < 0) return "";
  const end = appSource.indexOf(";\n", start);
  return end > start ? appSource.slice(start, end + 2) : "";
}

// The classifier that exists on BOTH sides of this phase. These must be present
// or the harness cannot execute anything, and the load check below fails.
const REQUIRED_PIECES = [
  sliceFunction("hasSpecificRidePlaceOrActionInMessage"),
  sliceFunction("isPlanningDepthQuestion"),
  sliceFunction("isOpenEndedLiveStrategyQuestion"),
  sliceFunction("isAwaitingLiveStateAnswer"),
  sliceFunction("isWithinLiveStateFollowupWindow"),
  sliceFunction("shouldAskFrontendLiveStateQuestion"),
];

// The 64C-1 additions. Deliberately OPTIONAL so this harness runs against the
// pinned pre-fix baseline too — that is what lets the invariant guards below
// prove they hold on BOTH sides rather than only after the change.
const NEW_PIECES = [
  // The boundary-aware specificity helpers. Optional for the same reason as the
  // weather pieces: the pinned baseline has none of them and matches terms by
  // plain substring, and the harness must still run there so the invariant
  // guards can prove they hold on BOTH sides.
  sliceLineConst("SPECIFIC_TERM_PATTERN_CACHE"),
  sliceFunction("escapeRegExpLiteral"),
  sliceFunction("buildSpecificTermPattern"),
  sliceFunction("messageContainsSpecificTerm"),
  sliceArrayConst("WEATHER_CONDITION_PATTERNS"),
  sliceLineConst("WEATHER_NEGATION_BEFORE"),
  sliceLineConst("WEATHER_NEGATION_AFTER"),
  sliceFunction("hasExplicitWeatherIntentInMessage"),
  sliceArrayConst("FAMILY_STATE_PATTERNS"),
  sliceFunction("hasExplicitFamilyStateInMessage"),
].filter(Boolean);

const CLASSIFIER = (() => {
  if (REQUIRED_PIECES.some((p) => !p)) return null;
  try {
    return new Function(
      `${NEW_PIECES.join("\n\n")}
      ${REQUIRED_PIECES.join("\n\n")}
      return {
        isOpenEndedLiveStrategyQuestion,
        shouldAskFrontendLiveStateQuestion,
        hasSpecificRidePlaceOrActionInMessage,
        hasExplicitWeatherIntentInMessage:
          typeof hasExplicitWeatherIntentInMessage === "function"
            ? hasExplicitWeatherIntentInMessage
            : null,
        hasExplicitFamilyStateInMessage:
          typeof hasExplicitFamilyStateInMessage === "function"
            ? hasExplicitFamilyStateInMessage
            : null,
      };`
    )();
  } catch (err) {
    console.log(`       classifier failed to load: ${err.message}`);
    return null;
  }
})();

// A 64C-1 predicate that does not exist yet answers `null` for every input, so
// baseline runs fail the feature assertions instead of crashing.
const weatherIntent = (m) =>
  CLASSIFIER && CLASSIFIER.hasExplicitWeatherIntentInMessage
    ? CLASSIFIER.hasExplicitWeatherIntentInMessage(m)
    : null;
const familyState = (m) =>
  CLASSIFIER && CLASSIFIER.hasExplicitFamilyStateInMessage
    ? CLASSIFIER.hasExplicitFamilyStateInMessage(m)
    : null;

console.log("TOHI question classification (64C-1) — FEATURE-DISCRIMINATING");

check(
  "the real production classifier loaded and was executed (not pattern-matched)",
  CLASSIFIER !== null,
  true
);

// Routing verdict for a first-turn question, which is the case the defect hit.
// null when the classifier could not be loaded, so every scenario fails loudly
// instead of passing vacuously.
function route(message) {
  if (!CLASSIFIER) return null;
  return CLASSIFIER.shouldAskFrontendLiveStateQuestion(message, [])
    ? "QUICK CHECK"
    : "direct";
}

function expectAll(label, messages, expected, kind = "feature") {
  const misses = messages.filter((m) => route(m) !== expected);
  const fn = kind === "feature" ? featureCheck : invariantCheck;
  fn(`${label} (${messages.length} cases)`, misses.length === 0, true);
  for (const m of misses) {
    console.log(`       ${JSON.stringify(m)} -> ${JSON.stringify(route(m))}`);
  }
}

/* ------------------------------------------------------ A. weather intent -- */

expectAll(
  "1. explicit weather questions go straight to the AI",
  [
    "What should we do if storms arrive later?",
    "what should we do if storms arrive later",
    "WHAT SHOULD WE DO IF STORMS ARRIVE LATER?",
    "What should we do if storms arrive later",
    "What should we do if storms arrive later!!",
    "What if it starts raining this afternoon?",
    "How should we handle lightning nearby?",
    "It looks extremely hot later—what should we change?",
    "The heat index will be high—what should we change?",
  ],
  "direct"
);

expectAll(
  "2. a negated condition does not silence a different active one",
  [
    "No rain, but extreme heat is expected later—what should we change?",
    "The storms cleared, but lightning is nearby—what should we do?",
    "No storms, but it is extremely hot—what should we do?",
  ],
  "direct"
);

// Holds on BOTH sides, so it is a guard rather than a feature: before this
// phase these fell through because no weather rule existed at all, and after it
// they fall through because every condition in them is negated. Same verdict,
// and it fails the moment a broad weather rule starts reading "no storms" as
// storm risk.
expectAll(
  "fully negated weather falls through to the existing classification",
  [
    "The forecast says no storms—what should we do next?",
    "The rain stopped. What should we do next?",
    "No rain expected—where should we go now?",
  ],
  "QUICK CHECK",
  "invariant"
);

featureCheck(
  "the weather predicate itself distinguishes active from negated",
  CLASSIFIER !== null &&
    weatherIntent("storms arrive later") === true &&
    weatherIntent("the forecast says no storms") === false &&
    weatherIntent("the rain stopped") === false &&
    weatherIntent("no rain, but extreme heat later") === true,
  true
);

expectAll(
  "2b. uncertainty about weather is still a weather question, not a negation",
  // Negation is anchored to the condition, so "not" inside "not sure if" never
  // reaches the condition that follows it.
  [
    "I'm not sure if storms arrive later—what should we do?",
    "We don't know whether it will rain—what should we do?",
    "Uncertain whether lightning is nearby—what should we do?",
    "Not only rain but lightning is expected—what should we do?",
  ],
  "direct"
);

expectAll(
  "2c. a negated condition does not suppress another active one WITHOUT a contrast word",
  [
    "No rain and extreme heat later—what should we change?",
    "No storms, lightning nearby—what should we do?",
    "No rain with heat-index concerns—what should we do?",
  ],
  "direct"
);

expectAll(
  "2d. mixed conditions across a contrast stay direct",
  [
    "It might not rain, but storms could arrive later—what should we do?",
    "The storms cleared, although lightning is still nearby—what should we do?",
  ],
  "direct"
);

featureCheck(
  "3b. condition-anchored negation forms are recognised",
  CLASSIFIER !== null &&
    [
      "no chance of storms",
      "storms are not expected",
      "rain isn't expected",
      "the storm passed",
      "the weather cleared",
      "without rain",
      "no risk of lightning",
      "the rain stopped",
    ].every((m) => weatherIntent(m) === false) &&
    // and none of the uncertainty forms is mistaken for one of them
    [
      "not sure if storms arrive",
      "don't know whether it will rain",
      "uncertain whether lightning is nearby",
      "not only rain but lightning is expected",
    ].every((m) => weatherIntent(m) === true),
  true
);

expectAll(
  "3c. fully negated weather then a vague question stays QUICK CHECK",
  ["No storms and no rain expected—what should we do next?"],
  "QUICK CHECK",
  "invariant"
);

featureCheck(
  "3d. the fully negated 'rain stopped / weather cleared' case now routes end to end",
  // Previously blocked upstream: the word "weather" contains "eat", a
  // specificTerms entry, so substring matching declared the message specific
  // before weather was ever consulted. Boundary-aware matching corrects that, so
  // the weather rule's verdict now actually reaches the routing decision.
  CLASSIFIER !== null &&
    weatherIntent("the rain stopped and the weather cleared—where should we go now?") ===
      false &&
    CLASSIFIER.hasSpecificRidePlaceOrActionInMessage(
      "the rain stopped and the weather cleared—where should we go now?"
    ) === false &&
    route("The rain stopped and the weather cleared—where should we go now?") ===
      "QUICK CHECK",
  true
);

expectAll(
  "3e. a term embedded inside another word is no longer specificity by itself",
  [
    "Great, what should we do next?",
    "We're back—what should we do next?",
    "This place is crowded—what should we do next?",
    "The weather cleared—what should we do next?",
    "The heat is over—what should we do next?",
    "A shower passed—what should we do next?",
    "The forest is quiet—what should we do next?",
  ],
  "QUICK CHECK"
);

featureCheck(
  "3f. the collision words are rejected at the specificity rule itself",
  CLASSIFIER !== null &&
    ["great", "weather", "heat", "seat", "theater", "back", "place", "space", "shower", "forest"]
      .every((w) => CLASSIFIER.hasSpecificRidePlaceOrActionInMessage(`the ${w} is fine`) === false),
  true
);

// A guard, not a feature: under the old substring matching every term trivially
// matched itself too. What it protects is that the boundary change did not
// silently narrow the list — it fails the moment any entry stops matching.
invariantCheck(
  "every specificTerms entry still matches as its own word or phrase",
  (() => {
    if (!CLASSIFIER) return false;
    const fnSource = sliceFunction("hasSpecificRidePlaceOrActionInMessage");
    const start = fnSource.indexOf("const specificTerms = [");
    const end = fnSource.indexOf("];", start);
    if (start < 0 || end < 0) return false;
    const terms = (fnSource.slice(start, end).match(/"([^"]+)"/g) || []).map((t) =>
      t.slice(1, -1)
    );
    if (terms.length < 50) return false;
    return terms.every(
      (t) =>
        CLASSIFIER.hasSpecificRidePlaceOrActionInMessage(t) === true &&
        CLASSIFIER.hasSpecificRidePlaceOrActionInMessage(`what about the ${t} then`) === true
    );
  })(),
  true
);

featureCheck(
  "3h. both apostrophe forms still match",
  CLASSIFIER !== null &&
    CLASSIFIER.hasSpecificRidePlaceOrActionInMessage("is rock 'n' roller worth it") === true &&
    CLASSIFIER.hasSpecificRidePlaceOrActionInMessage("is rock \u2019n\u2019 roller worth it") ===
      true,
  true
);

expectAll(
  "4. a question that already carries the family's state goes straight to the AI",
  [
    "Everyone is fading—what should we do?",
    "The kids are tired. Where should we go now?",
    "We need a break—what would you recommend?",
    "Everyone is exhausted, what should we do next?",
    "We are still going strong—what should we do next?",
    "Everyone has plenty of energy—what should we do next?",
    "The little ones are starting to fade. What should we do next?",
  ],
  "direct"
);

featureCheck(
  "impatience with a queue is not a report on the family's energy",
  // "tired of waiting" is a complaint about a line, not the information the
  // QUICK CHECK asks for, so it must not suppress the clarification.
  CLASSIFIER !== null &&
    familyState("everyone is tired of waiting in line") ===
      false &&
    familyState("we are tired of waiting for the parade") ===
      false &&
    familyState("everyone is tired") === true,
  true
);

/* ------------------------------------------------- C. the vague correction -- */

expectAll(
  "5. genuinely vague questions still get the energy QUICK CHECK",
  ["What should we do next?", "What would you recommend?", "Where should we go now?"],
  "QUICK CHECK"
);

featureCheck(
  '6. "What would you recommend?" is now QUICK CHECK-eligible',
  // A deliberate correction: production sent it to the AI only because it
  // matched no vague phrase, which was an accident rather than a decision.
  route("What would you recommend?") === "QUICK CHECK" &&
    route("what would you recommend") === "QUICK CHECK" &&
    // but it stays direct once the message carries real information
    route("We need a break—what would you recommend?") === "direct",
  true
);

/* ---------------------------------------------------- D. collision safety -- */

// Also a guard: these routed direct before this phase because no weather rule
// existed, and must still route direct now that one does. It fails the moment an
// unbounded substring rule reads "Barnstormer" as "storm".
expectAll(
  "ride and food names are never mistaken for weather",
  [
    "Should we do the Barnstormer next?",
    "What should we do about Big Thunder?",
    "Should we get a hot dog next?",
    "Should we visit the rainforest section next?",
  ],
  "direct",
  "invariant"
);

featureCheck(
  "the weather predicate rejects the collision words outright",
  // Proven at the predicate, not just at the routing verdict: the ride/place
  // check would mask a broken weather rule here, so this asserts the weather
  // rule is independently correct.
  CLASSIFIER !== null &&
    weatherIntent("should we do the barnstormer next") ===
      false &&
    weatherIntent("big thunder mountain") === false &&
    weatherIntent("should we get a hot dog next") === false &&
    weatherIntent("the rainforest cafe") === false &&
    weatherIntent("brainstorm the day") === false,
  true
);

/* ------------------------------------------- E. the reported defect, traced -- */

featureCheck(
  "8. the reported storm question now reaches the AI request path",
  // The intercept in handleChatSubmit returns BEFORE sendChatMessage. A verdict
  // of "direct" is therefore exactly the statement that the question survives to
  // the request rather than being answered by the frontend.
  route("What should we do if storms arrive later?") === "direct" &&
    // and the follow-up window still works: once a clarification HAS been asked,
    // the next message is never intercepted again.
    CLASSIFIER.shouldAskFrontendLiveStateQuestion("What should we do next?", [
      { role: "user", content: "anything" },
      { role: "assistant", content: "How's everyone's energy?", isLiveStateQuestion: true },
    ]) === false,
  true
);

console.log("Protected behaviour preserved — INVARIANT REGRESSION GUARDS");

expectAll(
  "positive specificity is preserved word-for-word",
  [
    "Should we eat now?",
    "Can we find AC?",
    "Should we see a show?",
    "We need to rest—what should we do?",
  ],
  "direct",
  "invariant"
);

expectAll(
  "specific attraction, resort, transport and wait questions still go direct",
  [
    "Should we ride Space Mountain now?",
    "Is a resort break realistic today?",
    "Is the monorail still the fastest way back?",
    "How long is the wait for Tron?",
    "Where should we go to get food?",
  ],
  "direct",
  "invariant"
);

invariantCheck(
  "the clarification still returns before any AI request is made",
  (() => {
    const start = appCode.indexOf("async function handleChatSubmit");
    const body = appCode.slice(start, appCode.indexOf("\n  }\n", start));
    const gate = body.indexOf("shouldAskFrontendLiveStateQuestion(trimmed, chat)");
    const send = body.indexOf("sendChatMessage(trimmed, {");
    const ret = body.indexOf("return;", gate);
    return gate > 0 && send > gate && ret > gate && ret < send;
  })(),
  true
);

invariantCheck(
  "no canned weather advice was added to the frontend",
  // The fix is routing only. TOHI's answer must still come from the AI, so no
  // storm/rain/heat guidance copy may appear in the classifier region.
  (() => {
    const start = appCode.indexOf("const WEATHER_CONDITION_PATTERNS");
    const end = appCode.indexOf("function isAwaitingLiveStateAnswer");
    // Absent on the pre-fix baseline, where "no canned advice was added" is
    // trivially true because nothing was added at all.
    if (start < 0 || end < start) return true;
    const region = appCode.slice(start, end);
    return (
      !/setChat\(|content:\s*"/.test(region) &&
      !/indoor|shelter|poncho|umbrella|take cover|head inside/i.test(region)
    );
  })(),
  true
);

invariantCheck(
  "conversation history, duplicate latch, failure restoration and request context are unchanged",
  /if \(chatInFlightRef\.current\) return;/.test(appCode) &&
    /chatInFlightRef\.current = true;/.test(appCode) &&
    /const finalizeChatFailure = \(\) => \{/.test(appCode) &&
    /setChat\(\[\.\.\.nextChat, buildChatConnectionFailureEntry\(\)\]\);/.test(appCode) &&
    /setMessage\(\(current\) =>/.test(appCode) &&
    /conversationHistory: nextChat\s*\n?\s*\.filter\(\(msg\) => msg\.isConnectionFailure !== true\)\s*\n?\s*\.slice\(-6\)/.test(
      appCode
    ) &&
    /const replyText = resolveAssistantReplyText\(res, trimmed\);/.test(appCode) &&
    /weather,/.test(appCode) &&
    /weatherMode,/.test(appCode),
  true
);

featureCheck(
  "9. the escape order is preserved and extended, not reordered",
  // Ride/place must stay AHEAD of weather so "Big Thunder" is settled as a ride
  // before any weather vocabulary is consulted.
  (() => {
    const fn = sliceFunction("isOpenEndedLiveStrategyQuestion");
    const order = ["isPlanningDepthQuestion", "hasSpecificRidePlaceOrActionInMessage",
      "hasExplicitWeatherIntentInMessage", "hasExplicitFamilyStateInMessage",
      "exactOpenEndedQuestions", "vagueLivePhrases"];
    let at = -1;
    for (const token of order) {
      const next = fn.indexOf(token);
      if (next <= at) return false;
      at = next;
    }
    return true;
  })(),
  true
);

invariantCheck(
  "the classifier stays pure — no state, network, storage or clock",
  (() => {
    const region = [
      sliceFunction("hasExplicitWeatherIntentInMessage"),
      sliceFunction("hasExplicitFamilyStateInMessage"),
      sliceFunction("isOpenEndedLiveStrategyQuestion"),
    ].join("\n");
    return !/setChat|setMessage|fetch\(|localStorage|sessionStorage|new Date|Date\.now|useState|trackAppEvent/.test(
      region
    );
  })(),
  true
);

console.log("");
console.log(`  64C-1 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64C-1 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
