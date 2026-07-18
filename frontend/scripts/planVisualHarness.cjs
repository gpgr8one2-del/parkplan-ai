#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
const cardSource = fs.readFileSync(
  path.join(frontendRoot, "src", "components", "RecommendationCard.jsx"),
  "utf8"
);

let passCount = 0;
let failCount = 0;

function check(label, actual, expected) {
  const ok = actual === expected;

  if (ok) {
    passCount += 1;
    console.log(`  PASS ${label}`);
  } else {
    failCount += 1;
    console.log(`  FAIL ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log("Setup header");
check(
  "strategy eyebrow switches day/night",
  appSource.includes('{planNight ? "EVENING STRATEGY" : "DAY STRATEGY"}'),
  true
);
check(
  "approved setup subtitle",
  appSource.includes(
    "TOHI uses your park, weather, family setup, and live waits to guide"
  ),
  true
);
check("setup title kept", appSource.includes("What should we do next?"), true);

console.log("Recommendations header");
check("RECOMMENDATIONS eyebrow", appSource.includes(">\n                      RECOMMENDATIONS"), true);
check("recommendations title", appSource.includes("Here’s what TOHI suggests"), true);
check(
  "recommendations subtitle",
  appSource.includes("Based on live waits, weather, and your family."),
  true
);

console.log("Where Are You card");
check("WHERE ARE YOU eyebrow", appSource.includes("Where are you?"), true);
check("Use My Location preserved", appSource.includes("Use My Location"), true);
check(
  "approved helper copy",
  appSource.includes(
    "Helps avoid unnecessary walking. Auto-updates while the app is open."
  ),
  true
);
check("land select preserved", appSource.includes('id="current-land"'), true);
check("manual selection handler preserved", appSource.includes("manual_location_selected"), true);

console.log("Weather + Comfort card");
check("eyebrow present", appSource.includes("WEATHER + COMFORT"), true);
check("uses real temperature state", appSource.includes("weather?.tempF != null ? ("), true);
check(
  "unavailable/loading fallback uses real summary",
  appSource.includes('{weather?.summary || "Loading weather..."}'),
  true
);

console.log("Family Context card");
check("eyebrow present", appSource.includes("FAMILY CONTEXT"), true);
check(
  "edit affordance uses existing screen navigation",
  appSource.includes('onClick={() => setActiveScreen("family_profile")}'),
  true
);
check(
  "connected to real family summary",
  appSource.includes("familyProfileSummary?.shortestHeightInches"),
  true
);

console.log("Clarification card intact");
check("eyebrow once", (appSource.match(/HELP TOHI CHOOSE/g) || []).length, 1);
check("question copy", appSource.includes("What matters more right now?"), true);
check("actions preserved", appSource.includes("Go for the must-do"), true);

console.log("Recommendation stack");
{
  const cardCalls = (appSource.match(/<RecommendationCard/g) || []).length;
  const nightCalls = (appSource.match(/<RecommendationCard night=\{planNight\}/g) || []).length;
  check("all recommendation cards receive night mode", cardCalls > 0 && cardCalls === nightCalls, true);
  check(
    "stack container is a vertical grid",
    appSource.includes('<div style={{ display: "grid", gap: 10 }}>'),
    true
  );
  check("no carousel introduced", appSource.includes('overflowX: "auto", paddingBottom: 4 }}>\n            {PARKS.map'), true);
  check(
    "action handlers still wired",
    (appSource.match(/renderRideActions=\{\(ride\) => renderRideActions\(ride, \{ night: planNight \}\)\}/g) || [])
      .length >= 5,
    true
  );
}

console.log("Recommendation card component contract");
check("radius within 18–22", cardSource.includes("borderRadius: 20"), true);
check("night surface", cardSource.includes('"#131C36"'), true);
check("wait pill preserved", cardSource.includes("min wait"), true);
check(
  "wait on this uses restrained amber, not rose",
  cardSource.includes('"WAIT ON THIS"') && !cardSource.includes("#E11D48"),
  true
);
check("no full-card gradient backgrounds", cardSource.includes("linear-gradient(145deg, #FFFFFF"), false);

console.log("Artwork rules");
{
  const imgTags = (appSource.match(/<img/g) || []).length;
  check("only the existing logo image exists", imgTags, 1);
  check("logo is the repo asset", appSource.includes('src="/tohi-logo.png"'), true);
  check("no external image URLs", /src="https?:\/\//.test(appSource), false);
  check("no external images in card component", /https?:\/\//.test(cardSource), false);
}

console.log("Strategy sections preserved and quieter");
check("TRIP TIMING present", appSource.includes("TRIP TIMING"), true);
check("WEATHER STRATEGY present", appSource.includes("WEATHER STRATEGY"), true);
check(
  "trip timing uses quiet surface",
  appSource.includes('background: planNight ? "#111A33" : "#FFFDF8"'),
  true
);

console.log("Night tokens");
check("plan night tokens defined", appSource.includes("const planTokens = {"), true);
check("night surface navy", appSource.includes('surface: planNight ? "#131C36"'), true);
check("no pure black surfaces", appSource.includes('"#000000"'), false);

console.log("Two-state Plan structure");
{
  check(
    "state condition uses existing state only",
    appSource.includes(
      "const planShowsSetupState = recommendations.needsLocation || !currentLand;"
    ),
    true
  );
  const branchStart = appSource.indexOf("{planShowsSetupState ? (");
  const dayStrategy = appSource.indexOf('"EVENING STRATEGY" : "DAY STRATEGY"');
  const whereAreYou = appSource.indexOf("Where are you?");
  const weatherComfort = appSource.indexOf("WEATHER + COMFORT");
  const familyContext = appSource.indexOf("FAMILY CONTEXT");
  const branchElse = appSource.indexOf('aria-label="Current park area"');
  const recommendationsHeader = appSource.indexOf(">\n                      RECOMMENDATIONS");

  check("setup branch exists", branchStart > 0, true);
  check("setup header inside setup branch", branchStart < dayStrategy, true);
  check(
    "setup context cards inside setup branch",
    branchStart < whereAreYou &&
      whereAreYou < weatherComfort &&
      weatherComfort < familyContext &&
      familyContext < branchElse,
    true
  );
  check(
    "recommendation state renders after setup branch closes",
    branchElse > familyContext && recommendationsHeader > branchElse,
    true
  );
  check(
    "recommendation state keeps a compact location affordance",
    appSource.includes('aria-label="Current park area"'),
    true
  );
  check(
    "setup headers appear exactly once",
    (appSource.match(/DAY STRATEGY/g) || []).length,
    1
  );
  check(
    "old always-stacked location prompt removed from recommendation chain",
    appSource.includes("{recommendations.needsLocation || !currentLand ? ("),
    false
  );
}

console.log("Night coverage for every Plan fallback and control");
{
  check(
    "locked card is night-capable",
    appSource.includes("night = false,\n  }) {") ||
      /renderLockedFeatureCard\(\{[\s\S]{0,200}night/.test(appSource),
    true
  );
  check(
    "plan locked call passes night",
    appSource.includes("night: planNight,"),
    true
  );
  check(
    "location selects are theme-aware",
    (appSource.match(/background: planNight \? "#0F172A" : colors.card/g) || []).length,
    2
  );
  check(
    "ride actions accept theme without handler changes",
    appSource.includes("function renderRideActions(ride, options = {})") &&
      appSource.includes("handleInLine(ride)") &&
      appSource.includes("handleDone(ride.id)") &&
      appSource.includes("handleSkip(ride.id)") &&
      appSource.includes("handleReportRideIssue(ride)"),
    true
  );
  check(
    "plan cards pass night to ride actions",
    (appSource.match(/renderRideActions\(ride, \{ night: planNight \}\)/g) || []).length >= 6,
    true
  );
  check(
    "waits tab ride actions remain day-styled",
    appSource.includes("browsingAnotherPark ? () => null : renderRideActions"),
    true
  );
  check(
    "tohi pick caution is theme-aware",
    appSource.includes('"rgba(69, 26, 3, 0.45)"'),
    true
  );
  check(
    "tohi pick decorative panel has night treatment",
    appSource.includes("#1E1B4B 0%, #0F172A 58%"),
    true
  );
  check(
    "pre-open, browse, and fallback cards are theme-aware",
    (appSource.match(/planNight \? "#111A33"/g) || []).length >= 3,
    true
  );
}

console.log("PlanTab night compatibility");
{
  const planTabSource = fs.readFileSync(
    path.join(frontendRoot, "src", "components", "PlanTab.jsx"),
    "utf8"
  );
  check("night palette defined", planTabSource.includes("PLAN_TAB_NIGHT_PALETTE"), true);
  check("night prop accepted", planTabSource.includes("night = false,"), true);
  check(
    "all section shells pick up night surfaces",
    (planTabSource.match(/palette\.shell/g) || []).length >= 11,
    true
  );
  check(
    "text colors flow through palette",
    planTabSource.includes("palette.text") && planTabSource.includes("palette.muted"),
    true
  );
  check("App passes night into PlanTab", appSource.includes("night={planNight}\n              card={card}"), true);
  check("day palette keeps existing values", planTabSource.includes("shell: null"), true);
}

console.log("Local palette (no module-mutable state)");
{
  const planTabSource = fs.readFileSync(
    path.join(frontendRoot, "src", "components", "PlanTab.jsx"),
    "utf8"
  );
  check(
    "palette is a local render value",
    planTabSource.includes(
      "const palette = night ? PLAN_TAB_NIGHT_PALETTE : PLAN_TAB_DAY_PALETTE;"
    ),
    true
  );
  check(
    "no module-level mutable palette remains",
    /let planPalette|planPalette\s*=/.test(planTabSource),
    false
  );
  check(
    "palette threads through presentational props",
    (planTabSource.match(/palette=\{palette\}/g) || []).length >= 12,
    true
  );
}

console.log("Night chip coverage");
{
  const planTabSource = fs.readFileSync(
    path.join(frontendRoot, "src", "components", "PlanTab.jsx"),
    "utf8"
  );
  check(
    "SectionBadge is night-treated",
    planTabSource.includes("background: getChipSurface(background, palette)"),
    true
  );
  check(
    "priority/status pills are night-treated",
    (planTabSource.match(/getChipAccent\(styleForPriority\.color, palette\)/g) || []).length,
    2
  );
  check(
    "night accents stay semantic",
    planTabSource.includes('"#E11D48": "#FDA4AF"') &&
      planTabSource.includes('"#92400E": "#FCD34D"') &&
      planTabSource.includes('"#0369A1": "#7DD3FC"'),
    true
  );
  check(
    "day chips keep existing surfaces",
    planTabSource.includes("if (!palette?.isNight) return color;"),
    true
  );
  check(
    "trip timing + strategy badges night-treated",
    (appSource.match(/planNight \? "rgba\(15, 23, 42, 0\.72\)" : colors\.amberSoft/g) || [])
      .length >= 3,
    true
  );
  check(
    "personalization pill night-treated",
    appSource.includes('? "#6EE7B7"\n                      : "#FDA4AF"'),
    true
  );
  check(
    "showtime info accepts night without losing data",
    appSource.includes("function renderShowtimeInfo(ride, options = {})") &&
      appSource.includes("Best target:") &&
      appSource.includes("Arrival buffer:"),
    true
  );
  check(
    "plan cards pass night to showtime info",
    (appSource.match(/renderShowtimeInfo\(ride, \{ night: planNight \}\)/g) || []).length >= 6,
    true
  );
  check(
    "waits showtime stays day-styled",
    appSource.includes("browsingAnotherPark ? () => null : renderShowtimeInfo"),
    true
  );
}

console.log("Scope protection");
{
  check(
    "RecommendationCard used only in App Plan region",
    (appSource.match(/<RecommendationCard/g) || []).length,
    6
  );
  check("BottomTabs untouched structurally", appSource.includes("<BottomTabs activeTab={activeTab}"), true);
  check(
    "Home hero untouched",
    appSource.includes("TODAY&apos;S GAME PLAN"),
    true
  );
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
