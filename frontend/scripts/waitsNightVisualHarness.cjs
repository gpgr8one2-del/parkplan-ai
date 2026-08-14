#!/usr/bin/env node

// Waits night presentation, prepared and inactive (63C-1).
//
// FEATURE-DISCRIMINATING assertions must FAIL against the pinned pre-night
// baseline and pass here. INVARIANT REGRESSION GUARDS protect behaviour, state,
// copy, day geometry, Plan and the shell — they legitimately pass at the
// baseline too, which is what makes them regression guards rather than feature
// checks.
//
// Most night assertions are made against RENDERED output rather than source
// text. Reading a ternary cannot prove a surface is actually dark: the branch
// can be present and unreachable, or reachable and wrong. Rendering every state
// at night={true} and inspecting the emitted styles proves what ships.
//
// Run with WAITS_NIGHT_BASELINE=1 to check the discrimination claim: in a
// detached worktree of the pinned baseline, every feature assertion must fail
// and every invariant must still pass.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const appSource = read("src", "App.jsx");
const waitsTabSource = read("src", "components", "WaitsTab.jsx");
const listSource = read("src", "components", "WaitTimesList.jsx");
const freshnessSource = read("src", "components", "FreshnessBadge.jsx");
const bannerSource = read("src", "components", "DataStatusBanner.jsx");
const bottomTabsSource = read("src", "components", "BottomTabs.jsx");
const resolverSource = read("src", "utils", "waitsViewState.js");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCode = strip(appSource);
const waitsTabCode = strip(waitsTabSource);
const listCode = strip(listSource);
const waitsSurface = `${waitsTabCode}\n${listCode}`;

// App's two renderers, sliced so assertions about the Waits variant cannot be
// satisfied by unrelated code elsewhere in a 5,900-line file.
function sliceFn(marker) {
  const start = appCode.indexOf(marker);
  if (start < 0) return "";
  const end = appCode.indexOf("\n  }\n", start);
  return end > start ? appCode.slice(start, end) : "";
}
const rideActions = sliceFn("function renderRideActions(ride, options = {}) {");
const showtimeInfo = sliceFn("function renderShowtimeInfo(ride, options = {}) {");

// The <WaitsTab .../> element, likewise sliced.
const waitsTabCall = (() => {
  const open = appCode.indexOf("<WaitsTab");
  if (open < 0) return "";
  const close = appCode.indexOf("\n            />", open);
  return close > open ? appCode.slice(open, close) : "";
})();

/* ----------------------------------------------------------- rendering -- */

function render(night) {
  return execFileSync(
    process.execPath,
    [path.join(frontendRoot, "scripts", "waitsDayParityRender.cjs")],
    {
      cwd: frontendRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, PARITY_NIGHT: night ? "1" : "0" },
      stdio: ["ignore", "pipe", "ignore"],
    }
  );
}

let NIGHT_HTML = "";
let DAY_HTML = "";
let renderError = "";
try {
  NIGHT_HTML = render(true);
  DAY_HTML = render(false);
} catch (err) {
  renderError = err.message;
}

// Split the rendered dump into named scenarios.
function split(html) {
  const map = {};
  for (const chunk of html.split(/^===== /m).slice(1)) {
    const name = chunk.slice(0, chunk.indexOf(" ====="));
    map[name] = chunk.slice(chunk.indexOf("\n") + 1);
  }
  return map;
}
const N = split(NIGHT_HTML);
const D = split(DAY_HTML);

// Every style value the night render emits, so "is anything still white" can be
// answered over values rather than over a raw string that also holds copy.
const nightStyleValues = [...NIGHT_HTML.matchAll(/style="([^"]*)"/g)]
  .flatMap((m) => m[1].split(";"))
  .map((d) => d.trim())
  .filter(Boolean);

const WHITE = /(#(?:FFFFFF|FFF|ffffff|fff)\b|rgba?\(\s*255,\s*255,\s*255[^)]*\))/;
const BLACK = /(#(?:000000|000)\b|rgba?\(\s*0,\s*0,\s*0[^)]*\))/;

let passCount = 0;
let failCount = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;
const featureLabels = [];

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
  return ok;
}
function featureCheck(l, a, e) {
  featureLabels.push(l);
  const b = failCount;
  check(l, a, e);
  if (failCount > b) featureFail += 1;
  else featurePass += 1;
}
function invariantCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) invariantFail += 1;
  else invariantPass += 1;
}

