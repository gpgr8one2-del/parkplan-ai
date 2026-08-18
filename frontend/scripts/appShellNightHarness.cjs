#!/usr/bin/env node

// Phase 62A — Plan-aware night shell and bottom navigation.
//
// Kept out of planVisualHarness deliberately: that harness is already large and
// is about Plan content, whereas this one is about the shared app shell and the
// bottom navigation.
//
// Two explicitly labeled categories:
//
//   FEATURE-DISCRIMINATING — proves the 62A behavior exists. All ten MUST fail
//   against base commit e939600.
//
//   INVARIANT REGRESSION GUARDS — protects day values and everything 62A was
//   told not to touch. These pass against the base wherever the unchanged
//   behavior already exists there; no new-feature conjunct is attached to force
//   a baseline failure.
//
// Matchers are whitespace- and prop-order-tolerant throughout.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(frontendRoot, ...parts), "utf8");

const appSource = read("src", "App.jsx");
const bottomTabsSource = read("src", "components", "BottomTabs.jsx");
const themeSource = read("src", "theme.js");
const tohiThemeSource = read("src", "theme", "tohiTheme.js");
const themeRuntimeSource = read("src", "theme", "tohiThemeRuntime.js");
const cardSource = read("src", "components", "RecommendationCard.jsx");

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

let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;

function featureCheck(label, actual, expected) {
  const before = failCount;
  check(label, actual, expected);
  if (failCount > before) featureFail += 1;
  else featurePass += 1;
}

function invariantCheck(label, actual, expected) {
  const before = failCount;
  check(label, actual, expected);
  if (failCount > before) invariantPass += 0, (invariantFail += 1);
  else invariantPass += 1;
}

// Slice a named object literal out of the theme source and return its
// key -> raw value pairs, so token values can be inspected for real rather than
// pattern-matched across the whole file.
function readTokenBlock(source, name) {
  const start = source.indexOf(`export const ${name} = {`);
  if (start < 0) return null;
  const end = source.indexOf("\n};", start);
  if (end < 0) return null;

  const body = source.slice(start, end);
  const pairs = {};
  for (const match of body.matchAll(/^\s{2}(\w+):\s*([\s\S]*?),\s*$/gm)) {
    pairs[match[1]] = match[2].trim();
  }
  return pairs;
}

// Line comments stripped, for checks that count real code usage.
const appSourceWithoutComments = appSource.replace(/^\s*\/\/.*$/gm, "");

// Render branch of each tab that remains deliberately day-styled, so a night
// value leaking into one of them can be detected directly.
//
// Every content tab has now been converted: Home left this list in 62B-2F-2,
// Waits in 63C-2, TOHI in 64B-2E-2 and Profile in the Profile night phase. Each
// left only once every surface on the tab had a night presentation and the tab
// had joined the shared shell flag.
//
// The list is deliberately kept — empty — rather than deleted. The machinery
// below is what fails the moment a NEW day-only tab is added and someone
// darkens it without giving its surfaces a night treatment, and re-deriving it
// from scratch at that point is exactly when it would be skipped. Onboarding is
// not in it because onboarding is not an activeTab branch; it is checked at its
// own element, where it must stay day-only permanently.
const mainEnd = appSource.indexOf("</main>");
const UNCONVERTED_TABS = [];
const unconvertedTabBranches = UNCONVERTED_TABS
  .map((key) => {
    const start = appSource.indexOf(`{activeTab === "${key}" &&`);
    if (start < 0) return "";
    const nextTab = appSource.indexOf('{activeTab === "', start + 20);
    const end = nextTab > start && nextTab < mainEnd ? nextTab : mainEnd;
    return appSource.slice(start, end);
  })
  .filter((branch) => branch.length > 0);

// The Profile render branch, sliced once and reused by the checks below.
const profileBranch = (() => {
  const start = appSource.indexOf('{activeTab === "profile" &&');
  if (start < 0) return "";
  return mainEnd > start ? appSource.slice(start, mainEnd) : appSource.slice(start);
})();

