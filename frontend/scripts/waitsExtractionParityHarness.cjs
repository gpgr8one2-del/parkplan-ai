#!/usr/bin/env node

// 63B-1 render parity: the extracted Waits tab must render byte-identically to
// the pre-extraction baseline for every representative existing state.
//
// The baseline is PINNED to an immutable commit, not to `main` by name. `main`
// moves; once this branch merges, comparing against a moving branch would be
// comparing the extraction to itself and would prove nothing.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "waitsExtractionParityRender.cjs");

// The merged main this extraction branched from.
const PINNED_BASE = "e7b61900d2598d7ea601b23972dc4304fd59c1d5";
const BASE_REF = process.env.WAITS_PARITY_BASE || PINNED_BASE;

const SCENARIOS = [
  "healthy-active-park-rides",
  "loading-refresh-button",
  "active-in-line-ride",
  "closed-and-unavailable-waits",
  "showtime-attraction",
  "browsing-another-park",
  "empty-ride-array",
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

function render(cwd) {
  return execFileSync(process.execPath, [path.join(cwd, "scripts", "waitsExtractionParityRender.cjs")], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function sections(text) {
  const out = {};
  const parts = text.split(/^===== (.+?) =====$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1].trim();
  return out;
}

console.log("Waits extraction render parity (63B-1)");

const current = render(frontendRoot);

check(
  "extracted tree renders every scenario without error",
  SCENARIOS.every((s) => current.includes(`===== ${s} =====`)) && !current.includes("RENDER_ERROR"),
  true
);

let worktree = null;
try {
  worktree = fs.mkdtempSync(path.join(os.tmpdir(), "waits-parity-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, BASE_REF], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  fs.symlinkSync(
    path.join(frontendRoot, "node_modules"),
    path.join(worktree, "frontend", "node_modules")
  );
  fs.copyFileSync(RENDERER, path.join(worktree, "frontend", "scripts", "waitsExtractionParityRender.cjs"));

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

  // The baseline has no WaitsTab.jsx — the renderer lifts the block from App.jsx.
  check(
    "baseline tree genuinely predates the extraction",
    !fs.existsSync(path.join(worktree, "frontend", "src", "components", "WaitsTab.jsx")),
    true
  );

  const baseline = render(path.join(worktree, "frontend"));

  check(
    "baseline renders every scenario without error",
    SCENARIOS.every((s) => baseline.includes(`===== ${s} =====`)) &&
      !baseline.includes("RENDER_ERROR"),
    true
  );

  const a = sections(baseline);
  const b = sections(current);

  for (const name of SCENARIOS) {
    const same = a[name] !== undefined && a[name] === b[name];
    check(`identical rendered markup: ${name}`, same, true);
    if (!same && a[name] !== undefined && b[name] !== undefined) {
      for (let i = 0; i < Math.max(a[name].length, b[name].length); i += 1) {
        if (a[name][i] !== b[name][i]) {
          console.log(`       first difference at char ${i}`);
          console.log(`       baseline:  ${a[name].slice(Math.max(0, i - 60), i + 120)}`);
          console.log(`       extracted: ${b[name].slice(Math.max(0, i - 60), i + 120)}`);
          break;
        }
      }
    }
  }

  check("whole render output is byte-identical", baseline === current, true);
} catch (err) {
  failCount += 1;
  console.log(`  FAIL baseline comparison could not run — ${err.message}`);
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