console.log("Waits night presentation (63C-1) — FEATURE-DISCRIMINATING");

// A precondition, not a feature claim — it is true at the baseline too, so it
// is counted outside the discriminating set.
check("both renders completed", renderError === "" && !NIGHT_HTML.includes("RENDER_ERROR"), true);

/* --- 1-3. the explicit, inactive contract ------------------------------- */

featureCheck(
  "1. WaitsTab accepts an explicit night prop and derives it from nothing",
  /\bnight = false,/.test(waitsTabCode) &&
    // no clock, theme, tab, storage or media query anywhere in the file
    !/planNight|shellNight|getTohiAppShellTheme|activeTab|localStorage|sessionStorage|matchMedia|prefers-color-scheme|new Date|getHours/.test(
      waitsTabCode
    ),
  true
);

featureCheck(
  "2. WaitTimesList accepts an explicit night prop and derives it from nothing",
  /\bnight = false,/.test(listCode) &&
    !/planNight|shellNight|getTohiAppShellTheme|activeTab|localStorage|sessionStorage|matchMedia|prefers-color-scheme|new Date|getHours/.test(
      listCode
    ),
  true
);

featureCheck(
  "3. App passes a LITERAL false to WaitsTab — not a variable, not a derivation",
  waitsTabCall.length > 0 &&
    /night=\{false\}/.test(waitsTabCall) &&
    (waitsTabCall.match(/\bnight=\{[^}]*\}/g) || []).length === 1,
  true
);

featureCheck(
  "24. night is prepared but INACTIVE — no night value can reach the Waits render",
  // The literal gate above, plus proof that the day render is what ships: the
  // rendered day output carries none of the night palette.
  /night=\{false\}/.test(waitsTabCall) &&
    !/#131C36|#1A2444|#281757|#1E2650|#2A0B1F|#192D4B|#0A1022|#2F1B1A|#2E1128|#0C3539/.test(
      DAY_HTML
    ),
  true
);

/* --- 6. every WaitsTab conditional surface has a night treatment --------- */

// Each entry: the scenario that reaches the surface, and a night value that
// surface must emit. Rendered, so an unreachable branch cannot satisfy it.
const WAITS_SURFACES = [
  ["LIVE WAITS eyebrow", "healthy-active-park", "background:#281757", "color:#C4B5FD"],
  ["park-specific heading", "healthy-active-park", "color:#F5F3FF", "Hollywood Studios wait times"],
  ["helper copy", "healthy-active-park", "color:#B6C2E2", "Check current waits"],
  ["caution icon and copy", "healthy-active-park", "color:#FCD34D", "Wait data can lag"],
  ["Refresh button", "healthy-active-park", "background:#131C36", "Refresh"],
  ["disabled Loading button", "refreshing-with-retained-data", "background:#131C36", "Loading"],
  ["freshness pill", "healthy-active-park", "color:#6EE7B7", "Live"],
  ["stale banner", "stale", "rgba(67, 20, 7, 0.55)", "Using slightly older data"],
  [
    "refresh-error-with-retained-data banner",
    "active-refresh-error-with-retained-data",
    "background:#2A0B1F",
    "Showing the last available data",
  ],
  ["composed error surface", "error-with-no-data", "background:#131C36", "Wait times unavailable"],
  ["composed empty surface", "valid-empty", "background:#131C36", "No attractions to show"],
  ["quiet browsed-loading surface", "browsed-loading", "background:#131C36", "Loading EPCOT wait times"],
  ["quiet browsed-error surface", "browsed-error", "background:#131C36", "unavailable right now"],
  ["VIEWING ONLY label", "browsed-healthy-viewing-only", "color:#B6C2E2", "VIEWING ONLY"],
  ["loading skeletons", "loading-before-first-data", "background:#1E2650", "border-radius:26px"],
];

for (const [name, scenario, nightValue, marker] of WAITS_SURFACES) {
  const html = N[scenario] || "";
  featureCheck(
    `6. night treatment reaches the ${name}`,
    html.includes(nightValue) && html.includes(marker),
    true
  );
}

// Preservation, not a new capability: true at the baseline and it must stay
// true, so it is an invariant rather than a discriminating assertion.
invariantCheck(
  "6. skeleton animation and reduced-motion behaviour survive at night",
  (N["loading-before-first-data"] || "").includes("tohiWaitsPulse 1.8s ease-in-out infinite") &&
    (N["loading-before-first-data"] || "").includes("prefers-reduced-motion: reduce") &&
    (N["loading-before-first-data"] || "").includes("animation: none !important"),
  true
);

