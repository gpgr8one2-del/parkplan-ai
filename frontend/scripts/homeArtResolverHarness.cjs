#!/usr/bin/env node

// Home artwork key resolution (62B-2A).
//
// Loads src/utils/homeArt.js by stripping its ESM export keywords and running
// it in a plain CommonJS wrapper — the same dependency-free technique the other
// pure-logic harnesses use, so no bundler or package is required.
//
// The forbidden-field check is enforced at RUNTIME with a Proxy that records
// every property read, not by grepping the source. A source grep would pass if
// the field were read via a computed key; the Proxy cannot be fooled that way.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const utilPath = path.join(frontendRoot, "src", "utils", "homeArt.js");
const utilSource = fs.readFileSync(utilPath, "utf8");

const executable = utilSource.replace(/^export\s+/gm, "");
const { resolveHomeParkArtKey, resolveHomeWeatherFamily } = new Function(
  `${executable}\nreturn { resolveHomeParkArtKey, resolveHomeWeatherFamily };`
)();

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

/* ------------------------------------------------------------------ parks -- */

console.log("Park art key — exact mapping");

check("magic_kingdom", resolveHomeParkArtKey("magic_kingdom"), "magicKingdom");
check("epcot", resolveHomeParkArtKey("epcot"), "epcot");
check("hollywood -> hollywoodStudios", resolveHomeParkArtKey("hollywood"), "hollywoodStudios");
check("animal_kingdom", resolveHomeParkArtKey("animal_kingdom"), "animalKingdom");

console.log("Park art key — everything else fails closed");

for (const id of ["universal_sf", "islands", "epic_universe"]) {
  check(`Universal park ${id} -> null`, resolveHomeParkArtKey(id), null);
}
for (const id of [
  "Magic_Kingdom", "MAGIC_KINGDOM", "magicKingdom", "magic kingdom", "magic-kingdom",
  "magic_kingdom ", " magic_kingdom", "magic", "kingdom", "epcot2", "hollywood_studios",
  "hollywoodStudios", "Epcot", "EPCOT", "animalKingdom", "",
]) {
  check(`near match ${JSON.stringify(id)} -> null`, resolveHomeParkArtKey(id), null);
}
for (const [label, value] of [
  ["null", null], ["undefined", undefined], ["number", 1], ["object", {}],
  ["array", []], ["true", true],
]) {
  check(`non-string ${label} -> null`, resolveHomeParkArtKey(value), null);
}
check(
  "prototype keys are not treated as parks",
  resolveHomeParkArtKey("constructor"),
  null
);

/* ---------------------------------------------------------------- weather -- */

const OBS = { tempF: 70, feelsLikeF: 70 }; // minimal current-observation evidence

console.log("Weather family — by weatherCode");

const CODE_CASES = [
  [8000, "storm"],
  [4000, "rain"], [4001, "rain"], [4200, "rain"], [4201, "rain"],
  [1100, "partlyCloudy"], [1101, "partlyCloudy"],
  [1001, "cloudyFog"], [1102, "cloudyFog"], [2000, "cloudyFog"], [2100, "cloudyFog"],
  [1000, "clear"],
];
for (const [code, family] of CODE_CASES) {
  check(`code ${code} -> ${family}`, resolveHomeWeatherFamily({ ...OBS, weatherCode: code }), family);
}
check(
  "numeric-string code is normalized",
  resolveHomeWeatherFamily({ ...OBS, weatherCode: "8000" }),
  "storm"
);
check(
  "padded numeric-string code is normalized",
  resolveHomeWeatherFamily({ ...OBS, weatherCode: " 1000 " }),
  "clear"
);
for (const bad of ["", "   ", "abc", true, false, {}, NaN, Infinity]) {
  check(
    `non-code weatherCode ${JSON.stringify(bad === undefined ? null : bad)} ignored`,
    resolveHomeWeatherFamily({ ...OBS, weatherCode: bad, rawSummary: "Clear" }),
    "clear"
  );
}

console.log("Weather family — by raw summary");

