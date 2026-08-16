#!/usr/bin/env node

// 64B-2E-1 TOHI night presentation.
//
// Every night claim below is made against REAL RENDERED MARKUP: TohiTab is
// rendered twice, once with night={true} and once with night={false}, and the
// two outputs are compared surface by surface. Nothing is asserted by reading a
// ternary, because a ternary can read correctly and still render the wrong
// branch.
//
// The night values are the ones measured off the committed night blueprints. The
// mapping is recorded in TohiTab's TOHI_NIGHT table beside each day token.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-night
// baseline, where TohiTab has no night prop at all and both renders are day.
// INVARIANT REGRESSION GUARDS protect what this phase must not touch.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");

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

const tohiPath = path.join(frontendRoot, "src", "components", "TohiTab.jsx");
const { TohiTab } = require(tohiPath);
const tohiSource = fs.readFileSync(tohiPath, "utf8");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const tohiCode = strip(tohiSource);

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

/* ---------------------------------------------------------------- renders -- */

const card = {
  background: "rgba(255,255,255,0.94)",
  border: "1px solid #EADCC8",
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
  border: "1px solid #EADCC8",
  background: "#FFFFFF",
  color: "#241C15",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

// Records what the locked renderer was handed, so "the locked state receives
// night" is proved by observation rather than by reading the call site.
const lockedCalls = [];
function renderLockedFeatureCard(args) {
  lockedCalls.push(args);
  return React.createElement("section", { "data-locked": "true" }, args.title);
}

const USER_Q = "It's 2pm and everyone is getting hot and cranky. What should we do?";
const REPLY = "Good time to head indoors for a bit.\n\nEarlier is safer than pushing to 4pm.";
const FAILURE_COPY =
  "TOHI couldn't connect right now. Your plan and recommendations haven't changed. " +
  "You can try sending your question again.";

function render(night, over = {}) {
  try {
    return renderToStaticMarkup(
      React.createElement(TohiTab, {
        chat: [],
        message: "",
        chatLoading: false,
        hasPersonalizedAccess: true,
        setMessage: () => {},
        onChatSubmit: () => {},
        renderLockedFeatureCard,
        onComposerKeyboardChange: () => {},
        night,
        card,
        button,
        ...over,
      })
    );
  } catch (err) {
    return `RENDER_ERROR: ${err.message}`;
  }
}

const CONVO = {
  chat: [
    { role: "user", content: USER_Q },
    { role: "assistant", content: REPLY },
  ],
};
const LOADING = { chat: [{ role: "user", content: USER_Q }], chatLoading: true };
const FAILED = {
  chat: [
    { role: "user", content: USER_Q },
    { role: "assistant", content: FAILURE_COPY, isConnectionFailure: true },
  ],
};
const QUICK = {
  chat: [
    { role: "user", content: "What next?" },
    { role: "assistant", content: "How's everyone's energy?", isLiveStateQuestion: true },
  ],
};
const DISABLED = { chat: [{ role: "user", content: USER_Q }], message: "   " };
const TYPED = { chat: [], message: "Should we take a break or keep going?" };

const N = {
  empty: render(true),
  convo: render(true, CONVO),
  loading: render(true, LOADING),
  failed: render(true, FAILED),
  quick: render(true, QUICK),
  disabled: render(true, DISABLED),
  typed: render(true, TYPED),
};
const D = {
  empty: render(false),
  convo: render(false, CONVO),
  loading: render(false, LOADING),
  failed: render(false, FAILED),
  quick: render(false, QUICK),
  disabled: render(false, DISABLED),
  typed: render(false, TYPED),
};

const nightAll = Object.values(N).join("\n");
const dayAll = Object.values(D).join("\n");

console.log("TOHI night presentation (64B-2E-1) — FEATURE-DISCRIMINATING");

check(
  "every scenario renders in both modes without error",
  !nightAll.includes("RENDER_ERROR") && !dayAll.includes("RENDER_ERROR"),
  true
);

/* --------------------------------------------- every surface, by measured value -- */

// [label, night value, which night render must contain it, which day render must NOT]
const SURFACES = [
  ["primary card / assistant bubble", "#131C36", "convo"],
  ["empty-state card", "#0A1022", "empty"],
  ["general border", "#282E66", "empty"],
  ["title ink", "#F5F3FF", "empty"],
  ["muted copy", "#B6C2E2", "empty"],
  ["purple accent (Send)", "#8B5CF6", "typed"],
  ["speaker-label ink", "#C4B5FD", "convo"],
  ["user bubble fill", "#1F214A", "convo"],
  ["user bubble border", "#48378B", "convo"],
  ["logo plate", "#E9E3FB", "empty"],
  ["logo plate border", "#BDAAEC", "empty"],
  ["QUICK CHECK fill", "#182C49", "quick"],
  ["QUICK CHECK ink", "#7ACEF6", "quick"],
  ["QUICK CHECK border", "#1A3F60", "quick"],
  ["loading fill", "#2F1B1A", "loading"],
  ["loading ink", "#FCD34D", "loading"],
  ["loading border", "#75521D", "loading"],
  ["failure fill", "#2A0B1F", "failed"],
  ["failure ink", "#FDA4AF", "failed"],
  ["failure border", "#6D2B40", "failed"],
  ["disabled Send fill", "#131B32", "disabled"],
  ["disabled Send ink", "#6A7598", "disabled"],
  ["input field fill", "#090F21", "empty"],
  ["input field border", "#4B536A", "empty"],
];

for (const [label, value, scenario] of SURFACES) {
  featureCheck(
    `night surface: ${label} renders ${value}`,
    N[scenario].includes(value) && !D[scenario].includes(value),
    true
  );
}

/* --------------------------------------- day values must not survive into night -- */

// Each of these is a day colour that night replaces. Present in the day render,
// absent from the night render. Paired so neither half can pass vacuously.
const DAY_MUST_VANISH = [
  ["card white", "#FFFFFF", "convo"],
  ["empty-state cream", "#FFF9F1", "empty"],
  ["user bubble lavender", "#F6F1FF", "convo"],
  ["QUICK CHECK sky", "#E0F2FE", "quick"],
  ["QUICK CHECK sky ink", "#0369A1", "quick"],
  ["loading amber", "#FEF3C7", "loading"],
  ["loading amber ink", "#92400E", "loading"],
  ["failure rose", "#FFF1F3", "failed"],
  ["failure rose ink", "#9F1239", "failed"],
  ["disabled putty", "#F1EDE7", "disabled"],
  ["disabled putty ink", "#A9A297", "disabled"],
  ["day purple", "#7C3AED", "typed"],
];

for (const [label, value, scenario] of DAY_MUST_VANISH) {
  featureCheck(
    `day value retired in night: ${label} (${value})`,
    D[scenario].includes(value) && !N[scenario].includes(value),
    true
  );
}

featureCheck(
  "no warm day surface leaks anywhere into a night render",
  // The whole warm day surface family, checked across every night scenario at
  // once. #FFFFFF is handled separately below: it is not a surface in night, but
  // it IS still the correct ink for the Send label on the violet button.
  ["#FFF4E6", "#FFF7ED", "#FFF9F1", "#F6F1FF", "#F3E8FF", "#EADCC8"].every(
    (v) => !nightAll.includes(v)
  ),
  true
);

featureCheck(
  "white survives in night only as the Send label ink, never as a surface",
  // The night sheet keeps the Send label white on the violet button, so a blanket
  // "no white anywhere" rule would be wrong. This asserts the precise shape:
  // white is gone from every scenario except the one with an enabled Send.
  !N.empty.includes("#FFFFFF") &&
    !N.convo.includes("#FFFFFF") &&
    !N.loading.includes("#FFFFFF") &&
    !N.failed.includes("#FFFFFF") &&
    !N.quick.includes("#FFFFFF") &&
    !N.disabled.includes("#FFFFFF") &&
    N.typed.includes("#FFFFFF") &&
    N.typed.includes("#8B5CF6"),
  true
);

featureCheck(
  "night and day outputs differ in every scenario",
  Object.keys(N).every((k) => N[k] !== D[k]),
  true
);

/* ------------------------------------------------------------- locked state -- */

featureCheck(
  "the locked state receives the explicit night value",
  (() => {
    lockedCalls.length = 0;
    render(true, { hasPersonalizedAccess: false });
    const nightCall = lockedCalls[lockedCalls.length - 1];
    render(false, { hasPersonalizedAccess: false });
    const dayCall = lockedCalls[lockedCalls.length - 1];
    return (
      nightCall &&
      dayCall &&
      nightCall.night === true &&
      dayCall.night === false &&
      // and the approved TOHI variant is still what is requested
      nightCall.variant === "tohi" &&
      dayCall.variant === "tohi"
    );
  })(),
  true
);

featureCheck(
  "the locked state keeps the branded header in night",
  (() => {
    const locked = render(true, { hasPersonalizedAccess: false });
    return (
      locked.includes('src="/tohi-logo.png"') &&
      locked.includes("#E9E3FB") &&
      locked.includes("Ask TOHI") &&
      locked.includes('data-locked="true"')
    );
  })(),
  true
);

/* ----------------------------------------------- night comes only from the prop -- */

featureCheck(
  "night derives ONLY from the explicit prop",
  /night = false,/.test(tohiCode) &&
    /const t = night \? TOHI_NIGHT : DAY;/.test(tohiCode) &&
    // no other source of truth is consulted anywhere in the file
    !/shellNight|planNight|shellTokens|getTohiAppShellTheme|isTohiNightMode|TOHI_NIGHT_SHELL/.test(
      tohiCode
    ),
  true
);

featureCheck(
  "the safe default is day — an opted-out caller cannot get night",
  (() => {
    const noProp = renderToStaticMarkup(
      React.createElement(TohiTab, {
        chat: [],
        message: "",
        chatLoading: false,
        hasPersonalizedAccess: true,
        setMessage: () => {},
        onChatSubmit: () => {},
        renderLockedFeatureCard,
        onComposerKeyboardChange: () => {},
        card,
        button,
      })
    );
    return noProp === D.empty;
  })(),
  true
);

invariantCheck(
  "no clock, storage, media query or colour-scheme derivation exists in TohiTab",
  // matchMedia is permitted for exactly one purpose: prefers-reduced-motion.
  !/localStorage|sessionStorage|prefers-color-scheme|new Date|Date\.now|getHours/.test(tohiCode) &&
    (tohiCode.match(/matchMedia\(/g) || []).length ===
      (tohiCode.match(/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/g) || []).length,
  true
);

console.log("Protected behaviour preserved — INVARIANT REGRESSION GUARDS");

/* ------------------------------------ geometry, copy, a11y, keyboard, chat -- */

// Strip every colour and shadow from a render. What remains is geometry, copy,
// markup order and accessibility wiring — none of which night may change.
const decolour = (html) =>
  html
    .replace(/#[0-9a-fA-F]{3,8}\b/g, "#")
    .replace(/rgba?\([^)]*\)/g, "c()")
    .replace(/background:[^;"]*/g, "background:")
    .replace(/border:[^;"]*/g, "border:")
    .replace(/box-shadow:[^;"]*/g, "box-shadow:")
    .replace(/color:[^;"]*/g, "color:")
    .replace(/outline:[^;"]*/g, "outline:");

for (const k of Object.keys(N)) {
  invariantCheck(
    `night changes nothing but colour in the "${k}" scenario`,
    decolour(N[k]) === decolour(D[k]),
    true
  );
}

invariantCheck(
  "the approved copy, prompts, labels and logo treatment are unchanged in night",
  N.empty.includes("Ask TOHI") &&
    N.empty.includes("What should we do next without wearing everyone out?") &&
    N.empty.includes("Should we take a break or keep going?") &&
    N.empty.includes("What if storms hit this afternoon?") &&
    N.empty.includes("Your question") &&
    N.empty.includes('placeholder="Ask TOHI..."') &&
    N.empty.includes('alt=""') &&
    N.convo.includes(">YOU</span>") &&
    N.convo.includes(">TOHI</span>") &&
    N.quick.includes("QUICK CHECK") &&
    N.failed.includes("CONNECTION") &&
    N.loading.includes("TOHI is checking your park-day context…") &&
    // React escapes the apostrophe in static markup, so compare the escaped form
    // rather than the source string.
    N.failed.includes(FAILURE_COPY.replace(/'/g, "&#x27;")),
  true
);

invariantCheck(
  "the accessibility log/status split survives night unchanged",
  /role="log"/.test(N.convo) &&
    /aria-live="polite"/.test(N.convo) &&
    /aria-relevant="additions"/.test(N.convo) &&
    /aria-label="TOHI conversation"/.test(N.convo) &&
    /aria-busy="true"/.test(N.loading) &&
    /aria-busy="false"/.test(N.convo) &&
    (N.loading.match(/role="status"/g) || []).length === 1 &&
    /aria-atomic="true"/.test(N.loading) &&
    /<label[^>]*for="tohi-question"[^>]*>Your question<\/label>/.test(N.empty),
  true
);

invariantCheck(
  "keyboard detection, autoscroll and the Safari clearance are untouched",
  /export function isComposerKeyboardOpen\(\{/.test(tohiCode) &&
    /wasOpen: keyboardOpenRef\.current/.test(tohiCode) &&
    /const KEYBOARD_MIN_VIEWPORT_SHRINK_PX = 150;/.test(tohiCode) &&
    /scrollMarginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
    /scrollElementIntoView\(transcriptEndRef\.current, "end"\)/.test(tohiCode) &&
    /behavior: prefersReducedMotion\(\) \? "auto" : "smooth"/.test(tohiCode),
  true
);

invariantCheck(
  "chat behaviour still lives entirely in App",
  !/handleChatSubmit|isOpenEndedLiveStrategyQuestion|sendChatMessage|resolveAssistantReplyText/.test(
    tohiCode
  ) &&
    !/fetch\(|axios|trackAppEvent/.test(tohiCode) &&
    !/useState|useReducer|useMemo|useCallback/.test(tohiCode),
  true
);

invariantCheck(
  "no new control, persistence or unapproved affordance arrived with night",
  !/autoFocus/.test(tohiCode) &&
    !/localStorage|sessionStorage/.test(tohiCode) &&
    !/Start Over|Retry|Try again/i.test(tohiCode) &&
    !/timestamp|reaction|onEdit|contentEditable/i.test(tohiCode) &&
    (tohiCode.match(/<button/g) || []).length === 2,
  true
);

invariantCheck(
  "Send stays disabled on blank input in night, exactly as in day",
  /disabled=""/.test(N.disabled) === /disabled=""/.test(D.disabled) &&
    /disabled=""/.test(N.disabled),
  true
);

console.log("");
console.log(`  64B-2E-1 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64B-2E-1 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
