#!/usr/bin/env node

// TOHI mobile behaviour and accessibility (64B-2C, extended by 64B-2D).
//
// Proves the four connected behaviours 64B-2C delivers:
//   A. new activity is scrolled into view via a stable target
//   B. the composer stays visible when the software keyboard opens
//   C. BottomTabs is suppressed ONLY for the TOHI composer's keyboard
//   D. the transcript is an accessible log tied to real loading state
//
// Plus the two real-device corrections from 64B-2D, marked 2D-* below:
//   1. the composer keeps scroll clearance for iPhone Safari's floating
//      address/toolbar bar, which is not part of the visual viewport
//   2. the keyboard state is state-aware, so losing focus mid-dismissal does not
//      remount BottomTabs inside a still-keyboard-sized viewport
//
// HOW EACH CLAIM IS ESTABLISHED — stated plainly so no assertion below reads as
// stronger than it is:
//
//   * The keyboard rule is EXECUTED. TohiTab exports isComposerKeyboardOpen, the
//     same pure function its effect calls in production, and this harness calls
//     it directly with real numbers. Nothing is re-implemented here and no
//     browser is simulated.
//   * The effect that drives that rule, and its listener cleanup, are verified
//     STRUCTURALLY from the source. There is no DOM here, so this harness does
//     not claim to have observed a listener being detached at runtime — it
//     claims every listener the effect adds is removed by the cleanup it
//     returns, and it checks exactly that.
//   * The accessibility surfaces are verified from REAL RENDERED MARKUP via
//     react-dom/server, by slicing out the log element and the status element
//     and checking which one actually contains the loading copy.
//
// This runs on the established Babel + server-render approach. No jsdom, no
// client mounting, no new dependency.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-phase
// baseline. INVARIANT REGRESSION GUARDS protect what this phase must not touch.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");

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
const tohiSource = fs.existsSync(tohiPath) ? fs.readFileSync(tohiPath, "utf8") : "";
const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
const bottomTabsPath = path.join(frontendRoot, "src", "components", "BottomTabs.jsx");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const tohiCode = strip(tohiSource);
const appCode = strip(appSource);

const LOADING_COPY = "TOHI is checking your park-day context…";

// The keyboard effect, sliced out so wiring claims stay scoped to it.
const KEYBOARD_EFFECT = (tohiCode.match(
  /const viewport =[\s\S]*?\}, \[hasPersonalizedAccess\]\);/
) || [""])[0];

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

/* ------------------------------------------- the production keyboard rule -- */

// The real exported helper. Absent on the pre-phase baseline, where every
// keyboard scenario below then yields null and fails rather than passing
// vacuously.
const KEYBOARD_RULE = (() => {
  try {
    return require(tohiPath).isComposerKeyboardOpen;
  } catch (err) {
    console.log(`       could not load TohiTab: ${err.message}`);
    return undefined;
  }
})();
const RULE_AVAILABLE = typeof KEYBOARD_RULE === "function";

// A focused composer on a 844pt phone with a 336pt keyboard, starting from the
// closed state, unless overridden. null (never true, never false) when the
// helper does not exist.
function keyboardOpen(over) {
  if (!RULE_AVAILABLE) return null;
  return KEYBOARD_RULE({
    wasOpen: false,
    composerFocused: true,
    hasAccess: true,
    innerHeight: 844,
    viewportHeight: 508,
    ...over,
  });
}

console.log("TOHI mobile behaviour and accessibility (64B-2C/2D) — FEATURE-DISCRIMINATING");

check(
  "the exported keyboard rule is loadable (scenarios below really executed it)",
  RULE_AVAILABLE,
  true
);

/* ------------------------------------------------------------ A. autoscroll -- */

featureCheck(
  "1. new activity has a stable scroll target and an update-triggered path",
  // A real end sentinel with a ref, scrolled from an effect keyed on the things
  // that add content. Nothing is located by matching message text.
  /const transcriptEndRef = useRef\(null\);/.test(tohiCode) &&
    /<div ref=\{transcriptEndRef\} aria-hidden="true" \/>/.test(tohiCode) &&
    /\}, \[chat\.length, chatLoading\]\);/.test(tohiCode) &&
    /scrollElementIntoView\(transcriptEndRef\.current, "end"\)/.test(tohiCode) &&
    !/querySelector|getElementsByClassName|textContent/.test(tohiCode),
  true
);

