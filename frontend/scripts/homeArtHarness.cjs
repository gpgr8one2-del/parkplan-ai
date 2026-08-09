#!/usr/bin/env node

// Home artwork asset integrity (62B-1B).
//
// Kept separate from planVisualHarness (Plan content) and appShellNightHarness
// (shell chrome): this one is purely about the Home art assets and manifest.
//
// Dependency-free by construction. Dimensions come from reading the JPEG SOF
// and PNG IHDR headers directly; alpha comes from a PNG decoder built on Node's
// built-in zlib. Nothing here needs a package to be installed, so the alpha and
// corner-pixel assertions genuinely decode the images rather than passing
// silently when a decoder is missing.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const frontendRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(frontendRoot, "src", "data", "homeArtManifest.js");
const manifestSource = fs.readFileSync(manifestPath, "utf8");

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

/* ---------------------------------------------------------------- headers -- */

function jpegSize(file) {
  const d = fs.readFileSync(file);
  if (d[0] !== 0xff || d[1] !== 0xd8) return null;
  let o = 2;
  while (o < d.length) {
    if (d[o] !== 0xff) { o += 1; continue; }
    const m = d[o + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
    const len = d.readUInt16BE(o + 2);
    // SOF0..SOF15 except DHT(c4) DAC(cc) and RSTn
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: d.readUInt16BE(o + 5), width: d.readUInt16BE(o + 7) };
    }
    o += 2 + len;
  }
  return null;
}

function decodePNG(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32BE(0) !== 0x89504e47) return null;
  let off = 8, w = 0, h = 0, bd = 0, ct = 0;
  const idat = [];
  while (off < d.length) {
    const len = d.readUInt32BE(off);
    const type = d.toString("ascii", off + 4, off + 8);
    const body = d.slice(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4); bd = body[8]; ct = body[9];
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (bd !== 8 || !ch) return { width: w, height: h, channels: ch || 0, data: null };
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p]; p += 1;
    const line = raw.slice(p, p + stride); p += stride;
    const base = y * stride;
    const prev = base - stride;
    for (let x = 0; x < stride; x++) {
      let v = line[x];
      const a = x >= ch ? out[base + x - ch] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = (y > 0 && x >= ch) ? out[prev + x - ch] : 0;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[base + x] = v & 0xff;
    }
  }
  return { width: w, height: h, channels: ch, data: out };
}

/* --------------------------------------------------------------- manifest -- */

const PARK_KEYS = ["magicKingdom", "epcot", "hollywoodStudios", "animalKingdom"];
const WEATHER_KEYS = ["clear", "partlyCloudy", "cloudyFog", "rain", "storm", "heat"];

const EXPECTED_FILES = [
  "magic-kingdom-day.jpg", "magic-kingdom-night.jpg",
  "epcot-day.jpg", "epcot-night.jpg",
  "hollywood-studios-day.jpg", "hollywood-studios-night.jpg",
  "animal-kingdom-day.jpg", "animal-kingdom-night.jpg",
  "weather-clear-day.png", "weather-clear-night.png",
  "weather-partly-cloudy-day.png", "weather-partly-cloudy-night.png",
  "weather-cloudy-fog-day.png", "weather-cloudy-fog-night.png",
  "weather-rain-day.png", "weather-rain-night.png",
  "weather-storm-day.png", "weather-storm-night.png",
  "weather-heat-day.png", "weather-heat-night.png",
];

// Parse the manifest structurally: import identifier -> asset path, then each
// key's day/night binding -> that identifier.
const imports = new Map();
for (const m of manifestSource.matchAll(
  /^import\s+(\w+)\s+from\s+"(\.\.\/assets\/homeArt\/[\w/-]+\.(?:jpg|png))";$/gm
)) {
  imports.set(m[1], m[2]);
}

function entriesFor(blockName) {
  const start = manifestSource.indexOf(`export const ${blockName} = {`);
  const end = manifestSource.indexOf("\n};", start);
  const body = start < 0 ? "" : manifestSource.slice(start, end);
  const out = {};
  for (const m of body.matchAll(
    /(\w+):\s*\{\s*day:\s*\{\s*src:\s*(\w+),\s*alt:\s*("(?:[^"]*)")\s*\},\s*night:\s*\{\s*src:\s*(\w+),\s*alt:\s*("(?:[^"]*)")\s*\},?\s*\}/g
  )) {
    out[m[1]] = { dayId: m[2], dayAlt: m[3], nightId: m[4], nightAlt: m[5] };
  }
  return out;
}

const parks = entriesFor("HOME_PARK_ART");
const weather = entriesFor("HOME_WEATHER_ART");
const allEntries = { ...parks, ...weather };
const referencedPaths = [];
for (const e of Object.values(allEntries)) {
  referencedPaths.push(imports.get(e.dayId), imports.get(e.nightId));
}
const referencedFiles = referencedPaths.filter(Boolean).map((p) => path.basename(p));

