#!/usr/bin/env node

// Home visual structure (62B-2B).
//
// Separate from planVisualHarness (Plan content), appShellNightHarness (shell
// chrome), homeArtHarness (asset integrity) and homeArtResolverHarness (pure
// key logic). This one protects what Home actually renders.
//
// Two categories, as established in 61D/61E/62A:
//
//   FEATURE-DISCRIMINATING — proves the 62B-2B header and hero exist. These
//   MUST fail against the base commit.
//
//   INVARIANT REGRESSION GUARDS — protects the Home capabilities this phase was
//   told not to touch. These legitimately pass at base.
//
// Whitespace- and prop-order-tolerant throughout.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(frontendRoot, ...p), "utf8");

const homeTabSource = read("src", "components", "HomeTab.jsx");
const appSource = read("src", "App.jsx");
const manifestSource = read("src", "data", "homeArtManifest.js");
const wywSource = read("src", "components", "WhileYouWaitCard.jsx");
const badgeSource = read("src", "components", "FreshnessBadge.jsx");
const bannerSource = read("src", "components", "DataStatusBanner.jsx");
const wywCode = wywSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const resolverSource = read("src", "utils", "homeArt.js");

// Comment-stripped view, for checks about code rather than prose.
const homeTabCode = homeTabSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

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

// Load the pure resolver so the no-art path can be proven behaviourally rather
// than by pattern-matching the JSX.
const { resolveHomeParkArtKey } = new Function(
  `${resolverSource.replace(/^export\s+/gm, "")}\nreturn { resolveHomeParkArtKey };`
)();

// The hero element, sliced so hero assertions cannot accidentally match markup
// elsewhere in Home. Bounded by real code landmarks rather than a character
// window, so editing the hero cannot silently push part of it out of scope, and
// taken from the comment-stripped view so prose about the hero — including a
// comment explaining why loading="lazy" is absent — cannot satisfy an assertion
// that is supposed to be about the markup.
const heroAspectIdx = homeTabCode.search(/aspectRatio:\s*"2 \/ 1"/);
const heroOpenIdx = heroAspectIdx > 0 ? homeTabCode.lastIndexOf("<div", heroAspectIdx) : -1;
// The data-status banner is the next block after the hero, so it is the end.
const heroEndIdx = homeTabCode.indexOf("{(parkData?.source || error)");
const heroBlock =
  heroOpenIdx > 0 && heroEndIdx > heroOpenIdx
    ? homeTabCode.slice(heroOpenIdx, heroEndIdx)
    : "";

// The Weather + comfort surface. Starting at the PARK CONDITIONS *text* was a
// real defect: it began INSIDE the section, so the outer background, border,
// radius and shadow fell outside the block entirely. Anything asserted about
// the card's own surface — nesting above all — was therefore measuring only the
// inner row and could not see a card inside a card.
//
// Correct bound: locate PARK CONDITIONS, then walk BACKWARD to the <section>
// that owns it, so the block is the complete weather surface including its
// outer styles. It still ends before Right Now View.
const weatherPillIdx = homeTabCode.indexOf("PARK CONDITIONS");
const weatherStartIdx =
  weatherPillIdx > 0 ? homeTabCode.lastIndexOf("<section", weatherPillIdx) : -1;
const weatherEndIdx = homeTabCode.indexOf("liveParkContext?.showNotice");
const weatherCardBlock =
  weatherStartIdx > 0 && weatherEndIdx > weatherStartIdx
    ? homeTabCode.slice(weatherStartIdx, weatherEndIdx)
    : "";

// The park selector, bounded from its owning <section> to the end of the
// component, so selector assertions cannot match markup elsewhere in Home.
//
// Anchored on handleSelectPark — the one thing true of the selector both before
// and after 62B-2D. Anchoring on getSelectableParks().map would make the block
// EMPTY at the base commit, which would silently turn every negative assertion
// below into a vacuous pass and would force base-true invariants to fail.
const selectorHandlerIdx = homeTabCode.indexOf("handleSelectPark(park.id)");
const selectorStartIdx =
  selectorHandlerIdx > 0 ? homeTabCode.lastIndexOf("<section", selectorHandlerIdx) : -1;
const selectorBlock =
  selectorStartIdx > 0 ? homeTabCode.slice(selectorStartIdx) : "";

// The Right Now View block, bounded from its section to the current-activity
// card that follows it.
const rightNowIdx = homeTabCode.indexOf("RIGHT NOW VIEW");
const rightNowStartIdx =
  rightNowIdx > 0 ? homeTabCode.lastIndexOf("<section", rightNowIdx) : -1;
const rightNowEndIdx = homeTabCode.indexOf('currentActivity?.type === "in_line"');
const rightNowBlock =
  rightNowStartIdx > 0 && rightNowEndIdx > rightNowStartIdx
    ? homeTabCode.slice(rightNowStartIdx, rightNowEndIdx)
    : "";

// The real selectable-park records, read from the shipping data utility rather
// than restated here, so the harness cannot drift from the app's own list.
const parkAreasSource = read("src", "data", "parkAreas.js");
const { PARKS: ALL_PARKS, getSelectableParks } = new Function(
  `${parkAreasSource.replace(/^export\s+/gm, "")}\nreturn { PARKS, getSelectableParks };`
)();

// The readings row's own style object, so nesting is judged on the element that
// actually carried the duplicate card treatment rather than on file-wide counts.
const readingsRowStyle = (() => {
  const anchor = weatherCardBlock.indexOf('flex: "1 1 auto", minWidth: 0');
  if (anchor < 0) return null;
  const readingsDiv = weatherCardBlock.lastIndexOf("<div", anchor);
  const rowDiv = weatherCardBlock.lastIndexOf("<div", readingsDiv - 1);
  if (rowDiv < 0) return null;
  return weatherCardBlock.slice(rowDiv, readingsDiv);
})();

