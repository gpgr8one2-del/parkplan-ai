#!/usr/bin/env node

// Waits secondary-state presentation and request ownership (63B-3).
//
// The resolver harness proves the decision table. This one proves the app
// actually renders those decisions, and that App owns an independent browsed
// request with late-response protection.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned baseline.
// INVARIANT REGRESSION GUARDS protect behaviour this phase must not touch and
// legitimately pass at the baseline.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const appSource = read("src", "App.jsx");
const waitsTabSource = read("src", "components", "WaitsTab.jsx");
const listSource = read("src", "components", "WaitTimesList.jsx");
const resolverPath = path.join(frontendRoot, "src", "utils", "waitsViewState.js");
const resolverSource = fs.existsSync(resolverPath) ? fs.readFileSync(resolverPath, "utf8") : "";

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCode = strip(appSource);
const waitsTabCode = strip(waitsTabSource);
const listCode = strip(listSource);
const waitsSurface = `${waitsTabCode}\n${listCode}`;

// The browsed-park loader in App, sliced so its assertions cannot match the
// active park's loadData.
const loaderStart = appCode.indexOf("const loadBrowsedParkData = useCallback(");
const loaderEnd = appCode.indexOf("useEffect(() => {", loaderStart);
const loader =
  loaderStart >= 0 && loaderEnd > loaderStart ? appCode.slice(loaderStart, loaderEnd) : "";

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

console.log("Waits secondary states (63B-3) — FEATURE-DISCRIMINATING");

/* --------------------------------------------------------- resolver -- */