console.log("Home artwork manifest structure");

check("exactly four park keys", Object.keys(parks).sort().join(","), [...PARK_KEYS].sort().join(","));
check("exactly six weather keys", Object.keys(weather).sort().join(","), [...WEATHER_KEYS].sort().join(","));

check(
  "every key has a day and a night entry, and they differ",
  Object.values(allEntries).length === 10 &&
    Object.values(allEntries).every(
      (e) => e.dayId && e.nightId && imports.get(e.dayId) && imports.get(e.nightId) &&
             imports.get(e.dayId) !== imports.get(e.nightId)
    ),
  true
);

check(
  "exactly the twenty approved final filenames are referenced",
  [...referencedFiles].sort().join(","),
  [...EXPECTED_FILES].sort().join(",")
);

check(
  "no final asset path is duplicated",
  new Set(referencedPaths).size,
  20
);

check(
  "every alt is exactly the empty string",
  Object.values(allEntries).every((e) => e.dayAlt === '""' && e.nightAlt === '""'),
  true
);

check(
  "no source / candidate / hybrid / Background Removed filename is referenced",
  referencedPaths.some((p) => /source|candidate|hybrid|Background Removed/i.test(p)),
  false
);

check(
  "no Desktop, public/, or remote URL is referenced",
  /https?:\/\/|\/Users\/|public\/|PUBLIC_URL/.test(manifestSource),
  false
);

check(
  "assets are bundled imports, not runtime path strings",
  imports.size === 20 &&
    referencedPaths.every((p) => p.startsWith("../assets/homeArt/")),
  true
);

console.log("Bundled asset files on disk");

const resolved = referencedPaths.map((p) =>
  path.join(frontendRoot, "src", "data", p)
);

check(
  "every import resolves to an actual bundled repository asset",
  resolved.every((f) => fs.existsSync(f) && fs.statSync(f).size > 0),
  true
);

const parkFiles = resolved.filter((f) => f.endsWith(".jpg"));
const weatherFiles = resolved.filter((f) => f.endsWith(".png"));

check(
  "every park JPEG is exactly 1024x512",
  parkFiles.length === 8 &&
    parkFiles.every((f) => {
      const s = jpegSize(f);
      return s && s.width === 1024 && s.height === 512;
    }),
  true
);

check(
  "every weather PNG is exactly 512x512",
  weatherFiles.length === 12 &&
    weatherFiles.every((f) => {
      const s = decodePNG(f);
      return s && s.width === 512 && s.height === 512;
    }),
  true
);

check(
  "every weather PNG carries a genuine RGBA alpha channel",
  weatherFiles.every((f) => {
    const im = decodePNG(f);
    if (!im || im.channels !== 4 || !im.data) return false;
    // real transparency present, not an opaque alpha channel
    let transparent = 0;
    for (let n = 3; n < im.data.length; n += 4 * 7) {
      if (im.data[n] === 0) transparent += 1;
    }
    return transparent > 0;
  }),
  true
);

check(
  "all four corner pixels of every weather PNG are fully transparent",
  weatherFiles.every((f) => {
    const im = decodePNG(f);
    if (!im || im.channels !== 4 || !im.data) return false;
    const { width: w, height: h, data } = im;
    const a = (x, y) => data[(y * w + x) * 4 + 3];
    return a(0, 0) === 0 && a(w - 1, 0) === 0 && a(0, h - 1) === 0 && a(w - 1, h - 1) === 0;
  }),
  true
);

console.log("Scope protection");

// Comments legitimately describe what the manifest deliberately does NOT do
// ("no cross-family fallback", "separate from rideArtManifest.js"), so the two
// scope assertions below inspect code only.
const manifestCode = manifestSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

check(
  "manifest is data only — no UI, resolver, or fallback logic",
  !/useState|useEffect|React|weatherCode|objectPosition|fallback|resolveWeather/i.test(
    manifestCode
  ),
  true
);

check(
  "manifest exports exactly the two named data constants",
  [...manifestCode.matchAll(/^export\s+(?:const|let|var|function|default|class)?\s*(\w+)?/gm)]
    .map((m) => m[1] || "default")
    .sort()
    .join(","),
  "HOME_PARK_ART,HOME_WEATHER_ART"
);

check(
  "manifest exports no function and no default export",
  // 62B-2 chooses the integration API after inspecting HomeTab's real needs.
  // Shipping a lookup helper now would lock the app into a signature — notably
  // a boolean `night` parameter — before that decision is made.
  /export\s+default|export\s+function|export\s+const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\b)/.test(
    manifestCode
  ),
  false
);

check(
  "ride artwork is untouched and still exactly 104 assets",
  fs.readdirSync(path.join(frontendRoot, "src", "assets", "rideArt"))
    .filter((n) => n.endsWith(".webp")).length,
  104
);

check(
  "Home art does not reference any ride-art asset",
  /rideArt|rideArtManifest/.test(manifestCode),
  false
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