console.log("Home header + park hero (62B-2B) — FEATURE-DISCRIMINATING");

featureCheck(
  "eyebrow reads TODAY'S PLAN and the old wording is gone",
  /TODAY&apos;S PLAN/.test(homeTabSource) && !/TODAY&apos;S GAME PLAN/.test(homeTabSource),
  true
);

featureCheck(
  "the large TOHI logo is removed from Home",
  !/tohi-logo/.test(homeTabSource) && !/alt="TOHI"/.test(homeTabSource),
  true
);

featureCheck(
  "Home imports the approved manifest and the exact-mapping resolver",
  // 62B-2C added the weather names to these same two import statements, so the
  // park names are matched within the braces rather than as the whole binding.
  /import\s*\{[^}]*\bHOME_PARK_ART\b[^}]*\}\s*from\s*"\.\.\/data\/homeArtManifest"/.test(
    homeTabSource
  ) &&
    /import\s*\{[^}]*\bresolveHomeParkArtKey\b[^}]*\}\s*from\s*"\.\.\/utils\/homeArt"/.test(
      homeTabSource
    ),
  true
);

featureCheck(
  "artwork is selected via resolveHomeParkArtKey(activePark) into HOME_PARK_ART",
  /resolveHomeParkArtKey\(\s*activePark\s*\)/.test(homeTabCode) &&
    /HOME_PARK_ART\[\s*homeParkArtKey\s*\]/.test(homeTabCode),
  true
);

featureCheck(
  "mode is an explicit lookup key, not a boolean helper argument",
  // A boolean `night` argument would lock the night phase into an API change;
  // an explicit mode key does not. 62B-2F-1 is that phase, and the key became a
  // per-render derivation exactly as designed — the resolver API is untouched.
  /const homeArtMode = night \? "night" : "day";/.test(homeTabCode) &&
    /\[\s*homeArtMode\s*\]/.test(homeTabCode) &&
    !/getHomeParkArtwork|getHomeWeatherArtwork/.test(homeTabSource) &&
    !/resolveHomeParkArtKey\([^)]*,\s*(true|false|night)/.test(homeTabCode),
  true
);

featureCheck(
  "the hero renders a real decorative img with alt=\"\", cover, centred",
  heroBlock.length > 0 &&
    /<img\s[\s\S]*?src=\{heroParkArt\.src\}/.test(heroBlock) &&
    /alt=""/.test(heroBlock) &&
    /objectFit:\s*"cover"/.test(heroBlock) &&
    /objectPosition:\s*"center"/.test(heroBlock),
  true
);

featureCheck(
  "the above-the-fold hero image is never lazy-loaded",
  // decoding="async" is kept — it does not defer the request. loading="lazy"
  // does, and on the primary hero that delays the first thing the family sees.
  // Scoped to the hero: this says nothing about images elsewhere.
  !/loading=\{?"?lazy/.test(heroBlock) &&
    /decoding="async"/.test(heroBlock),
  true
);

featureCheck(
  "hero artwork and hero name are both derived from activePark",
  // parkData is the last COMPLETED fetch, so mid-load it still describes the
  // previous park. Both the art key and the label must read activePark, which
  // updates immediately, or the hero can show one park's name over another
  // park's illustration.
  /const homeParkArtKey = resolveHomeParkArtKey\(\s*activePark\s*\)/.test(homeTabCode) &&
    /const heroParkName = activePark\s*\?\s*getParkNameById\(\s*activePark\s*\)/.test(
      homeTabCode
    ),
  true
);

featureCheck(
  "parkData.parkName cannot supply a stale label inside the hero",
  // The hero element itself renders only the derived name. parkData?.parkName
  // survives solely as the no-activePark fallback in the derivation above,
  // where there is no artwork to disagree with.
  /\{heroParkName\}/.test(heroBlock) &&
    !/parkData\?\.parkName/.test(heroBlock) &&
    (homeTabCode.match(/parkData\?\.parkName/g) || []).length === 1 &&
    /const heroParkName = activePark[\s\S]{0,120}:\s*parkData\?\.parkName \|\| "Choose a park";/.test(
      homeTabCode
    ),
  true
);

featureCheck(
  "park artwork never uses backgroundImage, a remote URL, or a public path",
  !/backgroundImage/.test(homeTabSource) &&
    !/src="https?:\/\//.test(homeTabSource) &&
    !/src="\//.test(homeTabSource),
  true
);

featureCheck(
  "a contrast scrim sits behind the overlaid hero text",
  /aria-hidden="true"[\s\S]{0,220}linear-gradient\(180deg, rgba\(15, 23, 42/.test(heroBlock),
  true
);

featureCheck(
  "unmapped parks resolve to no artwork, so the hero falls to its no-art state",
  // Behavioural: every id Home can hold that has no approved artwork must
  // resolve to null, and the JSX must gate the img on that value.
  ["universal_sf", "islands", "epic_universe", "", "unknown_park"].every(
    (id) => resolveHomeParkArtKey(id) === null
  ) &&
    resolveHomeParkArtKey(null) === null &&
    /heroParkArt\s*\?\s*\(/.test(homeTabCode) &&
    /:\s*null\}/.test(homeTabCode) &&
    /const heroParkArt = homeParkArtKey/.test(homeTabCode),
  true
);

featureCheck(
  "no-art hero still renders the park information and controls",
  // The name, close time, freshness and refresh live OUTSIDE the img ternary,
  // so they render whether or not artwork exists.
  heroBlock.indexOf("heroParkArt ? (") < heroBlock.indexOf("{heroParkName}") &&
    /\{heroParkName\}/.test(heroBlock) &&
    /Closes \{closeTimeLabel\}/.test(heroBlock) &&
    /<FreshnessBadge[\s/>]/.test(heroBlock) &&
    /loadData\(true\)/.test(heroBlock),
  true
);

featureCheck(
  "the no-art hero is composed, not an empty or borrowed frame",
  // When heroParkArt is null the card still paints its own approved treatment,
  // so an unmapped park gets a finished hero rather than a blank rectangle.
  // Tokenized in 62B-2F-1: both branches now resolve through the Home token set
  // so the composed state exists in day AND night. The protection is unchanged —
  // an unmapped park still gets a finished hero, never a blank rectangle.
  /background: heroParkArt\s*\?\s*t\.heroArtBackground\s*:\s*t\.heroNoArt,/.test(
    homeTabCode
  ) &&
    /heroNoArt:\s*\n?\s*"linear-gradient\(150deg, #F3E8FF/.test(homeTabSource) &&
    /heroNoArt:\s*\n?\s*"linear-gradient\(150deg, #1E1B4B/.test(homeTabSource),
  true
);

featureCheck(
  "the hero's only time line is the cautious close-time wording",
  // The hero states when the park closes and nothing more. No opening time and
  // no open/closed status, because Home has no reliable data for either.
  /Closes \{closeTimeLabel\}/.test(heroBlock) &&
    (heroBlock.match(/closeTimeLabel/g) || []).length === 2 &&
    !/\bOpens\b|\bOpen now\b|\bNow open\b/.test(heroBlock),
  true
);

console.log("Weather + comfort card (62B-2C) — FEATURE-DISCRIMINATING");

featureCheck(
  "Home imports the weather manifest and the weather-family resolver",
  /import\s*\{[^}]*\bHOME_WEATHER_ART\b[^}]*\}\s*from\s*"\.\.\/data\/homeArtManifest"/.test(
    homeTabSource
  ) &&
    /import\s*\{[^}]*\bresolveHomeWeatherFamily\b[^}]*\}\s*from\s*"\.\.\/utils\/homeArt"/.test(
      homeTabSource
    ),
  true
);

