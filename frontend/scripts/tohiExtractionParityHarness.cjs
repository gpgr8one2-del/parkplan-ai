#!/usr/bin/env node

// TOHI extraction parity — HISTORICAL PROOF (64B-1, preserved through 64B-2A).
//
// 64B-1 moved the TOHI presentation out of App.jsx with byte-identical output.
// 64B-2A then deliberately redesigned that presentation, so the working tree no
// longer matches the pre-extraction HTML and never will again.
//
// This harness therefore compares TWO PINNED COMMITS rather than the working
// tree:
//
//   PRE_EXTRACTION  8bf8342  the TOHI branch still inline in App.jsx
//   EXTRACTION      bc51899  the same presentation, moved to TohiTab.jsx
//
// Both are immutable, so the proof that the extraction changed nothing is
// preserved permanently and cannot rot as the redesign proceeds. What this
// harness does NOT do — and must not be read as doing — is claim the current
// redesigned tree is byte-identical to anything. Day presentation from 64B-2A
// onward is covered by tohiDayVisualHarness.cjs instead.
//
// The comparison runs entirely inside a detached worktree of the extraction
// commit. The working tree is never rendered here.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "tohiExtractionParityRender.cjs");

const PRE_EXTRACTION = "8bf834220e84b546cecc1b1e1d9130d9dc51015c";
const EXTRACTION = "bc5189975242afdc833f6077234564e621c41b22";

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

function hasPath(ref, rel) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:${rel}`], { cwd: repoRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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
      return `line ${i + 1}\n       pre-extraction: ${String(x[i]).slice(0, 220)}\n       extraction:     ${String(y[i]).slice(0, 220)}`;
    }
  }
  return "identical";
}

console.log("TOHI extraction parity — historical proof (64B-1)");

/* ------------------------------------------------ both commits are real -- */

for (const [label, ref] of [
  ["pre-extraction", PRE_EXTRACTION],
  ["extraction", EXTRACTION],
]) {
  check(
    `the pinned ${label} commit exists (${ref.slice(0, 7)})`,
    (() => {
      try {
        execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], { cwd: repoRoot });
        return true;
      } catch {
        return false;
      }
    })(),
    true
  );
}

check(
  "the pre-extraction commit renders TOHI inline in App.jsx and has no TohiTab",
  !hasPath(PRE_EXTRACTION, "frontend/src/components/TohiTab.jsx") &&
    (() => {
      const src = execFileSync("git", ["show", `${PRE_EXTRACTION}:frontend/src/App.jsx`], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      return /\{activeTab === "tohi" &&/.test(src) && !/<TohiTab/.test(src);
    })(),
  true
);

check(
  "the extraction commit has TohiTab and calls it from App.jsx",
  hasPath(EXTRACTION, "frontend/src/components/TohiTab.jsx") &&
    (() => {
      const src = execFileSync("git", ["show", `${EXTRACTION}:frontend/src/App.jsx`], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      return /<TohiTab/.test(src);
    })(),
  true
);

// The extraction commit must still carry the PRE-redesign presentation, or this
// would be comparing the redesign against the baseline and would rightly fail.
check(
  "the extraction commit still carries the pre-redesign presentation",
  (() => {
    const src = execFileSync(
      "git",
      ["show", `${EXTRACTION}:frontend/src/components/TohiTab.jsx`],
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    return (
      /<strong>\{isUser \? "You" : "TOHI"\}: <\/strong>/.test(src) &&
      /✨ TOHI COMPANION/.test(src)
    );
  })(),
  true
);

/* ------------------------------------------------------------ comparison -- */

let worktree = null;
try {
  worktree = fs.mkdtempSync(path.join(os.tmpdir(), "tohi-parity-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, EXTRACTION], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  fs.symlinkSync(
    path.join(frontendRoot, "node_modules"),
    path.join(worktree, "frontend", "node_modules")
  );
  // Run THIS renderer inside the extraction worktree, so both sides of the
  // comparison use one renderer and one fixture set.
  fs.copyFileSync(
    RENDERER,
    path.join(worktree, "frontend", "scripts", "tohiExtractionParityRender.cjs")
  );

  const resolved = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();
  check("the comparison runs against the pinned extraction commit", resolved, EXTRACTION);

  const wtFrontend = path.join(worktree, "frontend");
  const render = (source) =>
    execFileSync(
      process.execPath,
      [path.join(wtFrontend, "scripts", "tohiExtractionParityRender.cjs")],
      {
        cwd: wtFrontend,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, PARITY_SOURCE: source, TOHI_PARITY_BASE: PRE_EXTRACTION },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

  const baseline = render("baseline");
  const direct = render("current-direct");
  const callsite = render("current-callsite");

  for (const [label, html] of [
    ["pre-extraction", baseline],
    ["extraction component", direct],
    ["extraction call site", callsite],
  ]) {
    check(
      `${label} produced every required scenario without error`,
      REQUIRED_SCENARIOS.every((s) => Object.keys(split(html)).includes(s)) &&
        !html.includes("RENDER_ERROR"),
      true
    );
  }

  check("the render is not trivially empty", baseline.length > 20000, true);

  check(
    `the extraction was byte-identical to the pre-extraction commit (${PRE_EXTRACTION.slice(0, 7)} → ${EXTRACTION.slice(0, 7)})`,
    baseline === direct,
    true
  );
  if (baseline !== direct) console.log(`       first difference at ${firstDiff(baseline, direct)}`);

  check(
    "the extraction commit's call site rendered identically to its component",
    callsite === direct,
    true
  );

  const B = split(baseline);
  const D = split(direct);
  const C = split(callsite);
  for (const s of REQUIRED_SCENARIOS) {
    check(`byte-identical — ${s}`, B[s] === D[s] && C[s] === D[s], true);
  }

  // Anti-vacuity: two empty strings also compare equal. These prove the
  // compared output really contained the pre-redesign presentation.
  const MARKERS = [
    ["the emoji text badge", "✨ TOHI COMPANION"],
    ["the inline You: prefix", "<strong>You: </strong>"],
    ["the inline TOHI: prefix", "<strong>TOHI: </strong>"],
    ["the radial gradient", "radial-gradient(circle at 92% 4%"],
    ["the 112px decorative circle", "width:112px"],
    ["the 96px decorative circle", "width:96px"],
    ["the composer placeholder", 'placeholder="Ask TOHI..."'],
    ["the locked-card heading", "TOHI guidance needs your trip setup"],
  ];
  for (const [label, marker] of MARKERS) {
    check(`the compared output contained ${label}`, direct.includes(marker), true);
  }
} catch (err) {
  failCount += 1;
  console.log(`  FAIL the historical comparison could not run — ${err.message}`);
} finally {
  if (worktree) {
    try {
      fs.unlinkSync(path.join(worktree, "frontend", "node_modules"));
    } catch {}
    try {
      execFileSync("git", ["worktree", "remove", "--force", worktree], {
        cwd: repoRoot,
        stdio: "ignore",
      });
    } catch {}
    try {
      execFileSync("git", ["worktree", "prune"], { cwd: repoRoot, stdio: "ignore" });
    } catch {}
  }
}

/* ------------------------------------------------------------- scope note -- */

// Stated as an assertion rather than a comment so the boundary is visible in the
// output: this harness is historical, and the working tree is out of its scope.
check(
  "this harness makes no claim about the redesigned working tree",
  !fs.readFileSync(__filename, "utf8").includes("frontendRoot, \"src\", \"components\", \"TohiTab.jsx\""),
  true
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
