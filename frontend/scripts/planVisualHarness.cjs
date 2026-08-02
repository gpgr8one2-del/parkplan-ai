#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
const cardSource = fs.readFileSync(
  path.join(frontendRoot, "src", "components", "RecommendationCard.jsx"),
  "utf8"
);
const planRecommendationsPath = path.join(
  frontendRoot,
  "src/components/PlanRecommendations.jsx"
);
const planRecommendationsSource = fs.readFileSync(
  planRecommendationsPath,
  "utf8"
);

// The Plan presentation now lives in PlanRecommendations.jsx while App.jsx
// keeps state, handlers, and integration. Contracts that span both read the
// combined source; pure presentation reads the extracted component.
const planPresentationSource = `${appSource}\n${planRecommendationsSource}`;

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
  planRecommendationsSource.includes('{planNight ? "EVENING STRATEGY" : "DAY STRATEGY"}'),
  true
);
check(
  "approved setup subtitle",
  planRecommendationsSource.includes(
    "TOHI uses your park, weather, family setup, and live waits to guide"
  ),
  true
);
check("setup title kept", planRecommendationsSource.includes("What should we do next?"), true);

console.log("Recommendations header");
check("RECOMMENDATIONS eyebrow", planRecommendationsSource.includes(">\n                      RECOMMENDATIONS"), true);
check("recommendations title", planRecommendationsSource.includes("Here’s what TOHI suggests"), true);
check(
  "recommendations subtitle",
  planRecommendationsSource.includes("Based on live waits, weather, and your family."),
  true
);

console.log("Where Are You card");
check("WHERE ARE YOU eyebrow", planRecommendationsSource.includes("Where are you?"), true);
check("Use My Location preserved", planRecommendationsSource.includes("Use My Location"), true);
check(
  "approved helper copy",
  planRecommendationsSource.includes(
    "Helps avoid unnecessary walking. Auto-updates while the app is open."
  ),
  true
);
check("land select preserved", planRecommendationsSource.includes('id="current-land"'), true);
check("manual selection handler preserved", planRecommendationsSource.includes("manual_location_selected"), true);

console.log("Weather + Comfort card");
check("eyebrow present", planRecommendationsSource.includes("WEATHER + COMFORT"), true);
check("uses real temperature state", planRecommendationsSource.includes("weather?.tempF != null ? ("), true);
check(
  "unavailable/loading fallback uses real summary",
  planRecommendationsSource.includes('{weather?.summary || "Loading weather..."}'),
  true
);

console.log("Family Context card");
check("eyebrow present", planRecommendationsSource.includes("FAMILY CONTEXT"), true);
check(
  "edit affordance uses existing screen navigation",
  planRecommendationsSource.includes('onClick={() => setActiveScreen("family_profile")}'),
  true
);
check(
  "connected to real family summary",
  planRecommendationsSource.includes("familyProfileSummary?.shortestHeightInches"),
  true
);

console.log("Clarification card intact");
check("eyebrow once", (planPresentationSource.match(/HELP TOHI CHOOSE/g) || []).length, 1);
check("question copy", planRecommendationsSource.includes("What matters more right now?"), true);
check("actions preserved", planRecommendationsSource.includes("Go for the must-do"), true);