const TEXT_CASES = [
  ["Thunderstorm", "storm"],
  ["Severe lightning nearby", "storm"],
  ["Rain", "rain"], ["Light rain", "rain"], ["Heavy rain", "rain"],
  ["Drizzle", "rain"], ["Showers", "rain"],
  ["Partly cloudy", "partlyCloudy"], ["Mostly clear", "partlyCloudy"], ["Few clouds", "partlyCloudy"],
  ["Mostly cloudy", "cloudyFog"], ["Cloudy", "cloudyFog"], ["Overcast", "cloudyFog"],
  ["Fog", "cloudyFog"], ["Light fog", "cloudyFog"], ["Mist", "cloudyFog"], ["Haze", "cloudyFog"],
  ["Clear", "clear"], ["Sunny", "clear"], ["clear skies", "clear"],
];
for (const [summary, family] of TEXT_CASES) {
  check(`"${summary}" -> ${family}`, resolveHomeWeatherFamily({ ...OBS, rawSummary: summary }), family);
}

console.log("Weather family — precedence");

check(
  "storm outranks rain",
  resolveHomeWeatherFamily({ ...OBS, rawSummary: "Thunderstorm with heavy rain", currentPrecipitation: true }),
  "storm"
);
check(
  "storm outranks heat",
  resolveHomeWeatherFamily({ tempF: 99, feelsLikeF: 104, rawSummary: "Thunderstorm" }),
  "storm"
);
check(
  "storm code outranks rain code",
  resolveHomeWeatherFamily({ ...OBS, weatherCode: 8000, currentPrecipitation: true }),
  "storm"
);
check(
  "rain outranks heat",
  resolveHomeWeatherFamily({ tempF: 99, feelsLikeF: 104, currentPrecipitation: true }),
  "rain"
);
check(
  "rain text outranks heat",
  resolveHomeWeatherFamily({ tempF: 99, feelsLikeF: 104, rawSummary: "Light rain" }),
  "rain"
);
check(
  "heat outranks cloudy",
  resolveHomeWeatherFamily({ tempF: 95, feelsLikeF: 98, rawSummary: "Mostly cloudy" }),
  "heat"
);
check(
  "heat outranks clear",
  resolveHomeWeatherFamily({ tempF: 95, feelsLikeF: 98, rawSummary: "Clear" }),
  "heat"
);
check(
  "heat outranks partly cloudy",
  resolveHomeWeatherFamily({ tempF: 95, feelsLikeF: 98, weatherCode: 1101 }),
  "heat"
);
check(
  "partly cloudy never resolves to cloudyFog (text)",
  resolveHomeWeatherFamily({ ...OBS, rawSummary: "Partly cloudy" }),
  "partlyCloudy"
);
check(
  "partly cloudy never resolves to cloudyFog (code)",
  resolveHomeWeatherFamily({ ...OBS, weatherCode: 1101, rawSummary: "Partly cloudy" }),
  "partlyCloudy"
);
check(
  "mostly clear resolves to partlyCloudy, not clear",
  resolveHomeWeatherFamily({ ...OBS, rawSummary: "Mostly clear" }),
  "partlyCloudy"
);
check(
  "mostly cloudy resolves to cloudyFog, not partlyCloudy",
  resolveHomeWeatherFamily({ ...OBS, rawSummary: "Mostly cloudy" }),
  "cloudyFog"
);

console.log("Weather family — heat threshold");

check("feelsLike 92 is heat", resolveHomeWeatherFamily({ tempF: 80, feelsLikeF: 92 }), "heat");
check("feelsLike 91.9 is not heat", resolveHomeWeatherFamily({ tempF: 80, feelsLikeF: 91.9, rawSummary: "Clear" }), "clear");
check("feelsLike wins over tempF", resolveHomeWeatherFamily({ tempF: 99, feelsLikeF: 80, rawSummary: "Clear" }), "clear");
check("tempF used when feelsLike absent", resolveHomeWeatherFamily({ tempF: 95 }), "heat");
check("tempF used when feelsLike null", resolveHomeWeatherFamily({ tempF: 95, feelsLikeF: null }), "heat");

