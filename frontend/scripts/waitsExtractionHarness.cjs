#!/usr/bin/env node

// Waits extraction structure (63B-1).
//
// Two categories, as established across 61D–62B:
//
//   FEATURE-DISCRIMINATING — proves the extraction happened. These MUST fail
//   against the pinned pre-extraction baseline.
//
//   INVARIANT REGRESSION GUARDS — protects the behaviour the extraction was not
//   allowed to touch. These legitimately pass at the baseline.
//
// 63B-1 was a structural move. 63B-2 then replaced the Waits presentation with
// the approved healthy day blueprint, so the guards that pinned the LEGACY
// visual markup are gone — they described a design that was deliberately
// retired. Everything they protected about BEHAVIOUR is still here, and the new
// visual contract lives in waitsVisualHarness.cjs.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const PINNED_BASE = "e7b61900d2598d7ea601b23972dc4304fd59c1d5";

const appSource = read("src", "App.jsx");
const waitsTabSource = fs.existsSync(path.join(frontendRoot, "src", "components", "WaitsTab.jsx"))
  ? read("src", "components", "WaitsTab.jsx")
  : "";
const waitTimesListSource = read("src", "components", "WaitTimesList.jsx");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCode = strip(appSource);
const waitsTabCode = strip(waitsTabSource);

let passCount = 0;
let failCount = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;

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
function featureCheck(l, a, e) {
  const b = failCount; check(l, a, e);
  if (failCount > b) featureFail += 1; else featurePass += 1;
}
function invariantCheck(l, a, e) {
  const b = failCount; check(l, a, e);
  if (failCount > b) invariantFail += 1; else invariantPass += 1;
}

// The Waits render branch in App, sliced so assertions about it cannot match
// another tab's markup.
const waitsBranchStart = appCode.indexOf('{activeTab === "waits" &&');
const waitsBranchEnd = appCode.indexOf('{activeTab === "plan" &&', waitsBranchStart);
const waitsBranch =
  waitsBranchStart >= 0 && waitsBranchEnd > waitsBranchStart
    ? appCode.slice(waitsBranchStart, waitsBranchEnd)
    : "";

console.log("Waits extraction (63B-1) — FEATURE-DISCRIMINATING");

featureCheck(
  "App imports WaitsTab and renders it only for the Waits tab",
  /import \{ WaitsTab \} from "\.\/components\/WaitsTab";/.test(appSource) &&
    (appCode.match(/<WaitsTab[\s\n]/g) || []).length === 1 &&
    waitsBranch.includes("<WaitsTab") &&
    // the Waits branch now contains the component and nothing else
    !/<section|<h2|<p\b/.test(waitsBranch),
  true
);

featureCheck(
  "no Waits header JSX remains in App.jsx",
  // The legacy strings are gone from App, and so is the retired copy itself —
  // 63B-2 replaced it with the approved header. The heading now lives in
  // WaitsTab and nowhere else.
  !/Live Wait Times/.test(appSource) &&
    !/Browse all visible attractions/.test(appSource) &&
    !/Live wait data can lag/.test(appSource) &&
    !/Browsing \{browsedParkLabel\}/.test(appSource) &&
    /Browsing \{browsedParkLabel\}/.test(waitsTabSource) &&
    /wait times/.test(waitsTabSource),
  true
);

featureCheck(
  "WaitsTab renders the existing WaitTimesList",
  /import \{ WaitTimesList \} from "\.\/WaitTimesList";/.test(waitsTabSource) &&
    (waitsTabCode.match(/<WaitTimesList/g) || []).length === 1 &&
    !/WaitTimesList/.test(appSource),
  true
);

featureCheck(
  "Refresh still invokes the passed refresh callback",
  /onClick=\{\(\) => loadData\(true\)\}/.test(waitsTabCode) &&
    /loadData=\{loadData\}/.test(appCode) &&
    // WaitsTab must not build its own fetch
    !/fetch\(|useEffect|useState/.test(waitsTabSource),
  true
);

featureCheck(
  "Refresh remains disabled while loading",
  /disabled=\{loading\}/.test(waitsTabCode) && /loading=\{loading\}/.test(appCode),
  true
);

featureCheck(
  "Refresh still shows Loading versus Refresh",
  /\{loading \? "Loading" : "Refresh"\}/.test(waitsTabCode) &&
    // 63C-1 wrapped the icon over several lines to add its night colour. The
    // control, its size and its copy are unchanged.
    /<RefreshCw\s+size=\{16\}/.test(waitsTabCode) &&
    /import \{ RefreshCw[^}]*\} from "lucide-react";/.test(waitsTabSource) &&
    // RefreshCw was only used by the Waits block, so App no longer imports it
    !/RefreshCw/.test(appSource),
  true
);