featureCheck(
  "a pure resolver decides which state renders",
  /export function resolveWaitsViewState/.test(resolverSource) &&
    !/\bimport\b|\brequire\(|useState|useEffect|fetch\(|localStorage|setTimeout|setInterval|new Date/.test(
      resolverSource
    ),
  true
);

featureCheck(
  "WaitsTab renders from the resolver rather than ad-hoc conditionals",
  /import \{ resolveWaitsViewState, WAITS_COPY, WAITS_VIEW_STATES \} from "\.\.\/utils\/waitsViewState"/.test(
    waitsTabSource
  ) &&
    /const view = resolveWaitsViewState\(\{/.test(waitsTabCode) &&
    /browsing: browsingAnotherPark,/.test(waitsTabCode) &&
    /visibleRideCount: sortedRides\.length,/.test(waitsTabCode),
  true
);

featureCheck(
  "the resolver is fed the DISPLAYED park's request state, never the other park's",
  /const waitsLoading = browsingAnotherPark \? browsedParkRequest\.loading : loading;/.test(
    appCode
  ) &&
    /const waitsError = browsingAnotherPark \? browsedParkRequest\.error : error;/.test(appCode) &&
    /loading=\{waitsLoading\}/.test(appCode) &&
    /waitsError=\{waitsError\}/.test(appCode),
  true
);

/* -------------------------------------------- browsed request state -- */

featureCheck(
  "App owns explicit browsed-park data, loading, error and park identity",
  /const \[browsedParkRequest, setBrowsedParkRequest\] = useState\(\{/.test(appCode) &&
    /parkId: null,/.test(appCode) &&
    /data: null,/.test(appCode) &&
    /loading: false,/.test(appCode) &&
    /error: "",/.test(appCode),
  true
);

featureCheck(
  "a browsed failure sets a browsed error instead of collapsing to null",
  /\.catch\(\(err\) => \{/.test(loader) &&
    /error: err\?\.message \|\| "Could not load browsed park wait times\."/.test(loader) &&
    // the old ambiguous behaviour is gone
    !/setBrowsedParkData\(null\)/.test(appCode),
  true
);

featureCheck(
  "a monotonic request generation invalidates every older browsed request",
  // Park ID alone cannot separate two in-flight requests for the SAME park.
  /const browsedRequestIdRef = useRef\(0\);/.test(appCode) &&
    /const requestId = browsedRequestIdRef\.current \+ 1;/.test(appCode) &&
    /browsedRequestIdRef\.current = requestId;/.test(appCode) &&
    // both success and failure are gated by the shared guard
    (loader.match(/shouldApplyBrowsedResponse\(\{/g) || []).length === 2 &&
    (loader.match(/currentRequestId: browsedRequestIdRef\.current,/g) || []).length === 2 &&
    (loader.match(/currentParkId: current\.parkId,/g) || []).length === 2 &&
    // leaving browse mode invalidates outstanding requests
    /browsedRequestIdRef\.current \+= 1;/.test(appCode) &&
    /import \{ shouldApplyBrowsedResponse \} from "\.\/utils\/waitsViewState";/.test(appSource),
  true
);

featureCheck(
  "the guard requires BOTH request identity and park identity",
  /export function shouldApplyBrowsedResponse/.test(resolverSource) &&
    /if \(requestId !== currentRequestId\) return false;/.test(resolverSource) &&
    /if \(!parkId \|\| parkId !== currentParkId\) return false;/.test(resolverSource),
  true
);

featureCheck(
  "there is no idle state that could render blank",
  !/IDLE:/.test(resolverSource) &&
    /status = error \? WAITS_VIEW_STATES\.ERROR_NO_DATA : WAITS_VIEW_STATES\.LOADING_INITIAL;/.test(
      resolverSource
    ),
  true
);

featureCheck(
  "a late response cannot land under a different park",
  // Two layers: the per-run cancelled flag, and a parkId identity check inside
  // every setter so a resolved promise for a stale park is dropped.
  /let cancelled = false;/.test(loader) &&
    (loader.match(/if \(cancelled\) return;/g) || []).length === 2 &&
    // the per-run flag is retained as an ADDITIONAL guard alongside the
    // request-generation check asserted above
    /Retained as an additional guard/.test(appSource),
  true
);

featureCheck(
  "changing the browsed park clears the previous park's data",
  /:\s*\{ parkId, data: null, loading: true, error: "" \}/.test(loader),
  true
);

featureCheck(
  "a browsed refresh keeps existing data on screen while it runs",
  /\{ \.\.\.current, loading: true, error: "" \}/.test(loader),
  true
);

featureCheck(
  "successful browsed data clears the browsed error",
  /\{ parkId, data, loading: false, error: "" \}/.test(loader),
  true
);

featureCheck(
  "leaving browse mode clears browsed-only state",
  /setBrowsedParkRequest\(\{ parkId: null, data: null, loading: false, error: "" \}\)/.test(
    appCode
  ),
  true
);

featureCheck(
  "Refresh refreshes the park Waits is displaying, never the other one",
  /function handleWaitsRefresh\(\) \{/.test(appCode) &&
    /if \(browsingAnotherPark && browsedParkId\) \{\s*\n\s*loadBrowsedParkData\(browsedParkId, \{ force: true \}\);/.test(
      appCode
    ) &&
    /loadData\(true\);/.test(appCode) &&
    /loadData=\{handleWaitsRefresh\}/.test(appCode) &&
    /fetchParkData\(parkId, \{ force \}\)/.test(loader),
  true
);

/* ------------------------------------------------------- presentation -- */

featureCheck(
  "initial loading renders card-shaped skeletons with a 2x2 action area",
  /function WaitsSkeletonList\(\)/.test(waitsTabCode) &&
    /\{view\.showSkeletons && <WaitsSkeletonList \/>\}/.test(waitsTabCode) &&
    /borderRadius: 26,/.test(waitsTabCode) &&
    /padding: 20,/.test(waitsTabCode) &&
    /gridTemplateColumns: "1fr 1fr"/.test(waitsTabCode) &&
    /height=\{48\}/.test(waitsTabCode),
  true
);

featureCheck(
  "skeletons pulse gently and honour reduced motion",
  /@keyframes tohiWaitsPulse/.test(waitsTabCode) &&
    /prefers-reduced-motion: reduce/.test(waitsTabCode) &&
    /animation: none !important/.test(waitsTabCode),
  true
);

featureCheck(
  "the freshness pill is gated on the resolver, not shown unconditionally",
  /\{view\.showFreshness && \(/.test(waitsTabCode) &&
    /<FreshnessBadge/.test(waitsTabCode),
  true
);

featureCheck(
  "stale reuses DataStatusBanner rather than duplicating its copy",
  /import \{ DataStatusBanner \} from "\.\/DataStatusBanner"/.test(waitsTabSource) &&
    /view\.status === WAITS_VIEW_STATES\.STALE && \(\s*\n\s*<DataStatusBanner source=\{waitListParkData\?\.source\} \/>/.test(
      waitsTabCode
    ),
  true
);

featureCheck(
  "the retained-error message renders alongside the cards",
  /view\.status === WAITS_VIEW_STATES\.ERROR_RETAINED && \(/.test(waitsTabCode) &&
    /\{view\.bannerMessage\}/.test(waitsTabCode),
  true
);

featureCheck(
  "the composed surface renders the resolver's title and copy",
  /\{view\.showComposed && \(/.test(waitsTabCode) &&
    /\{view\.composedTitle\}/.test(waitsTabCode) &&
    /\{view\.composedBody\}/.test(waitsTabCode),
  true
);

featureCheck(
  "VIEWING ONLY renders once, above the cards, and is not a control",
  /\{view\.showViewingOnly && \(/.test(waitsTabCode) &&
    (waitsTabCode.match(/WAITS_COPY\.VIEWING_ONLY/g) || []).length === 1 &&
    waitsTabCode.indexOf("WAITS_COPY.VIEWING_ONLY") < waitsTabCode.indexOf("<WaitTimesList") &&
    // rendered in a div, never a button or link
    !/<button[^>]*>\s*\{WAITS_COPY\.VIEWING_ONLY\}/.test(waitsTabCode),
  true
);

featureCheck(
  "cards render only when the resolver says so",
  /\{view\.showCards && \(/.test(waitsTabCode),
  true
);


console.log("Behaviour and scope preserved — INVARIANT REGRESSION GUARDS");

invariantCheck(
  "no second retry control is added anywhere on the Waits surface",
  !/Try Again|Try again|Retry/.test(waitsSurface) &&
    // exactly one button on the Waits surface: the header Refresh
    (waitsTabCode.match(/<button/g) || []).length === 1,
  true
);


invariantCheck(
  "sorting and filtering remain owned by App and unchanged",
  /\.filter\(\(ride\) => shouldShowRideInWaitList\(waitListParkId, ride\)\)/.test(appCode) &&
    /\.sort\(\(a, b\) => \(b\.waitTime \|\| 0\) - \(a\.waitTime \|\| 0\)\)/.test(appCode) &&
    !/\.sort\(|\.filter\(/.test(waitsSurface),
  true
);

invariantCheck(
  "the four action handlers remain in App and are never reimplemented",
  /function handleInLine\(ride\) \{/.test(appCode) &&
    /function handleDone\(rideId\) \{/.test(appCode) &&
    /function handleSkip\(rideId\) \{/.test(appCode) &&
    /function handleReportRideIssue\(ride\) \{/.test(appCode) &&
    !/handleInLine|handleDone|handleSkip|handleReportRideIssue|trackAppEvent/.test(waitsSurface),
  true
);

invariantCheck(
  "browsing still hides all four actions and showtime detail",
  /renderRideActions=\{browsingAnotherPark \? \(\) => null : renderRideActions\}/.test(
    waitsTabCode
  ) &&
    /renderShowtimeInfo=\{browsingAnotherPark \? \(\) => null : renderShowtimeInfo\}/.test(
      waitsTabCode
    ) &&
    /hasShowtimeSchedule=\{browsingAnotherPark \? \(\) => false : hasShowtimeSchedule\}/.test(
      waitsTabCode
    ),
  true
);

invariantCheck(
  "the browsing context line keeps both park labels",
  /Browsing \{browsedParkLabel\}\. Your day stays anchored at\{" "\}/.test(waitsTabCode) &&
    /\{confirmedActiveParkLabel\}\./.test(waitsTabCode),
  true
);

invariantCheck(
  "card variants are unchanged: null waits stay -- / wait",
  /\{ride\.waitTime != null \? ride\.waitTime : "--"\}/.test(listCode) &&
    /\{ride\.waitTime != null \? "min" : "wait"\}/.test(listCode) &&
    /label: "Closed"/.test(listCode) &&
    /label: "Wait unavailable"/.test(listCode),
  true
);

invariantCheck(
  "a closed attraction with a stored schedule stays Closed",
  /const isScheduledShow =\s*\n\s*ride\.isOpen === true &&/.test(listCode),
  true
);

invariantCheck(
  "In Line Now keeps its calm emphasis and disables only that action",
  /label: "In Line Now"/.test(listCode) &&
    /#F6EEFF/.test(listCode) &&
    /disabled=\{isActiveRide\}/.test(appCode),
  true
);

invariantCheck(
  "the confirmed active park is never switched by browsing",
  // Only confirmed presence moves activePark; the browsed loader touches
  // nothing but its own request state.
  !/setActivePark/.test(loader) &&
    !/setParkData|setWeather|setError\(/.test(loader) &&
    /if \(confirmedPark && activePark !== confirmedPark\)/.test(appCode),
  true
);

invariantCheck(
  "no active-park subsystem reads browsed data",
  // recommendations, weather, TOHI Pick and planning all read parkData, and
  // browsedParkData is consumed only by the Waits list payload.
  (appCode.match(/browsedParkData/g) || []).length === 2 &&
    /const waitListParkData = browsingAnotherPark \? browsedParkData : parkData;/.test(appCode),
  true
);

invariantCheck(
  "Waits remains day-only",
  !/\bnight\b/.test(waitsTabCode) &&
    !/\bnight\b/.test(listCode) &&
    !/#131C36|#0F172A|#F5F3FF|#B6C2E2|#C4B5FD/.test(waitsSurface) &&
    /const shellNight\s*=\s*\n?\s*\(activeTab === "plan" \|\| activeTab === "home"\)\s*&&\s*planNight;/.test(
      appCode
    ),
  true
);

invariantCheck(
  "shared status components keep their shared behaviour",
  // 63B-3 reuses DataStatusBanner and FreshnessBadge; it does not fork them.
  /source === "live" \|\| source === "cached" \|\| !source/.test(
    read("src", "components", "DataStatusBanner.jsx")
  ) &&
    /getFreshnessLabel\(source, ageMs, fetchedAt\)/.test(
      read("src", "components", "FreshnessBadge.jsx")
    ),
  true
);

console.log("");
console.log(`  63B-3 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  63B-3 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
