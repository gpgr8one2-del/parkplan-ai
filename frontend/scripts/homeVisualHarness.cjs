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
  // A boolean `night` argument would lock the later night phase into an API
  // change; an explicit mode key does not.
  /const HOME_ART_MODE = "day";/.test(homeTabSource) &&
    /\[\s*HOME_ART_MODE\s*\]/.test(homeTabCode) &&
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
  /background: heroParkArt\s*\?\s*"rgba\([\d\s.,]+\)"\s*:\s*"linear-gradient\(150deg/.test(
    homeTabCode
  ),
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
    /HOME_WEATHER_ART\[\s*weatherArtFamily\s*\]\s*\?\.\[\s*HOME_ART_MODE\s*\]/.test(
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
    /<DataStatusBanner source=\{weather\?\.source\} \/>/.test(weatherCardBlock),
  true
);

// 62B-2C is the phase that introduces weather artwork, so 62B-2B's scope guard
// ("no weather artwork enters this phase") has done its job and is replaced by
// the weather-card assertions in the section below. Nothing is weakened: the
// forbidden-input protection that guard implicitly provided is now asserted
// directly and far more precisely against the real selection path.

invariantCheck(
  "Right Now View, hopper context and the planned-park action remain",
  /RIGHT NOW VIEW/.test(homeTabSource) &&
    /liveParkContext\?\.showNotice/.test(homeTabSource) &&
    /viewing_second_park/.test(homeTabSource) &&
    /viewing_different_park/.test(homeTabSource) &&
    /Use \{planningParkLabel\} waits/.test(homeTabSource) &&
    /live_park_switched_from_planned_park_notice/.test(homeTabSource),
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
  "WhileYouWaitCard keeps all sixteen props",
  (() => {
    const call = (homeTabSource.match(/<WhileYouWaitCard[\s\S]*?\/>/g) || [])[0] || "";
    const props = [...call.matchAll(/^\s+(\w+)=/gm)].map((m) => m[1]).sort();
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
  "park-presence prompt remains and still precedes the selector",
  /PARK CHECK/.test(homeTabSource) &&
    /handleConfirmParkPresence\(parkPresencePrompt\.parkId\)/.test(homeTabSource) &&
    /onClick=\{handleDismissParkPresencePrompt\}/.test(homeTabSource) &&
    homeTabSource.search(/\{parkPresencePrompt\s*&&\s*\(/) <
      homeTabSource.search(/\{PARKS\.map\(/),
  true
);

invariantCheck(
  "park selector and its handler remain unchanged",
  /\{PARKS\.map\(\(park\) => \(/.test(homeTabSource) &&
    /onClick=\{\(\)\s*=>\s*handleSelectPark\(park\.id\)\}/.test(homeTabSource) &&
    /browsedParkId === park\.id/.test(homeTabSource) &&
    !/setActivePark\(park\.id\)/.test(homeTabSource),
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