featureCheck(
  "weather artwork is selected via resolveHomeWeatherFamily(weather)",
  /const weatherArtFamily = resolveHomeWeatherFamily\(\s*weather\s*\)/.test(homeTabCode) &&
    /HOME_WEATHER_ART\[\s*weatherArtFamily\s*\]\s*\?\.\[\s*homeArtMode\s*\]/.test(
      homeTabCode
    ),
  true
);

featureCheck(
  "the weather family is never derived from contaminated signals in HomeTab",
  // The resolver is the ONLY input to the artwork choice. summary, weatherMode,
  // stormMode, rainRisk and advice text conflate current and forecast data, so
  // HomeTab must not consult them when choosing an illustration. They remain
  // free to drive the visible readings — hence the scoping to the derivation.
  (() => {
    const idx = homeTabCode.indexOf("const weatherArtFamily");
    const end = homeTabCode.indexOf(";", homeTabCode.indexOf("const weatherArt ="));
    if (idx < 0 || end < idx) return false;
    const derivation = homeTabCode.slice(idx, end);
    return !/summary|weatherMode|stormMode|rainRisk|forecast|advice|getWeatherMode|buildWeatherDisplay/.test(
      derivation
    );
  })(),
  true
);

featureCheck(
  "the weather illustration is a real decorative img, contained, not framed",
  weatherCardBlock.length > 0 &&
    /<img\s[\s\S]*?src=\{weatherArt\.src\}/.test(weatherCardBlock) &&
    /alt=""/.test(weatherCardBlock) &&
    /objectFit:\s*"contain"/.test(weatherCardBlock) &&
    // Transparent background preserved: no plate, tint, ring or radius behind it.
    !/<img[\s\S]{0,400}(background|borderRadius|border:)/.test(
      weatherCardBlock.slice(weatherCardBlock.indexOf("<img"))
    ),
  true
);

featureCheck(
  "the illustration stays visually secondary to the temperature",
  // 66px illustration against a 28px temperature that also carries the heaviest
  // weight and the accent colour: prominent, but not the primary element.
  /width: 66,\s*height: 66,/.test(weatherCardBlock) &&
    /fontSize: 28,/.test(weatherCardBlock),
  true
);

featureCheck(
  "the weather surface is ONE card — the readings row is not a second card",
  // Feature-discriminating: at the merged 62B-2B base the readings row carried
  // its own background, border, radius and shadow inside an already-raised
  // section, so this fails there and passes only after the correction.
  //
  // Judged two ways. Exactly one raised surface across the whole weather
  // section, and the readings row itself declares no card treatment at all.
  (weatherCardBlock.match(/boxShadow:/g) || []).length === 1 &&
    readingsRowStyle !== null &&
    !/background|border|borderRadius|boxShadow/.test(readingsRowStyle) &&
    // The spacing and layout the row is allowed to keep.
    /display: "flex"/.test(readingsRowStyle) &&
    /gap: 12/.test(readingsRowStyle),
  true
);

