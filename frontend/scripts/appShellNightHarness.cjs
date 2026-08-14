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
// Waits left this list in 63C-2, the phase that activated it, exactly as Home
// left it in 62B-2F-2. Both were removed only once every surface on the tab had
// a night presentation and the tab had joined the shared shell flag. TOHI and
// Profile are the tabs that remain unconverted, and the guard below still fails
// the moment either of them is darkened.
const mainEnd = appSource.indexOf("</main>");
const UNCONVERTED_TABS = ["tohi", "profile"];
const unconvertedTabBranches = UNCONVERTED_TABS
  .map((key) => {
    const start = appSource.indexOf(`{activeTab === "${key}" &&`);
    if (start < 0) return "";
    const nextTab = appSource.indexOf('{activeTab === "', start + 20);
    const end = nextTab > start && nextTab < mainEnd ? nextTab : mainEnd;
    return appSource.slice(start, end);
  })
  .filter((branch) => branch.length > 0);

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
  // the Home-or-Plan form when Waits joined. Each tab was added only once every
  // one of its surfaces had a night presentation. What is protected is unchanged
  // and slightly stronger: exactly one flag, derived from nothing but activeTab
  // and the existing planNight signal.
  /const shellNight\s*=\s*\n?\s*\(activeTab === "plan" \|\| activeTab === "home" \|\| activeTab === "waits"\)\s*&&\s*\n?\s*planNight;/.test(
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
  "the three converted tabs, and only those, drive the shell",
  // Exact set, not a substring match: adding an unconverted tab fails here, and
  // so does dropping a converted one.
  (() => {
    const m = appSource.match(
      /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
    );
    if (!m) return false;
    const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
    return tabs.join(",") === "home,plan,waits";
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

// Both converted content tabs are activated through the SAME flag, each pinned
// to exactly one night prop. Scoped per element: Plan's own components
// legitimately receive night={planNight}, so a file-wide positive would be wrong.
for (const tag of ["HomeTab", "WaitsTab"]) {
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
  // night presentation was prepared but inactive. 63C-2 activated it, so the
  // file-wide negative this check originally carried is restored — stronger
  // than the element-scoped form it needed while the gate existed.
  !/night=\{false\}/.test(appSource),
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
  "switching to any unconverted tab forces the shell and navigation to day",
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
  // used inside it. TOHI and Profile are the tabs that remain unconverted; Home
  // stopped being one in 62B-2F-2 and Waits in 63C-2, and both now legitimately
  // receive night={shellNight}.
  //
  // The forbidden list includes shellNight. Without it this guard was blind to
  // the rename: `planShellNight` does not match `shellNight`, so a darkened
  // unconverted branch would have passed unnoticed. That blindness was real —
  // the Home branch carried shellNight while the old expression still reported
  // clean.
  //
  // True at base (where none of these identifiers exist) and true now, and it
  // fails the moment someone darkens an unconverted tab's content.
  unconvertedTabBranches.length === UNCONVERTED_TABS.length &&
    unconvertedTabBranches.every(
      (branch) =>
        branch.length > 0 &&
        !/planShellNight|shellNight|shellTokens|pageStyle/.test(branch)
    ),
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
