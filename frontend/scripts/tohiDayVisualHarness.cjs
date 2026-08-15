#!/usr/bin/env node

// TOHI approved day presentation (64B-2A).
//
// The extraction harness proves the SEAM is right and the historical parity
// harness proves the extraction changed nothing. This one proves the DAY
// PRESENTATION matches the approved blueprints, and that nothing from a later
// phase arrived early.
//
// Assertions are made against RENDERED output wherever the claim is about what
// ships. Reading a style object cannot prove a surface is reachable: a branch
// can be present and never rendered, or rendered with the wrong props. Source
// assertions are used only for claims about structure that rendering cannot
// show, such as which value drives a branch.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-redesign
// baseline. INVARIANT REGRESSION GUARDS protect behaviour and trust boundaries
// this phase must not touch, and pass in both trees.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");

/* ------------------------------------------------------ jsx compilation -- */

const origJs = Module._extensions[".js"];
function compileJsx(module, filename) {
  if (filename.includes("node_modules")) return origJs(module, filename);
  const out = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
    babelrc: false,
    configFile: false,
  });
  return module._compile(out.code, filename);
}
Module._extensions[".js"] = compileJsx;
Module._extensions[".jsx"] = compileJsx;

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { colors } = require(path.join(frontendRoot, "src", "theme.js"));

const tohiPath = path.join(frontendRoot, "src", "components", "TohiTab.jsx");
const tohiSource = fs.existsSync(tohiPath) ? fs.readFileSync(tohiPath, "utf8") : "";
const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const tohiCode = strip(tohiSource);
const appCode = strip(appSource);

/* ------------------------------------------------------------- fixtures -- */

const card = {
  background: "rgba(255,255,255,0.94)",
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 24,
  padding: 16,
  boxShadow: "0 14px 34px rgba(28, 25, 23, 0.08)",
  marginBottom: 14,
};
const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: `1px solid ${colors.cardBorder}`,
  background: colors.card,
  color: colors.text,
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const noop = () => {};
const LOCKED = () =>
  React.createElement("section", { "data-locked-card": "true" }, "LOCKED CARD FROM APP");

const USER = (content) => ({ role: "user", content });
const TOHI = (content) => ({ role: "assistant", content });
const CLARIFY = {
  role: "assistant",
  content: "How's everyone's energy right now — still going, or starting to fade?",
  isLiveStateQuestion: true,
};
const MULTI_PARA = "First paragraph about the heat.\n\nSecond paragraph about the resort break.";

function props(over = {}) {
  return {
    chat: [],
    message: "",
    chatLoading: false,
    hasPersonalizedAccess: true,
    setMessage: noop,
    onChatSubmit: noop,
    renderLockedFeatureCard: LOCKED,
    card,
    button,
    ...over,
  };
}

let TohiTab = null;
let importError = "";
try {
  ({ TohiTab } = require(tohiPath));
} catch (err) {
  importError = err.message;
}

function render(over) {
  if (!TohiTab) return `RENDER_ERROR: ${importError}`;
  try {
    return renderToStaticMarkup(React.createElement(TohiTab, props(over)));
  } catch (err) {
    return `RENDER_ERROR: ${err.message}`;
  }
}

const R = {
  empty: render({}),
  picked: render({ message: "Should we take a break or keep going?" }),
  typed: render({ message: "Is the monorail still the fastest way back?" }),
  blank: render({ chat: [USER("hi"), TOHI("hello")], message: "   " }),
  convo: render({ chat: [USER("It's 2pm and everyone is hot."), TOHI(MULTI_PARA)] }),
  loading: render({ chat: [USER("What should we do next?")], chatLoading: true }),
  clarify: render({ chat: [USER("What should we do next?"), CLARIFY] }),
  locked: render({ hasPersonalizedAccess: false }),
};

const ALL = Object.values(R).join("\n");

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

console.log("TOHI approved day presentation (64B-2A) — FEATURE-DISCRIMINATING");

// A precondition, not a feature claim: it is true at the baseline too, so it is
// counted outside the discriminating set.
check(
  "every scenario renders without error",
  !ALL.includes("RENDER_ERROR") && R.empty.length > 500,
  true
);

