#!/usr/bin/env node

// Waits blueprint documentation integrity (63A).
//
// Phase 63A is documentation only: it preserves the approved Waits redesign
// blueprints so the implementation phases have a fixed reference. This harness
// protects that reference rather than any behaviour.
//
// It exists because a blueprint is only useful if it cannot quietly rot: the
// images must stay present and real, the locked copy must stay verbatim, and a
// later phase must not be able to swap a committed asset for a remote URL or
// start importing these documentation files into the app.
//
// Dependency-free by construction — PNG validation reads the signature and IHDR
// directly, so nothing needs installing for the file checks to be genuine.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const BLUEPRINT_DIR = path.join(frontendRoot, "docs", "design", "waits");
const README = path.join(BLUEPRINT_DIR, "README.md");

const EXPECTED_PNGS = [
  "waits-approved-healthy-day.png",
  "waits-approved-healthy-night.png",
  "waits-approved-states-day.png",
  "waits-approved-states-night.png",
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

/* ------------------------------------------------------------------ png -- */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Reads the signature and IHDR rather than trusting the extension, so a
// truncated, empty, or renamed non-PNG file cannot pass as a blueprint.
function readPng(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size === 0) return null;
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(24);
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (!head.slice(0, 8).equals(PNG_SIGNATURE)) return null;
  if (head.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    bytes: stat.size,
    width: head.readUInt32BE(16),
    height: head.readUInt32BE(20),
  };
}

console.log("Waits blueprint assets (63A)");

const pngs = EXPECTED_PNGS.map((name) => ({ name, info: readPng(path.join(BLUEPRINT_DIR, name)) }));

check(
  "all four approved blueprint exports exist",
  pngs.every((p) => fs.existsSync(path.join(BLUEPRINT_DIR, p.name))),
  true
);

check(
  "all four are non-empty, structurally valid PNG files",
  pngs.every((p) => p.info !== null && p.info.bytes > 0 && p.info.width > 0 && p.info.height > 0),
  true
);

for (const p of pngs) {
  if (p.info) {
    console.log(`       ${p.name} — ${p.info.width}x${p.info.height}, ${p.info.bytes} bytes`);
  }
}

check("the blueprint README exists", fs.existsSync(README), true);

const readme = fs.existsSync(README) ? fs.readFileSync(README, "utf8") : "";

/* --------------------------------------------------------------- copy --- */

console.log("Locked state headings and exact user-facing copy");

// Every string here is user-facing copy the redesign is committed to. They are
// compared verbatim, including curly apostrophes and the ellipsis character,
// because a straightened apostrophe is a different string at runtime.
const LOCKED_COPY = [
  // showtimes
  "Verify in My Disney Experience. Showtimes can change by day.",
  // refresh failure with existing data
  "Couldn’t refresh wait times. Showing the last available data.",
  // error with no data
  "Wait times unavailable",
  "We couldn’t load wait times right now. Try refreshing in a moment.",
  // valid empty state
  "No attractions to show",
  "No attractions are available for this park right now.",
  // browsed park
  "Loading EPCOT wait times…",
  "EPCOT wait times are unavailable right now.",
  "VIEWING ONLY",
];

for (const copy of LOCKED_COPY) {
  check(`README records verbatim: "${copy}"`, readme.includes(copy), true);
}

console.log("Locked structural decisions");

const LOCKED_RULES = [
  [/text-led/i, "Waits stays text-led"],
  [/no ride artwork/i, "no ride artwork"],
  [/One clear page header/i, "one page header, no duplicate headers"],
  [/decorative circles/i, "no decorative circles or blobs"],
  [/attraction-count tile/i, "no attraction-count tile"],
  [/2×2 grid/, "actions use the 2x2 grid"],
  [/In Line Now/, "In Line Now disables only the In Line action"],
  [/omit the freshness pill entirely/i, "refresh error omits the freshness pill"],
  [/deep navy surfaces, not pure black/i, "night uses deep navy, not pure black"],
  [/only presentation\s+tokens change/i, "day and night share structure and spacing"],
  [/not yet\s+implemented/i, "browsed-park loading and error are unimplemented"],
  [/never become app UI/i, "sheet labels are documentation, not app UI"],
  [/visual guidance, not proof/i, "blueprint is guidance, not proof of existence"],
  [/extracted and protected before/i, "behaviour is extracted before the redesign"],
  [/real current data and existing\s+interaction handlers/i, "implementation uses real data and handlers"],
];

