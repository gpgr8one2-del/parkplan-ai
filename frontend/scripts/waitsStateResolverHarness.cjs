#!/usr/bin/env node

// Waits view-state resolver (63B-3).
//
// Table-tests the pure resolver in src/utils/waitsViewState.js. Every row is a
// combination the real screen can reach, and every precedence rule the resolver
// exists to enforce has at least one row that would fail without it.
//
// Dependency-free: the module is loaded by stripping its `export` keywords, so
// no bundler or transform is required.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(frontendRoot, "src", "utils", "waitsViewState.js"),
  "utf8"
);

const {
  resolveWaitsViewState,
  WAITS_VIEW_STATES,
  WAITS_COPY,
  browsedLoadingCopy,
  browsedErrorCopy,
  shouldApplyBrowsedResponse,
} = new Function(
  `${source.replace(/^export default[\s\S]*$/m, "").replace(/^export\s+/gm, "")}
   return { resolveWaitsViewState, WAITS_VIEW_STATES, WAITS_COPY, browsedLoadingCopy, browsedErrorCopy, shouldApplyBrowsedResponse };`
)();

let passCount = 0;
let failCount = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
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

const DATA = { source: "live" };
const STALE = { source: "stale" };
const CACHED = { source: "cached" };

const S = WAITS_VIEW_STATES;

/* ------------------------------------------------------------- purity -- */

console.log("Resolver purity");