featureCheck(
  "2. reduced motion changes the scroll behaviour",
  /function prefersReducedMotion\(\)/.test(tohiCode) &&
    /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/.test(tohiCode) &&
    /behavior: prefersReducedMotion\(\) \? "auto" : "smooth"/.test(tohiCode),
  true
);

featureCheck(
  "the scroll effect cleans up its animation frame",
  /const frame = requestAnimationFrame\(/.test(tohiCode) &&
    /return \(\) => cancelAnimationFrame\(frame\);/.test(tohiCode),
  true
);

// True before and after: a must-not-appear guard, not a new capability.
invariantCheck(
  "no independently scrolling transcript panel was introduced",
  // Native page scrolling must be preserved: no overflow container, no fixed
  // height, no scroll lock.
  !/overflow-?[yY]?:\s*"?(auto|scroll)/i.test(tohiCode) &&
    !/maxHeight|position:\s*"fixed"|document\.body\.style/.test(tohiCode),
  true
);

/* ------------------------- B/C. the keyboard rule, executed with real numbers -- */

// Probe the boundary the EXECUTED rule actually uses, rather than reading the
// constant out of the source. This is the threshold as the product applies it.
const EXECUTED_THRESHOLD = (() => {
  if (!RULE_AVAILABLE) return null;
  for (let shrink = 0; shrink <= 600; shrink += 1) {
    if (
      KEYBOARD_RULE({
        composerFocused: true,
        hasAccess: true,
        innerHeight: 1000,
        viewportHeight: 1000 - shrink,
      })
    ) {
      return shrink;
    }
  }
  return null;
})();

featureCheck(
  "the executed threshold is 150px — between toolbar and keyboard movement",
  // Above the largest browser-chrome movement (~88px) and below the smallest
  // real keyboard (~200px in landscape). Measured by probing the live rule.
  EXECUTED_THRESHOLD === 150 && EXECUTED_THRESHOLD > 88 && EXECUTED_THRESHOLD < 200,
  true
);

featureCheck(
  "the source constant matches the threshold the rule actually applies",
  Number((tohiCode.match(/const KEYBOARD_MIN_VIEWPORT_SHRINK_PX = (\d+);/) || [])[1]) ===
    EXECUTED_THRESHOLD,
  true
);

// The open case is reused by each negative scenario so they assert that the rule
// DISTINGUISHES, not merely that nothing was reported. Before this phase there
// was no rule at all, so an unpaired negative would pass vacuously.
featureCheck(
  "3. keyboard-open requires BOTH composer focus and a meaningful shrink",
  keyboardOpen() === true &&
    keyboardOpen({ composerFocused: false }) === false &&
    keyboardOpen({ viewportHeight: 844 }) === false,
  true
);

featureCheck(
  "4. focus WITHOUT a meaningful shrink does not report a keyboard",
  // focus + a 60px collapsing URL bar -> closed, while the same rule still
  // reports open for a real keyboard.
  keyboardOpen() === true && keyboardOpen({ viewportHeight: 784 }) === false,
  true
);

featureCheck(
  "5. a shrink WITHOUT composer focus does not report a keyboard",
  keyboardOpen() === true && keyboardOpen({ composerFocused: false }) === false,
  true
);

featureCheck(
  "the threshold discriminates exactly at its boundary",
  // 149px of shrink is still browser chrome; 150px is a keyboard.
  keyboardOpen({ innerHeight: 1000, viewportHeight: 851 }) === false &&
    keyboardOpen({ innerHeight: 1000, viewportHeight: 850 }) === true,
  true
);

featureCheck(
  "a landscape-sized keyboard is still detected",
  keyboardOpen({ innerHeight: 390, viewportHeight: 190 }) === true,
  true
);

featureCheck(
  "a landscape toolbar movement is still ignored",
  keyboardOpen({ innerHeight: 390, viewportHeight: 190 }) === true &&
    keyboardOpen({ innerHeight: 390, viewportHeight: 346 }) === false,
  true
);

featureCheck(
  "missing visualViewport fails safe — navigation is never suppressed",
  // The effect passes null for viewportHeight when the API is absent; the rule
  // must treat that as closed even with focus and a huge apparent shrink.
  keyboardOpen({ viewportHeight: null }) === false &&
    keyboardOpen({ viewportHeight: undefined }) === false &&
    // and the effect really does pass null rather than assuming the API exists
    /window\.visualViewport \? window\.visualViewport : null/.test(tohiCode) &&
    /viewportHeight: viewport \? viewport\.height : null/.test(tohiCode),
  true
);

featureCheck(
  "locked access can never report a keyboard — there is no composer",
  keyboardOpen({ hasAccess: false }) === false &&
    keyboardOpen({ wasOpen: true, hasAccess: false }) === false &&
    /hasAccess: hasPersonalizedAccess/.test(tohiCode),
  true
);

/* ------------- 64B-2D. the rule is state-aware through a real dismissal ------- */

// Real-device QA: Safari drops composer focus BEFORE it restores the visual
// viewport. A focus-only rule therefore reported closed while the viewport was
// still keyboard-sized, and BottomTabs remounted halfway up the screen. Opening
// and staying open are now separate questions, and every case below is executed
// against the production helper.

invariantCheck(
  "2D-1. closed + focus + keyboard-sized shrink -> opens (preserved from 2C)",
  keyboardOpen({ wasOpen: false, composerFocused: true }) === true,
  true
);

invariantCheck(
  "2D-2. closed + NO focus + keyboard-sized shrink -> stays closed (preserved)",
  // The protection that predates this phase: a shrink alone must never hide
  // navigation, or browser chrome would trigger it.
  keyboardOpen({ wasOpen: false, composerFocused: false }) === false,
  true
);

featureCheck(
  "2D-3. already open + focus lost + viewport still shrunk -> STAYS OPEN",
  // The actual fix. Paired with 2D-2 so it cannot pass by the rule simply
  // ignoring focus: same absent focus, opposite answer, decided by wasOpen.
  keyboardOpen({ wasOpen: true, composerFocused: false }) === true &&
    keyboardOpen({ wasOpen: false, composerFocused: false }) === false,
  true
);

featureCheck(
  "2D-4. already open + focus lost + viewport restored -> closes",
  // What actually ends the open state: the viewport coming back, not the focus
  // going away. Checked both at full restoration and just below the threshold.
  keyboardOpen({ wasOpen: true, composerFocused: false, viewportHeight: 844 }) === false &&
    keyboardOpen({ wasOpen: true, composerFocused: false, viewportHeight: 784 }) === false &&
    // paired: same absent focus, still-shrunk viewport -> held open. Without
    // this clause the two above would pass against the old focus-only rule.
    keyboardOpen({ wasOpen: true, composerFocused: false }) === true,
  true
);

featureCheck(
  "2D-5. already open + visualViewport missing -> closes safely",
  keyboardOpen({ wasOpen: true, composerFocused: false, viewportHeight: null }) === false &&
    keyboardOpen({ wasOpen: true, composerFocused: true, viewportHeight: undefined }) === false &&
    // paired, for the same reason as 2D-4
    keyboardOpen({ wasOpen: true, composerFocused: false }) === true,
  true
);

featureCheck(
  "2D-6. the open state survives focus loss only while genuinely shrunk",
  // The threshold still governs the held-open case, at the same 150px boundary.
  keyboardOpen({
    wasOpen: true,
    composerFocused: false,
    innerHeight: 1000,
    viewportHeight: 850,
  }) === true &&
    keyboardOpen({
      wasOpen: true,
      composerFocused: false,
      innerHeight: 1000,
      viewportHeight: 851,
    }) === false,
  true
);

featureCheck(
  "2D-7. the effect feeds its own keyboardOpenRef back into the rule",
  /wasOpen: keyboardOpenRef\.current/.test(KEYBOARD_EFFECT) &&
    // and that ref is still what report() maintains, so the two cannot drift
    /keyboardOpenRef\.current = open;/.test(tohiCode),
  true
);

invariantCheck(
  "2D-8. the close path is event-driven — no timer or delayed guess",
  !/setTimeout|setInterval|requestIdleCallback|Date\.now|performance\.now/.test(tohiCode) &&
    // closing still comes from the viewport listeners the effect already owns
    /viewport\.addEventListener\("resize", evaluate\)/.test(KEYBOARD_EFFECT) &&
    /viewport\.addEventListener\("scroll", evaluate\)/.test(KEYBOARD_EFFECT),
  true
);

/* ------------------- 64B-2D. composer clearance for Safari's floating bar ---- */

featureCheck(
  "2D-9. the keyboard-follow target carries explicit Safari-toolbar clearance",
  // scroll-margin on the composer itself, applied to the element the
  // keyboard-follow scroll actually targets.
  /const COMPOSER_TOOLBAR_CLEARANCE_PX = (\d+);/.test(tohiCode) &&
    /scrollMarginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
    // it is on the composer form (the scroll target), not on the transcript
    /<form[\s\S]{0,600}?scrollMarginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
    // and the clearance is big enough to clear a ~50–56pt floating bar
    Number((tohiCode.match(/const COMPOSER_TOOLBAR_CLEARANCE_PX = (\d+);/) || [])[1]) >= 64,
  true
);

featureCheck(
  "2D-10. the clearance is scroll-only — no permanent visible spacing",
  // It must be scroll-margin, never padding/margin/height, and it must not be
  // applied conditionally on the keyboard state (which would make it a spacer).
  (() => {
    const composer = (tohiCode.match(/<form[\s\S]*?\n      >/) || [""])[0];
    return (
      /scrollMarginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(composer) &&
      !/paddingBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
      !/marginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
      !/height: COMPOSER_TOOLBAR_CLEARANCE_PX/.test(tohiCode) &&
      // the composer keeps its existing marginBottom: 0
      /marginBottom: 0,/.test(composer)
    );
  })(),
  true
);

featureCheck(
  "2D-11. transcript autoscroll was left alone — clearance is composer-only",
  // The sentinel scroll must not have gained the clearance; only the composer
  // follow needs to stop short of Safari's bar.
  /scrollElementIntoView\(transcriptEndRef\.current, "end"\)/.test(tohiCode) &&
    /<div ref=\{transcriptEndRef\} aria-hidden="true" \/>/.test(tohiCode) &&
    (tohiCode.match(/scrollMarginBottom/g) || []).length === 1 &&
    // and the reduced-motion path still governs both scrolls
    /behavior: prefersReducedMotion\(\) \? "auto" : "smooth"/.test(tohiCode),
  true
);

/* ------------------------------ the effect that drives the rule (structural) -- */

featureCheck(
  "the real effect calls the same exported rule, and does nothing else with it",
  KEYBOARD_EFFECT.length > 0 &&
    /const open = isComposerKeyboardOpen\(\{/.test(KEYBOARD_EFFECT) &&
    /composerFocused: composerFocusedRef\.current/.test(KEYBOARD_EFFECT) &&
    /innerHeight: typeof window !== "undefined" \? window\.innerHeight : null/.test(
      KEYBOARD_EFFECT
    ) &&
    /report\(open\);/.test(KEYBOARD_EFFECT) &&
    // the rule is the ONLY place the decision is made — no second comparison
    !new RegExp("KEYBOARD_MIN_VIEWPORT_SHRINK_PX").test(KEYBOARD_EFFECT),
  true
);

featureCheck(
  "6a. focus and blur both re-evaluate through the same rule while mounted",
  // onFocus/onBlur only maintain the focus flag and re-run the evaluation. Since
  // 64B-2D a blur no longer closes the state by itself — 2D-3 and 2D-4 above
  // show the viewport is what decides. This asserts the wiring, not the outcome.
  /onBlur=\{\(\) => \{/.test(tohiCode) &&
    /composerFocusedRef\.current = false;/.test(tohiCode) &&
    /onFocus=\{\(\) => \{/.test(tohiCode) &&
    /composerFocusedRef\.current = true;/.test(tohiCode) &&
    (tohiCode.match(/evaluateKeyboardRef\.current\(\);/g) || []).length === 2,
  true
);

featureCheck(
  "6b. every viewport listener the effect adds is removed by its cleanup",
  // Structural, not observed: the added set and the removed set must match
  // exactly, by event name AND handler identity.
  (() => {
    const added = [
      ...KEYBOARD_EFFECT.matchAll(/viewport\.addEventListener\("(\w+)", (\w+)\)/g),
    ]
      .map((m) => `${m[1]}:${m[2]}`)
      .sort();
    const removed = [
      ...KEYBOARD_EFFECT.matchAll(/viewport\.removeEventListener\("(\w+)", (\w+)\)/g),
    ]
      .map((m) => `${m[1]}:${m[2]}`)
      .sort();
    return (
      added.length === 2 &&
      added.join(",") === "resize:evaluate,scroll:evaluate" &&
      added.join(",") === removed.join(",")
    );
  })(),
  true
);

featureCheck(
  "6c. unmount, tab departure and access loss all report closed",
  // The cleanup returned by the effect both detaches the listeners and reports
  // false, so leaving TOHI (which unmounts it) restores navigation. App's guard
  // is scoped to activeTab as a second, independent protection.
  (() => {
    const at = KEYBOARD_EFFECT.indexOf("return () => {");
    const cleanup = at < 0 ? "" : KEYBOARD_EFFECT.slice(at);
    return (
      /removeEventListener/.test(cleanup) &&
      /report\(false\);/.test(cleanup) &&
      /evaluateKeyboardRef\.current = \(\) => \{\};/.test(cleanup)
    );
  })(),
  true
);

featureCheck(
  "the composer is brought into the reduced viewport when the keyboard opens",
  /scrollElementIntoView\(composerRef\.current, "end"\)/.test(tohiCode) &&
    /const composerRef = useRef\(null\);/.test(tohiCode) &&
    /<form\s*\n?\s*ref=\{composerRef\}/.test(tohiCode),
  true
);

featureCheck(
  "TohiTab only REPORTS the keyboard state; it takes no navigation action",
  /onComposerKeyboardChange/.test(tohiCode) &&
    !/BottomTabs/.test(tohiCode) &&
    !/activeTab/.test(tohiCode),
  true
);

/* ------------------------------------------------- C. App-side suppression -- */

featureCheck(
  '7. App scopes suppression to activeTab "tohi" AND the keyboard flag',
  /\{!\(activeTab === "tohi" && tohiComposerKeyboardOpen\) && \(/.test(appCode) &&
    /const \[tohiComposerKeyboardOpen, setTohiComposerKeyboardOpen\] = useState\(false\);/.test(
      appCode
    ) &&
    /onComposerKeyboardChange=\{setTohiComposerKeyboardOpen\}/.test(appCode),
  true
);

featureCheck(
  "the flag is written by TohiTab alone and read only for suppression",
  // The setter appears exactly twice: its declaration and the single prop
  // wiring. The reader appears exactly twice: its declaration and the single
  // suppression guard. Any third use would mean something else started
  // depending on the keyboard state.
  (appCode.match(/setTohiComposerKeyboardOpen/g) || []).length === 2 &&
    (appCode.match(/\btohiComposerKeyboardOpen\b/g) || []).length === 2,
  true
);

// True before and after: the props are unchanged, only the render is guarded.
invariantCheck(
  "BottomTabs keeps its existing props when it is rendered",
  /<BottomTabs\s*\n?\s*activeTab=\{activeTab\}\s*\n?\s*onTabChange=\{setActiveTab\}\s*\n?\s*night=\{shellNight\}\s*\n?\s*\/>/.test(
    appCode
  ),
  true
);

/* ------------------------------------------------------ D. accessibility -- */

const renderTohi = (over) => {
  const { TohiTab } = require(tohiPath);
  const card = { background: "#fff", marginBottom: 14 };
  const button = { display: "inline-flex", cursor: "pointer" };
  try {
    return renderToStaticMarkup(
      React.createElement(TohiTab, {
        chat: [],
        message: "",
        chatLoading: false,
        hasPersonalizedAccess: true,
        setMessage: () => {},
        onChatSubmit: () => {},
        renderLockedFeatureCard: () => React.createElement("section", null, "LOCKED"),
        onComposerKeyboardChange: () => {},
        card,
        button,
        ...over,
      })
    );
  } catch (err) {
    return `RENDER_ERROR: ${err.message}`;
  }
};

const R = {
  idle: renderTohi({}),
  loading: renderTohi({ chat: [{ role: "user", content: "hi" }], chatLoading: true }),
  locked: renderTohi({ hasPersonalizedAccess: false }),
};

check(
  "the component renders in every scenario",
  !Object.values(R).join("").includes("RENDER_ERROR"),
  true
);

// Slice one element out of the rendered markup by walking its <div> nesting, so
// "inside" and "outside" are decided by real containment rather than by two
// independent substring matches on the whole page.
function elementHtml(markup, marker) {
  const at = markup.indexOf(marker);
  if (at < 0) return "";
  const start = markup.lastIndexOf("<div", at);
  if (start < 0) return "";
  let depth = 0;
  let i = start;
  while (i < markup.length) {
    if (markup.startsWith("<div", i)) {
      depth += 1;
      i += 4;
      continue;
    }
    if (markup.startsWith("</div>", i)) {
      depth -= 1;
      i += 6;
      if (depth === 0) return markup.slice(start, i);
      continue;
    }
    i += 1;
  }
  return "";
}

const LOG_HTML = elementHtml(R.loading, 'role="log"');
const STATUS_HTML = elementHtml(R.loading, 'role="status"');

check(
  "the log and status elements were both located in the rendered markup",
  LOG_HTML.length > 0 && STATUS_HTML.length > 0,
  true
);

featureCheck(
  "9. the conversation is a polite log carrying the real busy state",
  // The entries live in the log, and aria-busy tracks the actual chatLoading
  // value rather than a constant.
  /role="log"/.test(R.idle) &&
    /aria-live="polite"/.test(LOG_HTML) &&
    /aria-relevant="additions"/.test(LOG_HTML) &&
    /aria-label="TOHI conversation"/.test(LOG_HTML) &&
    /aria-busy="false"/.test(R.idle) &&
    /aria-busy="true"/.test(LOG_HTML) &&
    /aria-busy=\{chatLoading\}/.test(tohiCode) &&
    // the conversation entries really are inside it
    LOG_HTML.includes(">YOU</span>") &&
    LOG_HTML.includes(">hi</div>"),
  true
);

featureCheck(
  "10. loading is INSIDE the status region and OUTSIDE the busy log",
  // Containment is proved by slicing each element out of the markup. This is
  // the whole point of the correction: a region marked busy cannot be relied on
  // to announce its own contents, so the loading copy must not be in it.
  STATUS_HTML.includes(LOADING_COPY) &&
    !LOG_HTML.includes(LOADING_COPY) &&
    // and the status region is a sibling, not nested inside the log
    !LOG_HTML.includes('role="status"') &&
    !STATUS_HTML.includes('role="log"'),
  true
);

featureCheck(
  "the loading copy has exactly one dedicated, atomic announcement path",
  // One status region, announced as a single utterance, containing the copy
  // once. aria-atomic is what keeps the speaker label and the copy from being
  // read as two unrelated fragments.
  (R.loading.match(/role="status"/g) || []).length === 1 &&
    /aria-atomic="true"/.test(STATUS_HTML) &&
    (R.loading.match(new RegExp(LOADING_COPY, "g")) || []).length === 1 &&
    // no hidden duplicate of the copy competing with the visible one
    !/sr-only|visually-hidden/.test(tohiCode) &&
    /data-tohi-loading="true"/.test(STATUS_HTML),
  true
);

featureCheck(
  "the status region exists only while loading",
  // Contrast, so this cannot pass by the region simply always being present.
  !/role="status"/.test(R.idle) && /role="status"/.test(R.loading),
  true
);

// NOT an announcement-behaviour claim. Counting attributes cannot prove what a
// screen reader says. This asserts only the structural fact that no second
// explicit live region was introduced to compete with the log, and that the
// status region relies on its own implicit politeness rather than redeclaring
// it — which is a source fact, checkable here.
featureCheck(
  "no competing explicit live region was introduced (structure, not behaviour)",
  (R.loading.match(/aria-live=/g) || []).length === 1 &&
    /aria-live="polite"/.test(LOG_HTML) &&
    !/aria-live/.test(STATUS_HTML) &&
    !/aria-live="assertive"/.test(tohiCode),
  true
);

featureCheck(
  "neither region is applied to the locked state",
  /role="log"/.test(R.idle) &&
    !/role="log"/.test(R.locked) &&
    !/role="status"/.test(R.locked),
  true
);

console.log("Protected behaviour preserved — INVARIANT REGRESSION GUARDS");

invariantCheck(
  "8. BottomTabs.jsx is byte-identical to origin/main",
  (() => {
    try {
      const now = execFileSync("git", ["hash-object", "frontend/src/components/BottomTabs.jsx"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim();
      const base = execFileSync(
        "git",
        ["rev-parse", "origin/main:frontend/src/components/BottomTabs.jsx"],
        { cwd: repoRoot, encoding: "utf8" }
      ).trim();
      if (now !== base) console.log(`       working ${now} vs origin/main ${base}`);
      return now === base;
    } catch (err) {
      console.log(`       could not compare: ${err.message}`);
      return false;
    }
  })(),
  true
);

invariantCheck(
  "BottomTabs keeps its portal, viewport positioning, cleanup and five tabs",
  (() => {
    const src = fs.readFileSync(bottomTabsPath, "utf8");
    return (
      /createPortal\(/.test(src) &&
      /window\.visualViewport/.test(src) &&
      /removeEventListener\("resize", update\)/.test(src) &&
      /cancelAnimationFrame\(frameId\)/.test(src) &&
      /env\(safe-area-inset-bottom, 0px\)/.test(src) &&
      [...src.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]).join(",") ===
        "home,waits,plan,tohi,profile"
    );
  })(),
  true
);

featureCheck(
  "13. TohiTab is the only new viewport observer",
  // The suppression guard is the ONLY conditional around BottomTabs, and it
  // names tohi explicitly. No other tab appears in it.
  (appCode.match(/<BottomTabs/g) || []).length === 1 &&
    !/activeTab === "(home|waits|plan|profile)"[^\n]*tohiComposerKeyboardOpen/.test(appCode) &&
    // and no other component observes the viewport
    (() => {
      const walk = (dir) =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
          return /\.jsx?$/.test(e.name) ? [full] : [];
        });
      const users = walk(path.join(frontendRoot, "src")).filter((f) =>
        /visualViewport/.test(strip(fs.readFileSync(f, "utf8")))
      );
      const names = users.map((f) => path.basename(f)).sort();
      return names.join(",") === "BottomTabs.jsx,TohiTab.jsx";
    })(),
  true
);

invariantCheck(
  "12. handleChatSubmit, the duplicate latch and failure handling are unchanged",
  /async function handleChatSubmit\(e\) \{/.test(appCode) &&
    /if \(chatInFlightRef\.current\) return;/.test(appCode) &&
    /chatInFlightRef\.current = true;/.test(appCode) &&
    /const finalizeChatFailure = \(\) => \{/.test(appCode) &&
    /setMessage\(\(current\) =>/.test(appCode) &&
    /conversationHistory: nextChat\s*\n?\s*\.filter\(\(msg\) => msg\.isConnectionFailure !== true\)/.test(
      appCode
    ) &&
    !/handleChatSubmit/.test(tohiCode),
  true
);

invariantCheck(
  "classifier and AI request behaviour are unchanged",
  /function isOpenEndedLiveStrategyQuestion\(/.test(appCode) &&
    /function shouldAskFrontendLiveStateQuestion\(/.test(appCode) &&
    /sendChatMessage\(trimmed, \{/.test(appCode) &&
    /function resolveAssistantReplyText\(res, userMessage\)/.test(appCode) &&
    // none of it moved into the presentation
    !/isOpenEndedLiveStrategyQuestion|sendChatMessage|resolveAssistantReplyText/.test(tohiCode),
  true
);

invariantCheck(
  "11. no autoFocus, persistence, Retry, Start Over, night or new control appeared",
  !/autoFocus/.test(tohiCode) &&
    !/localStorage|sessionStorage/.test(tohiCode) &&
    !/Start Over|Retry|Try again/i.test(tohiCode) &&
    !/timestamp|reaction|onEdit|contentEditable/i.test(tohiCode) &&
    !/\bnight\b|shellNight|planNight/.test(tohiCode) &&
    // exactly the controls that already existed: 3 prompts + Send
    (tohiCode.match(/<button/g) || []).length === 2,
  true
);

invariantCheck(
  "14. the approved day structure, copy and treatments remain intact",
  tohiCode.includes('src="/tohi-logo.png"') &&
    /alt=""/.test(tohiCode) &&
    tohiCode.includes("Ask TOHI") &&
    tohiCode.includes("What should we do next without wearing everyone out?") &&
    tohiCode.includes("Should we take a break or keep going?") &&
    tohiCode.includes("What if storms hit this afternoon?") &&
    tohiCode.includes("Your question") &&
    /msg\.isConnectionFailure === true/.test(tohiCode) &&
    /msg\.isLiveStateQuestion === true/.test(tohiCode) &&
    R.idle.includes(">YOU</span>") === false && // no messages in the idle state
    R.loading.includes(">YOU</span>"),
  true
);

invariantCheck(
  "the visible composer label keeps its input association",
  /<label[^>]*for="tohi-question"[^>]*>Your question<\/label>/.test(R.idle) &&
    R.idle.includes('id="tohi-question"') &&
    // no duplicate hidden label competing with the visible one
    !/aria-label="Your question"/.test(R.idle),
  true
);

invariantCheck(
  "shellNight membership is unchanged — TOHI is still day-only",
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

console.log("");
console.log(`  64B-2C/2D feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64B-2C/2D invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
