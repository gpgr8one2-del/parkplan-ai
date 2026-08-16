#!/usr/bin/env node

// TOHI day-value proof (64B-2E-1, still enforced after 64B-2E-2 activation).
//
// Renders every meaningful TOHI scenario at day in BOTH this tree and a detached
// worktree of the pinned pre-night baseline, then compares the two outputs byte
// for byte. Nothing is normalized: night was added without any approved day
// change, so there is nothing to normalize away and any day diff at all is a
// regression. Activation does not relax this — day mode must still render the
// pre-night bytes exactly.
//
// Why rendering rather than reading ternaries: a day branch with a mistyped hex
// still reads correctly, and a `night ? x : y` can silently reorder a day style
// object without changing a single visible character of the day branch. Only the
// rendered output proves the bytes that ship.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const RENDERER = path.join(frontendRoot, "scripts", "tohiDayParityRender.cjs");

// The approved pre-night TOHI baseline: the merge of PR #128, the last commit
// before any TOHI night presentation existed. Pinned to an immutable full hash
// on purpose.
//
// Defaulting to `main` would let this harness silently redefine what "unchanged
// day mode" means: every future merge would move the comparison point, so a day
// value could drift one merge at a time and every individual run would still
// report parity. The whole value of this check is that the reference cannot
// move. Change this constant only when a day-mode change is deliberately
// approved, and say so in the commit that changes it.
//
// TOHI_PARITY_BASE overrides it for deliberate local testing only.
const PINNED_BASE = "10f68f638b52f2dfd2a05123d859920271825383";
const BASE_REF = process.env.TOHI_PARITY_BASE || PINNED_BASE;

const REQUIRED_SCENARIOS = [
  "empty-with-suggested-prompts",
  "suggested-prompt-selected",
  "sending-with-user-message-retained",
  "healthy-active-conversation",
  "connection-failure-conversation-retained",
  "quick-check-clarification",
  "locked-trip-setup-required",
  "long-question-and-long-reply",
  "blank-input-send-disabled",
  "malformed-reply-resolved-as-failure",
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
  return execFileSync(process.execPath, [path.join(cwd, "scripts", "tohiDayParityRender.cjs")], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PARITY_NIGHT: night ? "1" : "0" },
    stdio: ["ignore", "pipe", "ignore"],
  });
}

const sections = (html) =>
  (html.match(/^===== (.+) =====$/gm) || []).map((s) =>
    s.replace(/^===== /, "").replace(/ =====$/, "")
  );

console.log("TOHI day render parity (64B-2E-1/2E-2)");

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

/* -------------------------------------------------- TOHI night is activated -- */

const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
const stripComments = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const appCode = stripComments(appSource);

// 64B-2E-1's gate assertions are gone: they required the literal night={false}
// that 64B-2E-2 removed, so keeping them would assert the opposite of the
// product. They are REPLACED, not dropped — what mattered about them was that
// TOHI's mode has exactly one source, and that is still asserted below.

check(
  "TOHI is activated only through night={shellNight}",
  (() => {
    const start = appCode.indexOf("<TohiTab");
    if (start < 0) return false;
    const call = appCode.slice(start, appCode.indexOf("/>", start));
    const nightProps = call.match(/night=\{[^}]*\}/g) || [];
    return nightProps.length === 1 && nightProps[0] === "night={shellNight}";
  })(),
  true
);

check(
  "no temporary literal gate survives anywhere in App",
  !/night=\{false\}/.test(appCode),
  true
);

check(
  "TOHI is part of the shared shell-night membership, which is exactly the four converted tabs",
  (() => {
    const m = appCode.match(/const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/);
    if (!m) return false;
    const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
    return tabs.join(",") === "home,plan,tohi,waits";
  })(),
  true
);

check(
  "Profile is still excluded, so activation did not darken every tab",
  (() => {
    const m = appCode.match(/const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/);
    return m ? !/activeTab === "profile"/.test(m[1]) : false;
  })(),
  true
);

/* --------------------------------------------- parity against the pinned base -- */

let worktree = null;
try {
  worktree = fs.mkdtempSync(path.join(os.tmpdir(), "tohi-parity-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, BASE_REF], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  // The worktree has no node_modules of its own; borrow this tree's.
  fs.symlinkSync(
    path.join(frontendRoot, "node_modules"),
    path.join(worktree, "frontend", "node_modules")
  );
  // The baseline predates this renderer, so it must be supplied.
  fs.copyFileSync(RENDERER, path.join(worktree, "frontend", "scripts", "tohiDayParityRender.cjs"));

  // Prove the comparison really ran against the pinned commit and not whatever
  // a branch name happens to point at now.
  const resolved = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim();
  check(
    `baseline is the pinned immutable commit, not a moving branch (${PINNED_BASE.slice(0, 7)})`,
    resolved,
    process.env.TOHI_PARITY_BASE
      ? execFileSync("git", ["rev-parse", BASE_REF], { cwd: repoRoot, encoding: "utf8" }).trim()
      : PINNED_BASE
  );

  // NOT a check that the baseline differs from HEAD: before this phase is
  // committed, HEAD legitimately IS the baseline commit. What has to be true is
  // that the two SOURCES being compared genuinely differ — otherwise byte
  // parity would be a tautology about one file.
  check(
    "the working tree really has the night work, so parity is not a tautology",
    /\bnight\b/.test(
      stripComments(
        fs.readFileSync(path.join(frontendRoot, "src", "components", "TohiTab.jsx"), "utf8")
      )
    ),
    true
  );

  // The baseline must genuinely predate the night work, or "parity with the
  // baseline" would be a tautology. Comment-blind: the baseline legitimately
  // documents that night was deferred, so this is about code, not prose.
  const baseTohi = fs.readFileSync(
    path.join(worktree, "frontend", "src", "components", "TohiTab.jsx"),
    "utf8"
  );
  check(
    "the pinned baseline really is pre-night: TohiTab does not know the prop",
    !/\bnight\b/.test(stripComments(baseTohi)),
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
        console.log(`       first differing line ${i + 1}`);
        console.log(`       base:    ${String(a[i]).slice(0, 260)}`);
        console.log(`       current: ${String(b[i]).slice(0, 260)}`);
        break;
      }
    }
  }
} catch (err) {
  check(`baseline comparison ran (${err.message})`, false, true);
} finally {
  if (worktree) {
    try {
      fs.unlinkSync(path.join(worktree, "frontend", "node_modules"));
    } catch (err) {
      /* the symlink may already be gone */
    }
    try {
      execFileSync("git", ["worktree", "remove", "--force", worktree], {
        cwd: repoRoot,
        stdio: "ignore",
      });
    } catch (err) {
      /* fall through to prune */
    }
    try {
      execFileSync("git", ["worktree", "prune"], { cwd: repoRoot, stdio: "ignore" });
    } catch (err) {
      /* nothing further to clean */
    }
  }
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