for (const [re, label] of LOCKED_RULES) {
  check(`README records: ${label}`, re.test(readme), true);
}

console.log("Locked healthy-card measurements");

const MEASUREMENTS = [
  ["attraction name", /17\.5px/],
  ["wait value", /42px/],
  ["card radius", /26px/],
  ["card padding", /20px/],
  ["action height", /48px/],
];

for (const [label, re] of MEASUREMENTS) {
  check(`README records the locked ${label}`, re.test(readme), true);
}

console.log("Canonical example names");

const CANONICAL_NAMES = [
  "Soarin' Around the World",
  "Mickey & Minnie's Runaway Railway",
  "Rock 'n' Roller Coaster Starring The Muppets",
];

for (const name of CANONICAL_NAMES) {
  check(`README records the canonical name: ${name}`, readme.includes(name), true);
}

check(
  "README records that example names must match production exactly",
  /match production data\s+exactly/i.test(readme),
  true
);

check(
  "README records that Muppet*Vision is filtered out of Waits",
  /Muppet\*Vision 3D/.test(readme) &&
    /filters it\s+out|filtered out/i.test(readme) &&
    /attractionDisplayFilters/.test(readme),
  true
);

/* --------------------------------------------------------------- scope --- */

console.log("Documentation scope");

check(
  "no remote image URL substitutes for a committed blueprint",
  // The README may not point at a hosted image in place of the four files it
  // documents. Artifact links elsewhere would be a substitution risk, so any
  // http(s) reference at all is rejected here.
  !/https?:\/\//i.test(readme),
  true
);

// These are documentation assets. Production code must never import them.
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.(jsx?|cjs|mjs|ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}

const productionFiles = walk(path.join(frontendRoot, "src"));
const importsBlueprint = productionFiles.filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  return (
    /docs\/design\/waits/.test(source) ||
    EXPECTED_PNGS.some((name) => source.includes(name))
  );
});

check(
  "no production source file imports or references a blueprint asset",
  importsBlueprint.length === 0,
  true
);
if (importsBlueprint.length) {
  for (const f of importsBlueprint) console.log(`       offending: ${path.relative(repoRoot, f)}`);
}

check(
  "blueprints live under docs, never under src or public",
  BLUEPRINT_DIR.includes(path.join("docs", "design", "waits")) &&
    !fs.existsSync(path.join(frontendRoot, "src", "docs")) &&
    !fs.existsSync(path.join(frontendRoot, "public", "docs")),
  true
);

/* ------------------------------------------------ blueprint integrity -- */

console.log("Blueprint integrity");

// 63A originally gated on the whole working diff ("no production-code changes",
// "only the six documentation files are in scope"). Those were phase-scoped
// assertions: correct during 63A, but guaranteed to fail in every later Waits
// phase, which legitimately changes production code. They are replaced here by
// two durable guards that protect what this harness actually exists to protect —
// the blueprint itself — and that hold in any phase.

const BLUEPRINT_COMMIT = "5bb967325f3d00034f98fd0da7d7f367edbc4cf9";

check(
  "every blueprint file is byte-identical to the commit that approved it",
  (() => {
    const { execFileSync } = require("child_process");
    try {
      return [...EXPECTED_PNGS, "README.md"].every((name) => {
        const rel = `frontend/docs/design/waits/${name}`;
        const now = execFileSync("git", ["hash-object", rel], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim();
        const approved = execFileSync("git", ["rev-parse", `${BLUEPRINT_COMMIT}:${rel}`], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim();
        if (now !== approved) console.log(`       drifted: ${name}`);
        return now === approved;
      });
    } catch (err) {
      console.log(`       could not compare: ${err.message}`);
      return false;
    }
  })(),
  true
);

check(
  "the blueprint directory holds only the five approved documentation files",
  (() => {
    const entries = fs.readdirSync(BLUEPRINT_DIR).sort();
    const expected = [...EXPECTED_PNGS, "README.md"].sort();
    const same = entries.join(",") === expected.join(",");
    if (!same) console.log(`       found: ${entries.join(", ")}`);
    return same;
  })(),
  true
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