console.log("Weather family — fails closed");

for (const [label, code] of [
  ["snow 5000", 5000], ["flurries 5001", 5001], ["light snow 5100", 5100], ["heavy snow 5101", 5101],
  ["freezing drizzle 6000", 6000], ["freezing rain 6001", 6001],
  ["light freezing rain 6200", 6200], ["heavy freezing rain 6201", 6201],
  ["ice pellets 7000", 7000], ["heavy ice pellets 7101", 7101], ["light ice pellets 7102", 7102],
  ["unknown code 9999", 9999],
]) {
  check(`${label} -> null`, resolveHomeWeatherFamily({ ...OBS, weatherCode: code }), null);
}
check("snow text -> null", resolveHomeWeatherFamily({ ...OBS, rawSummary: "Snow" }), null);
check("ice pellets text -> null", resolveHomeWeatherFamily({ ...OBS, rawSummary: "Ice pellets" }), null);
check("unreadable text -> null", resolveHomeWeatherFamily({ ...OBS, rawSummary: "Weather available" }), null);

for (const [label, value] of [
  ["null", null], ["undefined", undefined], ["string", "Clear"], ["number", 5], ["array", []],
]) {
  check(`non-object weather ${label} -> null`, resolveHomeWeatherFamily(value), null);
}
check("empty object -> null", resolveHomeWeatherFamily({}), null);
check(
  "mock 'Weather unavailable' payload -> null",
  resolveHomeWeatherFamily({
    summary: "Weather unavailable", rawSummary: "Weather unavailable",
    tempF: null, feelsLikeF: null, humidity: null, rainRisk: null,
    stormMode: false, currentPrecipitation: false,
  }),
  null
);

console.log("Weather family — current-observation evidence is required");

check(
  "forecast-like rawSummary alone -> null",
  resolveHomeWeatherFamily({ rawSummary: "Thunderstorm" }),
  null
);
check(
  "rain text alone, no measurement -> null",
  resolveHomeWeatherFamily({ rawSummary: "Rain possible soon" }),
  null
);
// currentPrecipitation === true is a direct measured current condition, so it
// supplies evidence on its own. `false` must not, because it is the default in
// an otherwise unavailable payload.
check(
  "currentPrecipitation true alone -> rain",
  resolveHomeWeatherFamily({ currentPrecipitation: true }),
  "rain"
);
check(
  "currentPrecipitation true + thunder text -> storm outranks rain",
  resolveHomeWeatherFamily({ currentPrecipitation: true, rawSummary: "Thunderstorms nearby" }),
  "storm"
);
check(
  "currentPrecipitation false + rain text, no other evidence -> null",
  resolveHomeWeatherFamily({ currentPrecipitation: false, rawSummary: "Rain" }),
  null
);
check(
  "currentPrecipitation false alone -> null",
  resolveHomeWeatherFamily({ currentPrecipitation: false }),
  null
);
check(
  "non-boolean currentPrecipitation is not evidence",
  resolveHomeWeatherFamily({ currentPrecipitation: "true", rawSummary: "Rain" }),
  null
);
check(
  "unavailable sentinel wins over any other signal",
  resolveHomeWeatherFamily({
    rawSummary: "Weather unavailable", currentPrecipitation: true, tempF: 95,
  }),
  null
);
check(
  "a real code supplies evidence",
  resolveHomeWeatherFamily({ weatherCode: 8000 }),
  "storm"
);
check(
  "a real tempF supplies evidence",
  resolveHomeWeatherFamily({ tempF: 70, rawSummary: "Clear" }),
  "clear"
);
check(
  "a real feelsLikeF supplies evidence",
  resolveHomeWeatherFamily({ feelsLikeF: 70, rawSummary: "Clear" }),
  "clear"
);

/* ------------------------------------------ forbidden fields, at runtime -- */

console.log("Forecast-contaminated fields are never read");

const FORBIDDEN = [
  "summary", "stormMode", "rainRisk", "weatherMode",
  "upcomingPrecipitation", "nextPrecipitationWindow", "precipitationProbability",
  "precipitationIntensityInPerHr", "forecastSource", "forecastHoursChecked",
  "precipitationLastHourIn",
];

