#!/usr/bin/env node

// 62B-2F-1 day-value proof.
//
// Renders Home and its Home-only children to static HTML at night={false} in
// BOTH this tree and a detached worktree of the merged base, then compares the
// two outputs byte for byte. Also renders night={true} here and proves the
// night surface carries no white card fill and no pure black.
//
// Why rendering rather than reading ternaries: a day branch with a mistyped hex
// still reads correctly. Only the rendered output proves the value that ships.
// This harness found four real day-value regressions during 62B-2F-1 — collapsed
// token values and overrides added where the base had none — that source
// inspection had missed.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "homeDayParityRender.cjs");

// The approved pre-night Home baseline: PR #113's merge, the last commit before
// any night presentation existed. It is pinned to an immutable full hash on
// purpose.
//
// Defaulting to `main` would let this harness silently redefine what "unchanged
// day mode" means: every future merge would move the comparison point, so a day
// value could drift one merge at a time and every individual run would still
// report parity. The whole value of this check is that the reference cannot
// move. Change this constant only when a day-mode change is deliberately
// approved, and say so in the commit that changes it.
//
// HOME_PARITY_BASE overrides it for deliberate local testing only.
const PINNED_BASE = "950f48bf6edf2846c55f1e8f9ef81f2e6b44bc67";
const BASE_REF = process.env.HOME_PARITY_BASE || PINNED_BASE;

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
  return execFileSync(process.execPath, [path.join(cwd, "scripts", "homeDayParityRender.cjs")], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PARITY_NIGHT: night ? "1" : "0" },
    stdio: ["ignore", "pipe", "ignore"],
  });
}

console.log("Home day/night render parity (62B-2F-1)");

const currentDay = render(frontendRoot, false);
const currentNight = render(frontendRoot, true);

check("day render produces every scenario without error",
  (currentDay.match(/^===== /gm) || []).length >= 32 && !currentDay.includes("RENDER_ERROR"),
  true);

check("night render produces every scenario without error",
  (currentNight.match(/^===== /gm) || []).length >= 32 && !currentNight.includes("RENDER_ERROR"),
  true);

check("night output actually differs from day", currentDay !== currentNight, true);

// The core acceptance rule: no reachable night surface keeps a white card fill.
const whiteFills = (
  currentNight.match(
    /background(-color)?:\s*(#(?:FFFFFF|FFF|ffffff|fff)\b|rgba?\(\s*255,\s*255,\s*255[^)]*\))/g
  ) || []
).filter(Boolean);
check("no white or near-white card fill survives in night", whiteFills.length, 0);

// No pure black anywhere except shadows (which legitimately use rgba(0,0,0,a)).
const blacks = (
  currentNight.match(
    /(?:^|;)(?:background|background-color|color|border-color):\s*(#000000\b|#000\b|rgba?\(\s*0,\s*0,\s*0[^)]*\))/g
  ) || []
).filter(Boolean);
check("no pure black among night values", blacks.length, 0);

/* ------------------------------------------------- base comparison ------- */

let worktree = null;
try {
  worktree = fs.mkdtempSync(path.join(os.tmpdir(), "home-parity-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, BASE_REF], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  // The worktree has no node_modules of its own; borrow this tree's.
  fs.symlinkSync(
    path.join(frontendRoot, "node_modules"),
    path.join(worktree, "frontend", "node_modules")
  );
  fs.copyFileSync(RENDERER, path.join(worktree, "frontend", "scripts", "homeDayParityRender.cjs"));

  // Prove the comparison really ran against the pinned commit and not whatever
  // a branch name happens to point at now.
  const resolved = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();
  check(
    `baseline is the pinned immutable commit, not a moving branch (${PINNED_BASE.slice(0, 7)})`,
    resolved,
    process.env.HOME_PARITY_BASE
      ? execFileSync("git", ["rev-parse", BASE_REF], { cwd: repoRoot, encoding: "utf8" }).trim()
      : PINNED_BASE
  );

  const baseDay = render(path.join(worktree, "frontend"), false);

  check(
    "base render produces every scenario without error",
    (baseDay.match(/^===== /gm) || []).length >= 32 && !baseDay.includes("RENDER_ERROR"),
    true
  );

  check(
    `every day value is byte-identical to the merged base (${BASE_REF})`,
    baseDay === currentDay,
    true
  );

  if (baseDay !== currentDay) {
    const a = baseDay.split("\n");
    const b = currentDay.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (a[i] !== b[i]) {
        console.log(`       first differing section near line ${i + 1}`);
        console.log(`       base:    ${String(a[i]).slice(0, 220)}`);
        console.log(`       current: ${String(b[i]).slice(0, 220)}`);
        break;
      }
    }
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
