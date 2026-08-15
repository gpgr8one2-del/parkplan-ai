#!/usr/bin/env node

// TOHI chat blueprint documentation integrity (64A-3).
//
// Phase 64A-3 is documentation only: it preserves the approved TOHI chat
// blueprints so the extraction and redesign phases have a fixed reference. This
// harness protects that reference rather than any behaviour.
//
// It exists because a blueprint is only useful if it cannot quietly rot: the
// images must stay present, real, and byte-exact; the locked decisions must stay
// recorded; and a later phase must not be able to swap a committed asset for a
// remote URL or start importing these documentation files into the app.
//
// Dependency-free by construction — PNG validation reads the signature and IHDR
// directly, and hashing uses node's built-in crypto, so nothing needs installing
// for the file checks to be genuine.
//
// One deliberate difference from waitsBlueprintHarness: that harness forbids any
// http(s) reference in its README, because a hosted image there would be a
// substitution risk. The TOHI README is REQUIRED to record the approval artifact
// URL, so this harness asserts that URL is present and instead guards the
// substitution risk directly — the committed PNGs are pinned by hash, and no
// production file may reference them or the artifact.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const BLUEPRINT_DIR = path.join(frontendRoot, "docs", "design", "tohi");
const README = path.join(BLUEPRINT_DIR, "README.md");

const ARTIFACT_URL =
  "https://claude.ai/code/artifact/afef2396-622f-4f3d-b985-a610d67280c3";

// Exact expected geometry and content. Hashes are pinned from the approved
// exports at the moment they were copied in; any regeneration, resize, crop,
// recompression, or optimisation changes them and fails this harness.
const EXPECTED = [
  {
    name: "tohi-approved-healthy-day.png",
    mode: "day",
    pair: "healthy",
    width: 1010,
    height: 1124,
    sha256: "13105206a27691ce859199c877861a61ee33768e918a50f46a16cec683339399",
  },
  {
    name: "tohi-approved-healthy-night.png",
    mode: "night",
    pair: "healthy",
    width: 1010,
    height: 1124,
    sha256: "49068159b8ea0082f3f59eee3664465a393678900e55de9745353beacb04a6ed",
  },
  {
    name: "tohi-approved-states-day.png",
    mode: "day",
    pair: "states",
    width: 1010,
    height: 5486,
    sha256: "7042da618f92ebabd7fd0b9257a0d39941ec2db196a0d62be0983554f8be0f03",
  },
  {
    name: "tohi-approved-states-night.png",
    mode: "night",
    pair: "states",
    width: 1010,
    height: 5486,
    sha256: "f84e289b22bf3d8138a32254cc6edfd7fec5678fd42b300f768628e3e242ff72",
  },
];

const EXPECTED_NAMES = EXPECTED.map((e) => e.name);

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
  const read = fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (read < 24) return null;
  if (!head.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (head.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    bytes: stat.size,
    width: head.readUInt32BE(16),
    height: head.readUInt32BE(20),
    sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  };
}

console.log("TOHI blueprint assets (64A-3)");

const found = EXPECTED.map((e) => ({ ...e, info: readPng(path.join(BLUEPRINT_DIR, e.name)) }));

check(
  "all four approved blueprint exports exist",
  EXPECTED_NAMES.every((n) => fs.existsSync(path.join(BLUEPRINT_DIR, n))),
  true
);

check(
  "all four are non-empty, structurally valid PNG files",
  found.every((f) => f.info !== null && f.info.bytes > 0),
  true
);

for (const f of found) {
  if (f.info) {
    console.log(
      `       ${f.name} — ${f.info.width}x${f.info.height}, ${f.info.bytes} bytes, ${f.info.sha256.slice(0, 16)}…`
    );
  }
}

console.log("Exact geometry");

for (const f of found) {
  check(
    `${f.name} is exactly ${f.width}x${f.height}`,
    f.info ? `${f.info.width}x${f.info.height}` : "missing",
    `${f.width}x${f.height}`
  );
}

