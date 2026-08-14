#!/usr/bin/env node

// Waits BEHAVIOURAL parity (63B-1 extraction, carried forward through 63B-2).
//
// 63B-1 proved the extraction changed nothing by comparing rendered markup with
// the pre-extraction baseline byte for byte. 63B-2 then replaced the Waits
// presentation with the approved blueprint, so that visual comparison is
// obsolete by design — it would now report a difference the product wanted.
//
// This harness therefore proves the thing that must NEVER change: behaviour.
// It renders the current Waits tab across the same representative states and
// asserts what each render must contain and must not contain — real ride data,
// real ordering, real active-ride identity, real showtime data, working action
// wiring, browsing suppression, and day-only scope.
//
// These are not existence-only checks. Each one is keyed to specific fixture
// values, so a broken wiring path changes the output and fails the assertion.
// The important guards are mutation-tested.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const frontendRoot = path.resolve(__dirname, "..");
const RENDERER = path.join(frontendRoot, "scripts", "waitsExtractionParityRender.cjs");

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

const raw = execFileSync(process.execPath, [RENDERER], {
  cwd: frontendRoot,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  stdio: ["ignore", "pipe", "ignore"],
});

const S = {};
{
  const parts = raw.split(/^===== (.+?) =====$/m);
  for (let i = 1; i < parts.length; i += 2) S[parts[i]] = parts[i + 1].trim();
}

const SCENARIOS = [
  "healthy-active-park-rides",
  "loading-refresh-button",
  "active-in-line-ride",
  "closed-and-unavailable-waits",
  "showtime-attraction",
  "browsing-another-park",
  "closed-show-with-schedule",
  "first-render-before-effect",
  "browsed-first-render-before-effect",
  "empty-ride-array",
];

console.log("Waits behavioural parity");

check(
  "every representative state renders without error",
  SCENARIOS.every((s) => S[s] !== undefined) && !raw.includes("RENDER_ERROR"),
  true
);

/* ------------------------------------------------------- real ride data -- */

const healthy = S["healthy-active-park-rides"] || "";

check(
  "real attraction names come from the supplied rides, not placeholders",
  healthy.includes("Star Tours – The Adventures Continue") &&
    healthy.includes("Slinky Dog Dash") &&
    healthy.includes("Rock &#x27;n&#x27; Roller Coaster Starring The Muppets"),
  true
);

check(
  "real wait values are rendered, not recomputed or invented",
  healthy.includes(">65<") && healthy.includes(">35<") && healthy.includes(">20<"),
  true
);

check(
  "land formatting still runs through the supplied formatter",
  // The fixture formatter emits `${parkId}:${land}` — proof the real callback
  // is used rather than the raw ride field.
  healthy.includes("hollywood:toy_story_land") &&
    healthy.includes("hollywood:echo_lake"),
  true
);

check(
  "ride order is the order supplied by App, not re-sorted in presentation",
  (() => {
    const a = healthy.indexOf("Slinky Dog Dash");
    const b = healthy.indexOf("Rock &#x27;n&#x27; Roller Coaster");
    const c = healthy.indexOf("Star Tours");
    return a > 0 && b > a && c > b;
  })(),
  true
);

check(
  "open/closed status still reflects the real isOpen flag",
  (S["closed-and-unavailable-waits"] || "").includes("Closed") &&
    (S["closed-and-unavailable-waits"] || "").includes("Open"),
  true
);

check(
  "a null wait still renders -- with the wait unit, never a number",
  (() => {
    const s = S["closed-and-unavailable-waits"] || "";
    return s.includes("--") && /wait<\/div>/i.test(s) && !/>0</.test(s);
  })(),
  true
);

/* --------------------------------------------------------- active ride -- */

const inLine = S["active-in-line-ride"] || "";

check(
  "the active ride is identified from activeRideId and marked In Line Now",
  inLine.includes("In Line Now") && !healthy.includes("In Line Now"),
  true
);