check(
  "the module imports nothing and touches no runtime surface",
  !/\bimport\b|\brequire\(|useState|useEffect|fetch\(|localStorage|sessionStorage|setTimeout|setInterval|Date\.now|new Date/.test(
    source
  ),
  true
);

check(
  "calling it twice with the same input gives the same result",
  JSON.stringify(resolveWaitsViewState({ data: DATA, visibleRideCount: 3 })) ===
    JSON.stringify(resolveWaitsViewState({ data: DATA, visibleRideCount: 3 })),
  true
);

check(
  "it does not mutate its input",
  (() => {
    const input = { data: DATA, visibleRideCount: 3, loading: false, error: "" };
    const snapshot = JSON.stringify(input);
    resolveWaitsViewState(input);
    return JSON.stringify(input) === snapshot;
  })(),
  true
);

/* ------------------------------------------------- active-park states -- */

console.log("Active-park state table");

const ACTIVE_TABLE = [
  // label,                              input,                                                        expected status
  ["first render, before the effect",    { },                                                          S.LOADING_INITIAL],
  ["initial loading, no data",           { loading: true },                                            S.LOADING_INITIAL],
  ["refreshing over existing data",      { loading: true, data: DATA, visibleRideCount: 3 },            S.HEALTHY],
  ["error, no data",                     { error: "boom" },                                            S.ERROR_NO_DATA],
  ["error, data retained",               { error: "boom", data: DATA, visibleRideCount: 3 },            S.ERROR_RETAINED],
  ["successful empty list",              { data: DATA, visibleRideCount: 0 },                           S.EMPTY],
  ["stale data",                         { data: STALE, visibleRideCount: 3 },                          S.STALE],
  ["healthy data",                       { data: DATA, visibleRideCount: 3 },                           S.HEALTHY],
  ["cached data is healthy, not stale",  { data: CACHED, visibleRideCount: 2 },                         S.HEALTHY],
];

for (const [label, input, expected] of ACTIVE_TABLE) {
  check(`active: ${label}`, resolveWaitsViewState(input).status, expected);
}

/* ---------------------------------------------------------- precedence -- */

console.log("Precedence rules");

check(
  "there is no IDLE state left to render blank",
  Object.values(WAITS_VIEW_STATES).includes("idle"),
  false
);

check(
  "the first pre-effect render shows skeletons, not empty copy",
  (() => {
    // data absent, loading not yet true, no error — the very first frame.
    const v = resolveWaitsViewState({});
    return (
      v.status === S.LOADING_INITIAL &&
      v.showSkeletons === true &&
      v.showFreshness === false &&
      v.composedTitle === "" &&
      v.composedBody === "" &&
      v.showCards === false
    );
  })(),
  true
);

check(
  "the first pre-effect browsed render shows the quiet loading line",
  (() => {
    const v = resolveWaitsViewState({ browsing: true, parkLabel: "EPCOT" });
    return (
      v.status === S.LOADING_INITIAL &&
      v.showSkeletons === false &&
      v.composedBody === "Loading EPCOT wait times…" &&
      v.showFreshness === false &&
      v.composedTitle === ""
    );
  })(),
  true
);

check(
  "an in-flight first request never becomes the empty state",
  resolveWaitsViewState({ loading: true, visibleRideCount: 0 }).status,
  S.LOADING_INITIAL
);

check(
  "loading never clears usable cards",
  (() => {
    const v = resolveWaitsViewState({ loading: true, data: DATA, visibleRideCount: 3 });
    return v.showCards === true && v.showSkeletons === false && v.refreshing === true;
  })(),
  true
);

check(
  "an error with retained data keeps the cards and never shows skeletons",
  (() => {
    const v = resolveWaitsViewState({ error: "boom", data: DATA, visibleRideCount: 3 });
    return v.showCards === true && v.showSkeletons === false;
  })(),
  true
);

check(
  "an error never shows a freshness pill, with or without data",
  resolveWaitsViewState({ error: "boom", data: DATA, visibleRideCount: 3 }).showFreshness ===
    false && resolveWaitsViewState({ error: "boom" }).showFreshness === false,
  true
);

check(
  "initial loading shows no freshness pill",
  resolveWaitsViewState({ loading: true }).showFreshness,
  false
);

check(
  "stale data is shown with a freshness pill and never called live",
  (() => {
    const v = resolveWaitsViewState({ data: STALE, visibleRideCount: 3 });
    return v.showFreshness === true && v.bannerMessage === WAITS_COPY.STALE_BANNER;
  })(),
  true
);

check(
  "a successful empty response is not an error and never mentions closure",
  (() => {
    const v = resolveWaitsViewState({ data: DATA, visibleRideCount: 0 });
    return (
      v.composedTitle === WAITS_COPY.EMPTY_TITLE &&
      v.composedBody === WAITS_COPY.EMPTY_BODY &&
      !/closed/i.test(v.composedBody) &&
      !/unavailable/i.test(v.composedTitle) &&
      v.showFreshness === true
    );
  })(),
  true
);

check(
  "an empty result while loading stays loading, not empty",
  resolveWaitsViewState({ loading: true, visibleRideCount: 0, error: "" }).status,
  S.LOADING_INITIAL
);

/* --------------------------------------------------------- exact copy -- */

console.log("Exact approved copy");

check(
  "stale banner copy",
  resolveWaitsViewState({ data: STALE, visibleRideCount: 1 }).bannerMessage,
  "Using slightly older data while we refresh in the background."
);

check(
  "active refresh-error copy",
  resolveWaitsViewState({ error: "x", data: DATA, visibleRideCount: 1 }).bannerMessage,
  "Couldn’t refresh wait times. Showing the last available data."
);

check(
  "active error-with-no-data heading",
  resolveWaitsViewState({ error: "x" }).composedTitle,
  "Wait times unavailable"
);

check(
  "active error-with-no-data copy",
  resolveWaitsViewState({ error: "x" }).composedBody,
  "We couldn’t load wait times right now. Try refreshing in a moment."
);

check(
  "empty heading",
  resolveWaitsViewState({ data: DATA, visibleRideCount: 0 }).composedTitle,
  "No attractions to show"
);

check(
  "empty copy",
  resolveWaitsViewState({ data: DATA, visibleRideCount: 0 }).composedBody,
  "No attractions are available for this park right now."
);

check("VIEWING ONLY label", WAITS_COPY.VIEWING_ONLY, "VIEWING ONLY");

check(
  "browsed loading copy uses the real park label",
  browsedLoadingCopy("EPCOT"),
  "Loading EPCOT wait times…"
);

check(
  "browsed error copy uses the real park label",
  browsedErrorCopy("EPCOT"),
  "EPCOT wait times are unavailable right now."
);

/* ------------------------------------------------------ browsed park -- */

console.log("Browsed-park state table");

const B = (over) => resolveWaitsViewState({ browsing: true, parkLabel: "EPCOT", ...over });

check("browsed: initial loading", B({ loading: true }).status, S.LOADING_INITIAL);

check(
  "browsed initial loading uses the quiet line, not skeletons",
  (() => {
    const v = B({ loading: true });
    return v.showSkeletons === false && v.composedBody === "Loading EPCOT wait times…";
  })(),
  true
);

check(
  "browsed refresh over existing data keeps the cards",
  (() => {
    const v = B({ loading: true, data: DATA, visibleRideCount: 2 });
    return v.showCards === true && v.showSkeletons === false && v.refreshing === true;
  })(),
  true
);

check("browsed: error with no data", B({ error: "boom" }).status, S.ERROR_NO_DATA);

check(
  "browsed error with no data uses the browsed copy, not the active copy",
  (() => {
    const v = B({ error: "boom" });
    return (
      v.composedBody === "EPCOT wait times are unavailable right now." &&
      v.composedTitle === "" &&
      v.composedBody !== WAITS_COPY.ACTIVE_ERROR_BODY
    );
  })(),
  true
);

check(
  "browsed error with retained data keeps cards, shows browsed copy, hides freshness",
  (() => {
    const v = B({ error: "boom", data: DATA, visibleRideCount: 2 });
    return (
      v.status === S.ERROR_RETAINED &&
      v.showCards === true &&
      v.bannerMessage === "EPCOT wait times are unavailable right now." &&
      v.bannerMessage !== WAITS_COPY.ACTIVE_REFRESH_ERROR &&
      v.showFreshness === false
    );
  })(),
  true
);

check(
  "browsed healthy data shows VIEWING ONLY",
  (() => {
    const v = B({ data: DATA, visibleRideCount: 2 });
    return v.status === S.HEALTHY && v.showViewingOnly === true && v.showCards === true;
  })(),
  true
);

check(
  "VIEWING ONLY never appears on the active park",
  resolveWaitsViewState({ data: DATA, visibleRideCount: 2 }).showViewingOnly,
  false
);

check(
  "VIEWING ONLY does not appear when there are no cards to qualify",
  B({ error: "boom" }).showViewingOnly,
  false
);

/* ------------------------------------------ cross-park contamination -- */

console.log("Cross-park isolation");

check(
  "an active-park error cannot reach the browsed view",
  // The caller passes ONE park's request state. Browsing with no browsed error
  // resolves healthy regardless of what the active park is doing, because the
  // active error is never among these inputs.
  (() => {
    const v = B({ data: DATA, visibleRideCount: 2, error: "" });
    return v.status === S.HEALTHY && v.bannerMessage === "" && v.composedBody === "";
  })(),
  true
);

check(
  "a browsed error cannot produce active-park wording",
  (() => {
    const v = B({ error: "boom", data: DATA, visibleRideCount: 1 });
    return (
      !v.bannerMessage.includes("Couldn’t refresh wait times") &&
      !v.composedBody.includes("We couldn’t load wait times")
    );
  })(),
  true
);

check(
  "the resolver reads no park identity of its own",
  // Park identity lives in App's request state. The view resolver receives only
  // a label, and the response guard receives IDs as arguments and compares
  // them — neither reads app state, so neither can mix two parks by itself.
  (() => {
    const viewStart = source.indexOf("export function resolveWaitsViewState");
    const viewEnd = source.indexOf("\nexport ", viewStart + 10);
    const viewBody = source.slice(viewStart, viewEnd > viewStart ? viewEnd : undefined);
    return (
      !/parkId/.test(viewBody) &&
      !/browsedParkId|activePark|browsedParkRequest/.test(source)
    );
  })(),
  true
);

/* --------------------------------------------------- shape stability -- */

console.log("Browsed response guard — late-response protection");

const G = shouldApplyBrowsedResponse;

check(
  "the newest request may write",
  G({ requestId: 4, currentRequestId: 4, parkId: "epcot", currentParkId: "epcot" }),
  true
);

check(
  "older request A resolving after newer request B is dropped",
  // Same park, both in flight; B bumped the generation to 5.
  G({ requestId: 4, currentRequestId: 5, parkId: "epcot", currentParkId: "epcot" }),
  false
);

check(
  "leave EPCOT, return to EPCOT, then the old EPCOT response resolves",
  // Leaving bumped the generation, returning bumped it again. Park ID matches
  // on both, which is exactly why the ID alone was not enough.
  G({ requestId: 7, currentRequestId: 9, parkId: "epcot", currentParkId: "epcot" }),
  false
);

check(
  "an old failure arriving after a newer success cannot set an error",
  G({ requestId: 2, currentRequestId: 3, parkId: "epcot", currentParkId: "epcot" }),
  false
);

check(
  "a response for a park the family has left is dropped",
  G({ requestId: 6, currentRequestId: 6, parkId: "epcot", currentParkId: "hollywood" }),
  false
);

check(
  "a response is dropped once browse mode has been left entirely",
  G({ requestId: 6, currentRequestId: 7, parkId: "epcot", currentParkId: null }),
  false
);

check(
  "malformed or missing identity never writes",
  [
    { requestId: undefined, currentRequestId: 1, parkId: "epcot", currentParkId: "epcot" },
    { requestId: 1, currentRequestId: undefined, parkId: "epcot", currentParkId: "epcot" },
    { requestId: 1, currentRequestId: 1, parkId: "", currentParkId: "" },
    {},
  ].every((input) => G(input) === false),
  true
);

check(
  "only one generation is ever writable at a time",
  // Across a run of ids, exactly the current one passes.
  [1, 2, 3, 4, 5].filter((id) =>
    G({ requestId: id, currentRequestId: 3, parkId: "epcot", currentParkId: "epcot" })
  ).join(","),
  "3"
);

console.log("Result shape");

check(
  "every result exposes the same keys",
  Object.keys(resolveWaitsViewState({})).sort().join(","),
  [
    "bannerMessage", "browsing", "composedBody", "composedTitle", "refreshing",
    "showCards", "showComposed", "showFreshness", "showSkeletons", "showViewingOnly",
    "status",
  ].join(",")
);

check(
  "cards and skeletons are never both shown",
  [
    {},
    { loading: true },
    { loading: true, data: DATA, visibleRideCount: 2 },
    { error: "x" },
    { error: "x", data: DATA, visibleRideCount: 2 },
    { data: DATA, visibleRideCount: 0 },
    { data: STALE, visibleRideCount: 2 },
    { data: DATA, visibleRideCount: 2 },
  ].every((input) => {
    const v = resolveWaitsViewState(input);
    return !(v.showCards && v.showSkeletons);
  }),
  true
);

check(
  "a composed surface and cards are never shown together",
  [
    { error: "x" },
    { data: DATA, visibleRideCount: 0 },
    { data: DATA, visibleRideCount: 2 },
    { error: "x", data: DATA, visibleRideCount: 2 },
  ].every((input) => {
    const v = resolveWaitsViewState(input);
    return !(v.showComposed && v.showCards);
  }),
  true
);

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