/* --- 7. every attraction-card variant has a night treatment -------------- */

const CARD_VARIANTS = [
  ["standard attraction card", "healthy-active-park", "background:#131C36"],
  ["active In Line card", "active-in-line", "linear-gradient(145deg, #131C36 0%, #1F214A 100%)"],
  ["attraction name", "healthy-active-park", "color:#F5F3FF"],
  ["attraction metadata", "healthy-active-park", "color:#B6C2E2"],
  ["Low wait", "healthy-active-park", "background:#0C3539"],
  ["Manageable", "healthy-active-park", "background:#2F1B1A"],
  ["High wait", "healthy-active-park", "background:#2E1128"],
  ["Closed", "closed", "background:#0A1022"],
  ["Wait unavailable", "wait-unavailable", "background:#0A1022"],
  ["Showtimes status", "scheduled-show", "background:#192D4B"],
  ["card border", "healthy-active-park", "border:1px solid #282E66"],
  // Same offset and blur as day; only the shadow colour deepens.
  ["card shadow", "healthy-active-park", "box-shadow:0 10px 30px rgba(2, 6, 23, 0.45)"],
];

for (const [name, scenario, nightValue] of CARD_VARIANTS) {
  featureCheck(
    `7. night treatment reaches the ${name}`,
    (N[scenario] || "").includes(nightValue),
    true
  );
}

featureCheck(
  "7. the wait value and unit are both re-toned at night",
  // 65 min is a High wait: value takes the tone colour, unit the muted colour.
  (() => {
    const h = N["healthy-active-park"] || "";
    return (
      /color:#FB7185[^"]*"[^>]*><div style="font-size:42px/.test(h) &&
      h.includes("text-transform:uppercase;color:#B6C2E2")
    );
  })(),
  true
);

// Preservation, not a new capability. Invariant for the same reason as above.
invariantCheck(
  "7. a null wait still renders -- / wait at night, never an invented number",
  (() => {
    const c = N["closed"] || "";
    const u = N["wait-unavailable"] || "";
    return (
      c.includes(">--</div>") &&
      c.includes(">wait</div>") &&
      u.includes(">--</div>") &&
      u.includes(">wait</div>")
    );
  })(),
  true
);

featureCheck(
  "7. closed outranks the scheduled-show treatment at night",
  (() => {
    const s = N["closed-attraction-with-stored-showtimes"] || "";
    // The locked precedence is about the STATUS and the WAIT COLUMN: a closed
    // attraction that still carries a stored schedule reads Closed with -- /
    // wait, and never borrows the sky Showtimes status or the "Scheduled show"
    // meta. Whether the stored panel itself still renders below is existing
    // day behaviour, unchanged by this phase and pinned by the day-parity
    // harness — asserting its absence here would assert a change 63C-1 must
    // not make.
    return (
      s.includes("background:#0A1022") &&
      s.includes(">Closed</span>") &&
      !s.includes(">Showtimes</span>") &&
      !s.includes("Scheduled show") &&
      s.includes(">--</div>") &&
      s.includes(">wait</div>")
    );
  })(),
  true
);

/* --- 8. every action has a night treatment ------------------------------ */

featureCheck(
  "8. the Waits action variant accepts the explicit night value from WaitsTab",
  /renderRideActions\(ride, \{ night \}\)/.test(waitsTabCode) &&
    /const night = options\.night === true;/.test(rideActions),
  true
);

const ACTIONS = [
  ["In Line", "healthy-active-park", "color:#C4B5FD", ">In Line<"],
  ["In Line Now disabled", "active-in-line", "color:#A8B4CC", ">In Line Now<"],
  ["Done", "healthy-active-park", "color:#6EE7B7", "Done<"],
  ["Skip", "healthy-active-park", "color:#B6C2E2", ">Skip<"],
  ["Report Issue", "healthy-active-park", "color:#FCD34D", ">Report Issue<"],
];
for (const [name, scenario, nightValue, marker] of ACTIONS) {
  const html = N[scenario] || "";
  featureCheck(
    `8. night treatment reaches the ${name} action`,
    html.includes(nightValue) && html.includes(marker),
    true
  );
}

featureCheck(
  "8. the Waits action surface and border are treated at night",
  (N["healthy-active-park"] || "").includes("background:#1A2444") &&
    (N["healthy-active-park"] || "").includes("border:1px solid rgba(129, 140, 248, 0.28)"),
  true
);

