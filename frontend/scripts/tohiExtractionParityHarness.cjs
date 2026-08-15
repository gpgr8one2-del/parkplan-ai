#!/usr/bin/env node

// TOHI extraction parity proof (64B-1).
//
// Renders the TOHI chat presentation three ways and compares them byte for byte:
//
//   baseline         the pinned pre-extraction App.jsx, sliced from git
//   current-direct   the extracted TohiTab component
//   current-callsite the current App.jsx <TohiTab/> call site
//
// baseline == current-direct   proves the extraction changed no output.
// current-callsite == current-direct proves App wired the props up correctly —
// a component can be perfect and still be handed the wrong props, and only the
// call-site render catches that.
//
// Nothing is normalized. 64B-1 is an extraction, so there is no approved visual
// change to normalize away and any diff at all is a regression. If exact parity
// cannot be reached the correct outcome is a failing harness, not a softened
// comparison.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "tohiExtractionParityRender.cjs");

const PINNED_BASE = "8bf834220e84b546cecc1b1e1d9130d9dc51015c";
const BASE_REF = process.env.TOHI_PARITY_BASE || PINNED_BASE;

// Every audited state from the 64A-1 matrix, plus the extras the phase requires.
const REQUIRED_SCENARIOS = [
  "01-access-locked",
  "02-personalized-empty-chat",
  "03-suggested-prompt-selected",
  "04-typed-question",
  "05-submission-in-progress",
  "06-successful-response",
  "07-multiple-messages",
  "08-request-failure-bubble",
  "09-blank-input",
  "10-rapid-repeated-submit",
  "11-missing-malformed-response",
  "12-clarification-intercept",
  "13-conversation-retained-after-tab-switch",
  "14-long-user-message",
  "15-long-tohi-response",
  "16-dev-preview-locked-card",
  "17-locked-while-loading",
  "18-empty-chat-with-typed-message",
];

let passCount = 0;
let failCount = 0;

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

function render(source) {
  return execFileSync(process.execPath, [RENDERER], {
    cwd: frontendRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PARITY_SOURCE: source, TOHI_PARITY_BASE: BASE_REF },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function split(html) {
  const map = {};
  for (const chunk of html.split(/^===== /m).slice(1)) {
    const name = chunk.slice(0, chunk.indexOf(" ====="));
    map[name] = chunk.slice(chunk.indexOf("\n") + 1);
  }
  return map;
}

function firstDiff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if (x[i] !== y[i]) {
      return `line ${i + 1}\n       base:    ${String(x[i]).slice(0, 240)}\n       current: ${String(y[i]).slice(0, 240)}`;
    }
  }
  return "identical";
}

console.log("TOHI extraction parity (64B-1)");

/* ------------------------------------------------ the baseline is real -- */

check(
  `the pinned baseline commit exists (${PINNED_BASE.slice(0, 7)})`,
  (() => {
    try {
      execFileSync("git", ["cat-file", "-e", `${BASE_REF}^{commit}`], { cwd: repoRoot });
      return true;
    } catch {
      return false;
    }
  })(),
  true
);

// The baseline must genuinely predate the extraction, or "parity with the
// baseline" would be comparing the extraction against itself.
check(
  "the pinned baseline really is pre-extraction: it has no TohiTab component",
  (() => {
    try {
      execFileSync("git", ["cat-file", "-e", `${BASE_REF}:frontend/src/components/TohiTab.jsx`], {
        cwd: repoRoot,
        stdio: "ignore",
      });
      return false;
    } catch {
      return true;
    }
  })(),
  true
);

