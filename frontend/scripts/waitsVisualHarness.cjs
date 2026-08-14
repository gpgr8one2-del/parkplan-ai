#!/usr/bin/env node

// Waits healthy day visual structure (63B-2).
//
// Protects the approved healthy day presentation. Two categories, as
// established across 61D–63B-1:
//
//   FEATURE-DISCRIMINATING — proves the approved design shipped. These MUST
//   fail against the pinned pre-redesign baseline.
//
//   INVARIANT REGRESSION GUARDS — protects behaviour and scope the redesign was
//   not allowed to touch. These legitimately pass at the baseline.
//
// Exceptional states (skeletons, refresh error, error-with-no-data, empty,
// browsed-park loading/error, stale redesign) are DEFERRED to their own phase
// and are deliberately not asserted here.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const appSource = read("src", "App.jsx");
const waitsTabSource = read("src", "components", "WaitsTab.jsx");
const listSource = read("src", "components", "WaitTimesList.jsx");
const planRecommendationsSource = read("src", "components", "PlanRecommendations.jsx");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCode = strip(appSource);
const waitsTabCode = strip(waitsTabSource);
const listCode = strip(listSource);
const waitsSurface = `${waitsTabCode}\n${listCode}`;

// App's shared ride-action renderer, sliced so assertions about the Waits
// option cannot match Plan's compact branch or the default branch.
// Bounded by the next top-level helper rather than a named one, so the slice
// resolves identically before and after this phase. A slice that silently
// collapses would make every invariant below fail for the wrong reason.
const rideActionsStart = appCode.indexOf("function renderRideActions(ride, options = {})");
const rideActionsEnd = appCode.indexOf("\n  function ", rideActionsStart + 10);
const rideActions =
  rideActionsStart >= 0
    ? appCode.slice(rideActionsStart, rideActionsEnd > rideActionsStart ? rideActionsEnd : undefined)
    : "";

const showtimeStart = appCode.indexOf("function renderShowtimeInfo(ride, options = {})");
const showtimeEnd = appCode.indexOf("\n  function ", showtimeStart + 10);
const showtimeInfo =
  showtimeStart >= 0
    ? appCode.slice(showtimeStart, showtimeEnd > showtimeStart ? showtimeEnd : undefined)
    : "";

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

console.log("Approved healthy Waits day design (63B-2) — FEATURE-DISCRIMINATING");

/* ------------------------------------------------------------- header -- */

featureCheck(
  "the Waits screen has exactly one page header",
  // One heading element across the whole Waits surface, and the retired inner
  // "Wait Times" header and its eyebrow are gone from the list.
  (waitsSurface.match(/<h1|<h2|<h3/g) || []).length === 1 &&
    /<h1/.test(waitsTabCode) &&
    !/LIVE PARK PULSE/.test(listSource) &&
    !/Wait Times</.test(listCode),
  true
);

featureCheck(
  "the heading names the park the list is actually showing",
  /const waitsParkName = waitListParkId \? getParkNameById\(waitListParkId\) : "";/.test(
    waitsTabCode
  ) &&
    /\$\{waitsParkName\} wait times/.test(waitsTabCode) &&
    /getParkNameById=\{getParkNameById\}/.test(appCode) &&
    /waitListParkId=\{waitListParkId\}/.test(appCode),
  true
);

featureCheck(
  "the approved eyebrow, helper copy and caution are present",
  /LIVE WAITS/.test(waitsTabCode) &&
    /Check current waits and mark what your family is doing\./.test(waitsTabCode) &&
    /Wait data can lag during reopenings or weather delays\./.test(waitsTabCode) &&
    /<TriangleAlert/.test(waitsTabCode),
  true
);

featureCheck(
  "the header carries real freshness from the same park payload as the list",
  /<FreshnessBadge/.test(waitsTabCode) &&
    /source=\{waitListParkData\?\.source\}/.test(waitsTabCode) &&
    /ageMs=\{waitListParkData\?\.ageMs\}/.test(waitsTabCode) &&
    /fetchedAt=\{waitListParkData\?\.fetchedAt\}/.test(waitsTabCode) &&
    /waitListParkData=\{waitListParkData\}/.test(appCode),
  true
);

featureCheck(
  "no attraction-count tile survives",
  !/\{rides\.length\}/.test(listCode) && !/rides\.length/.test(listCode),
  true
);