featureCheck(
  "8. In Line Now keeps its disabled border treatment at night",
  (N["active-in-line"] || "").includes("border-color:rgba(148, 163, 184, 0.30)"),
  true
);

/* --- 9. the Waits showtime panel has a night treatment ------------------ */

featureCheck(
  "9. the Waits showtime variant accepts the explicit night value from WaitsTab",
  /renderShowtimeInfo\(ride, \{ night \}\)/.test(waitsTabCode) &&
    /const night = options\.night === true;/.test(showtimeInfo),
  true
);

featureCheck(
  "9. the Typical Showtimes panel, its pills and its warning are all treated",
  (() => {
    const s = N["scheduled-show"] || "";
    return (
      s.includes("background:#192D4B") && // panel
      s.includes("color:#7DD3FC") && // panel eyebrow
      s.includes("background:#132139") && // time pills
      s.includes("color:#CBD5F0") && // pill text + verification warning
      s.includes("Typical showtimes") &&
      s.includes("Verify in My Disney Experience. Showtimes can change by day.")
    );
  })(),
  true
);

// The Waits showtime panel and the Waits actions live in App.jsx, but the
// rendered output above comes from waitsDayParityRender.cjs's reproduction of
// them. Asserting only the render would let App's real renderer lose its night
// branch while the reproduction kept it — a mutation that survived until this
// check existed. So the night values are asserted in App's own source too,
// scoped to each sliced renderer.
featureCheck(
  "9. App's real showtime renderer carries the Waits night branch",
  showtimeInfo.length > 0 &&
    /background: night \? "#192D4B" : "#E0F2FE",/.test(showtimeInfo) &&
    /color: night \? "#7DD3FC" : "#0369A1",/.test(showtimeInfo) &&
    /background: night \? "#132139" : "rgba\(255, 255, 255, 0\.85\)",/.test(showtimeInfo) &&
    (showtimeInfo.match(/color: night \? "#CBD5F0" : colors\.muted,/g) || []).length === 2,
  true
);

featureCheck(
  "8. App's real action renderer carries the Waits night surface and every action colour",
  rideActions.length > 0 &&
    /background: "#1A2444",/.test(rideActions) &&
    /border: "1px solid rgba\(129, 140, 248, 0\.28\)",/.test(rideActions) &&
    /night\s*\?\s*"#A8B4CC"/.test(rideActions) && // In Line Now disabled
    /night\s*\?\s*"#C4B5FD"/.test(rideActions) && // In Line
    /night \? "#6EE7B7" : colors\.success/.test(rideActions) && // Done
    /night \? "#B6C2E2" : colors\.muted/.test(rideActions) && // Skip
    /night \? "#FCD34D" : "#92400E"/.test(rideActions), // Report Issue
  true
);

/* --- 10-12. shared components and skeletons ----------------------------- */

featureCheck(
  "10. FreshnessBadge receives night from WaitsTab, and renders a night pill",
  /<FreshnessBadge[\s\S]{0,220}night=\{night\}/.test(waitsTabCode) &&
    (N["healthy-active-park"] || "").includes("background-color:rgba(6, 78, 59, 0.55)"),
  true
);

featureCheck(
  "11. DataStatusBanner receives night from WaitsTab, and renders a night banner",
  /<DataStatusBanner source=\{waitListParkData\?\.source\} night=\{night\} \/>/.test(
    waitsTabCode
  ) && (N["stale"] || "").includes("background-color:rgba(67, 20, 7, 0.55)"),
  true
);

featureCheck(
  "12. skeleton cards AND their bars both have night surfaces",
  (() => {
    const s = N["loading-before-first-data"] || "";
    return (
      s.includes("background:#131C36") && // the card
      s.includes("background:#1E2650") && // every bar
      !s.includes("rgba(234, 220, 200, 0.85)") // no day fill survives
    );
  })(),
  true
);

/* --- 13-16. the acceptance rules for a dark surface --------------------- */

featureCheck(
  "13. the error and empty surfaces are not bright white at night",
  (() => {
    for (const s of ["error-with-no-data", "valid-empty", "browsed-loading", "browsed-error"]) {
      const html = N[s] || "";
      if (!html.includes("background:#131C36")) return false;
      if (WHITE.test(html.replace(/rgba\(255, 255, 255, 0\)/g, ""))) return false;
    }
    return true;
  })(),
  true
);