featureCheck(
  "the browsed-park notice keeps both park labels",
  /\{browsingAnotherPark && \(/.test(waitsTabCode) &&
    /Browsing \{browsedParkLabel\}\. Your day stays anchored at\{" "\}/.test(waitsTabCode) &&
    /\{confirmedActiveParkLabel\}\./.test(waitsTabCode) &&
    /browsedParkLabel=\{browsedParkLabel\}/.test(appCode) &&
    /confirmedActiveParkLabel=\{confirmedActiveParkLabel\}/.test(appCode),
  true
);

featureCheck(
  "browsing another park still suppresses actions",
  // The gate remains browsingAnotherPark alone. 63C-1 changed only the
  // non-browsing arm, to pass the explicit night value through.
  /renderShowtimeInfo=\{\s*browsingAnotherPark \? \(\) => null : \(ride\) => renderShowtimeInfo\(ride, \{ night \}\)\s*\}/.test(
    waitsTabCode
  ) &&
    /renderRideActions=\{\s*browsingAnotherPark \? \(\) => null : \(ride\) => renderRideActions\(ride, \{ night \}\)\s*\}/.test(
      waitsTabCode
    ),
  true
);

featureCheck(
  "browsing another park still suppresses showtimes",
  // Same gate, asserted from the showtime side so either half failing is caught.
  /browsingAnotherPark \? \(\) => null : \(ride\) => renderShowtimeInfo\(ride, \{ night \}\)/.test(
    waitsTabCode
  ) &&
    /browsingAnotherPark=\{browsingAnotherPark\}/.test(appCode),
  true
);

featureCheck(
  "WaitsTab is presentation only and owns no app state",
  /export function WaitsTab\(\{/.test(waitsTabSource) &&
    !/useState|useEffect|useMemo|useRef|useCallback/.test(waitsTabSource) &&
    !/localStorage|sessionStorage|setInterval|setTimeout|matchMedia/.test(waitsTabSource) &&
    !/trackAppEvent|setParkPresence|setActivePark|handleInLine|handleDone|handleSkip|handleReportRideIssue/.test(
      waitsTabSource
    ),
  true
);

featureCheck(
  "every value WaitsTab needs arrives as an explicit prop",
  (() => {
    const open = waitsTabSource.indexOf("export function WaitsTab({");
    const close = waitsTabSource.indexOf("}) {", open);
    if (open < 0 || close < 0) return "";
    return [...waitsTabSource.slice(open, close).matchAll(/^\s*(\w+),$/gm)]
      .map((m) => m[1])
      .sort()
      .join(",");
  })(),
  [
    "activeRideId", "browsedParkLabel", "browsingAnotherPark", "button",
    "confirmedActiveParkLabel", "formatLandLabel", "getParkNameById",
    "hasShowtimeSchedule", "loadData", "loading", "renderRideActions",
    "renderShowtimeInfo", "sortedRides", "waitListParkData", "waitListParkId",
    "waitsError",
  ].join(",")
);

console.log("Behaviour App still owns — INVARIANT REGRESSION GUARDS");

invariantCheck(
  "sortedRides stays filtered through shouldShowRideInWaitList",
  /import \{ shouldShowRideInWaitList \} from "\.\/attractionDisplayFilters";/.test(appSource) &&
    /\.filter\(\(ride\) => shouldShowRideInWaitList\(waitListParkId, ride\)\)/.test(appCode),
  true
);

invariantCheck(
  "sortedRides stays sorted by descending wait time",
  /\.sort\(\(a, b\) => \(b\.waitTime \|\| 0\) - \(a\.waitTime \|\| 0\)\)/.test(appCode) &&
    /const sortedRides = useMemo\(\(\) => \{/.test(appCode) &&
    /\[waitListParkData, waitListParkId\]/.test(appCode),
  true
);

invariantCheck(
  "activeRideId derivation is unchanged",
  /const activeRideId =\s*\n?\s*currentActivity\?\.type === "in_line" && currentActivity\?\.rideId != null\s*\n?\s*\? String\(currentActivity\.rideId\)\s*\n?\s*: null;/.test(
    appCode
  ),
  true
);

invariantCheck(
  "the four existing action handlers remain in App and stay wired",
  /function handleInLine\(ride\) \{/.test(appCode) &&
    /function handleDone\(rideId\) \{/.test(appCode) &&
    /function handleSkip\(rideId\) \{/.test(appCode) &&
    /function handleReportRideIssue\(ride\) \{/.test(appCode) &&
    /function renderRideActions\(ride, options = \{\}\) \{/.test(appCode) &&
    /onClick=\{\(\) => handleInLine\(ride\)\}/.test(appCode) &&
    /onClick=\{\(\) => handleDone\(ride\.id\)\}/.test(appCode) &&
    /onClick=\{\(\) => handleSkip\(ride\.id\)\}/.test(appCode) &&
    /onClick=\{\(\) => handleReportRideIssue\(ride\)\}/.test(appCode),
  true
);

invariantCheck(
  "the existing showtime renderer remains in App and unchanged",
  /function renderShowtimeInfo\(ride, options = \{\}\) \{/.test(appCode) &&
    /const showProfile = ride\?\.showProfile \|\| meta\?\.showProfile;/.test(appCode) &&
    /if \(!showProfile\?\.showtimes\?\.length\) return null;/.test(appCode),
  true
);

invariantCheck(
  "the browsed-park data path stays separate from the confirmed park",
  // 63B-3 replaced the browsed fetch with explicit request state, so pinning
  // setBrowsedParkData would pin a retired implementation. The RULE is
  // unchanged and still asserted: the Waits list reads the browsed payload only
  // while browsing, and the confirmed park's own data is never replaced by it.
  /const waitListParkId = browsingAnotherPark \? browsedParkId : activePark;/.test(appCode) &&
    /const waitListParkData = browsingAnotherPark \? browsedParkData : parkData;/.test(appCode) &&
    /\[browsingAnotherPark, browsedParkId, parkData/.test(appCode) &&
    // browsed data reaches the wait list and nothing else
    (appCode.match(/browsedParkData/g) || []).length === 2,
  true
);

invariantCheck(
  "shellNight gates exactly the three converted tabs",
  // 63C-2 added Waits, as 62B-2F-2 added Home. The exact set is asserted, so
  // adding an unconverted tab or dropping a converted one both fail here.
  (() => {
    const m = appCode.match(
      /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
    );
    if (!m) return false;
    const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
    return tabs.join(",") === "home,plan,waits";
  })() &&
    (appCode.match(/const shellNight\s*=/g) || []).length === 1,
  true
);

invariantCheck(
  "Waits night is supplied by the parent, never derived in the presentation",
  // 63C-1 delivered the night presentation behind a literal false; 63C-2
  // activated it through the shared flag. What has held across both, and is
  // what keeps the extraction honest, is that WaitsTab receives exactly one
  // night value from App and computes no mode of its own.
  (waitsBranch.match(/\bnight=\{[^}]*\}/g) || []).join() === "night={shellNight}" &&
    !/shellNight|shellTokens|getTohiAppShellTheme|planNight|localStorage|matchMedia|new Date|getHours/.test(
      waitsTabCode
    ),
  true
);

invariantCheck(
  "no blueprint image is imported by production code",
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
  "no prohibited production area changed against the pinned baseline",
  (() => {
    try {
      const changed = execFileSync(
        "git",
        ["diff", "--name-only", `${PINNED_BASE}...HEAD`],
        { cwd: repoRoot, encoding: "utf8" }
      )
        .split("\n")
        .filter(Boolean);
      const status = execFileSync(
        "git",
        ["status", "--porcelain", "--untracked-files=all"],
        { cwd: repoRoot, encoding: "utf8" }
      )
        .split("\n")
        .filter(Boolean)
        .map((l) => l.slice(3));
      const all = [...new Set([...changed, ...status])];
      const FORBIDDEN = [
        // 63B-3 adds src/utils/waitsViewState.js, which is Waits' own pure
        // resolver. Every other util remains off limits.
        /^frontend\/src\/utils\/(?!waitsViewState\.js$)/,
        /^frontend\/src\/components\/BottomTabs\.jsx$/,
        /^frontend\/src\/theme\.js$/,
        /^frontend\/src\/data\//,
        /^frontend\/src\/assets\//,
        /^frontend\/docs\/design\/waits\//,
        /^backend\//,
        /public\//,
        /package(-lock)?\.json$/,
        /^CLAUDE\.md$/,
      ];
      const bad = all.filter((f) => FORBIDDEN.some((re) => re.test(f)));
      if (bad.length) console.log(`       offending: ${bad.join(", ")}`);
      return bad.length === 0;
    } catch {
      return false;
    }
  })(),
  true
);

console.log("");
console.log(`  63B-1 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  63B-1 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