/* ------------------------------------------------------ the branded header -- */

featureCheck(
  "the official logo is used at the approved path, width and ratio",
  R.empty.includes('src="/tohi-logo.png"') &&
    /width:80px/.test(R.empty) &&
    /height:auto/.test(R.empty),
  true
);

featureCheck(
  "the logo carries an empty alt",
  /<img[^>]*src="\/tohi-logo\.png"[^>]*alt=""/.test(R.empty) ||
    /<img[^>]*alt=""[^>]*src="\/tohi-logo\.png"/.test(R.empty),
  true
);

featureCheck(
  "the logo sits on the approved brand plate",
  R.empty.includes(`background:${colors.purpleSoft}`) &&
    R.empty.includes("border:1px solid rgba(124, 58, 237, 0.16)") &&
    /border-radius:999px/.test(R.empty),
  true
);

featureCheck(
  "the Ask TOHI heading sits directly beneath the plate",
  (() => {
    const logo = R.empty.indexOf("/tohi-logo.png");
    const head = R.empty.indexOf("Ask TOHI</h2>");
    return logo >= 0 && head > logo;
  })(),
  true
);

featureCheck(
  "no generic chat icon, text badge or emoji survives",
  !/MessageCircle/.test(ALL) &&
    !/TOHI COMPANION/.test(ALL) &&
    !/✨/.test(ALL) &&
    !/✨/.test(tohiCode),
  true
);

/* ---------------------------------------------------------- legacy removal -- */

featureCheck(
  "no decorative corner circle survives",
  !/width:112px/.test(ALL) && !/width:96px/.test(ALL),
  true
);