// Day and night render from one markup source, so a mismatch here means the two
// modes diverged structurally rather than only in tokens.
for (const pair of ["healthy", "states"]) {
  const [d, n] = [
    found.find((f) => f.pair === pair && f.mode === "day"),
    found.find((f) => f.pair === pair && f.mode === "night"),
  ];
  check(
    `${pair} day and night dimensions match`,
    d?.info && n?.info
      ? d.info.width === n.info.width && d.info.height === n.info.height
      : false,
    true
  );
}

console.log("Byte-exact pins");

for (const f of found) {
  check(
    `${f.name} matches its pinned SHA-256`,
    f.info ? f.info.sha256 : "missing",
    f.sha256
  );
}

// Identical bytes across a day/night pair would mean one mode was copied twice.
for (const pair of ["healthy", "states"]) {
  const [d, n] = [
    found.find((f) => f.pair === pair && f.mode === "day"),
    found.find((f) => f.pair === pair && f.mode === "night"),
  ];
  check(
    `${pair} day and night are not byte-identical to each other`,
    d?.info && n?.info ? d.info.sha256 !== n.info.sha256 : false,
    true
  );
}

check(
  "all four blueprints are distinct files",
  new Set(found.filter((f) => f.info).map((f) => f.info.sha256)).size === EXPECTED.length,
  true
);

console.log("Directory scope");

check(
  "the blueprint directory holds only the five approved documentation files",
  (() => {
    if (!fs.existsSync(BLUEPRINT_DIR)) return false;
    const entries = fs.readdirSync(BLUEPRINT_DIR).sort();
    const expected = [...EXPECTED_NAMES, "README.md"].sort();
    const same = entries.join(",") === expected.join(",");
    if (!same) console.log(`       found: ${entries.join(", ")}`);
    return same;
  })(),
  true
);

check(
  "no unexpected blueprint PNG is present in this directory",
  (() => {
    if (!fs.existsSync(BLUEPRINT_DIR)) return false;
    const pngs = fs.readdirSync(BLUEPRINT_DIR).filter((n) => /\.png$/i.test(n)).sort();
    const same = pngs.join(",") === [...EXPECTED_NAMES].sort().join(",");
    if (!same) console.log(`       png files: ${pngs.join(", ")}`);
    return same;
  })(),
  true
);

check(
  "blueprints live under docs, never under src or public",
  BLUEPRINT_DIR.includes(path.join("docs", "design", "tohi")) &&
    !fs.existsSync(path.join(frontendRoot, "src", "docs")) &&
    !fs.existsSync(path.join(frontendRoot, "public", "docs")),
  true
);

/* ------------------------------------------------------ the official logo -- */

// The blueprints render the official committed wordmark. That file is a shipped
// production asset, NOT a blueprint: it is pinned here so the sheets cannot
// silently start depicting a logo the repository no longer contains, and so a
// later phase cannot recolour or replace the mark and call the sheets current.
console.log("Official logo asset");

const LOGO_PATH = path.join(frontendRoot, "public", "tohi-logo.png");
const LOGO_SHA = "62102bfa0fd7230cbe12f007d9b07c08e8e5316b918f74a2af4c93f07bfd0b83";
const logo = readPng(LOGO_PATH);

check("the official logo exists and is a valid PNG", logo !== null, true);

check(
  "the official logo is exactly 874x286",
  logo ? `${logo.width}x${logo.height}` : "missing",
  "874x286"
);

check(
  "the official logo is RGBA (colour type 6)",
  (() => {
    if (!fs.existsSync(LOGO_PATH)) return false;
    const fd = fs.openSync(LOGO_PATH, "r");
    const head = Buffer.alloc(26);
    fs.readSync(fd, head, 0, 26, 0);
    fs.closeSync(fd);
    // byte 24 is bit depth, byte 25 is colour type; 6 = truecolour + alpha
    return head[24] === 8 && head[25] === 6;
  })(),
  true
);

check("the official logo matches its committed SHA-256", logo ? logo.sha256 : "missing", LOGO_SHA);