featureCheck(
  "no artwork means no illustration at all, and the readings reflow",
  // Gated on weatherArt, and the readings block takes the remaining width so an
  // omitted illustration leaves no empty column behind.
  /\{weatherArt \? \(/.test(homeTabCode) &&
    /\)\s*:\s*null\}/.test(weatherCardBlock) &&
    /flex: "1 1 auto", minWidth: 0/.test(weatherCardBlock) &&
    // No placeholder, no generic icon, no remote fallback in the card.
    !/placeholder|fallbackArt|defaultWeather|https?:\/\//.test(weatherCardBlock),
  true
);

console.log("Illustrated park selector + Right Now View (62B-2D) — FEATURE-DISCRIMINATING");

featureCheck(
  "the selector is supplied by getSelectableParks(), and PARKS.map is gone",
  /import\s*\{[^}]*\bgetSelectableParks\b[^}]*\}\s*from\s*"\.\.\/data\/parkAreas"/.test(
    homeTabSource
  ) &&
    /\{getSelectableParks\(\)\.map\(\(park\) => \{/.test(homeTabCode) &&
    !/PARKS\.map/.test(homeTabCode) &&
    // No second park list is introduced anywhere in Home.
    !/\[\s*"magic_kingdom"|SELECTABLE_PARKS\s*=|const PARK_LIST/.test(homeTabCode),
  true
);

featureCheck(
  "no Universal park can reach the selector",
  // Behavioural against the real data, PLUS the iteration change that actually
  // enforces it. The data half is base-true — parkAreas.js is untouched — so
  // the discriminating half is that the selector now iterates the FILTERED
  // utility. Before 62B-2D it mapped the full PARKS list and rendered all three
  // coming-soon parks as active buttons.
  ALL_PARKS.filter((p) => p.status === "coming_soon").every(
    (p) => !getSelectableParks().some((s) => s.id === p.id)
  ) &&
    /\{getSelectableParks\(\)\.map\(/.test(selectorBlock) &&
    !/PARKS\.map/.test(selectorBlock),
  true
);

featureCheck(
  "each selector card resolves its own artwork from park.id",
  /const selectorArtKey = resolveHomeParkArtKey\(\s*park\.id\s*\)/.test(selectorBlock) &&
    /HOME_PARK_ART\[\s*selectorArtKey\s*\]\s*\?\.\[\s*homeArtMode\s*\]/.test(selectorBlock),
  true
);

featureCheck(
  "selector images are decorative, cover, centred, lazy and async",
  /<img\s[\s\S]*?src=\{selectorArt\.src\}/.test(selectorBlock) &&
    /alt=""/.test(selectorBlock) &&
    /loading="lazy"/.test(selectorBlock) &&
    /decoding="async"/.test(selectorBlock) &&
    /objectFit:\s*"cover"/.test(selectorBlock) &&
    /objectPosition:\s*"center"/.test(selectorBlock),
  true
);

featureCheck(
  "selector artwork is bundled-local — no remote URL, public path or CSS background-image",
  // The positive conjunct keeps the negatives from passing vacuously on a
  // selector that has no images at all.
  /src=\{selectorArt\.src\}/.test(selectorBlock) &&
    !/backgroundImage/.test(selectorBlock) &&
    !/src="https?:\/\//.test(selectorBlock) &&
    !/src="\//.test(selectorBlock),
  true
);

featureCheck(
  "a park with no artwork stays selectable and gets a finished text card",
  // The image is conditional; the name and the button are not. A missing entry
  // must never remove the park or borrow another park's illustration.
  /\{selectorArt \? \(/.test(selectorBlock) &&
    /\{park\.name\}/.test(selectorBlock) &&
    selectorBlock.indexOf("selectorArt ? (") < selectorBlock.indexOf("{park.name}") &&
    !/HOME_PARK_ART\.magicKingdom|HOME_PARK_ART\["/.test(selectorBlock),
  true
);

featureCheck(
  "selected state and aria-pressed follow browsedParkId, never activePark",
  /const isSelected = browsedParkId === park\.id;/.test(selectorBlock) &&
    /aria-pressed=\{isSelected\}/.test(selectorBlock) &&
    !/activePark/.test(selectorBlock) &&
    // A clear purple selected outline.
    /border: isSelected[\s\S]{0,80}colors\.purple/.test(selectorBlock),
  true
);

featureCheck(
  "the card is one button, scrollable, with a comfortable tap target",
  (selectorBlock.match(/<button/g) || []).length === 1 &&
    /overflowX: "auto"/.test(selectorBlock) &&
    /width: 112,/.test(selectorBlock) &&
    /height: 62,/.test(selectorBlock),
  true
);

featureCheck(
  "the Right Now View eyebrow is restyled to the approved pill",
  // Element-anchored rather than distance-anchored: walk back from the eyebrow
  // text to the element that owns it and inspect that element's own style, so
  // adding or reordering style properties cannot break the assertion.
  (() => {
    const label = rightNowBlock.indexOf("RIGHT NOW VIEW");
    if (label < 0) return false;
    const open = rightNowBlock.lastIndexOf("<div", label);
    if (open < 0) return false;
    const eyebrow = rightNowBlock.slice(open, label);
    return (
      /display: "inline-flex"/.test(eyebrow) &&
      /borderRadius: 999/.test(eyebrow) &&
      /background: t\.amberPillSoft/.test(eyebrow)
    );
  })(),
  true
);


console.log("Home night presentation, gate inactive (62B-2F-1) — FEATURE-DISCRIMINATING");

featureCheck(
  "HomeTab takes one explicit night boolean and invents no theme source",
  /^\s*night = false,$/m.test(homeTabSource) &&
    !/getTohiAppShellTheme|parkPresenceTheme|isTohiNightMode|TOHI_THEME_MODES/.test(homeTabSource) &&
    !/useState|useEffect|useMemo|useRef|matchMedia|setInterval|setTimeout|localStorage|sessionStorage|Date\.now\(|new Date\(\s*\)/.test(
      homeTabCode
    ),
  true
);

featureCheck(
  "Home has exactly one theme signal — the prompt uses the same night prop",
  // Before this phase the park-presence prompt read parkPresenceTheme.isNight
  // directly, so at night it went dark while the rest of Home stayed white.
  /PARK CHECK/.test(homeTabSource) &&
    (homeTabCode.match(/\bnight\b\s*\?/g) || []).length >= 4 &&
    !/parkPresenceTheme/.test(homeTabSource),
  true
);

featureCheck(
  "artwork mode is derived per render from the same flag",
  /const homeArtMode = night \? "night" : "day";/.test(homeTabCode) &&
    (homeTabCode.match(/\?\.\[homeArtMode\]/g) || []).length === 3 &&
    !/HOME_ART_MODE/.test(homeTabSource),
  true
);

featureCheck(
  "Home resolves a day/night token set whose values are applied locally",
  /function getHomeTokens\(night\) \{/.test(homeTabCode) &&
    /const t = getHomeTokens\(night\);/.test(homeTabCode) &&
    // Applied AFTER the shared day objects so no white fill survives beneath.
    /\.\.\.card,\s*\.\.\.\(night \?/.test(homeTabCode),
  true
);

featureCheck(
  "every Home surface carries both a day and a night value",
  [
    "headerBackground", "headerBorder", "headerShadow", "headerOrbCoral", "headerOrbSky",
    "eyebrowPill", "eyebrow", "title", "muted",
    "heroBorder", "heroShadow", "heroArtBackground", "heroNoArt",
    "weatherBackground", "weatherBorder", "weatherShadow",
    "skyPill", "skyPillSoft", "skyText", "amberPill", "amberPillSoft", "amberText",
    "rightNowBackground", "rightNowBorder", "rightNowShadow", "nestedSurface",
    "activityBorder", "activityBackground", "activityEyebrow",
    "successText", "errorText", "surface", "borderQuiet", "shadow", "controlBackground",
  ].every((k) => (homeTabCode.match(new RegExp(`\\b${k}:`, "g")) || []).length === 2),
  true
);

featureCheck(
  "both shared children receive the same night flag at every call site",
  (homeTabCode.match(/<FreshnessBadge\s+night=\{night\}/g) || []).length === 2 &&
    (homeTabCode.match(/<DataStatusBanner [^>]*night=\{night\}/g) || []).length === 2 &&
    /<WhileYouWaitCard\s*\n\s*night=\{night\}/.test(homeTabCode),
  true
);

featureCheck(
  "FreshnessBadge honours night across every existing status variant",
  /night = false/.test(badgeSource) &&
    ["live", "cached", "stale", "mock", "unknown"].every((k) =>
      new RegExp(`${k}: \\{`).test(badgeSource)
    ) &&
    // night overrides AFTER the day style spread, so no day fill survives
    /\.\.\.style,\s*\n[\s\S]{0,220}\.\.\.\(night \? resolveNightBadgeStyle\(source\) : null\)/.test(
      badgeSource
    ) &&
    // label/tooltip/source logic still comes from the shared utility
    /getFreshnessLabel\(source, ageMs, fetchedAt\)/.test(badgeSource),
  true
);

featureCheck(
  "DataStatusBanner keeps its gate and messages and gains a night presentation",
  /night = false/.test(bannerSource) &&
    /source === "live" \|\| source === "cached" \|\| !source/.test(bannerSource) &&
    /stale: "Using slightly older data while we refresh in the background\."/.test(bannerSource) &&
    /mock: "Live data is currently unavailable\. Showing best estimates\."/.test(bannerSource) &&
    /<AlertTriangle size=\{14\}/.test(bannerSource) &&
    /night \? NIGHT_STATUS_STYLE : DAY_STATUS_STYLE/.test(bannerSource),
  true
);

featureCheck(
  "WhileYouWaitCard gains exactly one new prop: the shared night flag",
  (() => {
    const call = (homeTabSource.match(/<WhileYouWaitCard[\s\S]*?\/>/g) || [])[0] || "";
    return /^\s+night=\{night\}$/m.test(call);
  })(),
  true
);

featureCheck(
  "WhileYouWaitCard and LineTimeCompanion share one night flag",
  (wywCode.match(/night = false,/g) || []).length === 2 &&
    /<LineTimeCompanion\s*\n\s*night=\{night\}/.test(wywCode) &&
    (wywCode.match(/const w = getWywTokens\(night\);/g) || []).length === 2,
  true
);

featureCheck(
  "all eight mini-game branches survive and are night-treated",
  [
    "trivia", "look_around", "family_vote", "would_you_rather",
    "conversation_starter", "queue_clues", "prediction_game", "family_challenge",
  ].every((k) => new RegExp(`activeMiniGame\\.type === "${k}"`).test(wywCode)) &&
    // no day-only literal remains anywhere in the rendered markup
    !/colors\.(text|muted|card|cardBorder|purpleSoft|purpleDeep|success|successSoft|error|errorSoft)/.test(
      wywCode.slice(wywCode.indexOf("function LineTimeCompanion"))
    ),
  true
);

featureCheck(
  "every trivia choice and result state resolves through night-aware tokens",
  /background: shouldShowCorrect\s*\n\s*\? w\.successSurface\s*\n\s*: shouldShowWrong\s*\n\s*\? w\.errorSurface\s*\n\s*: w\.optionSurface,/.test(
    wywCode
  ) &&
    /color: shouldShowCorrect\s*\n\s*\? w\.successText/.test(wywCode) &&
    /revealedTriviaAnswer && !isCorrect && !isSelected/.test(wywCode) &&
    /\$\{w\.errorBorderSoft\}/.test(wywCode) &&
    /\$\{w\.successBorderSoft\}/.test(wywCode),
  true
);

featureCheck(
  "look_around and family_vote conditional states are night-treated",
  /lookAroundFound \? w\.successText : w\.title/.test(wywCode) &&
    /lookAroundFound \? w\.successSurface : w\.optionSurface/.test(wywCode) &&
    /selected \? w\.selectedSurface : w\.optionSurface/.test(wywCode) &&
    /selected \? w\.selectedText : w\.title/.test(wywCode) &&
    /Vote locked in: \{selectedFamilyVoteOption\}/.test(wywCode) &&
    /color: w\.selectedText,/.test(wywCode),
  true
);

featureCheck(
  "the four picker chips carry active and idle night treatments",
  /background: isActive\s*\n\s*\? w\.chipActiveBackground\s*\n\s*: w\.chipIdleBackground,/.test(
    wywCode
  ) &&
    /color: isActive \? "white" : w\.chipIdleText,/.test(wywCode) &&
    /\? w\.chipActiveBorder/.test(wywCode) &&
    /\? w\.chipActiveShadow/.test(wywCode) &&
    /CORE_GAME_TYPES\.map/.test(wywCode),
  true
);

featureCheck(
  "no pure black in either token set",
  !/#000\b|#000000\b|rgba?\(\s*0,\s*0,\s*0\s*[,)]/.test(
    homeTabCode.slice(0, homeTabCode.indexOf("function formatActivityStartTime"))
  ) &&
    !/#000\b|#000000\b|rgba?\(\s*0,\s*0,\s*0\s*[,)]/.test(
      wywCode.slice(0, wywCode.indexOf("function LineTimeCompanion"))
    ),
  true
);

console.log("Home capabilities preserved — INVARIANT REGRESSION GUARDS");


invariantCheck(
  "greeting and TOHI guidance copy are unchanged",
  /\{homeGreeting\}/.test(homeTabSource) &&
    /Here&apos;s what matters right now\.\s+TOHI is watching the heat, waits,\s+and walking so your family can keep the day feeling good\./.test(
      homeTabSource
    ),
  true
);

invariantCheck(
  "park name and close time stay data-driven, never hard-coded",
  // The name is now derived rather than read straight from parkData, but the
  // protection is the same one: it resolves from state, and the "Choose a park"
  // empty case survives.
  /getParkNameById\(/.test(homeTabSource) &&
    /"Choose a park"/.test(homeTabSource) &&
    /\{closeTimeLabel\}/.test(homeTabSource) &&
    !/Magic Kingdom"|80°F|87%|11:00 PM/.test(homeTabCode),
  true
);

invariantCheck(
  "refresh still drives loadData and respects loading",
  /onClick=\{\(\)\s*=>\s*loadData\(true\)\}/.test(homeTabSource) &&
    /disabled=\{loading\}/.test(homeTabSource) &&
    /\{loading \? "Loading" : "Refresh"\}/.test(homeTabSource),
  true
);

invariantCheck(
  "freshness, data-status banner and error text remain",
  // Trailing-delimiter anchored: a bare /<FreshnessBadge/ would still match a
  // renamed <FreshnessBadgeX>, so a component swap could pass unnoticed.
  (homeTabSource.match(/<FreshnessBadge[\s/>]/g) || []).length === 2 &&
    (homeTabSource.match(/<DataStatusBanner[\s/>]/g) || []).length === 2 &&
    /\{\(parkData\?\.source \|\| error\) && \(/.test(homeTabSource) &&
    /\{error\}/.test(homeTabSource),
  true
);

invariantCheck(
  "every Weather + comfort reading survives the restyle",
  // 62B-2C restyled this card. The readings themselves are unchanged, and this
  // guard is what proves the restyle cost none of them.
  // Scoped to the CARD, not the whole file. buildWeatherDisplay() builds the
  // same phrases in template literals ( `${weather.humidity}% humidity` ), so a
  // file-wide match is satisfied by the helper even when the visible JSX
  // reading has been deleted. Only the rendered card counts here.
  /Weather \+ comfort/.test(weatherCardBlock) &&
    /weather\?\.tempF != null/.test(weatherCardBlock) &&
    /\{weather\.tempF\}°F/.test(weatherCardBlock) &&
    /feels like \{weather\.feelsLikeF\}°F/.test(weatherCardBlock) &&
    /\{weather\.humidity\}% humidity/.test(weatherCardBlock) &&
    /buildWeatherDisplay\(weather\)/.test(weatherCardBlock) &&
    /\{weather\?\.summary\s*\?\s*weather\.summary/.test(weatherCardBlock),
  true
);

invariantCheck(
  "the weather mode pill, comfort guidance, badge and banner all remain",
  // Card-scoped for the same reason.
  /weatherMode\?\.mode && weatherMode\.mode !== "normal"/.test(weatherCardBlock) &&
    /\{weatherMode\.label \|\| "Weather watch"\}/.test(weatherCardBlock) &&
    /TOHI will favor lower-walking, indoor, shaded, or reset-friendly moves/.test(
      weatherCardBlock
    ) &&
    /<FreshnessBadge[\s\S]{0,120}source=\{weather\?\.source\}/.test(weatherCardBlock) &&
    /<DataStatusBanner source=\{weather\?\.source\}/.test(weatherCardBlock),
  true
);

// 62B-2C is the phase that introduces weather artwork, so 62B-2B's scope guard
// ("no weather artwork enters this phase") has done its job and is replaced by
// the weather-card assertions in the section below. Nothing is weakened: the
// forbidden-input protection that guard implicitly provided is now asserted
// directly and far more precisely against the real selection path.

invariantCheck(
  "Right Now View keeps its gate, label, guidance and both status branches",
  /liveParkContext\?\.showNotice && \(/.test(homeTabSource) &&
    /\{liveParkContext\.label \|\|/.test(rightNowBlock) &&
    /\{liveParkContext\.guidance \|\|/.test(rightNowBlock) &&
    /liveParkContext\?\.status === "viewing_second_park"/.test(rightNowBlock) &&
    /parkHopperContext\?\.secondParkMustDos\?\.count/.test(rightNowBlock) &&
    /liveParkContext\?\.status === "viewing_different_park"/.test(rightNowBlock) &&
    /\{todayPlannedParkLabel \|\| planningParkLabel\}/.test(rightNowBlock) &&
    /Use \{planningParkLabel\} waits/.test(rightNowBlock),
  true
);

invariantCheck(
  "the planned-park action keeps all three branches in order",
  // confirm presence when allowed -> otherwise browse -> otherwise set active.
  (() => {
    const confirm = rightNowBlock.indexOf("canConfirmParkPresence(parkPresence, planningPark)");
    const browse = rightNowBlock.indexOf("selectBrowsedPark(current, planningPark)");
    const setActive = rightNowBlock.indexOf("setActivePark(planningPark)");
    return (
      confirm > 0 &&
      browse > confirm &&
      setActive > browse &&
      /handleConfirmParkPresence\(planningPark\)/.test(rightNowBlock) &&
      /planningPark && activePark !== planningPark/.test(rightNowBlock)
    );
  })(),
  true
);

invariantCheck(
  "the Right Now analytics call keeps its event, source and full metadata",
  /trackAppEvent\("live_park_switched_from_planned_park_notice", \{/.test(rightNowBlock) &&
    /source: "right_now_live_park_context_notice"/.test(rightNowBlock) &&
    [
      "previousActivePark",
      "nextActivePark",
      "planningPark",
      "planningParkSource",
      "scheduledParkForToday",
      "scheduledSecondaryParkForToday",
      "scheduledParkPlanLabel",
      "hopperContextStatus",
      "shouldConsiderSecondPark",
      "liveParkContextStatus",
      "isLiveParkMismatch",
      "scheduledParkDayNumber",
      // `key:` or bare `key,` — planningPark and planningParkSource are ES6
      // shorthand properties and carry no colon.
    ].every((k) => new RegExp(`\\b${k}\\s*[:,]`).test(rightNowBlock)),
  true
);

invariantCheck(
  "buildLiveParkContext stays in App.jsx and is not reimplemented in Home",
  /const buildLiveParkContext|function buildLiveParkContext/.test(appSource) &&
    !/buildLiveParkContext/.test(homeTabSource),
  true
);

invariantCheck(
  "current-activity card and its actions remain",
  /CURRENTLY IN LINE/.test(homeTabSource) &&
    /handleDone\(currentActivity\.rideId\)/.test(homeTabSource) &&
    /onClick=\{handleCancelCurrentActivity\}/.test(homeTabSource) &&
    /formatElapsedInLineBadge\(currentActivityContext\?\.elapsedMinutesInLine\)/.test(
      homeTabSource
    ),
  true
);

invariantCheck(
  "WhileYouWaitCard keeps all sixteen original props",
  (() => {
    const call = (homeTabSource.match(/<WhileYouWaitCard[\s\S]*?\/>/g) || [])[0] || "";
    // The night flag is this phase's single addition and is asserted separately
    // as a feature; the sixteen originals are what this guard protects.
    const props = [...call.matchAll(/^\s+(\w+)=/gm)]
      .map((m) => m[1])
      .filter((k) => k !== "night")
      .sort();
    return props.join(",");
  })(),
  [
    "actionButton", "activeMiniGame", "activeMiniGameType", "button", "card",
    "handleFamilyVote", "handleLookAroundFound", "handleMiniGameTypeChange",
    "handleNextMiniGame", "handleTriviaChoice", "lookAroundFound",
    "revealedTriviaAnswer", "selectedFamilyVoteOption", "selectedTriviaChoice",
    "showTriviaAnswer", "whileYouWaitContent",
  ].join(",")
);

invariantCheck(
  "the existing data utility yields exactly the four selectable Disney parks",
  // Base-true: parkAreas.js is untouched by this phase. Classified as a guard,
  // not a discriminator — what 62B-2D changed is which list Home iterates, and
  // that is asserted above.
  getSelectableParks().map((p) => p.id).join(","),
  "magic_kingdom,epcot,hollywood,animal_kingdom"
);



invariantCheck(
  "LineTimeCompanion still destructures every prop it is given",
  // The inner component receives the mini-game state and handlers. Dropping one
  // here leaves the markup intact but the control dead — it renders identically,
  // so only a prop-list guard catches it.
  (() => {
    const open = wywSource.indexOf("function LineTimeCompanion({");
    const close = wywSource.indexOf("}) {", open);
    if (open < 0 || close < 0) return "";
    return [...wywSource.slice(open, close).matchAll(/^\s*(\w+)[,=]/gm)]
      .map((m) => m[1])
      .filter((k) => k !== "night")
      .sort()
      .join(",");
  })(),
  [
    "actionButton", "activeMiniGame", "activeMiniGameType", "button",
    "handleFamilyVote", "handleLookAroundFound", "handleMiniGameTypeChange",
    "handleNextMiniGame", "handleTriviaChoice", "lookAroundFound",
    "revealedTriviaAnswer", "selectedFamilyVoteOption", "selectedTriviaChoice",
    "showTriviaAnswer",
  ].join(",")
);

invariantCheck(
  "WhileYouWaitCard still destructures every prop it is given",
  // The HomeTab call site is guarded above; this guards the receiving end.
  // Dropping a handler from the destructuring leaves the markup intact but the
  // control dead, which renders identically and would otherwise slip through.
  (() => {
    const open = wywSource.indexOf("export function WhileYouWaitCard({");
    const close = wywSource.indexOf("}) {", open);
    if (open < 0 || close < 0) return "";
    return [...wywSource.slice(open, close).matchAll(/^\s*(\w+)[,=]/gm)]
      .map((m) => m[1])
      .filter((k) => k !== "night")
      .sort()
      .join(",");
  })(),
  [
    "actionButton", "activeMiniGame", "activeMiniGameType", "button", "card",
    "handleFamilyVote", "handleLookAroundFound", "handleMiniGameTypeChange",
    "handleNextMiniGame", "handleTriviaChoice", "lookAroundFound",
    "revealedTriviaAnswer", "selectedFamilyVoteOption", "selectedTriviaChoice",
    "showTriviaAnswer", "whileYouWaitContent",
  ].join(",")
);

invariantCheck(
  "park-presence prompt remains and still precedes the selector",
  // Selector located by its handler, so this reads identically before and after
  // 62B-2D and stays a genuine base-true guard rather than being padded with
  // this phase's new landmark.
  /PARK CHECK/.test(homeTabSource) &&
    /handleConfirmParkPresence\(parkPresencePrompt\.parkId\)/.test(homeTabSource) &&
    /onClick=\{handleDismissParkPresencePrompt\}/.test(homeTabSource) &&
    selectorStartIdx > 0 &&
    homeTabCode.search(/\{parkPresencePrompt\s*&&\s*\(/) < selectorStartIdx,
  true
);

invariantCheck(
  "the selector still browses, and never switches the active park",
  /onClick=\{\(\)\s*=>\s*handleSelectPark\(park\.id\)\}/.test(homeTabSource) &&
    /browsedParkId === park\.id/.test(homeTabSource) &&
    !/setActivePark\(park\.id\)/.test(selectorBlock),
  true
);

invariantCheck(
  "HomeTab stays presentation-only",
  !/useState|useEffect|useMemo|useCallback|useRef/.test(homeTabSource) &&
    !/localStorage|sessionStorage|setInterval|addEventListener/.test(homeTabSource) &&
    !/\bfetch\s*\(/.test(homeTabSource),
  true
);


invariantCheck(
  "Home night is not activated — App passes a literal false and the shell stays Plan-only",
  // Base-true and true now: before this phase App passed no night prop at all
  // and planShellNight was Plan-only; after it, the prop is a literal false and
  // planShellNight is untouched. 62B-2F-2 is what flips this.
  /const planShellNight\s*=\s*activeTab === "plan"\s*&&\s*planNight;/.test(appSource) &&
    /night=\{planShellNight\}/.test(appSource) &&
    (() => {
      const open = appSource.indexOf("<HomeTab");
      const close = appSource.indexOf("/>", open);
      if (open < 0 || close < 0) return false;
      const el = appSource.slice(open, close);
      const nightProps = el.match(/night=\{[^}]*\}/g) || [];
      // Base has no night prop at all; this phase passes a literal false.
      // Anything else — planNight, parkPresenceTheme.isNight, planShellNight —
      // means Home night went live, which belongs to 62B-2F-2.
      return nightProps.length === 0 ||
        (nightProps.length === 1 && nightProps[0] === "night={false}");
    })(),
  true
);

invariantCheck(
  "Home night mode is still not activated",
  // parkPresenceTheme.isNight already styles the park-presence prompt and is
  // pre-existing, so it is not what this guards. What must NOT appear is the
  // shell's night machinery reaching Home, and the Plan-only night gate in App
  // must still be Plan-only.
  !/planShellNight|shellTokens|getTohiAppShellTheme|forceMode|pageStyle/.test(homeTabSource) &&
    /const planShellNight\s*=\s*activeTab === "plan"\s*&&\s*planNight;/.test(appSource),
  true
);

invariantCheck(
  "Home states no opening time and makes no authoritative open claim",
  // Base-true, and therefore a guard rather than a discriminator: Home has
  // never claimed a park was open, and this phase must not start.
  !/Park open|Park is open|Open until/i.test(homeTabSource) &&
    !/openTimeLabel|parkOpenLabel|openingTime|getParkHoursForDate/.test(homeTabSource),
  true
);

invariantCheck(
  "App still owns Home's data, refresh and visibility behaviour",
  /const AUTO_REFRESH_MS = 3 \* 60 \* 1000;/.test(appSource) &&
    /document\.addEventListener\("visibilitychange", handleVisibility\)/.test(appSource) &&
    /\{activeTab === "home" && \(/.test(appSource) &&
    (appSource.match(/<HomeTab[\s>]/g) || []).length === 1,
  true
);

invariantCheck(
  "the artwork manifest is untouched by this phase",
  /export const HOME_PARK_ART = \{/.test(manifestSource) &&
    /export const HOME_WEATHER_ART = \{/.test(manifestSource) &&
    !/export\s+default|export\s+function/.test(manifestSource),
  true
);

console.log("");
console.log(`  62B-2B/2C feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  62B-2B/2C invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