featureCheck(
  "14. stale and refresh-error stay semantically distinct at night",
  (() => {
    const stale = N["stale"] || "";
    const err = N["active-refresh-error-with-retained-data"] || "";
    // Amber family vs rose family, and neither borrows the other's fill.
    return (
      stale.includes("rgba(67, 20, 7, 0.55)") &&
      stale.includes("#FDBA74") &&
      err.includes("#2A0B1F") &&
      err.includes("#FDA4AF") &&
      !stale.includes("#2A0B1F") &&
      !err.includes("rgba(67, 20, 7, 0.55)")
    );
  })(),
  true
);

// "No pure black" is only a meaningful claim once the surface is actually dark:
// a light render trivially contains no black. So the two halves are asserted
// together — every opaque background is a genuinely dark navy, AND none of them
// (nor any text or border) is pure black. At the baseline the first half fails,
// which is what makes this discriminate.
featureCheck(
  "15. every night surface is deep navy — dark, but never pure black",
  (() => {
    const noBlack =
      nightStyleValues.filter(
        (d) => /^(background|background-color|color|border-color)\s*:/.test(d) && BLACK.test(d)
      ).length === 0;

    // Relative luminance of every opaque background the night render emits.
    const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const backgrounds = nightStyleValues.filter((d) =>
      /^(background|background-color)\s*:/.test(d)
    );
    let checked = 0;
    for (const decl of backgrounds) {
      for (const m of decl.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
        const v = parseInt(m[1], 16);
        const L = lum((v >> 16) & 255, (v >> 8) & 255, v & 255);
        checked += 1;
        // Dark enough to be a night surface, light enough not to be black.
        if (L > 0.22 || L < 0.005) return false;
      }
    }
    return noBlack && checked >= 8;
  })(),
  true
);

featureCheck(
  "16. no unguarded day-white card survives when night is true",
  // Every background declaration across every night scenario, checked as a
  // value. Fully transparent white is not a card fill and is allowed.
  nightStyleValues.filter(
    (d) =>
      /^(background|background-color)\s*:/.test(d) &&
      WHITE.test(d) &&
      !/rgba\(\s*255,\s*255,\s*255,\s*0\s*\)/.test(d)
  ).length,
  0
);

featureCheck(
  "16. no day cream, warm border or day shadow survives at night either",
  // The specific day tokens the Waits surface uses. A missed branch would leave
  // one of these behind.
  [
    "#FFFFFF",
    "#FFF9F1",
    "#F3E8FF",
    "#241C15",
    "#7A6F63",
    "rgba(234, 220, 200, 0.45)",
    "rgba(234, 220, 200, 0.85)",
    "rgba(234, 220, 200, 0.90)",
    "rgba(28, 25, 23, 0.055)",
    "#FEF2F2",
    "#9F1239",
    "#E0F2FE",
    "#0369A1",
    "#D1FAE5",
    "#FEF3C7",
    "#FFE4E6",
    "#B58A3C",
  ]
    .filter((tok) => NIGHT_HTML.includes(tok))
    .join(" | "),
  ""
);

console.log("Behaviour, state, copy, day, Plan and shell preserved — INVARIANT REGRESSION GUARDS");

/* --- 4-5. the shell decision is untouched ------------------------------- */

invariantCheck(
  "4. Waits is still EXCLUDED from shellNight",
  /const shellNight\s*=\s*\n?\s*\(activeTab === "plan" \|\| activeTab === "home"\)\s*&&\s*planNight;/.test(
    appCode
  ) &&
    (() => {
      const m = appCode.match(/const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*planNight;/);
      if (!m) return false;
      const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
      return tabs.join(",") === "home,plan";
    })() &&
    // and nothing in the Waits branch reads the shell
    !/shellNight|shellTokens|pageStyle/.test(waitsTabCall) &&
    !/shellNight|shellTokens|getTohiAppShellTheme/.test(waitsSurface),
  true
);