// The logo is a production asset and this is a documentation-only correction, so
// the commit that changes the blueprints must leave it untouched.
check(
  "the official logo is unchanged against origin/main",
  (() => {
    const { execFileSync } = require("child_process");
    try {
      const now = execFileSync("git", ["hash-object", "frontend/public/tohi-logo.png"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim();
      const base = execFileSync("git", ["rev-parse", "origin/main:frontend/public/tohi-logo.png"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim();
      if (now !== base) console.log(`       working ${now} vs origin/main ${base}`);
      return now === base;
    } catch (err) {
      console.log(`       could not compare: ${err.message}`);
      return false;
    }
  })(),
  true
);

/* -------------------------------------------------------------- readme --- */

console.log("README record");

check("the blueprint README exists", fs.existsSync(README), true);

const readme = fs.existsSync(README) ? fs.readFileSync(README, "utf8") : "";

check("the README is not empty", readme.trim().length > 0, true);

for (const name of EXPECTED_NAMES) {
  check(`README references the exact filename: ${name}`, readme.includes(name), true);
}

check("README records the approval artifact URL", readme.includes(ARTIFACT_URL), true);

check(
  "README records the exact dimensions of both sheet pairs",
  /1010 × 1124/.test(readme) && /1010 × 5486/.test(readme),
  true
);

console.log("Branded header record");

// The logo correction is only durable if the README keeps the facts that make it
// reproducible: which file, at what size, on which plate, and why night is pale.
const LOGO_RULES = [
  [/frontend\/public\/tohi-logo\.png/, "the official logo path"],
  [/874 × 286/, "the source logo dimensions"],
  [/80 × ~?26\.17px/, "the displayed logo size"],
  [/~?106 × 42\.17px/, "the brand plate size"],
  [/intrinsic aspect ratio preserved/i, "the aspect ratio is preserved"],
  [/#F3E8FF/, "the day plate colour"],
  [/#E9E3FB/, "the night plate colour"],
  [/#7742D2/, "the measured wordmark ink"],
  [/pale night plate is intentional/i, "the pale-night-plate decision"],
  [/2\.8–3\.0:1/, "the failing contrast against the navy shell"],
  [/4\.8:1/, "the passing contrast on the pale plate"],
  [
    /`TOHI COMPANION` text badge is no longer part of the approved design/i,
    "the old text badge is retired",
  ],
  [
    /No generic MessageCircle or chat icon appears in the redesigned header/i,
    "no generic chat icon in the header",
  ],
  [
    /full wordmark is not used in BottomTabs/i,
    "the full wordmark does not replace the navigation sparkle",
  ],
  [/compact TOHI sparkle icon/i, "navigation keeps its compact sparkle icon"],
  [/uses `alt=""`/, "the alt=\"\" requirement"],
  [/would be a duplicate announcement/i, "the non-duplicative alt rationale"],
  [
    /never be redrawn, recoloured, traced, distorted,\s*\n?\s*cropped, or replaced/i,
    "the logo may not be redrawn, recoloured, distorted or replaced",
  ],
  [
    /does not authorize a production-code\s*\n?\s*change on its own/i,
    "the correction does not authorize production code",
  ],
];

for (const [re, label] of LOGO_RULES) {
  check(`README records ${label}`, re.test(readme), true);
}

// Every string below is a locked decision this phase committed to. Losing one
// means a later phase can no longer tell what was approved.
const LOCKED_COPY = [
  "TOHI couldn’t connect right now. Your plan and recommendations haven’t changed. You can try sending your question again.",
  "TOHI is checking your park-day context…",
  "QUICK CHECK",
  "Your question",
];

for (const copy of LOCKED_COPY) {
  check(`README records verbatim: "${copy}"`, readme.includes(copy), true);
}

const LOCKED_RULES = [
  [/TOHI\s+\*\*tab\*\*\s+contains one feature: TOHI chat|tab is chat only/i, "TOHI tab scope is chat only"],
  [/TOHI Pick/, "TOHI Pick is named as out of scope"],
  [/While You Wait/, "While You Wait is named as out of scope"],
  [/Recommendation cards/i, "recommendation cards are named as out of scope"],
  [/Plan guidance/i, "Plan guidance is named as out of scope"],
  [/identical structure, hierarchy, measurements, copy,\s*\n?\s*and behavior\. Only presentation tokens change/i,
    "day and night share structure; only tokens differ"],
  [/No decorative corner circles/i, "no decorative corner circles"],
  [/No fake overflow, menu, settings, bell/i, "no fake overflow or menu control"],
  [/No persistent decorative scrollbar/i, "no persistent decorative scrollbar"],
  // Reworded by the logo correction: the header no longer has an "eyebrow" to
  // put an emoji in. The rule itself is unchanged and slightly stronger — it now
  // also requires the specific ✨ currently shipping to be named as removed.
  [/No emoji in the header/i, "no emoji in the header"],
  [/The current `✨` is removed/, "the shipping emoji is named as removed"],
  [/No loud gradients/i, "no loud gradients"],
  [/does not ship controls with no\s*\n?\s*behavior behind them/i, "no fake controls"],
  [/never rendered as an ordinary TOHI answer/i, "failure is a distinct inline status"],
  [/existing conversation remains visible after a failure/i, "conversation survives failure"],
  [/No Retry button is added/i, "no Retry button"],
  [/Send is disabled whenever the message is empty/i, "blank Send is disabled"],
  [/malformed or missing response uses the same connection-failure state/i,
    "malformed responses use the failure state"],
  [/Paragraph breaks in responses remain visible/i, "paragraphs remain visible"],
  [/visible `Your question` label/i, "visible composer label"],
  [/No chat persistence across reload is approved/i, "no persistence approved"],
  [/No Start Over/i, "no Start Over control approved"],
  [/canUseAiChat/, "the unused AI time gate is out of scope"],
  [/backend `\/api\/ai-chat` response behavior/i, "backend behavior is out of scope"],
  [/not authorization to\s*\n?\s*change AI behavior, recommendation logic, access control, scoring, or Plan/i,
    "blueprints are not authorization to change behavior"],
  [/must never become app\s*\n?\s*UI/i, "sheet labels are documentation, not app UI"],
];

for (const [re, label] of LOCKED_RULES) {
  check(`README records: ${label}`, re.test(readme), true);
}

console.log("Scoping and sequencing rules");

check(
  "README records that keyboard navigation suppression is TOHI-only",
  /restricted to the TOHI composer while its\s*\n?\s*mobile keyboard is open/i.test(readme) &&
    /must not change keyboard or navigation\s*\n?\s*behavior on Profile, onboarding, or any other tab/i.test(
      readme
    ),
  true
);

check(
  "README records the byte-identical extraction rule for 64B-1",
  /Phase 64B-1 must be byte-identical to current production/i.test(readme),
  true
);

check(
  "README records that the current inline TOHI: and You: prefixes survive extraction",
  /current inline `TOHI:` and `You:` message prefixes remain during\s*\n?\s*extraction/i.test(readme),
  true
);

check(
  "README records that speaker labels are deferred to the redesign phase",
  /speaker labels above\s*\n?\s*each message belongs to the later day-redesign phase/i.test(readme),
  true
);

/* --------------------------------------------------------------- scope --- */

console.log("Documentation scope");

// These are documentation assets. Production code must never import them, and
// must never fetch the approval artifact in place of a committed file.
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.(jsx?|cjs|mjs|ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}

const productionFiles = walk(path.join(frontendRoot, "src"));
const offenders = productionFiles.filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  return (
    /docs\/design\/tohi/.test(source) ||
    /claude\.ai\/code\/artifact/.test(source) ||
    EXPECTED_NAMES.some((name) => source.includes(name))
  );
});

check(
  "no production source file imports or references a blueprint asset",
  offenders.length === 0,
  true
);
for (const f of offenders) console.log(`       offending: ${path.relative(repoRoot, f)}`);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