// The <OnboardingFlow ... /> element, bounded so a night prop belonging to a
// later component cannot be mistaken for one of onboarding's.
const onboardingElement = (() => {
  const open = appSource.indexOf("<OnboardingFlow");
  if (open < 0) return "";
  const close = appSource.indexOf("/>", open);
  return close > open ? appSource.slice(open, close) : "";
})();

const nightShell = readTokenBlock(tohiThemeSource, "TOHI_NIGHT_SHELL");
const dayShell = readTokenBlock(tohiThemeSource, "TOHI_DAY_SHELL");

// Isolate the <BottomTabs ... /> call in App rather than scanning the whole file.
const bottomTabsCallStart = appSource.search(/<BottomTabs[\s>]/);
const bottomTabsCallEnd =
  bottomTabsCallStart >= 0 ? appSource.indexOf("/>", bottomTabsCallStart) : -1;
const bottomTabsCall =
  bottomTabsCallStart >= 0 && bottomTabsCallEnd > bottomTabsCallStart
    ? appSource.slice(bottomTabsCallStart, bottomTabsCallEnd + 2)
    : "";

console.log("Phase 62A app shell night — FEATURE-DISCRIMINATING");

featureCheck(
  "App derives one converted-tab shell-night flag from activeTab and planNight",
  // 62B-2F-2 superseded the Plan-only form when Home joined; 63C-2 superseded
  // the Home-or-Plan form when Waits joined; the Profile night phase adds the
  // fifth and final content tab. Each tab was added only once every one of its
  // surfaces had a night presentation. What is protected is unchanged and
  // slightly stronger: exactly one flag, derived from nothing but activeTab and
  // the existing planNight signal.
  /const shellNight\s*=\s*\n?\s*\(activeTab === "plan" \|\|\s*\n?\s*activeTab === "home" \|\|\s*\n?\s*activeTab === "waits" \|\|\s*\n?\s*activeTab === "tohi" \|\|\s*\n?\s*activeTab === "profile"\)\s*&&\s*\n?\s*planNight;/.test(
    appSource
  ) &&
    /const planNight = parkPresenceTheme\.isNight;/.test(appSource) &&
    !/const planShellNight/.test(appSource) &&
    // derived only — no stored state, effect, timer, storage, or media query
    !/useState\([^)]*shellNight/.test(appSource) &&
    !/shellNight[\s\S]{0,120}(localStorage|setInterval|setTimeout|matchMedia)/.test(
      appSource
    ),
  true
);

featureCheck(
  "the five converted tabs, and only those, drive the shell",
  // Exact set, not a substring match: adding an unconverted tab fails here, and
  // so does dropping a converted one.
  (() => {
    const m = appSource.match(
      /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
    );
    if (!m) return false;
    const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
    // 64B-2E-2 added tohi; the Profile night phase adds profile, completing the
    // five content tabs. Exact set, so adding a sixth or dropping one fails here.
    return tabs.join(",") === "home,plan,profile,tohi,waits";
  })() &&
    // and the tabs that are NOT converted are provably absent from it
    UNCONVERTED_TABS.every(
      (t) =>
        !new RegExp(
          `const shellNight[\\s\\S]*?activeTab === "${t}"[\\s\\S]*?planNight;`
        ).test(appSource)
    ),
  true
);

// Every converted content tab is activated through the SAME flag, each pinned
// to exactly one night prop. Scoped per element: Plan's own components
// legitimately receive night={planNight}, so a file-wide positive would be wrong.
for (const tag of ["HomeTab", "WaitsTab", "TohiTab"]) {
  featureCheck(
    `${tag} is activated through that same flag`,
    (() => {
      const open = appSource.indexOf(`<${tag}`);
      if (open < 0) return false;
      const close = appSource.indexOf("/>", open);
      if (close < 0) return false;
      const el = appSource.slice(open, close);
      const nightProps = el.match(/night=\{[^}]*\}/g) || [];
      return nightProps.length === 1 && nightProps[0] === "night={shellNight}";
    })(),
    true
  );
}