invariantCheck(
  "5. BottomTabs still receives the existing shellNight decision",
  /<BottomTabs[\s\S]{0,200}night=\{shellNight\}/.test(appCode) &&
    /export function BottomTabs\(\{[^}]*night = false/.test(bottomTabsSource),
  true
);

invariantCheck(
  "no second night mechanism was introduced anywhere",
  (appCode.match(/const shellNight\s*=/g) || []).length === 1 &&
    (appCode.match(/const planNight\s*=/g) || []).length === 1 &&
    !/matchMedia|prefers-color-scheme/.test(appCode) &&
    !/(localStorage|sessionStorage)[^\n]*(night|dark|theme)/i.test(appCode),
  true
);

/* --- 17. day geometry is unchanged -------------------------------------- */

invariantCheck(
  "17. the locked day geometry is unchanged — and night shares it exactly",
  (() => {
    const geometry = [
      "font-size:17.5px", // attraction name
      "font-size:42px", // wait value
      "border-radius:26px", // card radius
      "padding:20px", // card padding
      "min-height:48px", // action height
      "grid-template-columns:1fr 1fr", // 2x2 actions
    ];
    const scenario = "all-card-variants";
    return geometry.every(
      (g) => (D[scenario] || "").includes(g) && (N[scenario] || "").includes(g)
    );
  })(),
  true
);

invariantCheck(
  "17. night changes only colour — every non-colour declaration is identical",
  // Strip colour values from both renders. What remains is layout, spacing,
  // type and geometry, and it must match exactly.
  (() => {
    const skeleton = (html) =>
      html
        .replace(/#[0-9a-fA-F]{3,8}\b/g, "«c»")
        .replace(/rgba?\([^)]*\)/g, "«c»")
        .replace(/linear-gradient\([^;"]*\)/g, "«c»");
    return skeleton(DAY_HTML) === skeleton(NIGHT_HTML);
  })(),
  true
);

invariantCheck(
  "17. no artwork, circle, blob, glow, count tile or new control was added",
  !/<img|<svg[^>]*circle|border-radius:999px;width:76px|filter:blur/.test(NIGHT_HTML) &&
    !/radial-gradient/.test(NIGHT_HTML) &&
    // exactly one button on the WaitsTab surface itself: the header Refresh
    (waitsTabCode.match(/<button/g) || []).length === 1 &&
    !/Try Again|Try again|Retry/.test(waitsSurface),
  true
);

/* --- 18. exact copy is unchanged ---------------------------------------- */

invariantCheck(
  "18. every exact approved string is unchanged, and identical in day and night",
  (() => {
    const COPY = [
      "LIVE WAITS",
      "Check current waits and mark what your family is doing.",
      "Wait data can lag during reopenings or weather delays.",
      "Using slightly older data while we refresh in the background.",
      "Couldn’t refresh wait times. Showing the last available data.",
      "Wait times unavailable",
      "We couldn’t load wait times right now. Try refreshing in a moment.",
      "No attractions to show",
      "No attractions are available for this park right now.",
      "VIEWING ONLY",
      "Loading EPCOT wait times…",
      "EPCOT wait times are unavailable right now.",
      "Verify in My Disney Experience. Showtimes can change by day.",
      "Typical showtimes",
      "In Line",
      "In Line Now",
      "Done",
      "Skip",
      "Report Issue",
      "Low wait",
      "Manageable",
      "High wait",
      "Closed",
      "Wait unavailable",
      "Showtimes",
      "Scheduled show",
      "Refresh",
      "Loading",
    ];
    return COPY.every((c) => DAY_HTML.includes(c) && NIGHT_HTML.includes(c));
  })(),
  true
);

invariantCheck(
  "18. the copy contract still lives in the resolver, untouched",
  /STALE_BANNER: "Using slightly older data while we refresh in the background\.",/.test(
    resolverSource
  ) &&
    /ACTIVE_ERROR_TITLE: "Wait times unavailable",/.test(resolverSource) &&
    /EMPTY_TITLE: "No attractions to show",/.test(resolverSource) &&
    /VIEWING_ONLY: "VIEWING ONLY",/.test(resolverSource),
  true
);

/* --- 19. state precedence is unchanged ---------------------------------- */

invariantCheck(
  "19. the resolver is untouched: same states, same order, still pure",
  /LOADING_INITIAL: "loading_initial",/.test(resolverSource) &&
    /status = error \? WAITS_VIEW_STATES\.ERROR_NO_DATA : WAITS_VIEW_STATES\.LOADING_INITIAL;/.test(
      resolverSource
    ) &&
    /\} else if \(error\) \{/.test(resolverSource) &&
    /\} else if \(visibleRideCount === 0\) \{/.test(resolverSource) &&
    /\} else if \(source === "stale"\) \{/.test(resolverSource) &&
    !/IDLE:/.test(resolverSource) &&
    !/\bimport\b|\brequire\(|useState|useEffect|fetch\(|localStorage|setTimeout|new Date|\bnight\b/.test(
      resolverSource
    ),
  true
);

invariantCheck(
  "19. WaitsTab still renders from the resolver, and night decides no state",
  /const view = resolveWaitsViewState\(\{/.test(waitsTabCode) &&
    /\{view\.showSkeletons && <WaitsSkeletonList/.test(waitsTabCode) &&
    /\{view\.showComposed && \(/.test(waitsTabCode) &&
    /\{view\.showCards && \(/.test(waitsTabCode) &&
    /\{view\.showFreshness && \(/.test(waitsTabCode) &&
    /\{view\.showViewingOnly && \(/.test(waitsTabCode) &&
    // night never appears in a condition that selects a state
    !/night\s*(&&|\?)[^\n]*view\./.test(waitsTabCode) &&
    !/view\.[a-zA-Z]+\s*&&\s*night/.test(waitsTabCode),
  true
);

invariantCheck(
  "19. day and night resolve the SAME state in every scenario",
  // The strongest form of this: strip colour from both renders and require the
  // structures to match. Already asserted above for geometry; here it is the
  // state-selection claim, checked per scenario so a failure names the state.
  Object.keys(D).every((k) => {
    const skel = (h) =>
      (h || "")
        .replace(/#[0-9a-fA-F]{3,8}\b/g, "«c»")
        .replace(/rgba?\([^)]*\)/g, "«c»")
        .replace(/linear-gradient\([^;"]*\)/g, "«c»");
    return skel(D[k]) === skel(N[k]);
  }),
  true
);

invariantCheck(
  "19. closed still outranks the scheduled-show treatment in BOTH modes",
  // The gate itself, plus the rendered result in day and night: same status,
  // same meta, same wait column. Night must not shift this precedence in
  // either direction.
  /const isScheduledShow =\s*\n\s*ride\.isOpen === true &&/.test(listCode) &&
    ["closed-attraction-with-stored-showtimes"].every((s) =>
      [D[s] || "", N[s] || ""].every(
        (html) =>
          html.includes(">Closed</span>") &&
          !html.includes(">Showtimes</span>") &&
          !html.includes("Scheduled show") &&
          html.includes(">--</div>")
      )
    ) &&
    // and an OPEN show still does get the scheduled-show treatment, so the
    // guard above is proving precedence rather than a dead branch
    [D["scheduled-show"] || "", N["scheduled-show"] || ""].every(
      (html) => html.includes(">Showtimes</span>") && html.includes("Scheduled show")
    ),
  true
);

/* --- 20-21. handlers, refresh routing, browsed isolation ---------------- */

invariantCheck(
  "20. all four handlers remain in App and are never reimplemented in Waits",
  /function handleInLine\(ride\) \{/.test(appCode) &&
    /function handleDone\(rideId\) \{/.test(appCode) &&
    /function handleSkip\(rideId\) \{/.test(appCode) &&
    /function handleReportRideIssue\(ride\) \{/.test(appCode) &&
    !/handleInLine|handleDone|handleSkip|handleReportRideIssue|trackAppEvent/.test(waitsSurface) &&
    // the handlers are still wired to the buttons
    /onClick=\{\(\) => handleInLine\(ride\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleDone\(ride\.id\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleSkip\(ride\.id\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleReportRideIssue\(ride\)\}/.test(rideActions) &&
    /disabled=\{isActiveRide\}/.test(rideActions),
  true
);

invariantCheck(
  "20. refresh routing still follows the DISPLAYED park",
  /function handleWaitsRefresh\(\) \{/.test(appCode) &&
    /loadData=\{handleWaitsRefresh\}/.test(appCode) &&
    /const waitsLoading = browsingAnotherPark \? browsedParkRequest\.loading : loading;/.test(
      appCode
    ) &&
    /const waitsError = browsingAnotherPark \? browsedParkRequest\.error : error;/.test(appCode),
  true
);

invariantCheck(
  "20. sorting and filtering remain owned by App and unchanged",
  /\.filter\(\(ride\) => shouldShowRideInWaitList\(waitListParkId, ride\)\)/.test(appCode) &&
    /\.sort\(\(a, b\) => \(b\.waitTime \|\| 0\) - \(a\.waitTime \|\| 0\)\)/.test(appCode) &&
    !/\.sort\(|\.filter\(/.test(waitsSurface),
  true
);

invariantCheck(
  "21. browsed-park isolation is unchanged, in day and at night",
  // The gate is still on browsingAnotherPark alone — night is not part of it.
  /hasShowtimeSchedule=\{browsingAnotherPark \? \(\) => false : hasShowtimeSchedule\}/.test(
    waitsTabCode
  ) &&
    /renderShowtimeInfo=\{\s*browsingAnotherPark \? \(\) => null :/.test(waitsTabCode) &&
    /renderRideActions=\{\s*browsingAnotherPark \? \(\) => null :/.test(waitsTabCode) &&
    /const waitListParkData = browsingAnotherPark \? browsedParkData : parkData;/.test(appCode) &&
    (appCode.match(/browsedParkData/g) || []).length === 2 &&
    // and it holds in the render: no actions, no showtimes while browsing
    !(N["browsed-healthy-viewing-only"] || "").includes(">In Line<") &&
    !(N["browsed-healthy-viewing-only"] || "").includes("Typical showtimes") &&
    !(D["browsed-healthy-viewing-only"] || "").includes(">In Line<"),
  true
);

invariantCheck(
  "21. a browsed failure is never presented as the active park's failure",
  (() => {
    const be = N["browsed-error"] || "";
    return (
      be.includes("EPCOT wait times are unavailable right now.") &&
      !be.includes("Wait times unavailable") &&
      !be.includes("Try refreshing in a moment")
    );
  })(),
  true
);

/* --- 22. Plan is untouched ---------------------------------------------- */

invariantCheck(
  "22. Plan's action presentation — default, compact and night — is unchanged",
  /const compact = options\.compact === true;/.test(rideActions) &&
    /padding: "6px 9px",\n          fontSize: 11,/.test(rideActions) &&
    /minHeight: 36,/.test(rideActions) &&
    // the shared night surface Plan uses is untouched by the Waits-only override
    /background: "rgba\(15, 23, 42, 0\.72\)",\n          border: "1px solid rgba\(99, 102, 241, 0\.30\)",\n          color: "#E2E8F0",/.test(
      rideActions
    ) &&
    /renderRideActions\(ride, \{ night: planNight, compact: true \}\)/.test(
      read("src", "components", "PlanRecommendations.jsx")
    ),
  true
);

invariantCheck(
  "22. Plan's showtime presentation is unchanged, including both extra lines",
  /Best target: \{showProfile\.recommendedShowtimes\.join\(" or "\)\}/.test(showtimeInfo) &&
    /Arrival buffer:/.test(showtimeInfo) &&
    /\(showProfile\.arrivalBufferMinutes \|\| showProfile\.middayArrivalBufferMinutes\)/.test(
      showtimeInfo
    ) &&
    /renderShowtimeInfo\(ride, \{ night: planNight \}\)/.test(
      read("src", "components", "PlanRecommendations.jsx")
    ),
  true
);

invariantCheck(
  "22. the Waits showtime panel still omits Best target and Arrival buffer",
  (() => {
    const d = D["scheduled-show"] || "";
    const n = N["scheduled-show"] || "";
    return (
      d.includes("Typical showtimes") &&
      n.includes("Typical showtimes") &&
      !d.includes("Best target") &&
      !n.includes("Best target") &&
      !d.includes("Arrival buffer") &&
      !n.includes("Arrival buffer")
    );
  })(),
  true
);

/* --- 23. the blueprints stay documentation ------------------------------ */

invariantCheck(
  "23. no production code reads, imports or references a blueprint PNG",
  (() => {
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
        return /\.(jsx?|cjs|mjs|ts|tsx|css)$/.test(e.name) ? [full] : [];
      });
    return walk(path.join(frontendRoot, "src")).every((f) => {
      const src = strip(fs.readFileSync(f, "utf8"));
      return !/docs\/design\/waits/.test(src) && !/waits-approved-/.test(src);
    });
  })(),
  true
);

invariantCheck(
  "shared status components were re-used, not forked",
  /source === "live" \|\| source === "cached" \|\| !source/.test(bannerSource) &&
    /getFreshnessLabel\(source, ageMs, fetchedAt\)/.test(freshnessSource) &&
    !/FreshnessBadge|DataStatusBanner/.test(listCode),
  true
);

/* ------------------------------------------------- baseline discrimination -- */

if (process.env.WAITS_NIGHT_BASELINE === "1") {
  console.log("");
  console.log(
    `Baseline discrimination: ${featureFail}/${featureLabels.length} feature assertions failed (all must fail), ` +
      `${invariantFail} invariants failed (must be 0)`
  );
}

console.log("");
console.log(`  63C-1 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  63C-1 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