check(
  "exactly one card carries the active-ride emphasis",
  (() => {
    // The disabled-In-Line rule belongs to App's renderRideActions and is
    // asserted at source in waitsVisualHarness. What this render can prove is
    // that WaitTimesList elevates the active ride and only the active ride.
    const elevated = (inLine.match(/#F6EEFF/g) || []).length;
    const elevatedHealthy = (healthy.match(/#F6EEFF/g) || []).length;
    return elevated === 1 && elevatedHealthy === 0;
  })(),
  true
);

/* ------------------------------------------------------------ handlers -- */

check(
  "every ride receives an action block from the supplied renderer",
  (() => {
    const blocks = (healthy.match(/data-actions-for="/g) || []).length;
    return blocks === 3;
  })(),
  true
);

check(
  "action blocks are keyed to the real ride ids",
  healthy.includes('data-actions-for="102"') &&
    healthy.includes('data-actions-for="103"') &&
    healthy.includes('data-actions-for="101"'),
  true
);

/* ----------------------------------------------------------- showtimes -- */

const show = S["showtime-attraction"] || "";

check(
  "showtime rendering uses the supplied showtime renderer and real ride id",
  show.includes('data-showtimes-for="106"'),
  true
);

check(
  "a non-show ride renders no showtime block",
  !healthy.includes("data-showtimes-for"),
  true
);

/* --------------------------------------------- closed outranks the show -- */

check(
  "a closed attraction with a stored schedule still reads Closed",
  (() => {
    const s = S["closed-show-with-schedule"] || "";
    return s.includes("Fantasmic!") && s.includes("Closed") && !s.includes("Scheduled show");
  })(),
  true
);

check(
  "a closed attraction with a stored schedule keeps its -- / wait column",
  (() => {
    const s = S["closed-show-with-schedule"] || "";
    return s.includes("--") && /wait<\/div>/i.test(s);
  })(),
  true
);

check(
  "a closed attraction with a stored schedule never takes the Showtimes tone",
  (() => {
    const s = S["closed-show-with-schedule"] || "";
    // The Showtimes chip label and its sky fill must both be absent.
    return !/>Showtimes</.test(s) && !s.includes("#E0F2FE");
  })(),
  true
);

/* ------------------------------------------------- browsing suppression -- */

const browsing = S["browsing-another-park"] || "";

check(
  "browsing another park still hides every action",
  browsing.length > 0 && !browsing.includes("data-actions-for"),
  true
);

check(
  "browsing another park still hides showtime detail",
  browsing.length > 0 && !browsing.includes("data-showtimes-for"),
  true
);

check(
  "browsing another park still shows the rides and both park labels",
  browsing.includes("Slinky Dog Dash") &&
    browsing.includes("EPCOT") &&
    browsing.includes("Hollywood Studios"),
  true
);

/* ------------------------------------------------------------- refresh -- */

check(
  "Refresh is enabled and labelled Refresh when not loading",
  healthy.includes("Refresh") && !/<button[^>]*disabled=""[^>]*>[^<]*Loading/.test(healthy),
  true
);

check(
  "Refresh is disabled and labelled Loading while loading",
  (() => {
    const s = S["loading-refresh-button"] || "";
    return s.includes("Loading") && !s.includes(">Refresh<") && /disabled=""/.test(s);
  })(),
  true
);

/* ------------------------------------------- first frame is never blank -- */

check(
  "the first pre-effect render shows skeletons, not a blank screen or empty copy",
  (() => {
    const s = S["first-render-before-effect"] || "";
    return (
      s.includes('data-tohi-waits-skeleton="true"') &&
      !s.includes("No attractions to show") &&
      !s.includes("Wait times unavailable") &&
      !s.includes("data-actions-for")
    );
  })(),
  true
);

check(
  "the first pre-effect browsed render shows the quiet loading line",
  (() => {
    const s = S["browsed-first-render-before-effect"] || "";
    return (
      s.includes("Loading EPCOT wait times…") &&
      !s.includes('data-tohi-waits-skeleton="true"') &&
      !s.includes("No attractions to show")
    );
  })(),
  true
);

check(
  "no freshness pill renders before any data exists",
  (() => {
    const a = S["first-render-before-effect"] || "";
    const b = S["browsed-first-render-before-effect"] || "";
    return !/Live|Cached|Status unknown/.test(a) && !/Live|Cached|Status unknown/.test(b);
  })(),
  true
);

/* ----------------------------------------------------------- day-only -- */

check(
  "Waits renders day-only — no night surfaces in any state",
  SCENARIOS.every((s) => {
    const html = S[s] || "";
    return !/#131C36|#0F172A|#F5F3FF|#B6C2E2|#C4B5FD|rgba\(2, 6, 23/.test(html);
  }),
  true
);

check(
  "the empty state renders nothing rather than inventing a placeholder ride",
  (() => {
    const s = S["empty-ride-array"] || "";
    return !s.includes("data-actions-for") && !/\bmin<\/div>/.test(s);
  })(),
  true
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