function watched(payload) {
  const reads = [];
  return {
    reads,
    proxy: new Proxy(payload, {
      get(target, prop) {
        if (typeof prop === "string") reads.push(prop);
        return target[prop];
      },
    }),
  };
}

{
  // A payload whose contaminated fields all scream "storm" while the genuine
  // current observation is a clear, mild day. Reading any forbidden field would
  // change the answer, so this is behavioural as well as structural.
  const payload = {
    rawSummary: "Clear", currentPrecipitation: false, weatherCode: 1000,
    tempF: 70, feelsLikeF: 70,
    summary: "Thunderstorm", stormMode: true, rainRisk: 0.95,
    weatherMode: { mode: "storm", label: "Storm Smart Mode" },
    upcomingPrecipitation: true,
    nextPrecipitationWindow: { summary: "Thunderstorm", rainRisk: 0.9 },
    precipitationProbability: 90, precipitationIntensityInPerHr: 0.5,
    forecastSource: "forecast", forecastHoursChecked: 3, precipitationLastHourIn: 0.4,
  };
  const { reads, proxy } = watched(payload);
  const result = resolveHomeWeatherFamily(proxy);

  check("contaminated payload still resolves from current data", result, "clear");
  check(
    "no forbidden property was accessed",
    reads.filter((k) => FORBIDDEN.includes(k)).join(",") || "none",
    "none"
  );
  check(
    "only the five trusted fields were read",
    [...new Set(reads)].sort().join(","),
    "currentPrecipitation,feelsLikeF,rawSummary,tempF,weatherCode"
  );
}

console.log("Inputs are not mutated");

{
  const payload = {
    rawSummary: "Partly cloudy", currentPrecipitation: false, weatherCode: 1101,
    tempF: 78, feelsLikeF: 80, summary: "Rain possible nearby", stormMode: true,
  };
  const before = JSON.stringify(payload);
  resolveHomeWeatherFamily(payload);
  resolveHomeParkArtKey("magic_kingdom");
  check("weather object is unchanged after resolution", JSON.stringify(payload), before);
  check("frozen input does not throw", (() => {
    try { return resolveHomeWeatherFamily(Object.freeze({ tempF: 70, rawSummary: "Clear" })); }
    catch { return "THREW"; }
  })(), "clear");
}

console.log("Determinism and purity");

{
  const payload = { tempF: 88, feelsLikeF: 90, rawSummary: "Mostly cloudy", weatherCode: 1102 };
  const runs = new Set(Array.from({ length: 25 }, () => resolveHomeWeatherFamily(payload)));
  check("repeated calls are identical", runs.size, 1);
  check("repeated park calls are identical",
    new Set(Array.from({ length: 25 }, () => resolveHomeParkArtKey("hollywood"))).size, 1);
}

console.log("Module scope");

{
  const code = utilSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("no React or JSX", /\breact\b|useState|useEffect|<[A-Z]/i.test(code), false);
  check("no DOM access", /\bdocument\b|\bwindow\b|localStorage|sessionStorage/.test(code), false);
  check("no theme or night logic", /isNight|planNight|theme|palette|colors/i.test(code), false);
  check("no asset or manifest import", /homeArtManifest|assets\/|\.png|\.jpg|src:/i.test(code), false);
  check("no imports at all", /^\s*import\s/m.test(code), false);
  check("no timers, randomness, or clock", /setTimeout|setInterval|Math\.random|new Date\(|Date\.now/.test(code), false);
  check(
    "forbidden field names absent from source",
    FORBIDDEN.some((f) => new RegExp(`\\b${f}\\b`).test(code)),
    false
  );
  check(
    "exports exactly the two resolvers",
    [...utilSource.matchAll(/^export\s+function\s+(\w+)/gm)].map((m) => m[1]).sort().join(","),
    "resolveHomeParkArtKey,resolveHomeWeatherFamily"
  );
  check("no default export", /export\s+default/.test(utilSource), false);
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
