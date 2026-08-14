#!/usr/bin/env node

// 63C-1 Waits day-value proof.
//
// Renders every meaningful Waits scenario to static HTML at night={false} in
// BOTH this tree and a detached worktree of the pinned pre-night baseline, then
// compares the two outputs byte for byte. Nothing is normalized: 63C-1 is a
// preparation phase, so there is no approved day change to normalize away and
// any day diff at all is a regression.
//
// Why rendering rather than reading ternaries: a day branch with a mistyped hex
// still reads correctly, and an `...(night ? x : null)` spread can silently
// reorder a day style object without changing a single visible character of the
// day branch. Only the rendered output proves the bytes that ship.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "waitsDayParityRender.cjs");

// The approved pre-night Waits baseline: the merge of PR #120, the last commit
// before any Waits night presentation existed. Pinned to an immutable full hash
// on purpose.
//
// Defaulting to `main` would let this harness silently redefine what "unchanged
// day mode" means: every future merge would move the comparison point, so a day
// value could drift one merge at a time and every individual run would still
// report parity. The whole value of this check is that the reference cannot
// move. Change this constant only when a day-mode change is deliberately
// approved, and say so in the commit that changes it.
//
// WAITS_PARITY_BASE overrides it for deliberate local testing only.
const PINNED_BASE = "3e68e0fa0c1d0499cd364d332418914398710536";
const BASE_REF = process.env.WAITS_PARITY_BASE || PINNED_BASE;

// Every state the 63C-1 brief requires day parity for. Listed here so a dropped
// scenario fails this harness instead of quietly shrinking the proof.
const REQUIRED_SCENARIOS = [
  "healthy-active-park",
  "loading-before-first-data",
  "refreshing-with-retained-data",
  "stale",
  "active-refresh-error-with-retained-data",
  "error-with-no-data",
  "valid-empty",
  "browsed-loading",
  "browsed-error",
  "browsed-healthy-viewing-only",
  "browsed-refresh-with-retained-data",
  "browsed-refresh-error-with-retained-data",
  "active-in-line",
  "closed",
  "wait-unavailable",
  "scheduled-show",
  "closed-attraction-with-stored-showtimes",
  "all-card-variants",
  "list-direct-all-variants",
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

function render(cwd, night) {
  return execFileSync(
    process.execPath,
    [path.join(cwd, "scripts", "waitsDayParityRender.cjs")],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, PARITY_NIGHT: night ? "1" : "0" },
      stdio: ["ignore", "pipe", "ignore"],
    }
  );
}

const sections = (html) => (html.match(/^===== (.+) =====$/gm) || []).map((s) =>
  s.replace(/^===== /, "").replace(/ =====$/, "")
);

console.log("Waits day render parity (63C-1)");

const currentDay = render(frontendRoot, false);
const currentNight = render(frontendRoot, true);

check(
  "day render produces every required scenario without error",
  REQUIRED_SCENARIOS.every((s) => sections(currentDay).includes(s)) &&
    !currentDay.includes("RENDER_ERROR"),
  true
);

check(
  "night render produces every required scenario without error",
  REQUIRED_SCENARIOS.every((s) => sections(currentNight).includes(s)) &&
    !currentNight.includes("RENDER_ERROR"),
  true
);

check("night output actually differs from day", currentDay !== currentNight, true);

/* ------------------------------------ the reproduced renderers stay honest -- */

// waitsDayParityRender.cjs reproduces App's renderRideActions and
// renderShowtimeInfo, because they are closures and cannot be imported. That
// copy is only useful while its DAY values match App's. Every day-mode style
// literal in App's two renderers must therefore appear in the renderer file.
//
// This proves value parity, not structural equivalence. The copy is
// hand-maintained and this check is what stops it going stale unnoticed.
{
  const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
  const rendererSource = fs.readFileSync(RENDERER, "utf8");

  const slice = (marker) => {
    const start = appSource.indexOf(marker);
    if (start < 0) return "";
    const end = appSource.indexOf("\n  }\n", start);
    return end > start ? appSource.slice(start, end) : "";
  };
  const actions = slice("function renderRideActions(ride, options = {}) {");
  const showtimes = slice("function renderShowtimeInfo(ride, options = {}) {");

  check("both App renderers were located for comparison", actions.length > 0 && showtimes.length > 0, true);

  // Colour and shadow literals are the values a day regression would land in.
  const literals = new Set();
  for (const src of [actions, showtimes]) {
    for (const m of src.matchAll(/"(#[0-9a-fA-F]{3,8}|rgba?\([^"]*\))"/g)) literals.add(m[1]);
  }

  check("App's renderers expose day literals to compare", literals.size >= 10, true);

  const missing = [...literals].filter((lit) => !rendererSource.includes(lit));
  if (missing.length) console.log(`       missing from renderer: ${missing.join(", ")}`);
  check(
    "every style literal in App's Waits renderers is reproduced in the parity renderer",
    missing.length,
    0
  );
}