featureCheck(
  "no radial glow or loud gradient survives",
  !/radial-gradient/.test(ALL) &&
    !/linear-gradient\(155deg/.test(ALL) &&
    !/linear-gradient\(145deg, #7C3AED/.test(ALL),
  true
);

featureCheck(
  "the user message is a quiet lavender surface, not a purple gradient",
  R.convo.includes("background:#F6F1FF") && !/background:linear-gradient/.test(R.convo),
  true
);

/* ------------------------------------------------------------- messages -- */

featureCheck(
  "separate uppercase YOU and TOHI labels render, with no inline prefixes",
  R.convo.includes(">YOU</span>") &&
    R.convo.includes(">TOHI</span>") &&
    !/<strong>/.test(ALL) &&
    !/You: /.test(ALL) &&
    !/TOHI: /.test(ALL),
  true
);

featureCheck(
  "user and TOHI messages use the approved max widths",
  R.convo.includes("max-width:85%") && R.convo.includes("max-width:92%"),
  true
);

featureCheck(
  "user messages are right aligned and TOHI messages left aligned",
  R.convo.includes("align-items:flex-end") && R.convo.includes("align-items:flex-start"),
  true
);

featureCheck(
  "paragraph breaks are preserved without parsing or injecting HTML",
  R.convo.includes("white-space:pre-wrap") &&
    R.convo.includes("First paragraph about the heat.\n\nSecond paragraph") &&
    !/dangerouslySetInnerHTML/.test(tohiCode),
  true
);

/* --------------------------------------------------------- QUICK CHECK -- */

featureCheck(
  "QUICK CHECK renders on a clarification turn",
  R.clarify.includes("QUICK CHECK"),
  true
);

featureCheck(
  "QUICK CHECK is driven only by isLiveStateQuestion, never by copy",
  /msg\.isLiveStateQuestion === true/.test(tohiCode) &&
    // an ordinary assistant reply must not get it
    !R.convo.includes("QUICK CHECK") &&
    // and nothing matches on message text to infer a state
    !/content\s*\.\s*(includes|match|indexOf)/.test(tohiCode),
  true
);

featureCheck(
  "a clarification is still an ordinary TOHI message",
  R.clarify.includes(">TOHI</span>") && R.clarify.includes("max-width:92%"),
  true
);

/* ------------------------------------------------------ empty and prompts -- */

// Preserved, not new — the prompts and their order predate the redesign.
invariantCheck(
  "the three approved prompts render exactly and in order",
  (() => {
    const want = [
      "What should we do next without wearing everyone out?",
      "Should we take a break or keep going?",
      "What if storms hit this afternoon?",
    ];
    const idx = want.map((p) => R.empty.indexOf(p));
    return idx.every((i) => i >= 0) && idx[0] < idx[1] && idx[1] < idx[2];
  })(),
  true
);

// Preserved, not new — the explanation copy is unchanged.
invariantCheck(
  "the trip-context explanation still renders on the empty state",
  R.empty.includes("TOHI uses your park, weather, family setup, current activity,"),
  true
);

featureCheck(
  "a selected prompt gets the approved selected treatment, by exact match only",
  R.picked.includes("background:#F6F1FF") &&
    /const picked = message === prompt;/.test(tohiCode) &&
    // an unselected list has no selected surface
    !R.empty.includes("background:#F6F1FF"),
  true
);

// Preserved, not new — the chat.length === 0 gate is pre-existing.
invariantCheck(
  "prompts and explanation disappear once the conversation starts",
  !R.convo.includes("What if storms hit this afternoon?") &&
    !R.convo.includes("TOHI uses your park, weather"),
  true
);

/* ------------------------------------------------------------- sending -- */

featureCheck(
  "the loading surface renders with the approved copy",
  R.loading.includes("TOHI is checking your park-day context…"),
  true
);

featureCheck(
  "the submitted message is retained while loading and no reply is invented",
  // The user's message stays, and there is exactly ONE 92%-wide left surface —
  // the loading one. A fabricated assistant bubble would add a second.
  R.loading.includes("What should we do next?") &&
    R.loading.includes("max-width:85%") &&
    (R.loading.match(/max-width:92%/g) || []).length === 1 &&
    (R.loading.match(/>TOHI<\/span>/g) || []).length === 1,
  true
);

featureCheck(
  "the loading indicator honours reduced motion",
  R.loading.includes("prefers-reduced-motion") && R.loading.includes("data-tohi-loading"),
  true
);

/* ------------------------------------------------------------ composer -- */

featureCheck(
  "the composer carries a real visible label bound to the field",
  /<label[^>]*for="tohi-question"[^>]*>Your question<\/label>/.test(R.empty) &&
    R.empty.includes('id="tohi-question"'),
  true
);

featureCheck(
  "Send is disabled when the message is blank or whitespace only",
  /disabled=""/.test(R.empty) && /disabled=""/.test(R.blank),
  true
);

// Preserved, not new — Send has always been usable with real input.
invariantCheck(
  "Send is enabled once there is something to send",
  !/disabled=""/.test(R.typed),
  true
);

// Preserved, not new — disabling during a request predates the redesign.
invariantCheck(
  "Send is disabled while a request is in flight",
  /disabled=""/.test(R.loading),
  true
);

featureCheck(
  "the composer keeps a 48px touch target",
  (R.empty.match(/min-height:48px/g) || []).length >= 2,
  true
);

featureCheck(
  "a visible focus treatment replaces the removed outline:none",
  R.empty.includes("focus-visible") &&
    R.empty.includes("outline: 2px solid") &&
    !/outline:none/.test(ALL),
  true
);

// A must-not-appear guard, true in both trees.
invariantCheck(
  "no persistent decorative scrollbar was introduced",
  !/scrollbar|overflow-y:scroll|::-webkit-scrollbar/.test(ALL) && !/data-tohi-rail/.test(ALL),
  true
);

console.log("Behaviour, trust and scope preserved — INVARIANT REGRESSION GUARDS");

/* ------------------------------------------------------------- invariants -- */

invariantCheck(
  "TohiTab is presentation only — no state, effects, networking or storage",
  !/useState|useEffect|useMemo|useRef|useCallback/.test(tohiSource) &&
    !/fetch\(|axios|sendChatMessage|trackAppEvent|trackEvent/.test(tohiCode) &&
    !/localStorage|sessionStorage|matchMedia|new Date|Date\.now|getHours/.test(tohiCode),
  true
);

invariantCheck(
  "TohiTab mutates no app state and derives no access",
  !/setChat\(|setChatLoading\(|setActivePark|setParkData|setTripPlanState|setRecommendations/.test(
    tohiCode
  ) && !/canUseRecommendations|buildAccessState|profileCompletion/.test(tohiCode),
  true
);

invariantCheck(
  "the locked state is still delegated to App's renderer, unchanged",
  /renderLockedFeatureCard\(\{/.test(tohiCode) &&
    R.locked.includes("LOCKED CARD FROM APP") &&
    // the approved locked-card redesign belongs to a later phase
    !/PERSONALIZED FEATURE/.test(tohiCode) &&
    !/Dev Preview/.test(tohiCode) &&
    !/setActiveScreen|setDevPreviewFullApp|lockedCardStyle/.test(tohiCode),
  true
);

invariantCheck(
  "the locked branch renders nothing else — no chat surface leaks through",
  !R.locked.includes("Ask TOHI") &&
    !R.locked.includes("/tohi-logo.png") &&
    !R.locked.includes("Your question"),
  true
);

invariantCheck(
  "the exact locked-card arguments are unchanged",
  /title: "TOHI guidance needs your trip setup",/.test(tohiCode) &&
    /"TOHI needs your trip setup so it can answer with your family, resort, height, and park context\."/.test(
      tohiCode
    ) &&
    /actionLabel: "Finish trip setup",/.test(tohiCode),
  true
);

invariantCheck(
  "the submit callback and setter still come from App",
  /onSubmit=\{onChatSubmit\}/.test(tohiCode) &&
    /onClick=\{\(\) => setMessage\(prompt\)\}/.test(tohiCode) &&
    /onChange=\{\(e\) => setMessage\(e\.target\.value\)\}/.test(tohiCode) &&
    !/handleChatSubmit/.test(tohiCode),
  true
);

invariantCheck(
  "message ordering, index keys and transcript retention are unchanged",
  /\{chat\.map\(\(msg, idx\) => \{/.test(tohiCode) &&
    /key=\{idx\}/.test(tohiCode) &&
    R.convo.indexOf("It's 2pm and everyone is hot.") <
      R.convo.indexOf("First paragraph about the heat."),
  true
);

invariantCheck(
  "TOHI remains day-only and excluded from shellNight",
  !/\bnight\b|shellNight|planNight|shellTokens|getTohiAppShellTheme/.test(tohiCode) &&
    (() => {
      const m = appCode.match(
        /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
      );
      if (!m) return false;
      const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
      return tabs.join(",") === "home,plan,waits";
    })(),
  true
);

invariantCheck(
  "no later-phase behaviour arrived early",
  // Each is approved for a later phase and must be absent from this one.
  !/scrollIntoView|autoFocus/.test(tohiCode) &&          // autoscroll
    !/aria-live|role="log"/.test(tohiCode) &&            // live region
    !/Start Over|Retry|Try again/i.test(tohiCode) &&     // retry / start over
    !/visualViewport/.test(tohiCode) &&                  // keyboard nav suppression
    !/couldn.t connect|CONNECTION/i.test(tohiCode) &&    // failure surface
    !/timestamp|reaction|onEdit/i.test(tohiCode),
  true
);

invariantCheck(
  "no failure state is inferred from reply copy",
  // This phase has no honest failure metadata, so nothing may pattern-match a
  // message to decide a state. isLiveStateQuestion is real data App sets.
  !/Offline Help|having trouble reaching/i.test(tohiCode) &&
    !/content\s*\.\s*(includes|startsWith|match|indexOf)/.test(tohiCode),
  true
);

invariantCheck(
  "no TOHI Pick, Plan, recommendation or While You Wait content is present",
  !/TohiPick|tohiPick|RecommendationCard|PlanRecommendations|PlanTab|WhileYouWait|mustDo|bestMove/i.test(
    tohiCode
  ) && tohiCode.includes("and recommendations to answer with real trip context."),
  true
);

invariantCheck(
  "no studio-sheet chrome leaked in from the blueprints",
  !/statusbar|BottomTabs|9:41|SHEET|STATE \d/.test(tohiCode) &&
    !/data-tohi-nav|<nav/.test(tohiCode),
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
console.log(`  64B-2A feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64B-2A invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