featureCheck(
  "no decorative circle, corner blob or legacy glow remains",
  !/aria-hidden/.test(listCode) &&
    !/width: 76/.test(listCode) &&
    !/borderRadius: "999px"/.test(listCode) &&
    !/radial-gradient/.test(waitsSurface),
  true
);

featureCheck(
  "no outer list card wraps the attractions",
  // The list is now a plain vertical stack; the card treatment belongs to each
  // attraction, and `card` is no longer threaded into the Waits surface.
  /<div style=\{\{ display: "flex", flexDirection: "column", gap: 14 \}\}>/.test(listCode) &&
    !/\.\.\.card/.test(listCode) &&
    !/card=\{card\}/.test(waitsTabCode),
  true
);

/* -------------------------------------------------------------- cards -- */

featureCheck(
  "cards use the locked 26px radius and 20px padding",
  /borderRadius: 26,/.test(listCode) && /padding: 20,/.test(listCode),
  true
);

featureCheck(
  "attraction names use the locked 17.5px",
  /fontSize: 17\.5,/.test(listCode),
  true
);

featureCheck(
  "wait values use the locked 42px",
  /fontSize: 42,/.test(listCode),
  true
);

invariantCheck(
  "cards are text-led — no ride artwork anywhere on the Waits surface",
  !/<img/.test(waitsSurface) &&
    !/getRideArtwork|rideArtManifest|backgroundImage/.test(waitsSurface),
  true
);

invariantCheck(
  "no fake search, filter, sort, dropdown, bell or chevron control",
  !/<input|<select|placeholder=|type="search"/.test(waitsSurface) &&
    !/Bell|ChevronDown|ChevronRight|Filter|Search|ArrowUpDown/.test(waitsSurface),
  true
);

/* ------------------------------------------------------------ actions -- */