check(
  "the pinned baseline renders the TOHI branch inline in App.jsx",
  (() => {
    const src = execFileSync("git", ["show", `${BASE_REF}:frontend/src/App.jsx`], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return /\{activeTab === "tohi" &&/.test(src) && !/<TohiTab/.test(src);
  })(),
  true
);

/* -------------------------------------------------------------- renders -- */

let baseline = "";
let direct = "";
let callsite = "";
let renderError = "";
try {
  baseline = render("baseline");
  direct = render("current-direct");
  callsite = render("current-callsite");
} catch (err) {
  renderError = err.stderr ? String(err.stderr).slice(0, 600) : err.message;
}

check("all three renders completed", renderError === "", true);
if (renderError) console.log(`       ${renderError}`);

for (const [label, html] of [
  ["baseline", baseline],
  ["current-direct", direct],
  ["current-callsite", callsite],
]) {
  check(
    `${label} produced every required scenario without error`,
    REQUIRED_SCENARIOS.every((s) => Object.keys(split(html)).includes(s)) &&
      !html.includes("RENDER_ERROR"),
    true
  );
}

check("the render is not trivially empty", baseline.length > 20000, true);

/* --------------------------------------------------------- the two proofs -- */

check(
  `extraction is byte-identical to the pinned baseline (${BASE_REF.slice(0, 7)})`,
  baseline === direct,
  true
);
if (baseline !== direct) console.log(`       first difference at ${firstDiff(baseline, direct)}`);

check(
  "the App call site renders identically to the component itself",
  callsite === direct,
  true
);
if (callsite !== direct) console.log(`       first difference at ${firstDiff(direct, callsite)}`);

// Per scenario, so a failure names the state that broke.
const B = split(baseline);
const D = split(direct);
const C = split(callsite);
for (const s of REQUIRED_SCENARIOS) {
  check(`byte-identical — ${s}`, B[s] === D[s] && C[s] === D[s], true);
}

/* ------------------------------------------- the proof covers real markup -- */

// A comparison of two empty strings is also "identical". These assert the
// rendered output actually contains the presentation under test, so the parity
// result above cannot be vacuous.
const MARKERS = [
  ["the emoji eyebrow", "✨ TOHI COMPANION"],
  ["the Ask TOHI heading", "Ask TOHI</h2>"],
  ["the inline You: prefix", "<strong>You: </strong>"],
  ["the inline TOHI: prefix", "<strong>TOHI: </strong>"],
  ["the first suggested prompt", "What should we do next without wearing everyone out?"],
  ["the second suggested prompt", "Should we take a break or keep going?"],
  ["the third suggested prompt", "What if storms hit this afternoon?"],
  ["the empty-chat explanation", "TOHI uses your park, weather, family setup, current activity"],
  ["the radial gradient", "radial-gradient(circle at 92% 4%"],
  ["the 112px decorative circle", "width:112px"],
  ["the 96px decorative circle", "width:96px"],
  ["the composer placeholder", 'placeholder="Ask TOHI..."'],
  ["the locked-card heading", "TOHI guidance needs your trip setup"],
  ["the Dev Preview branch", "Dev Preview"],
];

for (const [label, marker] of MARKERS) {
  check(`the compared output contains ${label}`, direct.includes(marker), true);
}

// The loading label is the literal "..." on the submit button, and Send is
// disabled only while loading. Both are pinned exactly as they ship.
check(
  "the loading state renders the literal ... label on a disabled Send",
  (D["05-submission-in-progress"] || "").includes("disabled=\"\"") &&
    (D["05-submission-in-progress"] || "").includes("..."),
  true
);

check(
  "Send is NOT disabled when idle, even with blank input",
  !(D["09-blank-input"] || "").includes('disabled=""'),
  true
);

// The malformed reply still renders its prefix and nothing after it. This is
// today's behaviour and 64B-1 must not fix it.
check(
  "a malformed reply still renders an otherwise-empty bubble",
  /<strong>TOHI: <\/strong><\/div>/.test(D["11-missing-malformed-response"] || ""),
  true
);

// Newlines are still collapsed by the browser because no whiteSpace rule is set.
check(
  "multi-paragraph replies still carry no whiteSpace rule",
  (D["15-long-tohi-response"] || "").includes("\n\n") &&
    !/white-space:\s*pre/.test(D["15-long-tohi-response"] || ""),
  true
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
