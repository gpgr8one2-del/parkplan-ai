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


/* --------------------------------- 62B-2G approved-decoration normalization -- */

// Phase 62B-2G removed the legacy decorative-circle motif from the Home header
// and the Home Weather + comfort card. That is an APPROVED day-mode visual
// change, so the byte-for-byte comparison legitimately detects it.
//
// The pinned baseline is NOT moved and the comparison is NOT weakened. Instead
// the five exact removed fragments are normalized out of BOTH renders, so the
// check keeps proving that every other day byte is identical.
//
// Each entry is an exact rendered string, not a pattern. The two background
// entries are scoped by the Home card's own border alpha (0.24) so they cannot
// touch WhileYouWaitCard's outer surface, which renders a byte-identical radial
// layer with border alpha 0.26 and is out of scope for this phase.
const APPROVED_62B2G_REMOVALS = [
  {
    name: "Home header 130x130 orb",
    from:
      '<div aria-hidden="true" style="position:absolute;width:130px;height:130px;border-radius:999px;background:rgba(251, 113, 133, 0.18);right:-42px;bottom:-54px;filter:blur(2px)"></div>',
    to: "",
  },
  {
    name: "Home header 86x86 orb",
    from:
      '<div aria-hidden="true" style="position:absolute;width:86px;height:86px;border-radius:999px;background:rgba(56, 189, 248, 0.16);right:38px;top:38px;filter:blur(1px)"></div>',
    to: "",
  },
  {
    name: "Home weather 104x104 orb",
    from:
      '<div aria-hidden="true" style="position:absolute;width:104px;height:104px;border-radius:999px;right:-42px;bottom:-48px;background:rgba(124, 58, 237, 0.10)"></div>',
    to: "",
  },
  {
    name: "Home header circular radial layers",
    from:
      "background:radial-gradient(circle at 88% 8%, rgba(124, 58, 237, 0.34) 0%, rgba(124, 58, 237, 0.12) 24%, transparent 46%), radial-gradient(circle at 8% 0%, rgba(245, 158, 11, 0.30) 0%, rgba(245, 158, 11, 0.10) 32%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF4D8 45%, #F3E8FF 100%)",
    to: "background:linear-gradient(150deg, #FFFFFF 0%, #FFF4D8 45%, #F3E8FF 100%)",
  },
  {
    name: "Home weather circular radial layer",
    from:
      "background:radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%);border:1px solid rgba(56, 189, 248, 0.24)",
    to:
      "background:linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%);border:1px solid rgba(56, 189, 248, 0.24)",
  },
];

const countOf = (haystack, needle) => haystack.split(needle).length - 1;

// The out-of-scope surface that renders a byte-identical radial layer. It must
// survive normalization in BOTH renders, which is what proves the scoping works.
const WYW_OUTER_RADIAL =
  "rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%);border:1px solid rgba(56, 189, 248, 0.26)";

function normalizeApprovedRemovals(html) {
  let out = html;
  for (const r of APPROVED_62B2G_REMOVALS) out = out.split(r.from).join(r.to);
  return out;
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

  // The pinned base must still contain every approved decoration, and the
  // current render must contain none of them. Asserting both directions is what
  // stops this normalization from quietly hiding an unrelated regression: it
  // only ever removes fragments that are provably present before and provably
  // absent after.
  check(
    "pinned base still contains every approved 62B-2G decoration",
    APPROVED_62B2G_REMOVALS.every((r) => countOf(baseDay, r.from) === 7),
    true
  );

  check(
    "current render contains none of the approved 62B-2G decorations",
    APPROVED_62B2G_REMOVALS.every((r) => countOf(currentDay, r.from) === 0),
    true
  );

  check(
    "the out-of-scope WhileYouWaitCard radial layer is untouched in both renders",
    countOf(baseDay, WYW_OUTER_RADIAL) === 14 &&
      countOf(currentDay, WYW_OUTER_RADIAL) === 14,
    true
  );

  const baseNormalized = normalizeApprovedRemovals(baseDay);
  const currentNormalized = normalizeApprovedRemovals(currentDay);

  check(
    `every other day value is byte-identical to the merged base (${BASE_REF})`,
    baseNormalized === currentNormalized,
    true
  );

  if (baseNormalized !== currentNormalized) {
    const a = baseNormalized.split("\n");
    const b = currentNormalized.split("\n");
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