/* ------------------------------------------------- base comparison ------- */

let worktree = null;
try {
  worktree = fs.mkdtempSync(path.join(os.tmpdir(), "waits-parity-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, BASE_REF], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  // The worktree has no node_modules of its own; borrow this tree's.
  fs.symlinkSync(
    path.join(frontendRoot, "node_modules"),
    path.join(worktree, "frontend", "node_modules")
  );
  fs.copyFileSync(
    RENDERER,
    path.join(worktree, "frontend", "scripts", "waitsDayParityRender.cjs")
  );

  // Prove the comparison really ran against the pinned commit and not whatever
  // a branch name happens to point at now.
  const resolved = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();
  check(
    `baseline is the pinned immutable commit, not a moving branch (${PINNED_BASE.slice(0, 7)})`,
    resolved,
    process.env.WAITS_PARITY_BASE
      ? execFileSync("git", ["rev-parse", BASE_REF], { cwd: repoRoot, encoding: "utf8" }).trim()
      : PINNED_BASE
  );

  // The baseline must genuinely predate the night work, or "parity with the
  // baseline" would be a tautology.
  const baseWaitsTab = fs.readFileSync(
    path.join(worktree, "frontend", "src", "components", "WaitsTab.jsx"),
    "utf8"
  );
  const baseList = fs.readFileSync(
    path.join(worktree, "frontend", "src", "components", "WaitTimesList.jsx"),
    "utf8"
  );
  // Comment-blind: the baseline legitimately documents that night was deferred,
  // so the check is about code, not prose.
  const stripComments = (t) =>
    t
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  check(
    "the pinned baseline really is pre-night: neither Waits component knows the prop",
    !/\bnight\b/.test(stripComments(baseWaitsTab)) &&
      !/\bnight\b/.test(stripComments(baseList)),
    true
  );

  const baseDay = render(path.join(worktree, "frontend"), false);

  check(
    "base render produces every required scenario without error",
    REQUIRED_SCENARIOS.every((s) => sections(baseDay).includes(s)) &&
      !baseDay.includes("RENDER_ERROR"),
    true
  );

  check(
    `every day byte is identical to the pinned pre-night baseline (${BASE_REF.slice(0, 7)})`,
    baseDay === currentDay,
    true
  );

  if (baseDay !== currentDay) {
    const a = baseDay.split("\n");
    const b = currentDay.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (a[i] !== b[i]) {
        console.log(`       first differing section near line ${i + 1}`);
        console.log(`       base:    ${String(a[i]).slice(0, 260)}`);
        console.log(`       current: ${String(b[i]).slice(0, 260)}`);
        break;
      }
    }
  }

  // Per-scenario parity, so a failure names the state that broke rather than a
  // line number in a 19-scenario dump.
  const split = (html) => {
    const map = {};
    for (const chunk of html.split(/^===== /m).slice(1)) {
      const name = chunk.slice(0, chunk.indexOf(" ====="));
      map[name] = chunk.slice(chunk.indexOf("\n") + 1);
    }
    return map;
  };
  const baseMap = split(baseDay);
  const curMap = split(currentDay);
  for (const scenario of REQUIRED_SCENARIOS) {
    check(`day output unchanged — ${scenario}`, baseMap[scenario] === curMap[scenario], true);
  }
} catch (err) {
  failCount += 1;
  console.log(`  FAIL base comparison could not run — ${err.message}`);
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

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
