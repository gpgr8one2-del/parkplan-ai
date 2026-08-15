#!/usr/bin/env node

// TOHI extraction seam and scope (64B-1).
//
// The parity harness proves the OUTPUT did not change. This one proves the
// SEAM is right: that App still owns every piece of state, networking, trust and
// access logic, that TohiTab is presentation only, and that the extraction did
// not quietly carry a redesign across with it.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-extraction
// baseline. INVARIANT REGRESSION GUARDS protect behaviour this phase must not
// touch and legitimately pass at the baseline too.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const appSource = read("src", "App.jsx");
const tohiPath = path.join(frontendRoot, "src", "components", "TohiTab.jsx");
const tohiSource = fs.existsSync(tohiPath) ? fs.readFileSync(tohiPath, "utf8") : "";

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCode = strip(appSource);
const tohiCode = strip(tohiSource);

// The <TohiTab .../> element, sliced so assertions about it cannot be satisfied
// by unrelated code elsewhere in a 5,700-line file.
const tohiCall = (() => {
  const open = appCode.indexOf("<TohiTab");
  if (open < 0) return "";
  const close = appCode.indexOf("/>", open);
  return close > open ? appCode.slice(open, close + 2) : "";
})();

// handleChatSubmit, sliced from App.
const chatSubmit = (() => {
  const start = appCode.indexOf("async function handleChatSubmit(e) {");
  if (start < 0) return "";
  const end = appCode.indexOf("\n  }\n", start);
  return end > start ? appCode.slice(start, end) : "";
})();

// THE PRESENTATION SURFACE, wherever it currently lives.
//
// After extraction that is TohiTab.jsx. Before extraction it was the inline
// branch in App.jsx. The guards below are about what the presentation contains,
// not about which file holds it, so they resolve against whichever exists. That
// keeps them true regression guards — they hold at the pinned baseline and now,
// and they fail the moment the presentation itself changes. Asserting them
// against TohiTab alone would have made them new-feature claims wearing an
// invariant label, because nothing can be true of a file that does not exist.
const presentation = (() => {
  if (tohiCode.length > 0) return tohiCode;
  const marker = '{activeTab === "tohi" &&';
  const start = appCode.indexOf(marker);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start; i < appCode.length; i += 1) {
    if (appCode[i] === "{") depth += 1;
    else if (appCode[i] === "}") {
      depth -= 1;
      if (depth === 0) return appCode.slice(start, i + 1);
    }
  }
  return "";
})();

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

console.log("TOHI extraction seam (64B-1) — FEATURE-DISCRIMINATING");

/* ------------------------------------------------------------- the seam -- */