featureCheck(
  "the Waits action layout is a 2x2 grid",
  /const waits = options\.variant === "waits";/.test(rideActions) &&
    /waits\s*\n?\s*\? \{\s*\n\s*display: "grid",\s*\n\s*gridTemplateColumns: "1fr 1fr",/.test(
      rideActions
    ),
  true
);

featureCheck(
  "Waits actions use the locked 48px height",
  /: waits\s*\n?\s*\? \{[\s\S]{0,220}minHeight: 48,/.test(rideActions),
  true
);

featureCheck(
  "browsing another park also withholds the scheduled-show treatment",
  // Without this the Showtimes chip would appear while the panel below it was
  // suppressed, promising detail the card never shows.
  /hasShowtimeSchedule=\{browsingAnotherPark \? \(\) => false : hasShowtimeSchedule\}/.test(
    waitsTabCode
  ),
  true
);

featureCheck(
  "the Waits surface requests the Waits action and showtime variants",
  /renderRideActions=\{\(ride\) => renderRideActions\(ride, \{ variant: "waits" \}\)\}/.test(
    appCode
  ) &&
    /renderShowtimeInfo=\{\(ride\) => renderShowtimeInfo\(ride, \{ variant: "waits" \}\)\}/.test(
      appCode
    ),
  true
);

/* ---------------------------------------------------------- showtimes -- */

featureCheck(
  "the approved panel carries the same verifyDailySchedule caution, verbatim",
  (showtimeInfo.match(
    /Verify in My Disney Experience\. Showtimes can change by day\./g
  ) || []).length === 2 &&
    (showtimeInfo.match(/\{showProfile\.verifyDailySchedule && \(/g) || []).length === 2,
  true
);

featureCheck(
  "the Waits panel carries only the blueprint content",
  (() => {
    // Split renderShowtimeInfo into its Waits branch and the default branch the
    // Plan surface still uses, so this can never pass by reading the wrong one.
    const waitsBranch = showtimeInfo.slice(
      showtimeInfo.indexOf("if (waits) {"),
      showtimeInfo.indexOf("return (\n      <div")
    );
    const defaultBranch = showtimeInfo.slice(showtimeInfo.indexOf("return (\n      <div"));
    return (
      waitsBranch.length > 0 &&
      defaultBranch.length > 0 &&
      // the blueprint has neither of these two lines
      !/Best target:/.test(waitsBranch) &&
      !/Arrival buffer:/.test(waitsBranch) &&
      // and the default renderer still supplies both
      /Best target:/.test(defaultBranch) &&
      /Arrival buffer:/.test(defaultBranch) &&
      /recommendedShowtimes/.test(defaultBranch) &&
      /arrivalBufferMinutes/.test(defaultBranch)
    );
  })(),
  true
);

featureCheck(
  "closed outranks the scheduled-show treatment",
  // A stored schedule on a closed attraction must not suppress its -- / wait
  // column or relabel it as a scheduled show.
  /const isScheduledShow =\s*\n\s*ride\.isOpen === true &&\s*\n\s*typeof hasShowtimeSchedule === "function" &&\s*\n\s*hasShowtimeSchedule\(ride\);/.test(
    listCode
  ),
  true
);

featureCheck(
  "the approved TYPICAL SHOWTIMES panel renders real showtime data",
  /Typical showtimes/.test(showtimeInfo) &&
    /textTransform: "uppercase"/.test(showtimeInfo) &&
    /showProfile\.showtimes\.map\(\(time\) =>/.test(showtimeInfo) &&
    // no invented times
    !/"1[0-2]:\d\d (AM|PM)"/.test(showtimeInfo),
  true
);

featureCheck(
  "the active-ride chip reads In Line Now, matching the action button",
  // Baseline rendered "In line now" on the chip while the action button already
  // read "In Line Now". The approved design uses one spelling for both.
  /label: "In Line Now"/.test(listCode) &&
    /\{isActiveRide \? "In Line Now" : "In Line"\}/.test(rideActions),
  true
);

featureCheck(
  "a scheduled show gets the Showtimes status and no numeric wait",
  /label: "Showtimes"/.test(listCode) &&
    /const isScheduledShow =/.test(listCode) &&
    /\{!isScheduledShow && \(/.test(listCode) &&
    /"Scheduled show"/.test(listCode) &&
    // show detection resolves from real data in App, not in presentation
    /function hasShowtimeSchedule\(ride\) \{/.test(appCode) &&
    /ride\?\.showProfile \|\| meta\?\.showProfile/.test(appCode),
  true
);

console.log("Behaviour and scope preserved — INVARIANT REGRESSION GUARDS");

/* ----------------------------------------------------------- refresh -- */

invariantCheck(
  "Refresh keeps the existing callback and stays loading-aware",
  /onClick=\{\(\) => loadData\(true\)\}/.test(waitsTabCode) &&
    /disabled=\{loading\}/.test(waitsTabCode) &&
    /\{loading \? "Loading" : "Refresh"\}/.test(waitsTabCode) &&
    /loadData=\{loadData\}/.test(appCode),
  true
);

/* ----------------------------------------------------------- actions -- */

invariantCheck(
  "all four action labels remain, with Report Issue unabbreviated",
  /\{isActiveRide \? "In Line Now" : "In Line"\}/.test(rideActions) &&
    /✓ Done/.test(rideActions) &&
    />\s*Skip\s*</.test(rideActions) &&
    /\{compact \? "Report" : "Report Issue"\}/.test(rideActions),
  true
);

invariantCheck(
  "the active ride disables only its In Line action",
  (() => {
    const inLineBtn = rideActions.slice(
      rideActions.indexOf("onClick={() => handleInLine(ride)}"),
      rideActions.indexOf("onClick={() => handleDone(ride.id)}")
    );
    const rest = rideActions.slice(rideActions.indexOf("onClick={() => handleDone(ride.id)}"));
    return /disabled=\{isActiveRide\}/.test(inLineBtn) && !/disabled=/.test(rest);
  })(),
  true
);

invariantCheck(
  "the four existing action handlers stay connected",
  /onClick=\{\(\) => handleInLine\(ride\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleDone\(ride\.id\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleSkip\(ride\.id\)\}/.test(rideActions) &&
    /onClick=\{\(\) => handleReportRideIssue\(ride\)\}/.test(rideActions) &&
    // presentation must not reimplement any of them
    !/handleInLine|handleDone|handleSkip|handleReportRideIssue|trackAppEvent/.test(waitsSurface),
  true
);

/* -------------------------------------------------------- data + sort -- */

invariantCheck(
  "sorting and filtering are unchanged and still owned by App",
  /\.filter\(\(ride\) => shouldShowRideInWaitList\(waitListParkId, ride\)\)/.test(appCode) &&
    /\.sort\(\(a, b\) => \(b\.waitTime \|\| 0\) - \(a\.waitTime \|\| 0\)\)/.test(appCode) &&
    !/\.sort\(|\.filter\(/.test(waitsSurface),
  true
);

invariantCheck(
  "a null wait still renders -- with the wait unit",
  /\{ride\.waitTime != null \? ride\.waitTime : "--"\}/.test(listCode) &&
    /\{ride\.waitTime != null \? "min" : "wait"\}/.test(listCode),
  true
);

invariantCheck(
  "the existing wait-tone thresholds are unchanged",
  /label: "Closed"/.test(listCode) &&
    /label: "Wait unavailable"/.test(listCode) &&
    /label: "Low wait"/.test(listCode) &&
    /label: "Manageable"/.test(listCode) &&
    /label: "High wait"/.test(listCode) &&
    /ride\.waitTime <= 20/.test(listCode) &&
    /ride\.waitTime <= 45/.test(listCode),
  true
);

invariantCheck(
  "Open and Closed still come from the real isOpen flag",
  /ride\.isOpen\s*\n?\s*\? "Open"\s*\n?\s*: "Closed"/.test(listCode),
  true
);

/* --------------------------------------------------------- showtimes -- */

invariantCheck(
  "the exact schedule-warning copy is retained behind verifyDailySchedule",
  /\{showProfile\.verifyDailySchedule && \(/.test(showtimeInfo) &&
    /Verify in My Disney Experience\. Showtimes can change by day\./.test(showtimeInfo),
  true
);

invariantCheck(
  "showtimes are never invented — the panel renders only supplied data",
  /if \(!showProfile\?\.showtimes\?\.length\) return null;/.test(showtimeInfo) &&
    !/showtimes: \[/.test(waitsSurface),
  true
);

/* ---------------------------------------------------------- browsing -- */

invariantCheck(
  "browsing another park still hides all four actions",
  /renderRideActions=\{browsingAnotherPark \? \(\) => null : renderRideActions\}/.test(
    waitsTabCode
  ),
  true
);

invariantCheck(
  "browsing another park still hides showtime detail",
  /renderShowtimeInfo=\{browsingAnotherPark \? \(\) => null : renderShowtimeInfo\}/.test(
    waitsTabCode
  ),
  true
);

/* ------------------------------------------------------------ scope -- */

invariantCheck(
  "Waits remains day-only and consumes no night prop",
  !/\bnight\b/.test(waitsTabCode) &&
    !/\bnight\b/.test(listCode) &&
    !/night: true/.test(
      appCode.slice(appCode.indexOf("<WaitsTab"), appCode.indexOf("<WaitsTab") + 1200)
    ) &&
    /const shellNight\s*=\s*\n?\s*\(activeTab === "plan" \|\| activeTab === "home"\)\s*&&\s*planNight;/.test(
      appCode
    ),
  true
);

invariantCheck(
  "Plan's compact and default action presentations are unchanged",
  /const compact = options\.compact === true;/.test(rideActions) &&
    /padding: "6px 9px",\n          fontSize: 11,/.test(rideActions) &&
    /minHeight: 36,/.test(rideActions) &&
    /renderRideActions\(ride, \{ night: planNight, compact: true \}\)/.test(
      planRecommendationsSource
    ),
  true
);

invariantCheck(
  "Plan's showtime presentation is unchanged, including both guidance lines",
  /SHOWTIMES/.test(showtimeInfo) &&
    /showProfile\.showtimes\.join\(" · "\)/.test(showtimeInfo) &&
    /Best target: \{showProfile\.recommendedShowtimes\.join\(" or "\)\}/.test(showtimeInfo) &&
    /Arrival buffer:/.test(showtimeInfo) &&
    // the gating condition itself, so disabling the branch is caught
    /\(showProfile\.arrivalBufferMinutes \|\| showProfile\.middayArrivalBufferMinutes\)/.test(
      showtimeInfo
    ) &&
    /renderShowtimeInfo\(ride, \{ night: planNight \}\)/.test(planRecommendationsSource),
  true
);

invariantCheck(
  "no blueprint image is imported or referenced by production code",
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
  "night is the only remaining deferral",
  // 63B-2 deferred the exceptional states; 63B-3 delivered them, so pinning
  // their absence would now assert the opposite of the product. What is still
  // deferred is night, and that is what this guards. The approved secondary
  // states have their own harnesses.
  !/\bnight\b/.test(waitsSurface) &&
    !/#131C36|#0F172A|#F5F3FF|#B6C2E2|#C4B5FD/.test(waitsSurface) &&
    !/shellNight|shellTokens|getTohiAppShellTheme/.test(waitsSurface),
  true
);

console.log("");
console.log(`  63B-2 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  63B-2 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