console.log("Recommendation stack");
{
  const cardCalls = (planRecommendationsSource.match(/<RecommendationCard/g) || []).length;
  const nightCalls = (planRecommendationsSource.match(/<RecommendationCard night=\{planNight\}/g) || []).length;
  check("all recommendation cards receive night mode", cardCalls > 0 && cardCalls === nightCalls, true);
  check(
    "stack container is a vertical grid",
    planRecommendationsSource.includes('<div style={{ display: "grid", gap: 10 }}>'),
    true
  );
  check("no carousel introduced", appSource.includes('overflowX: "auto", paddingBottom: 4 }}>\n            {PARKS.map'), true);
  check(
    "action handlers still wired",
    (planRecommendationsSource.match(/renderRideActions=\{\(ride\) => renderRideActions\(ride, \{ night: planNight, compact: true \}\)\}/g) || [])
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

console.log("Compact card anatomy (61C-1)");
{
  check(
    "every Plan card action callback passes compact",
    (planRecommendationsSource.match(/renderRideActions\(ride, \{ night: planNight, compact: true \}\)/g) || []).length,
    6
  );
  const rideActionsStart = appSource.indexOf("function renderRideActions(ride, options = {})");
  const rideActionsEnd = appSource.indexOf("function renderShowtimeInfo(ride, options = {})");
  const rideActionsSlice = appSource.slice(rideActionsStart, rideActionsEnd);
  check(
    "compact option is read inside renderRideActions only",
    rideActionsStart > 0 &&
      rideActionsSlice.includes("const compact = options.compact === true;") &&
      (appSource.match(/options\.compact/g) || []).length ===
        (rideActionsSlice.match(/options\.compact/g) || []).length,
    true
  );
  check(
    "default Report Issue label kept in the non-compact branch",
    rideActionsSlice.includes('{compact ? "Report" : "Report Issue"}'),
    true
  );
  check(
    "compact Report label exists only via the compact branch",
    (appSource.match(/"Report"/g) || []).length ===
      (rideActionsSlice.match(/\{compact \? "Report" : "Report Issue"\}/g) || []).length,
    true
  );
  check(
    "compact action row uses nowrap and default keeps wrap",
    rideActionsSlice.includes('flexWrap: compact ? "nowrap" : "wrap"'),
    true
  );
  check(
    "non-compact button sizing untouched",
    rideActionsSlice.includes(": themedActionButton;") &&
      appSource.includes('padding: "7px 10px"'),
    true
  );
  check(
    "compact buttons keep a 36px minimum touch height",
    /const sizedActionButton = compact\n      \? \{[\s\S]*?minHeight: 36,\n        \}\n      : themedActionButton;/.test(
      rideActionsSlice
    ),
    true
  );
  const cardShowtimeIndex = cardSource.indexOf("{renderShowtimeInfo?.(ride)}");
  const cardActionsIndex = cardSource.indexOf("{renderRideActions?.(ride)}");
  check(
    "showtime info renders before ride actions in the card",
    cardShowtimeIndex > 0 && cardActionsIndex > cardShowtimeIndex,
    true
  );
  check(
    "action row is the final dynamic card section",
    cardSource.indexOf("</div>", cardActionsIndex) ===
      cardSource.indexOf("<", cardActionsIndex + "{renderRideActions?.(ride)}".length + 1),
    true
  );
  check("badge pill removed from RecommendationCard", /badge/.test(cardSource), false);
  check("category eyebrow remains", cardSource.includes("{slot.eyebrow}"), true);
  check("two-line reason clamp exists", cardSource.includes("WebkitLineClamp: 2"), true);
  check(
    "More/Less control uses aria-expanded",
    cardSource.includes("aria-expanded={reasonExpanded}"),
    true
  );
  check(
    "More control only renders when content is clipped",
    cardSource.includes("reasonClipped || reasonExpanded"),
    true
  );
  check(
    "protected reasons bypass the default clamp",
    cardSource.includes("protectReason = false") &&
      cardSource.includes("const showFullReason = protectReason || reasonExpanded;"),
    true
  );
  check(
    "protectReason driven by explicit ride data at all Plan call sites",
    (planRecommendationsSource.match(/protectReason=\{Boolean\(/g) || []).length,
    6
  );
  check(
    "protectReason never inferred from copy text",
    /protectReason=\{[^}]*(reason|Reason)\b[^}]*\.includes/.test(planRecommendationsSource),
    false
  );
  check(
    "no remote artwork URLs in the card or Plan presentation",
    /https?:\/\//.test(cardSource) || /src="https?:\/\//.test(planRecommendationsSource),
    false
  );
  check(
    "no park-level or area-level artwork fallback consumed",
    /getParkArtwork|getAreaArtwork|getTohiArtwork|TOHI_PARK_ARTWORK|TOHI_AREA_ARTWORK/.test(
      `${cardSource}\n${planRecommendationsSource}`
    ),
    false
  );
}

console.log("Artwork rules");
{
  const imgTags = (appSource.match(/<img/g) || []).length;
  check("only the existing logo image exists", imgTags, 1);
  check("logo is the repo asset", appSource.includes('src="/tohi-logo.png"'), true);
  check("no external image URLs", /src="https?:\/\//.test(planPresentationSource), false);
  check("no external images in card component", /https?:\/\//.test(cardSource), false);
}

console.log("Exact ride artwork (61C-1A)");
{
  const manifestPath = path.join(frontendRoot, "src", "data", "rideArtManifest.js");
  const manifestSource = fs.readFileSync(manifestPath, "utf8");

  const importMatches = [
    ...manifestSource.matchAll(
      /^import (\w+) from "(\.\.\/assets\/rideArt\/[\w.-]+\.webp)";$/gm
    ),
  ];
  check("manifest imports exactly one hundred four webp assets", importMatches.length, 104);
  check(
    "webp imports are bundled, not public/ paths",
    importMatches.every(([, , assetPath]) => assetPath.startsWith("../assets/rideArt/")) &&
      !/PUBLIC_URL|\/public\//.test(manifestSource),
    true
  );

  const expectedAssets = [
    "153-the-seas-with-nemo-and-friends_day.webp",
    "153-the-seas-with-nemo-and-friends_night.webp",
    "155-journey-into-imagination-with-figment_day.webp",
    "155-journey-into-imagination-with-figment_night.webp",
    "156-living-with-the-land_day.webp",
    "156-living-with-the-land_night.webp",
    "159-spaceship-earth_day.webp",
    "159-spaceship-earth_night.webp",
    "151-soarin-across-america_day.webp",
    "151-soarin-across-america_night.webp",
    "158-mission-space_day.webp",
    "158-mission-space_night.webp",
    "160-test-track_day.webp",
    "160-test-track_night.webp",
    "10916-guardians-of-the-galaxy-cosmic-rewind_day.webp",
    "10916-guardians-of-the-galaxy-cosmic-rewind_night.webp",
    "2679-frozen-ever-after_day.webp",
    "2679-frozen-ever-after_night.webp",
    "10914-remys-ratatouille-adventure_day.webp",
    "10914-remys-ratatouille-adventure_night.webp",
    "128-enchanted-tales-with-belle_day.webp",
    "128-enchanted-tales-with-belle_night.webp",
    "126-the-barnstormer_day.webp",
    "126-the-barnstormer_night.webp",
    "141-magic-carpets-of-aladdin_day.webp",
    "141-magic-carpets-of-aladdin_night.webp",
    "161-prince-charming-regal-carrousel_day.webp",
    "161-prince-charming-regal-carrousel_night.webp",
    "1190-tomorrowland-transit-authority-peoplemover_day.webp",
    "1190-tomorrowland-transit-authority-peoplemover_night.webp",
    "143-tomorrowland-speedway_day.webp",
    "143-tomorrowland-speedway_night.webp",
    "248-astro-orbiter_day.webp",
    "248-astro-orbiter_night.webp",
    "127-under-the-sea-journey-of-the-little-mermaid_day.webp",
    "127-under-the-sea-journey-of-the-little-mermaid_night.webp",
    "132-dumbo-the-flying-elephant_day.webp",
    "132-dumbo-the-flying-elephant_night.webp",
    "135-mad-tea-party_day.webp",
    "135-mad-tea-party_night.webp",
    "131-buzz-lightyears-space-ranger-spin_day.webp",
    "131-buzz-lightyears-space-ranger-spin_night.webp",
    "133-its-a-small-world_day.webp",
    "133-its-a-small-world_night.webp",
    "142-many-adventures-of-winnie-the-pooh_day.webp",
    "142-many-adventures-of-winnie-the-pooh_night.webp",
    "11527-tron-lightcycle-run_day.webp",
    "11527-tron-lightcycle-run_night.webp",
    "130-big-thunder-mountain-railroad_day.webp",
    "130-big-thunder-mountain-railroad_night.webp",
    "134-jungle-cruise_day.webp",
    "134-jungle-cruise_night.webp",
    "129-seven-dwarfs-mine-train_day.webp",
    "129-seven-dwarfs-mine-train_night.webp",
    "136-peter-pans-flight_day.webp",
    "136-peter-pans-flight_night.webp",
    "140-haunted-mansion_day.webp",
    "140-haunted-mansion_night.webp",
    "13630-tianas-bayou-adventure_day.webp",
    "13630-tianas-bayou-adventure_night.webp",
    "137-pirates-of-the-caribbean_day.webp",
    "137-pirates-of-the-caribbean_night.webp",
    "138-space-mountain_day.webp",
    "138-space-mountain_night.webp",
    "6369-star-wars-rise-of-the-resistance_day.webp",
    "6369-star-wars-rise-of-the-resistance_night.webp",
    "5476-slinky-dog-dash_day.webp",
    "5476-slinky-dog-dash_night.webp",
    "6361-mickey-and-minnies-runaway-railway_day.webp",
    "6361-mickey-and-minnies-runaway-railway_night.webp",
    "117-toy-story-mania_day.webp",
    "117-toy-story-mania_night.webp",
    "123-tower-of-terror_day.webp",
    "123-tower-of-terror_night.webp",
    "6368-millennium-falcon-smugglers-run_day.webp",
    "6368-millennium-falcon-smugglers-run_night.webp",
    "5477-alien-swirling-saucers_day.webp",
    "5477-alien-swirling-saucers_night.webp",
    "120-star-tours-the-adventures-continue_day.webp",
    "120-star-tours-the-adventures-continue_night.webp",
    "16342-rock-n-roller-coaster-starring-the-muppets_day.webp",
    "16342-rock-n-roller-coaster-starring-the-muppets_night.webp",
    "4439-avatar-flight-of-passage_day.webp",
    "4439-avatar-flight-of-passage_night.webp",
    "4438-navi-river-journey_day.webp",
    "4438-navi-river-journey_night.webp",
    "113-kilimanjaro-safaris_day.webp",
    "113-kilimanjaro-safaris_night.webp",
    "110-expedition-everest_day.webp",
    "110-expedition-everest_night.webp",
    "112-kali-river-rapids_day.webp",
    "112-kali-river-rapids_night.webp",
    "655-wildlife-express-train_day.webp",
    "655-wildlife-express-train_night.webp",
    "14943-zootopia-better-zoogether_day.webp",
    "14943-zootopia-better-zoogether_night.webp",
    "16545-blueys-wild-world-at-conservation-station_day.webp",
    "16545-blueys-wild-world-at-conservation-station_night.webp",
    "651-gorilla-falls-exploration-trail_day.webp",
    "651-gorilla-falls-exploration-trail_night.webp",
    "10920-finding-nemo-the-big-blue-and-beyond_day.webp",
    "10920-finding-nemo-the-big-blue-and-beyond_night.webp",
    "657-festival-of-the-lion-king_day.webp",
    "657-festival-of-the-lion-king_night.webp",
  ];
  const assetDir = path.join(frontendRoot, "src", "assets", "rideArt");
  const assetBuffers = expectedAssets.map((name) => {
    const assetPath = path.join(assetDir, name);
    return fs.existsSync(assetPath) ? fs.readFileSync(assetPath) : null;
  });
  check(
    "all one hundred four webp files exist and are nonzero",
    assetBuffers.every((buf) => buf && buf.length > 0),
    true
  );
  check(
    "all one hundred four files carry the WebP RIFF signature",
    assetBuffers.every(
      (buf) =>
        buf &&
        buf.slice(0, 4).toString("ascii") === "RIFF" &&
        buf.slice(8, 12).toString("ascii") === "WEBP"
    ),
    true
  );
  check(
    "no accidental duplicate assets — all one hundred four files are distinct",
    new Set(assetBuffers.map((buf) => (buf ? buf.toString("base64") : ""))).size,
    104
  );
  check(
    "extra files have not crept into the rideArt directory",
    fs.readdirSync(assetDir).filter((name) => name !== ".DS_Store").sort().join(","),
    [...expectedAssets].sort().join(",")
  );

  // Evaluate the manifest with import identifiers stubbed to their file paths
  // so lookup behavior is tested for real, not just by source inspection.
  const preamble = importMatches
    .map(([, name, assetPath]) => `const ${name} = ${JSON.stringify(assetPath)};`)
    .join("\n");
  const executable = manifestSource
    .split("\n")
    .filter((line) => !line.startsWith("import ") && !line.startsWith("export default"))
    .join("\n")
    .replace(/^export /gm, "");
  const { RIDE_ART_MANIFEST, getRideArtwork } = new Function(
    `${preamble}\n${executable}\nreturn { RIDE_ART_MANIFEST, getRideArtwork };`
  )();

  check(
    "manifest holds only the four canonical parks",
    Object.keys(RIDE_ART_MANIFEST).sort().join(","),
    ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"].sort().join(",")
  );
  check(
    "manifest holds only the twenty-two approved ride IDs",
    Object.keys(RIDE_ART_MANIFEST.magic_kingdom).sort().join(","),
    [
      "126", "127", "128", "129", "130", "131", "132", "133", "134", "135",
      "136", "140", "141", "142", "143", "161", "248", "1190", "11527",
      "13630", "137", "138",
    ]
      .sort()
      .join(",")
  );
  check(
    "each ride maps to its own ID-prefixed assets",
    Object.entries(RIDE_ART_MANIFEST.magic_kingdom).every(
      ([rideId, rideArt]) =>
        rideArt.day.src.includes(`/${rideId}-`) &&
        rideArt.night.src.includes(`/${rideId}-`)
    ),
    true
  );
  check(
    "every ride has distinct day and night sources with alt text",
    Object.values(RIDE_ART_MANIFEST.magic_kingdom).every(
      (rideArt) =>
        rideArt.day?.src &&
        rideArt.night?.src &&
        rideArt.day.src !== rideArt.night.src &&
        typeof rideArt.day.alt === "string" &&
        typeof rideArt.night.alt === "string"
    ),
    true
  );
  check(
    "day lookup returns the day asset for an exact ID",
    getRideArtwork("magic_kingdom", "138", false)?.src.endsWith(
      "138-space-mountain_day.webp"
    ),
    true
  );
  check(
    "night lookup returns the night asset for an exact ID",
    getRideArtwork("magic_kingdom", "13630", true)?.src.endsWith(
      "13630-tianas-bayou-adventure_night.webp"
    ),
    true
  );
  check(
    "numeric ride IDs are canonicalized with String",
    getRideArtwork("magic_kingdom", 137, false)?.src.endsWith(
      "137-pirates-of-the-caribbean_day.webp"
    ),
    true
  );
  check(
    "batch 2 through 7g rides resolve to their own day and night assets",
    [
      ["128", "128-enchanted-tales-with-belle"],
      ["129", "129-seven-dwarfs-mine-train"],
      ["136", "136-peter-pans-flight"],
      ["140", "140-haunted-mansion"],
      ["130", "130-big-thunder-mountain-railroad"],
      ["11527", "11527-tron-lightcycle-run"],
      ["134", "134-jungle-cruise"],
      ["131", "131-buzz-lightyears-space-ranger-spin"],
      ["133", "133-its-a-small-world"],
      ["142", "142-many-adventures-of-winnie-the-pooh"],
      ["127", "127-under-the-sea-journey-of-the-little-mermaid"],
      ["132", "132-dumbo-the-flying-elephant"],
      ["135", "135-mad-tea-party"],
      ["1190", "1190-tomorrowland-transit-authority-peoplemover"],
      ["143", "143-tomorrowland-speedway"],
      ["248", "248-astro-orbiter"],
      ["126", "126-the-barnstormer"],
      ["141", "141-magic-carpets-of-aladdin"],
      ["161", "161-prince-charming-regal-carrousel"],
    ].every(
      ([rideId, stem]) =>
        getRideArtwork("magic_kingdom", rideId, false)?.src.endsWith(`${stem}_day.webp`) &&
        getRideArtwork("magic_kingdom", rideId, true)?.src.endsWith(`${stem}_night.webp`)
    ),
    true
  );
  check(
    "no two rides share an asset",
    new Set(
      Object.values(RIDE_ART_MANIFEST.magic_kingdom).flatMap((rideArt) => [
        rideArt.day.src,
        rideArt.night.src,
      ])
    ).size,
    44
  );
  check("unknown ride returns null", getRideArtwork("magic_kingdom", "999", false), null);
  check("unknown park returns null", getRideArtwork("epcot", "137", false), null);
  check("null inputs return null", getRideArtwork(null, null, false), null);

  // EPCOT ride artwork (61C-2h) — first non-Magic-Kingdom park.
  check(
    "epcot holds only the ten approved ride IDs",
    Object.keys(RIDE_ART_MANIFEST.epcot).sort().join(","),
    ["10916", "2679", "10914", "151", "158", "160", "155", "156", "159", "153"]
      .sort()
      .join(",")
  );
  check(
    "each epcot ride maps to its own ID-prefixed distinct day/night assets with alt text",
    Object.entries(RIDE_ART_MANIFEST.epcot).every(
      ([rideId, rideArt]) =>
        rideArt.day.src.includes(`/${rideId}-`) &&
        rideArt.night.src.includes(`/${rideId}-`) &&
        rideArt.day.src !== rideArt.night.src &&
        typeof rideArt.day.alt === "string" &&
        typeof rideArt.night.alt === "string"
    ),
    true
  );
  check(
    "epcot rides resolve to their own day and night assets by exact ID (incl. String canonicalization)",
    [
      ["10916", "10916-guardians-of-the-galaxy-cosmic-rewind"],
      ["2679", "2679-frozen-ever-after"],
      ["10914", "10914-remys-ratatouille-adventure"],
      ["151", "151-soarin-across-america"],
      ["158", "158-mission-space"],
      ["160", "160-test-track"],
      ["155", "155-journey-into-imagination-with-figment"],
      ["156", "156-living-with-the-land"],
      ["159", "159-spaceship-earth"],
      ["153", "153-the-seas-with-nemo-and-friends"],
    ].every(
      ([rideId, stem]) =>
        getRideArtwork("epcot", rideId, false)?.src.endsWith(`${stem}_day.webp`) &&
        getRideArtwork("epcot", rideId, true)?.src.endsWith(`${stem}_night.webp`) &&
        getRideArtwork("epcot", Number(rideId), false)?.src.endsWith(`${stem}_day.webp`)
    ),
    true
  );
  check(
    "epcot lookup has no cross-park fallback — unknown epcot ride returns null",
    getRideArtwork("epcot", "999", false),
    null
  );
  check(
    "epcot IDs near The Seas with Nemo & Friends do not fuzzy-match it",
    ["15", "153 ", "1153", "1530", "0153", "153-the-seas-with-nemo-and-friends"].every(
      (rideId) =>
        getRideArtwork("epcot", rideId, false) === null &&
        getRideArtwork("epcot", rideId, true) === null
    ),
    true
  );
  check(
    "park artwork is isolated — a Magic Kingdom ID never resolves under epcot and vice versa",
    getRideArtwork("epcot", "138", false) === null &&
      getRideArtwork("magic_kingdom", "10916", false) === null,
    true
  );
  check(
    "The Seas with Nemo & Friends stays inside epcot — ID 153 never resolves under another park",
    getRideArtwork("magic_kingdom", "153", false) === null &&
      getRideArtwork("hollywood", "153", false) === null &&
      getRideArtwork("animal_kingdom", "153", false) === null &&
      getRideArtwork("magic_kingdom", 153, true) === null &&
      getRideArtwork("hollywood", 153, true) === null &&
      getRideArtwork("animal_kingdom", 153, true) === null,
    true
  );

  // Hollywood Studios ride artwork (61C-3a) — first batch under the hollywood key.
  check(
    "hollywood holds only the nine approved ride IDs",
    Object.keys(RIDE_ART_MANIFEST.hollywood).sort().join(","),
    ["6369", "5476", "6361", "117", "123", "6368", "5477", "120", "16342"].sort().join(",")
  );
  check(
    "each hollywood ride maps to its own ID-prefixed distinct day/night assets with alt text",
    Object.entries(RIDE_ART_MANIFEST.hollywood).every(
      ([rideId, rideArt]) =>
        rideArt.day.src.includes(`/${rideId}-`) &&
        rideArt.night.src.includes(`/${rideId}-`) &&
        rideArt.day.src !== rideArt.night.src &&
        typeof rideArt.day.alt === "string" &&
        typeof rideArt.night.alt === "string"
    ),
    true
  );
  check(
    "hollywood rides resolve to their own day and night assets by exact ID (incl. String canonicalization)",
    [
      ["6369", "6369-star-wars-rise-of-the-resistance"],
      ["5476", "5476-slinky-dog-dash"],
      ["6361", "6361-mickey-and-minnies-runaway-railway"],
      ["117", "117-toy-story-mania"],
      ["123", "123-tower-of-terror"],
      ["6368", "6368-millennium-falcon-smugglers-run"],
      ["5477", "5477-alien-swirling-saucers"],
      ["120", "120-star-tours-the-adventures-continue"],
      ["16342", "16342-rock-n-roller-coaster-starring-the-muppets"],
    ].every(
      ([rideId, stem]) =>
        getRideArtwork("hollywood", rideId, false)?.src.endsWith(`${stem}_day.webp`) &&
        getRideArtwork("hollywood", rideId, true)?.src.endsWith(`${stem}_night.webp`) &&
        getRideArtwork("hollywood", Number(rideId), false)?.src.endsWith(`${stem}_day.webp`)
    ),
    true
  );
  check(
    "hollywood lookup has no cross-park fallback — unknown hollywood ride returns null",
    getRideArtwork("hollywood", "999", false),
    null
  );
  check(
    "park artwork is isolated — a hollywood ID never resolves under another park and vice versa",
    getRideArtwork("magic_kingdom", "6369", false) === null &&
      getRideArtwork("epcot", "5476", false) === null &&
      getRideArtwork("hollywood", "138", false) === null &&
      getRideArtwork("hollywood", "10916", false) === null,
    true
  );

  // Animal Kingdom ride and show artwork (batches 1-3 plus the final show batch).
  check(
    "animal kingdom holds only the eleven approved ride IDs",
    Object.keys(RIDE_ART_MANIFEST.animal_kingdom).sort().join(","),
    ["4439", "4438", "113", "110", "112", "655", "14943", "16545", "651", "10920", "657"]
      .sort()
      .join(",")
  );
  check(
    "each animal kingdom ride maps to its own ID-prefixed distinct day/night assets with alt text",
    Object.entries(RIDE_ART_MANIFEST.animal_kingdom).every(
      ([rideId, rideArt]) =>
        rideArt.day.src.includes(`/${rideId}-`) &&
        rideArt.night.src.includes(`/${rideId}-`) &&
        rideArt.day.src !== rideArt.night.src &&
        typeof rideArt.day.alt === "string" &&
        typeof rideArt.night.alt === "string"
    ),
    true
  );
  check(
    "animal kingdom rides resolve to their own day and night assets by exact ID (incl. String canonicalization)",
    [
      ["4439", "4439-avatar-flight-of-passage"],
      ["4438", "4438-navi-river-journey"],
      ["113", "113-kilimanjaro-safaris"],
      ["110", "110-expedition-everest"],
      ["112", "112-kali-river-rapids"],
      ["655", "655-wildlife-express-train"],
      ["14943", "14943-zootopia-better-zoogether"],
      ["16545", "16545-blueys-wild-world-at-conservation-station"],
      ["651", "651-gorilla-falls-exploration-trail"],
      ["10920", "10920-finding-nemo-the-big-blue-and-beyond"],
      ["657", "657-festival-of-the-lion-king"],
    ].every(
      ([rideId, stem]) =>
        getRideArtwork("animal_kingdom", rideId, false)?.src.endsWith(`${stem}_day.webp`) &&
        getRideArtwork("animal_kingdom", rideId, true)?.src.endsWith(`${stem}_night.webp`) &&
        getRideArtwork("animal_kingdom", Number(rideId), false)?.src.endsWith(`${stem}_day.webp`)
    ),
    true
  );
  check(
    "animal kingdom lookup has no cross-park fallback — unknown animal kingdom ride returns null",
    getRideArtwork("animal_kingdom", "999", false),
    null
  );
  check(
    "park artwork is isolated — an animal kingdom ID never resolves under another park and vice versa",
    getRideArtwork("magic_kingdom", "4439", false) === null &&
      getRideArtwork("epcot", "4438", false) === null &&
      getRideArtwork("hollywood", "113", false) === null &&
      getRideArtwork("magic_kingdom", "110", false) === null &&
      getRideArtwork("epcot", "112", false) === null &&
      getRideArtwork("hollywood", "655", false) === null &&
      getRideArtwork("magic_kingdom", "14943", false) === null &&
      getRideArtwork("epcot", "16545", false) === null &&
      getRideArtwork("hollywood", "651", false) === null &&
      getRideArtwork("magic_kingdom", "10920", false) === null &&
      getRideArtwork("epcot", "657", false) === null &&
      getRideArtwork("hollywood", "10920", false) === null &&
      getRideArtwork("animal_kingdom", "138", false) === null &&
      getRideArtwork("animal_kingdom", "10916", false) === null &&
      getRideArtwork("animal_kingdom", "6369", false) === null,
    true
  );
  check(
    "animal kingdom IDs match exactly — near-miss and partial IDs never resolve",
    [
      "65",
      "651 ",
      "6510",
      "6551",
      "1494",
      "149430",
      "16545x",
      "1654",
      "1092",
      "109200",
      "10920x",
      "65",
      "6570",
    ].every((rideId) => getRideArtwork("animal_kingdom", rideId, false) === null),
    true
  );
  // Feathered Friends in Flight (10921) is intentionally excluded from this batch.
  // It must resolve to nothing rather than borrowing the adjacent 10920 show art.
  check(
    "Feathered Friends (10921) has no artwork entry in any park",
    ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"].every(
      (parkId) =>
        getRideArtwork(parkId, "10921", false) === null &&
        getRideArtwork(parkId, "10921", true) === null &&
        getRideArtwork(parkId, 10921, false) === null
    ),
    true
  );
  check(
    "10921 is absent from the animal kingdom manifest keys",
    Object.prototype.hasOwnProperty.call(RIDE_ART_MANIFEST.animal_kingdom, "10921"),
    false
  );
  check(
    "neighboring show IDs stay distinct — 657 and 655 never share artwork",
    getRideArtwork("animal_kingdom", "657", false).src !==
      getRideArtwork("animal_kingdom", "655", false).src &&
      getRideArtwork("animal_kingdom", "657", true).src !==
        getRideArtwork("animal_kingdom", "655", true).src,
    true
  );
  check(
    "neighboring animal kingdom IDs stay distinct — 651 and 655 never share artwork",
    getRideArtwork("animal_kingdom", "651", false).src !==
      getRideArtwork("animal_kingdom", "655", false).src &&
      getRideArtwork("animal_kingdom", "651", true).src !==
        getRideArtwork("animal_kingdom", "655", true).src,
    true
  );

  check(
    "lookup uses exact park + ride keys only",
    manifestSource.includes("RIDE_ART_MANIFEST[parkId]") &&
      manifestSource.includes("parkArt[String(rideId)]"),
    true
  );
  check(
    "no fuzzy attraction-name matching in the manifest",
    /\.name\b|toLowerCase|normalize|includes\(|indexOf\(|match\(/.test(manifestSource),
    false
  );
  check(
    "no park-level or area-level fallback in the manifest",
    /getParkArtwork|getAreaArtwork|getTohiArtwork|TOHI_PARK_ARTWORK|TOHI_AREA_ARTWORK|DEFAULT_TOHI_ARTWORK/.test(
      manifestSource
    ),
    false
  );
  check("no remote URLs in the manifest", /https?:\/\//.test(manifestSource), false);

  check("artwork prop is optional with a null default", cardSource.includes("artwork = null,"), true);
  check(
    "absent artwork renders the text-led layout with no panel",
    cardSource.includes("const hasArtwork = Boolean(artwork?.src);") &&
      /\{hasArtwork \? \(/.test(cardSource) &&
      /\) : \(\n        upperContent\n      \)\}/.test(cardSource),
    true
  );
  check(
    "artwork panel is a contained 4:5 rounded panel",
    cardSource.includes('aspectRatio: "4 / 5"') &&
      cardSource.includes('overflow: "hidden"') &&
      cardSource.includes("borderRadius: 14"),
    true
  );
  check(
    "artwork panel takes roughly a third of the card width",
    cardSource.includes('flex: "0 0 36%"') && cardSource.includes('maxWidth: "40%"'),
    true
  );
  check("artwork image uses object-fit cover", cardSource.includes('objectFit: "cover"'), true);
  check(
    "artwork image lazy-loads and decodes async",
    cardSource.includes('loading="lazy"') && cardSource.includes('decoding="async"'),
    true
  );
  check(
    "text column stays shrinkable beside the artwork",
    cardSource.includes('<div style={{ minWidth: 0, flex: "1 1 auto" }}>{upperContent}</div>'),
    true
  );
  check(
    "artwork never becomes the card background",
    /backgroundImage|url\(/.test(cardSource),
    false
  );

  check(
    "all six Plan call sites resolve exact artwork",
    (planRecommendationsSource.match(/artwork=\{getRideArtwork\(activePark, /g) || []).length,
    6
  );
  check(
    "every lookup is driven by activePark, ride.id, and planNight",
    (planRecommendationsSource.match(
      /artwork=\{getRideArtwork\(activePark, [\w.]+\.id, planNight\)\}/g
    ) || []).length,
    6
  );
  check(
    "Plan imports the exact-art helper from the manifest",
    planRecommendationsSource.includes(
      'import { getRideArtwork } from "../data/rideArtManifest";'
    ),
    true
  );
  check(
    "App.jsx has no artwork changes",
    /getRideArtwork|rideArtManifest|rideArt\//.test(appSource),
    false
  );
}

console.log("TOHI Pick integration (61C-2)");
{
  check(
    "pick ride ID is String-normalized before comparison",
    planRecommendationsSource.includes("? String(tohiPickDisplayCandidate.rideId)") &&
      planRecommendationsSource.includes("String(slot.ride.id) === tohiPickRideId"),
    true
  );
  check(
    "match uses the rideId field, never a name",
    planRecommendationsSource.includes("tohiPickDisplayCandidate?.rideId != null") &&
      !/toLowerCase\(\)|\.name\s*===/.test(planRecommendationsSource),
    true
  );
  check(
    "only rendered normal-branch slots are matchable",
    planRecommendationsSource.includes('{ key: "primary", ride: primaryRecommendation }') &&
      planRecommendationsSource.includes(
        ".filter((slot) => slot && slot.ride && slot.ride.id != null)"
      ),
    true
  );
  check(
    "render guards and match list share one source of truth",
    ["showsBackupCard", "showsWorthTheWalkCard", "showsPlanAheadCard", "showsWaitOnThisCard"].every(
      (name) => (planRecommendationsSource.match(new RegExp(name, "g")) || []).length >= 3
    ),
    true
  );
  check(
    "the pre-open plan-ahead card is excluded from matching",
    (planRecommendationsSource.match(/isTohiPick=\{tohiPickMatchedSlotKey === "/g) || []).length,
    5
  );
  check(
    "exactly one card can claim the pick",
    ["primary", "backup", "worthTheWalk", "planAhead", "waitOnThis"].every(
      (key) =>
        (planRecommendationsSource.match(
          new RegExp(`isTohiPick=\\{tohiPickMatchedSlotKey === "${key}"\\}`, "g")
        ) || []).length === 1
    ),
    true
  );
  check(
    "standalone pick is suppressed only when a rendered card matched",
    planRecommendationsSource.includes(
      "{tohiPickDisplayCandidate && !tohiPickMatchedSlotKey && ("
    ),
    true
  );
  check(
    "standalone pick block itself is otherwise unchanged",
    planRecommendationsSource.includes('aria-label="TOHI Pick recommendation"') &&
      planRecommendationsSource.includes("✨ TOHI Pick") &&
      planRecommendationsSource.includes("Calmest clear move") &&
      planRecommendationsSource.includes("Best move right now"),
    true
  );
  check("card accepts an optional isTohiPick", cardSource.includes("isTohiPick = false,"), true);
  check(
    "pick eyebrow prefixes the existing category label",
    cardSource.includes("{isTohiPick ? `✨ TOHI PICK · ${slot.eyebrow}` : slot.eyebrow}"),
    true
  );
  check(
    "pick uses a restrained purple accent and border",
    cardSource.includes("const TOHI_PICK_STYLE = {") &&
      cardSource.includes("TOHI_PICK_STYLE.accent(night)") &&
      cardSource.includes("TOHI_PICK_STYLE.border(night)"),
    true
  );
  check(
    "pick styling leaves surface, artwork, reason, and actions alone",
    cardSource.includes("const surface = night ? COMPACT_CARD.nightSurface") &&
      cardSource.includes("const showFullReason = protectReason || reasonExpanded;") &&
      cardSource.includes("const hasArtwork = Boolean(artwork?.src);"),
    true
  );
  check(
    "TOHI Pick selection stays in App and is untouched",
    appSource.includes("const tohiPickDisplayCandidate =") &&
      !/isTohiPick|tohiPickMatchedSlotKey/.test(appSource),
    true
  );
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
check("no pure black surfaces", planPresentationSource.includes('"#000000"'), false);

console.log("Two-state Plan structure");
{
  check(
    "state condition uses existing state only",
    appSource.includes(
      "const planShowsSetupState = recommendations.needsLocation || !currentLand;"
    ),
    true
  );
  const branchStart = planRecommendationsSource.indexOf("{planShowsSetupState ? (");
  const dayStrategy = planRecommendationsSource.indexOf('"EVENING STRATEGY" : "DAY STRATEGY"');
  const whereAreYou = planRecommendationsSource.indexOf("Where are you?");
  const weatherComfort = planRecommendationsSource.indexOf("WEATHER + COMFORT");
  const familyContext = planRecommendationsSource.indexOf("FAMILY CONTEXT");
  const branchElse = planRecommendationsSource.indexOf('aria-label="Current park area"');
  const recommendationsHeader = planRecommendationsSource.indexOf(">\n                      RECOMMENDATIONS");

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
    planRecommendationsSource.includes('aria-label="Current park area"'),
    true
  );
  check(
    "setup headers appear exactly once",
    (planPresentationSource.match(/DAY STRATEGY/g) || []).length,
    1
  );
  check(
    "old always-stacked location prompt removed from recommendation chain",
    planPresentationSource.includes("{recommendations.needsLocation || !currentLand ? ("),
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
    (planRecommendationsSource.match(/background: planNight \? "#0F172A" : colors.card/g) || []).length,
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
    (planRecommendationsSource.match(/renderRideActions\(ride, \{ night: planNight, compact: true \}\)/g) || []).length >= 6,
    true
  );
  check(
    "waits tab ride actions remain day-styled",
    appSource.includes("browsingAnotherPark ? () => null : renderRideActions"),
    true
  );
  check(
    "tohi pick caution is theme-aware",
    planRecommendationsSource.includes('"rgba(69, 26, 3, 0.45)"'),
    true
  );
  check(
    "tohi pick decorative panel has night treatment",
    planRecommendationsSource.includes("#1E1B4B 0%, #0F172A 58%"),
    true
  );
  check(
    "pre-open, browse, and fallback cards are theme-aware",
    (planPresentationSource.match(/planNight \? "#111A33"/g) || []).length >= 3,
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
    (planPresentationSource.match(/planNight \? "rgba\(15, 23, 42, 0\.72\)" : colors\.amberSoft/g) || [])
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
    (planRecommendationsSource.match(/renderShowtimeInfo\(ride, \{ night: planNight \}\)/g) || []).length >= 6,
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
    "RecommendationCard used only in the Plan presentation",
    (planRecommendationsSource.match(/<RecommendationCard/g) || []).length,
    6
  );
  check("BottomTabs untouched structurally", appSource.includes("<BottomTabs activeTab={activeTab}"), true);
  check(
    "Home hero untouched",
    appSource.includes("TODAY&apos;S GAME PLAN"),
    true
  );
}

console.log("Extraction integrity");
{
  check(
    "App imports PlanRecommendations exactly once",
    (appSource.match(/import \{ PlanRecommendations \} from "\.\/components\/PlanRecommendations";/g) || [])
      .length,
    1
  );
  check(
    "App renders PlanRecommendations exactly once",
    (appSource.match(/<PlanRecommendations/g) || []).length,
    1
  );
  check(
    "component holds all six RecommendationCard render sites",
    (planRecommendationsSource.match(/<RecommendationCard/g) || []).length,
    6
  );
  check(
    "App holds zero RecommendationCard render sites",
    (appSource.match(/<RecommendationCard/g) || []).length,
    0
  );
  check("Trip Timing remains in App", appSource.includes("TRIP TIMING"), true);
  check("Weather Strategy remains in App", appSource.includes("WEATHER STRATEGY"), true);
  check("PlanTab remains in App", appSource.includes("<PlanTab"), true);
  check(
    "locked hasPersonalizedAccess branch remains in App",
    appSource.includes("renderLockedFeatureCard({") &&
      appSource.includes("Personalized Best Move is locked until setup is finished"),
    true
  );
  check("handleChatSubmit remains in App", appSource.includes("handleChatSubmit"), true);
  check("landOptions remains in App", appSource.includes("const landOptions = LAND_OPTIONS[activePark]"), true);
  check(
    "tohiPickDisplayCandidate remains in App",
    appSource.includes("const tohiPickDisplayCandidate ="),
    true
  );
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