featureCheck(
  "App still owns the activeTab === \"tohi\" condition",
  /\{activeTab === "tohi" && \(/.test(appCode) && /<TohiTab/.test(appCode),
  true
);

featureCheck(
  "App renders exactly one TohiTab",
  (appCode.match(/<TohiTab/g) || []).length === 1,
  true
);

featureCheck(
  "App imports TohiTab from the components module",
  /import \{ TohiTab \} from "\.\/components\/TohiTab";/.test(appSource),
  true
);

featureCheck(
  "the complete explicit prop contract is present, and nothing else",
  (() => {
    if (!tohiCall) return false;
    const props = [...tohiCall.matchAll(/(\w+)=\{/g)].map((m) => m[1]).sort();
    return (
      props.join(",") ===
      [
        "button",
        "card",
        "chat",
        "chatLoading",
        "hasPersonalizedAccess",
        "message",
        "onChatSubmit",
        "renderLockedFeatureCard",
        "setMessage",
      ].join(",")
    );
  })(),
  true
);

featureCheck(
  "each prop is wired to the value App owns",
  /chat=\{chat\}/.test(tohiCall) &&
    /message=\{message\}/.test(tohiCall) &&
    /chatLoading=\{chatLoading\}/.test(tohiCall) &&
    /hasPersonalizedAccess=\{hasPersonalizedAccess\}/.test(tohiCall) &&
    /setMessage=\{setMessage\}/.test(tohiCall) &&
    /onChatSubmit=\{handleChatSubmit\}/.test(tohiCall) &&
    /renderLockedFeatureCard=\{renderLockedFeatureCard\}/.test(tohiCall) &&
    /card=\{card\}/.test(tohiCall) &&
    /button=\{button\}/.test(tohiCall),
  true
);

featureCheck(
  "TohiTab exists and is presentation only — no state, effects or refs",
  tohiSource.length > 0 &&
    /export function TohiTab\(\{/.test(tohiSource) &&
    !/useState|useEffect|useMemo|useRef|useCallback|useReducer/.test(tohiSource),
  true
);

featureCheck(
  "TohiTab calls the passed callbacks rather than owning them",
  /onSubmit=\{onChatSubmit\}/.test(tohiCode) &&
    /onClick=\{\(\) => setMessage\(prompt\)\}/.test(tohiCode) &&
    /onChange=\{\(e\) => setMessage\(e\.target\.value\)\}/.test(tohiCode),
  true
);

featureCheck(
  "TohiTab uses the passed renderLockedFeatureCard and does not reimplement it",
  /renderLockedFeatureCard\(\{/.test(tohiCode) &&
    // the closure's own dependencies must not have followed it across
    !/setActiveScreen|setDevPreviewFullApp|DEV_ALLOW_FULL_APP_WITHOUT_PROFILE|lockedCardStyle/.test(
      tohiCode
    ) &&
    !/PERSONALIZED FEATURE/.test(tohiCode) &&
    !/Dev Preview/.test(tohiCode),
  true
);

featureCheck(
  "card and button are received as props, never rebuilt locally",
  // Rebuilding them would change emitted style property order even with
  // identical values, which is exactly what the parity harness would catch.
  /\.\.\.card,/.test(tohiCode) &&
    /\.\.\.button,/.test(tohiCode) &&
    !/const card\s*=/.test(tohiCode) &&
    !/const button\s*=/.test(tohiCode) &&
    !/const actionButton\s*=/.test(tohiCode),
  true
);

featureCheck(
  "TohiTab imports only React, the two icons, and colors",
  (() => {
    const imports = [...tohiSource.matchAll(/^import .*?from "([^"]+)";$/gm)].map((m) => m[1]).sort();
    return imports.join(",") === ["react", "lucide-react", "../theme"].sort().join(",");
  })(),
  true
);

featureCheck(
  "the two icons moved with the presentation and left App's import",
  /import \{ MessageCircle, Send \} from "lucide-react";/.test(tohiSource) &&
    /<MessageCircle size=\{20\} \/>/.test(tohiCode) &&
    /<Send size=\{14\} \/>/.test(tohiCode) &&
    !/\bMessageCircle\b/.test(appCode) &&
    // App keeps only the literal tracking label, never the icon element
    !/<Send\b/.test(appCode),
  true
);

console.log("Behaviour, state, trust and scope preserved — INVARIANT REGRESSION GUARDS");

/* ------------------------------------------------- App keeps the logic -- */

invariantCheck(
  "handleChatSubmit remains in App, in full",
  /async function handleChatSubmit\(e\) \{/.test(appCode) &&
    chatSubmit.length > 0 &&
    !/handleChatSubmit/.test(tohiCode),
  true
);

invariantCheck(
  "chat networking, cleaning and fallback all remain in App",
  // buildLocalChatFallback and cleanAssistantReply are both defined at module
  // scope inside App.jsx, not imported, so the assertion is that they are
  // DEFINED and CALLED there — and that none of them followed the presentation.
  /sendChatMessage\(trimmed, \{/.test(appCode) &&
    /import \{[^}]*sendChatMessage[^}]*\} from "\.\/api";/.test(appSource) &&
    /function cleanAssistantReply\(/.test(appCode) &&
    /cleanAssistantReply\(res\.reply, trimmed\)/.test(appCode) &&
    /function buildLocalChatFallback\(/.test(appCode) &&
    /buildLocalChatFallback\(\{/.test(appCode) &&
    !/sendChatMessage|cleanAssistantReply|buildLocalChatFallback/.test(tohiCode),
  true
);

invariantCheck(
  "the clarification interception remains in App and still short-circuits the network",
  /shouldAskFrontendLiveStateQuestion\(trimmed, chat\)/.test(chatSubmit) &&
    /isLiveStateQuestion: true,/.test(chatSubmit) &&
    // it returns before setChatLoading(true), so no request is made
    chatSubmit.indexOf("shouldAskFrontendLiveStateQuestion") <
      chatSubmit.indexOf("setChatLoading(true)"),
  true
);

invariantCheck(
  "the chat state and its setters remain in App",
  /const \[message, setMessage\] = useState\(""\);/.test(appCode) &&
    /const \[chat, setChat\] = useState\(\[\]\);/.test(appCode) &&
    /const \[chatLoading, setChatLoading\] = useState\(false\);/.test(appCode),
  true
);

invariantCheck(
  "access derivation remains in App",
  /const hasPersonalizedAccess = access\.canUseRecommendations;/.test(appCode) &&
    !/canUseRecommendations|buildAccessState|profileCompletion/.test(tohiCode),
  true
);

invariantCheck(
  "renderLockedFeatureCard is implemented in App and keeps its Dev Preview branch",
  /function renderLockedFeatureCard\(\{/.test(appCode) &&
    /DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && \(/.test(appCode) &&
    /setDevPreviewFullApp\(true\)/.test(appCode) &&
    /setActiveScreen\("family_profile"\)/.test(appCode),
  true
);

/* ------------------------------------------- TohiTab stays presentation -- */

invariantCheck(
  "TohiTab performs no networking and mutates no app state",
  !/fetch\(|axios|XMLHttpRequest|sendChatMessage|sendTohiPickReview|trackEvent|trackAppEvent/.test(
    presentation
  ) &&
    !/setChat\(|setChatLoading\(|setActivePark|setParkData|setTripPlanState|setRecommendations/.test(
      presentation
    ),
  true
);

invariantCheck(
  "TohiTab derives no mode, clock, storage, media query or night value",
  !/localStorage|sessionStorage|matchMedia|prefers-color-scheme|new Date|getHours|Date\.now/.test(
    presentation
  ) &&
    !/\bnight\b|shellNight|planNight|shellTokens|getTohiAppShellTheme/.test(presentation),
  true
);

invariantCheck(
  "no Plan, TOHI Pick, recommendation or While You Wait content moved into TohiTab",
  // Identifiers and components, not the bare word "recommendations" — that
  // appears legitimately in the approved empty-chat explanation copy, which
  // must survive extraction unchanged.
  !/TohiPick|tohiPick|RecommendationCard|<PlanRecommendations|PlanRecommendations|PlanTab|WhileYouWait|mustDo|bestMove|planAhead|waitOnThis/i.test(
    presentation
  ) &&
    // and the approved copy that legitimately contains the word is still here
    presentation.includes("and recommendations to answer with real trip context."),
  true
);

/* --------------------------------------------- the presentation is intact -- */

invariantCheck(
  "all three suggested prompts remain exact and in order",
  (() => {
    const want = [
      "What should we do next without wearing everyone out?",
      "Should we take a break or keep going?",
      "What if storms hit this afternoon?",
    ];
    const idx = want.map((p) => presentation.indexOf(p));
    return idx.every((i) => i >= 0) && idx[0] < idx[1] && idx[1] < idx[2];
  })(),
  true
);

invariantCheck(
  "the inline You: and TOHI: prefixes remain — speaker labels are a later phase",
  /<strong>\{isUser \? "You" : "TOHI"\}: <\/strong>/.test(presentation) &&
    // the approved redesign labels must NOT have arrived early
    !/QUICK CHECK/.test(presentation) &&
    !/Your question/.test(presentation),
  true
);

invariantCheck(
  "the emoji eyebrow remains",
  /✨ TOHI COMPANION/.test(presentation),
  true
);

invariantCheck(
  "both decorative corner circles remain",
  (presentation.match(/aria-hidden="true"/g) || []).length === 2 &&
    /width: 112,/.test(presentation) &&
    /width: 96,/.test(presentation) &&
    /radial-gradient\(circle at 92% 4%/.test(presentation),
  true
);

invariantCheck(
  "the composer keeps its current semantics and disabled rule",
  /<form\s+onSubmit=\{(onChatSubmit|handleChatSubmit)\}/.test(presentation) &&
    /type="submit"/.test(presentation) &&
    /disabled=\{chatLoading\}/.test(presentation) &&
    /\{chatLoading \? "\.\.\." : "Send"\}/.test(presentation) &&
    /placeholder="Ask TOHI\.\.\."/.test(presentation) &&
    // the redesign's blank-input disabling must not have arrived early
    !/message\.trim\(\)/.test(presentation),
  true
);

invariantCheck(
  "current index keys and message ordering are unchanged",
  /\{chat\.map\(\(msg, idx\) => \{/.test(presentation) && /key=\{idx\}/.test(presentation),
  true
);

invariantCheck(
  "no redesign behaviour arrived early",
  // Each of these is approved for a later phase and must be absent here.
  !/white-space|whiteSpace/.test(presentation) &&      // paragraph preservation
    !/scrollIntoView|autoFocus/.test(presentation) &&  // autoscroll / focus
    !/aria-live|role="log"/.test(presentation) &&      // live region
    !/<label/.test(presentation) &&                    // visible composer label
    !/outline:\s*"2px|focus-visible/.test(presentation), // focus ring correction
  true
);

invariantCheck(
  "the exact user-facing copy is unchanged",
  [
    "Ask TOHI",
    "Ask what to do next, how to handle heat or storms, whether a resort",
    "TOHI uses your park, weather, family setup, current activity,",
    "TOHI guidance needs your trip setup",
    "TOHI needs your trip setup so it can answer with your family, resort, height, and park context.",
    "Finish trip setup",
  ].every((c) => presentation.includes(c)),
  true
);

/* ------------------------------------------------------- shell and trust -- */

invariantCheck(
  "TOHI remains excluded from shellNight",
  (() => {
    const m = appCode.match(
      /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
    );
    if (!m) return false;
    const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
    return tabs.join(",") === "home,plan,waits";
  })() &&
    !/shellNight|shellTokens|pageStyle/.test(tohiCall),
  true
);

invariantCheck(
  "chat cannot mutate deterministic recommendations or Plan state",
  // The whole of handleChatSubmit touches exactly three setters. Asserted as an
  // exact set, so a new setter of any kind fails here.
  (() => {
    const setters = [...new Set((chatSubmit.match(/\bset[A-Z][A-Za-z]*\(/g) || []))].sort();
    return setters.join(",") === ["setChat(", "setChatLoading(", "setMessage("].join(",");
  })(),
  true
);

invariantCheck(
  "the blank-submit guard and preventDefault remain in App",
  /e\.preventDefault\(\);/.test(chatSubmit) &&
    /const trimmed = message\.trim\(\);/.test(chatSubmit) &&
    /if \(!trimmed\) return;/.test(chatSubmit),
  true
);

invariantCheck(
  "no production file references the blueprint assets",
  (() => {
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
        return /\.(jsx?|cjs|mjs|ts|tsx|css)$/.test(e.name) ? [full] : [];
      });
    return walk(path.join(frontendRoot, "src")).every((f) => {
      const src = strip(fs.readFileSync(f, "utf8"));
      return !/docs\/design\/tohi/.test(src) && !/tohi-approved-/.test(src);
    });
  })(),
  true
);

console.log("");
console.log(`  64B-1 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64B-1 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