featureCheck(
  "no temporary night gate survives anywhere in App",
  // 63C-1 parked a deliberate night={false} on <WaitsTab /> while the Waits
  // night presentation was prepared but inactive, and 63C-2 restored this
  // file-wide negative once Waits was activated. 64B-2E-1 did the same for TOHI
  // and 64B-2E-2 restores it again — stronger than the element-scoped form it
  // needed while the gate existed.
  //
  // The narrowed 64B-2E-1 block that permitted exactly one TohiTab gate, and the
  // restore-reminder it carried, are both deliberately gone: the gate they
  // described no longer exists, so keeping them would let a future gate be
  // parked indefinitely without anyone noticing.
  !/night=\{false\}/.test(appSource),
  true
);

featureCheck(
  "Profile styling is driven by the shared shell decision, not by a local one",
  // Replaces the previous "Profile and onboarding remain day-only" check, which
  // asserted the opposite and is now wrong for Profile. What survives from it is
  // the half that still holds — onboarding — checked separately below.
  //
  // Profile must READ shellNight and must not compute night for itself: no clock,
  // no theme lookup, no isNight, no forceMode, no media query, no storage inside
  // the branch. That is what makes Profile's night a consequence of the one
  // parent decision rather than a second, drift-prone mechanism.
  profileBranch.length > 0 &&
    /shellNight/.test(profileBranch) &&
    !/planNight|isNight|new Date\(|getHours|forceMode|matchMedia|prefers-color-scheme/.test(
      profileBranch
    ) &&
    !/localStorage|sessionStorage/.test(profileBranch) &&
    !/getTohiAppShellTheme|getTohiThemeMode|getTohiShellTokens|isTohiNightMode/.test(
      profileBranch
    ) &&
    !/useState|useEffect/.test(profileBranch),
  true
);

featureCheck(
  "every Profile surface has an intentional night treatment",
  // A night presentation that covers only some surfaces is worse than none: the
  // untreated ones read as bugs on the dark shell. Each conditional below is one
  // named surface from the phase's list, matched at its own token so a missing
  // treatment fails here by name rather than passing on a file-wide positive.
  (() => {
    const required = [
      // setup hero
      "PROFILE_NIGHT.heroBackground",
      "PROFILE_NIGHT.heroBorder",
      "PROFILE_NIGHT.heroShadow",
      // complete and incomplete status pills
      "PROFILE_NIGHT.statusCompleteBackground",
      "PROFILE_NIGHT.statusCompleteColor",
      "PROFILE_NIGHT.statusNeededBackground",
      "PROFILE_NIGHT.statusNeededColor",
      // primary action
      "PROFILE_NIGHT.ctaBackground",
      "PROFILE_NIGHT.ctaColor",
      "PROFILE_NIGHT.ctaBorder",
      "PROFILE_NIGHT.ctaShadow",
      // incomplete-profile alert
      "PROFILE_NIGHT.alertBackground",
      "PROFILE_NIGHT.alertBorder",
      "PROFILE_NIGHT.alertShadow",
      "PROFILE_NIGHT.alertTitle",
      "PROFILE_NIGHT.alertBody",
      // child rows
      "PROFILE_NIGHT.childSurface",
      "PROFILE_NIGHT.childBorder",
      // all three height-message states
      "PROFILE_NIGHT.heightLowBackground",
      "PROFILE_NIGHT.heightLowColor",
      "PROFILE_NIGHT.heightMidBackground",
      "PROFILE_NIGHT.heightMidColor",
      "PROFILE_NIGHT.heightHighBackground",
      "PROFILE_NIGHT.heightHighColor",
      // priority chips
      "PROFILE_NIGHT.priorityBackground",
      "PROFILE_NIGHT.priorityColor",
      "PROFILE_NIGHT.priorityBorder",
      // developer-preview banner and button
      "PROFILE_NIGHT.devSurface",
      "PROFILE_NIGHT.devBorder",
      "PROFILE_NIGHT.devTitle",
      "PROFILE_NIGHT.devButtonBackground",
      "PROFILE_NIGHT.devButtonBorder",
      "PROFILE_NIGHT.devButtonColor",
    ];
    // These live in the shared Profile renderers rather than the branch, so they
    // are checked against the whole file: grouped cards, section eyebrow chips,
    // labels, values, hints, "Not set", and the packing disclaimer caption.
    const requiredInRenderers = [
      "PROFILE_NIGHT.groupSurface",
      "PROFILE_NIGHT.groupShadow",
      "PROFILE_NIGHT.tonePurpleText",
      "PROFILE_NIGHT.tonePurpleChip",
      "PROFILE_NIGHT.tonePurpleBorder",
      "PROFILE_NIGHT.toneSkyText",
      "PROFILE_NIGHT.toneSkyChip",
      "PROFILE_NIGHT.toneSkyBorder",
      "PROFILE_NIGHT.toneAmberText",
      "PROFILE_NIGHT.toneAmberChip",
      "PROFILE_NIGHT.toneAmberBorder",
      "PROFILE_NIGHT.toneFallbackBorder",
      "PROFILE_NIGHT.title",
      "PROFILE_NIGHT.muted",
    ];
    return (
      required.every((token) => profileBranch.includes(token)) &&
      requiredInRenderers.every((token) => appSource.includes(token))
    );
  })(),
  true
);

featureCheck(
  "the Profile night palette is a lookup table, not a second night decision",
  // PROFILE_NIGHT may hold colours and nothing else. If it ever gained a clock,
  // a storage read, or a theme lookup it would become a competing mechanism, and
  // the single-source guarantee the shell rests on would be gone.
  (() => {
    const start = appSource.indexOf("const PROFILE_NIGHT = {");
    if (start < 0) return false;
    const end = appSource.indexOf("\n};", start);
    if (end < 0) return false;
    // Comments stripped: each entry deliberately names the DAY value it
    // replaces, so `<- #FFFFFF` is documentation, not a night colour. Without
    // this the day-fill guard below would fire on the comments it is meant to
    // make possible.
    const table = appSource.slice(start, end).replace(/\/\/.*$/gm, "");
    return (
      !/new Date\(|getHours|matchMedia|localStorage|sessionStorage|useState|isNight|forceMode|=>/.test(
        table
      ) &&
      // no pure black anywhere in the palette
      !/#000\b|#000000\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(table) &&
      // and no day-mode white or cream card fill smuggled into a night token
      !/#FFFFFF\b|#FFF9F1\b|#FFFDF8\b/i.test(table)
    );
  })(),
  true
);

featureCheck(
  "onboarding remains day-only, including when reached from a night Profile",
  // The surviving half of the old Profile-and-onboarding check. Onboarding is
  // reached through activeScreen rather than activeTab, so shellNight cannot
  // apply to it — it keeps the module-level day `page` and takes no night prop.
  // "Review setup" therefore returns to the unchanged day onboarding.
  onboardingElement.length > 0 &&
    !/page=\{pageStyle\}/.test(onboardingElement) &&
    !/night=\{/.test(onboardingElement) &&
    /page=\{page\}/.test(onboardingElement) &&
    !/shellNight|planNight|shellTokens|PROFILE_NIGHT/.test(onboardingElement),
  true
);

featureCheck(
  "no second night-mode mechanism is introduced anywhere in App",
  // The activation must add no clock, media query, storage value or preference.
  // Counts are pinned rather than merely pattern-matched, because an UNUSED
  // extra clock introduces no behaviour today and would otherwise sit in the
  // file until someone wires it up. Both existing getHours() calls are pure
  // time helpers (day-phase and minutes-of-day), neither decides a theme.
  (appSource.match(/getTohiAppShellTheme\(/g) || []).length === 3 &&
    (appSource.match(/getHours\(\)/g) || []).length === 2 &&
    !/matchMedia|prefers-color-scheme/.test(appSource) &&
    !/isTohiNightMode|TOHI_NIGHT_SHELL/.test(appSource) &&
    !/(localStorage|sessionStorage)[^\n]*(night|dark|theme)/i.test(appSource) &&
    // exactly one night flag is derived, and one place derives it
    (appSource.match(/const shellNight\s*=/g) || []).length === 1 &&
    (appSource.match(/const planNight\s*=/g) || []).length === 1,
  true
);

featureCheck(
  "the main page receives the dark shell only through that flag",
  /const pageStyle\s*=\s*shellNight\s*\n?\s*\?\s*\{[\s\S]{0,400}?\}\s*:\s*page;/.test(
    appSource
  ) &&
    /background:\s*shellTokens\.pageBackground/.test(appSource) &&
    /backgroundColor:\s*shellTokens\.pageBackgroundColor/.test(appSource) &&
    /color:\s*shellTokens\.text/.test(appSource) &&
    /<main style=\{pageStyle\}>/.test(appSource),
  true
);

featureCheck(
  "BottomTabs receives the explicit night prop from App",
  bottomTabsCall.length > 0 && /\bnight=\{shellNight\}/.test(bottomTabsCall),
  true
);

featureCheck(
  "the prop is forwarded through both portal and non-portal render paths",
  /export function BottomTabs\(\{[^}]*night = false/.test(bottomTabsSource) &&
    /function BottomTabsContent\(\{[^}]*night = false/.test(bottomTabsSource) &&
    (bottomTabsSource.match(/<BottomTabsContent[\s\S]*?night=\{night\}/g) || []).length === 2 &&
    /createPortal\(\s*<BottomTabsContent[\s\S]*?night=\{night\}/.test(bottomTabsSource),
  true
);

featureCheck(
  "BottomTabs forces its theme from the supplied prop, not from the clock",
  /forceMode:\s*night\s*\?\s*TOHI_THEME_MODES\.NIGHT\s*:\s*TOHI_THEME_MODES\.DAY/.test(
    bottomTabsSource
  ) &&
    // no unforced lookup left anywhere in the component
    !/getTohiAppShellTheme\(\s*\)/.test(bottomTabsSource) &&
    // and no local decision of its own
    !/isNight|new Date\(|getHours/.test(bottomTabsSource),
  true
);

featureCheck(
  "the night page background uses navy values",
  Boolean(nightShell) &&
    /#0F172A/i.test(nightShell.pageBackground) &&
    /#111A33/i.test(nightShell.pageBackground) &&
    /#131C36/i.test(nightShell.pageBackground) &&
    nightShell.pageBackgroundColor === '"#0F172A"',
  true
);

featureCheck(
  "night navigation outer shell, tray, active tab, and inactive tabs are all treated",
  Boolean(nightShell) &&
    [
      "navBackground",
      "navBorder",
      "navShadow",
      "navTrayBackground",
      "navTrayBorder",
      "navTrayInset",
      "navActiveBackground",
      "navActiveBorder",
      "navActiveColor",
      "navActiveShadow",
      "navInactiveColor",
    ].every((token) => Boolean(nightShell[token])) &&
    // every one differs from its day counterpart, so none was left day-styled
    [
      "navBackground",
      "navBorder",
      "navShadow",
      "navTrayBackground",
      "navTrayBorder",
      "navTrayInset",
      "navActiveBackground",
      "navActiveBorder",
      "navActiveColor",
      "navActiveShadow",
      "navInactiveColor",
    ].every((token) => nightShell[token] !== dayShell[token]),
  true
);

featureCheck(
  "the Plan-gated night condition stays active while Plan Tools is open",
  // shellNight depends only on activeTab, which stays "plan" for the sub-view,
  // so opening Plan Tools cannot turn the shell back to day.
  /activeTab === "plan"/.test(appSource) &&
    !/shellNight[^\n]*planToolsOpen/.test(appSource) &&
    !/planToolsOpen[^\n]*shellNight/.test(appSource) &&
    /const \[planToolsOpen, setPlanToolsOpen\]\s*=\s*useState\(false\)/.test(appSource),
  true
);

featureCheck(
  "whenever the shell flag is false, the shell and navigation are forced to day",
  // Previously phrased as "switching to any unconverted tab". Every content tab
  // is now converted, so the flag is false during daylight rather than on a
  // particular tab — but what it protects is unchanged: a false flag must force
  // day everywhere, never merely fail to force night.
  //
  // page falls back to the untouched module-level object by identity...
  /:\s*page;/.test(appSource) &&
    // ...and the shell lookup itself forces day whenever the flag is false
    /forceMode:\s*shellNight\s*\?\s*TOHI_THEME_MODES\.NIGHT\s*:\s*TOHI_THEME_MODES\.DAY/.test(
      appSource
    ) &&
    /forceMode:\s*night\s*\?\s*TOHI_THEME_MODES\.NIGHT\s*:\s*TOHI_THEME_MODES\.DAY/.test(
      bottomTabsSource
    ),
  true
);

featureCheck(
  "no pure black among the new night-shell token values",
  Boolean(nightShell) &&
    Object.entries(nightShell)
      // box-shadow and text-shadow legitimately use rgba(0,0,0,a)
      .filter(([key]) => !/shadow|inset/i.test(key))
      .every(
        ([, value]) =>
          !/#000\b|#000000\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/i.test(
            value
          )
      ),
  true
);

console.log("Phase 62A app shell night — INVARIANT REGRESSION GUARDS");

invariantCheck(
  "day mode retains the existing page and BottomTabs values",
  // Each literal the shell renders in day mode still exists verbatim in the
  // shell layer, whether it lives in BottomTabs (base) or in the day shell
  // token set (after 62A).
  [
    "linear-gradient(180deg, #FFF4E6 0%, #FFF9F1 100%)",
    "rgba(255, 249, 241, 0.98)",
    "rgba(255, 255, 255, 0.52)",
    "1px solid rgba(234, 220, 200, 0.55)",
    "inset 0 1px 0 rgba(255, 255, 255, 0.76)",
    "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(243,232,255,0.94))",
    "1px solid rgba(124, 58, 237, 0.24)",
    "0 10px 22px rgba(124, 58, 237, 0.16)",
    "1px solid transparent",
  ].every((literal) =>
    `${bottomTabsSource}\n${tohiThemeSource}\n${themeSource}`.includes(literal)
  ),
  true
);

invariantCheck(
  "Plan Tools remains a secondary view inside Plan and adds no sixth primary tab",
  (bottomTabsSource.match(/key:\s*"(\w+)"/g) || []).length === 5 &&
    !/setActiveTab\(\s*["'`]plan_tools/.test(appSource) &&
    !/setActiveScreen\(\s*["'`]plan_tools/.test(appSource) &&
    !/plan_tools|planTools/.test(bottomTabsSource),
  true
);

invariantCheck(
  "BottomTabs remains five tabs in the same order",
  [...bottomTabsSource.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]).join(",") ===
    "home,waits,plan,tohi,profile",
  true
);

invariantCheck(
  "tab labels, icons, handlers, and aria-current remain",
  ["Home", "Waits", "Plan", "TOHI", "Profile"].every((label) =>
    new RegExp(`label:\\s*"${label}"`).test(bottomTabsSource)
  ) &&
    ["Home", "Clock", "CalendarDays", "Sparkles", "UserCircle"].every((icon) =>
      new RegExp(`icon:\\s*${icon}`).test(bottomTabsSource)
    ) &&
    /onClick=\{\(\)\s*=>\s*onTabChange\?\.\(tab\.key\)\}/.test(bottomTabsSource) &&
    /aria-current=\{isActive \? "page" : undefined\}/.test(bottomTabsSource) &&
    /minHeight:\s*56/.test(bottomTabsSource),
  true
);

invariantCheck(
  "visualViewport behavior and listener cleanup remain",
  /window\.visualViewport/.test(bottomTabsSource) &&
    /window\.addEventListener\("resize", update\)/.test(bottomTabsSource) &&
    /window\.removeEventListener\("resize", update\)/.test(bottomTabsSource) &&
    /window\.visualViewport\?\.removeEventListener\("resize", update\)/.test(
      bottomTabsSource
    ) &&
    /cancelAnimationFrame\(frameId\)/.test(bottomTabsSource),
  true
);

invariantCheck(
  "portal architecture and safe-area handling remain",
  /createPortal\(/.test(bottomTabsSource) &&
    /document\.body\s*\)/.test(bottomTabsSource) &&
    /typeof document === "undefined" \|\| !document\.body/.test(bottomTabsSource) &&
    /padding:\s*"8px 10px calc\(8px \+ env\(safe-area-inset-bottom, 0px\)\)"/.test(
      bottomTabsSource
    ) &&
    /height:\s*`calc\(\$\{NAV_BASE_HEIGHT_PX\}px \+ env\(safe-area-inset-bottom, 0px\)\)`/.test(
      bottomTabsSource
    ) &&
    /zIndex:\s*2147483647/.test(bottomTabsSource),
  true
);

invariantCheck(
  "onboarding remains on the original day page style",
  // OnboardingFlow is handed the module-level day `page`, never `pageStyle`.
  /<OnboardingFlow[\s\S]*?page=\{page\}/.test(appSource) &&
    !/<OnboardingFlow[\s\S]*?page=\{pageStyle\}/.test(appSource),
  true
);

invariantCheck(
  "no night styling reaches an unconverted tab's content",
  // Slice each unconverted tab's render branch and prove no shell-night value is
  // used inside it. Home stopped being one in 62B-2F-2, Waits in 63C-2, TOHI in
  // 64B-2E-2 and Profile in the Profile night phase, so the list is empty today
  // and this holds vacuously.
  //
  // Kept rather than deleted, because its job was never to describe the current
  // tab list — it is the guard that catches a NEW day-only tab being darkened
  // without a night presentation. Adding a key to UNCONVERTED_TABS re-arms it in
  // one line.
  //
  // The forbidden list includes shellNight. Without it this guard was blind to
  // the rename: `planShellNight` does not match `shellNight`, so a darkened
  // unconverted branch would have passed unnoticed.
  unconvertedTabBranches.length === UNCONVERTED_TABS.length &&
    unconvertedTabBranches.every(
      (branch) =>
        branch.length > 0 &&
        !/planShellNight|shellNight|shellTokens|pageStyle/.test(branch)
    ),
  true
);

invariantCheck(
  "the approved Profile DAY values survive the night conversion unchanged",
  // Day parity, checked at the source. Every literal below is a value the
  // approved Profile day design rendered before this phase, and each must still
  // be present on the false side of its conditional. A conversion that "tidied"
  // a day colour while adding night would fail here, which is the exact failure
  // this phase was told to prevent.
  //
  // Structural day values — radii, padding, spacing, font sizes and weights —
  // are deliberately not duplicated into the night palette at all, so they
  // cannot drift: there is only one copy of each in the branch.
  [
    // setup hero
    'linear-gradient(150deg, #FFFFFF 0%, #F6EFFF 56%, #FFF7ED 100%)',
    '"1px solid rgba(124, 58, 237, 0.22)"',
    '"0 16px 38px rgba(91, 33, 182, 0.10)"',
    // status pills
    "colors.successSoft",
    "colors.amberSoft",
    '"#046A4E"',
    '"#92400E"',
    // primary action
    'linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)',
    '"rgba(124, 58, 237, 0.28)"',
    '"0 12px 24px rgba(124, 58, 237, 0.18)"',
    // incomplete alert
    'linear-gradient(145deg, #FFFFFF 0%, #FEF3C7 100%)',
    '"1px solid rgba(245, 158, 11, 0.32)"',
    '"0 10px 28px rgba(245, 158, 11, 0.10)"',
    '"#7A4A10"',
    // child rows
    "colors.backgroundSoft",
    "colors.cardBorder",
    // height messages
    "colors.errorSoft",
    '"#9F1239"',
    // priority chips
    '"1px solid rgba(91, 33, 182, 0.35)"',
    // developer preview
    '"1px solid #ddd6fe"',
    '"#f5f3ff"',
    '"#6d28d9"',
    "colors.purple",
  ].every((literal) => profileBranch.includes(literal)) &&
    // grouped cards and eyebrow chips live in the shared renderers
    [
      '"#FFFFFF"',
      '"0 10px 28px rgba(28, 25, 23, 0.06)"',
      "colors.purpleDeep",
      '"rgba(124, 58, 237, 0.10)"',
      '"rgba(124, 58, 237, 0.20)"',
      '"#0369A1"',
      '"rgba(56, 189, 248, 0.14)"',
      '"rgba(56, 189, 248, 0.26)"',
      '"rgba(245, 158, 11, 0.28)"',
    ].every((literal) => appSource.includes(literal)),
  true
);

invariantCheck(
  "Profile keeps its content, structure, single action, and read-only shape",
  // The night phase was presentation-only. These are the load-bearing pieces of
  // the approved Profile that a restyle could quietly disturb: the group titles
  // and their order, the definition-list structure, the one primary action, and
  // the absence of any editing control.
  [
    "Your family setup",
    "Trip details",
    "Who's going",
    "Comfort &amp; pace",
    "What matters most",
    "Packing &amp; day comfort",
  ]
    .map((title) => title.replace("&amp;", "&"))
    .every((title) => profileBranch.includes(title)) &&
    // group order is unchanged
    (() => {
      const order = ["Trip details", "Who's going", "Comfort & pace", "What matters most", "Packing & day comfort"];
      const positions = order.map((title) => profileBranch.indexOf(title));
      return positions.every((p, i) => p > -1 && (i === 0 || p > positions[i - 1]));
    })() &&
    // still a read-only summary: no editing control was introduced
    !/<input|<select|<textarea/.test(profileBranch) &&
    // exactly two buttons in the branch — the primary action and the
    // developer-preview toggle, which only renders behind the dev flag
    (profileBranch.match(/<button/g) || []).length === 2 &&
    /setActiveScreen\("family_profile"\)/.test(profileBranch) &&
    // the definition-list renderer is still what draws label/value pairs
    /<dl style=/.test(appSource) &&
    /renderProfileRows\(/.test(profileBranch),
  true
);

invariantCheck(
  "Plan recommendations, Plan Tools contents, and RecommendationCard are untouched by the shell",
  // shellNight listed alongside planShellNight for the same reason as above: the
  // renamed flag must be forbidden here too, or the rename would silently open a
  // hole. Every existing check is preserved unchanged.
  !/planShellNight|shellNight|shellTokens/.test(cardSource) &&
    /if\s*\(\s*el\.clientHeight\s*===\s*0\s*\)\s*return;/.test(cardSource) &&
    /new\s+window\.ResizeObserver\s*\(\s*measureReason\s*\)/.test(cardSource) &&
    /<PlanRecommendations/.test(appSource) &&
    /<PlanToolsView/.test(appSource) &&
    /<PlanTab[\s>]/.test(appSource),
  true
);

invariantCheck(
  "no storage, routing, analytics, scoring, or refresh behavior changed",
  /const AUTO_REFRESH_MS = 3 \* 60 \* 1000;/.test(appSource) &&
    /<BottomTabs[\s\S]*?activeTab=\{activeTab\}[\s\S]*?onTabChange=\{setActiveTab\}/.test(
      appSource
    ) &&
    !/localStorage|sessionStorage/.test(bottomTabsSource) &&
    !/localStorage|sessionStorage/.test(tohiThemeSource) &&
    !/localStorage|sessionStorage/.test(themeRuntimeSource) &&
    !/trackAppEvent/.test(bottomTabsSource),
  true
);

invariantCheck(
  "existing theme-runtime force-mode behavior remains deterministic",
  /if \(forceMode === TOHI_THEME_MODES\.DAY \|\| forceMode === TOHI_THEME_MODES\.NIGHT\) \{\s*return forceMode;/.test(
    themeRuntimeSource
  ) &&
    /if \(localHour >= 18 \|\| localHour < 6\)/.test(themeRuntimeSource) &&
    /return TOHI_THEME_MODES\.NIGHT;/.test(themeRuntimeSource) &&
    /return TOHI_THEME_MODES\.DAY;/.test(themeRuntimeSource),
  true
);

console.log("");
console.log(`  62A feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  62A invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
