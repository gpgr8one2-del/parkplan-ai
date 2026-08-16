#!/usr/bin/env node

// TOHI park-to-park prompt wiring (64C-3C).
//
// 64C-3B added an audited 12-route dataset. This phase connects it to the chat
// prompt and retires the blanket refusal that came before it.
//
// HOW THESE CLAIMS ARE ESTABLISHED
//
// The real builder is EXECUTED against the real committed route module. It is
// extracted from aiService.js rather than required, because that file imports
// the Anthropic SDK and the backend's node_modules are not installed here; the
// route module itself IS required, so the rendered context is built from the
// same data production uses.
//
// That matters for the "no duplicate table" claim: the harness injects the real
// dataset and then checks the rendered output against it entry by entry. A
// second hardcoded table inside aiService.js would diverge and fail.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-phase
// baseline. INVARIANT REGRESSION GUARDS are truths that hold on both sides.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const AI_PATH = path.join(repoRoot, "backend", "services", "aiService.js");
const DATA_PATH = path.join(repoRoot, "backend", "data", "parkToParkRoutes.js");

const aiSource = fs.readFileSync(AI_PATH, "utf8");

let passCount = 0;
let failCount = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;
let loadPass = 0;
let loadFail = 0;

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
function loadCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) loadFail += 1;
  else loadPass += 1;
}
function featureCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) featureFail += 1;
  else featurePass += 1;
}
function invariantCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) invariantFail += 1;
  else invariantPass += 1;
}

/* ------------------------------------------------- real data + real builder -- */

const DATA = (() => {
  if (!fs.existsSync(DATA_PATH)) return null;
  try {
    return require(DATA_PATH);
  } catch (err) {
    console.log(`       route module failed to load: ${err.message}`);
    return null;
  }
})();

function sliceFunction(name) {
  const start = aiSource.indexOf(`function ${name}(`);
  if (start < 0) return "";
  const end = aiSource.indexOf("\n}\n", start);
  return end > start ? aiSource.slice(start, end + 2) : "";
}
function sliceObjectConst(name) {
  const start = aiSource.indexOf(`const ${name} = {`);
  if (start < 0) return "";
  const end = aiSource.indexOf("\n};", start);
  return end > start ? aiSource.slice(start, end + 3) : "";
}

const PIECES = [
  sliceObjectConst("PARK_DISPLAY_NAMES"),
  sliceFunction("normalizeParkToParkParkId"),
  sliceFunction("describeParkToParkRoute"),
  sliceFunction("buildParkToParkTransportationContext"),
];

const BUILDER = (() => {
  if (!DATA || PIECES.some((p) => !p)) return null;
  try {
    return new Function(
      "PARK_TO_PARK_PARK_IDS",
      "PARK_TO_PARK_ROUTES",
      "PARK_TO_PARK_OPERATIONAL_CAVEAT",
      `${PIECES.join("\n\n")}
      return {
        buildParkToParkTransportationContext,
        normalizeParkToParkParkId,
      };`
    )(
      DATA.PARK_TO_PARK_PARK_IDS,
      DATA.PARK_TO_PARK_ROUTES,
      DATA.PARK_TO_PARK_OPERATIONAL_CAVEAT
    );
  } catch (err) {
    console.log(`       builder failed to load: ${err.message}`);
    return null;
  }
})();

console.log("TOHI park-to-park prompt wiring (64C-3C) — FEATURE-DISCRIMINATING");

loadCheck("1. the real park-to-park prompt builder loaded and is executable", BUILDER !== null, true);

const render = (activePark) =>
  BUILDER ? BUILDER.buildParkToParkTransportationContext(activePark) : "";

const CONTEXT = render("epcot");
const ROUTES = DATA?.PARK_TO_PARK_ROUTES || [];

const NAMES = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood: "Disney's Hollywood Studios",
  animal_kingdom: "Disney's Animal Kingdom",
};

/* ---------------------------------------------- 2-6. derivation and shape -- */

featureCheck(
  "2. the context is derived from the merged route module, not a duplicate table",
  // Every rendered pair line must match the real dataset, AND aiService.js must
  // import the module rather than re-state its facts. A second hardcoded table
  // would either diverge here or show up as literal route facts in the source.
  (() => {
    if (!BUILDER || !ROUTES.length) return false;
    const importsModule =
      /require\(["']\.\.\/data\/parkToParkRoutes["']\)/.test(aiSource) &&
      /PARK_TO_PARK_ROUTES/.test(aiSource);
    if (!importsModule) return false;

    // The builder function itself must contain no route facts of its own.
    const builderSource = sliceFunction("buildParkToParkTransportationContext");
    const restatesFacts =
      /Caribbean Beach|Transportation and Ticket Center|Friendship Boat|International Gateway|Skyliner|Monorail/i.test(
        builderSource
      );
    if (restatesFacts) return false;

    return ROUTES.every((e) =>
      CONTEXT.includes(`- ${NAMES[e.originPark]} to ${NAMES[e.destinationPark]}:`)
    );
  })(),
  true
);

featureCheck(
  "3. all 12 directional pairs render",
  ROUTES.length === 12 &&
    ROUTES.every((e) =>
      CONTEXT.includes(`- ${NAMES[e.originPark]} to ${NAMES[e.destinationPark]}:`)
    ),
  true
);

featureCheck(
  "4. canonical display names render correctly",
  CONTEXT.includes("Magic Kingdom") &&
    CONTEXT.includes("EPCOT") &&
    CONTEXT.includes("Disney's Hollywood Studios") &&
    CONTEXT.includes("Disney's Animal Kingdom") &&
    // the raw IDs must never leak into guest-facing prompt text
    !/magic_kingdom|animal_kingdom|hollywood_studios/.test(CONTEXT),
  true
);

featureCheck(
  "5. hollywood_studios activePark normalizes to hollywood",
  BUILDER !== null &&
    BUILDER.normalizeParkToParkParkId("hollywood_studios") === "hollywood" &&
    BUILDER.normalizeParkToParkParkId("disney_hollywood_studios") === "hollywood" &&
    render("hollywood_studios").includes(
      "Current park: Disney's Hollywood Studios. Use it as the origin"
    ) &&
    // and the alias never reaches the exact-ID resolver
    DATA.resolveParkToParkRoute("hollywood_studios", "epcot") === null,
  true
);

featureCheck(
  "6. unknown or missing activePark remains unknown and asks for the origin",
  ["", null, undefined, "disney_springs", "universal_studios"].every((value) => {
    const block = render(value);
    return (
      block.includes("Current park: unknown") &&
      block.includes("ask which park they are starting from") &&
      BUILDER.normalizeParkToParkParkId(value) === ""
    );
  }),
  true
);

/* ------------------------------------------- 7-13. the verified route facts -- */

const lineFor = (origin, destination) =>
  CONTEXT.split("\n").find((l) =>
    l.startsWith(`- ${NAMES[origin]} to ${NAMES[destination]}:`)
  ) || "";

featureCheck(
  "7. both EPCOT -> Hollywood Studios options render",
  /Friendship Boat/i.test(lineFor("epcot", "hollywood")) &&
    /Skyliner/i.test(lineFor("epcot", "hollywood")),
  true
);

featureCheck(
  "8. both Hollywood Studios -> EPCOT options render",
  /Friendship Boat/i.test(lineFor("hollywood", "epcot")) &&
    /Skyliner/i.test(lineFor("hollywood", "epcot")),
  true
);

featureCheck(
  "9. the boat is present in BOTH directions and is never dropped",
  (CONTEXT.match(/Friendship Boat/g) || []).length === 2 &&
    CONTEXT.includes("Present all listed options for a pair; do not drop one"),
  true
);

featureCheck(
  "10. the Caribbean Beach transfer appears only for the two Skyliner directions",
  (() => {
    const lines = CONTEXT.split("\n").filter((l) => /Caribbean Beach/i.test(l));
    return (
      lines.length === 2 &&
      lines.every((l) => /Skyliner/i.test(l)) &&
      lines.some((l) => l.startsWith("- EPCOT to Disney's Hollywood Studios:")) &&
      lines.some((l) => l.startsWith("- Disney's Hollywood Studios to EPCOT:"))
    );
  })(),
  true
);

featureCheck(
  "11. the TTC transfer appears for both Magic Kingdom <-> EPCOT directions",
  /transfer at Transportation and Ticket Center/i.test(lineFor("magic_kingdom", "epcot")) &&
    /transfer at Transportation and Ticket Center/i.test(lineFor("epcot", "magic_kingdom")) &&
    // and nowhere else
    (CONTEXT.match(/transfer at Transportation and Ticket Center/gi) || []).length === 2,
  true
);

featureCheck(
  "12. every Animal Kingdom pair renders as a direct bus with no transfer",
  (() => {
    const pairs = [
      ["magic_kingdom", "animal_kingdom"],
      ["animal_kingdom", "magic_kingdom"],
      ["epcot", "animal_kingdom"],
      ["animal_kingdom", "epcot"],
      ["hollywood", "animal_kingdom"],
      ["animal_kingdom", "hollywood"],
    ];
    return pairs.every(([o, d]) => {
      const line = lineFor(o, d);
      return line.includes("Direct Disney bus") && !/transfer/i.test(line);
    });
  })(),
  true
);

featureCheck(
  "13. Magic Kingdom <-> Hollywood Studios renders as a direct bus",
  ["magic_kingdom>hollywood", "hollywood>magic_kingdom"].every((pair) => {
    const [o, d] = pair.split(">");
    const line = lineFor(o, d);
    return line.includes("Direct Disney bus") && !/transfer/i.test(line);
  }),
  true
);

/* --------------------------------------------- 14-16. prompt hygiene -------- */

featureCheck(
  "14. the operational caveat renders once, not twelve times",
  (CONTEXT.match(/Confirm current operation in the My Disney Experience app/g) || []).length ===
    1,
  true
);

featureCheck(
  "15. source URLs and audit metadata are not dumped into the prompt",
  // Paired with a positive: an empty context trivially contains no URLs, so the
  // negative alone would pass at the baseline where no builder exists.
  CONTEXT.includes("Park-to-park transportation") &&
    CONTEXT.split("\n").length > 12 &&
    !/https?:\/\//.test(CONTEXT) &&
    !/verifiedOn|2026-08-16|plandisney|disneyworld\.disney\.go\.com|first_party/i.test(CONTEXT),
  true
);

featureCheck(
  "16. no speed ranking, travel time, interval or operating-hour claim is rendered",
  (() => {
    // The instruction line legitimately FORBIDS these words; the route lines
    // must not contain them. So the route lines are checked on their own.
    const routeLines = CONTEXT.split("\n").filter((l) => / to .*: /.test(l));
    const superlatives = /\b(fastest|quickest|shortest|best|slowest)\b/i;
    const timings =
      /\b\d+\s*(?:minute|minutes|min|mins|hour|hours|hr|hrs)\b|\bevery\s+\d|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b/i;
    return (
      routeLines.length === 12 &&
      !routeLines.some((l) => superlatives.test(l) || timings.test(l)) &&
      // and the prompt explicitly instructs against them
      /Do not rank these options as fastest, quickest or best/.test(CONTEXT)
    );
  })(),
  true
);

/* ----------------------------------------- 17-24. the system routing rules -- */

featureCheck(
  "17. park-to-park context is authoritative only for park-to-park questions",
  /If the question is PARK-TO-PARK \(theme park to theme park\): answer ONLY from the separate "Park-to-park transportation" block/.test(
    aiSource
  ) &&
    /FIRST identify the DESTINATION being asked about/.test(aiSource),
  true
);

featureCheck(
  "18. an explicitly named origin overrides the current park",
  /An origin the guest names explicitly overrides the current park/.test(aiSource),
  true
);

featureCheck(
  "19. a destination-only question may use the current park as origin",
  /if they name only a destination, use the current park as the origin/.test(aiSource) &&
    CONTEXT.includes("Use it as the origin when the guest names only a destination"),
  true
);

featureCheck(
  "20. an unclear origin or destination asks one short clarification",
  /if the origin or destination is still unclear, ask one short clarification/.test(aiSource) &&
    /If the destination is AMBIGUOUS[\s\S]*?ask which destination the guest means/.test(
      aiSource
    ) &&
    render("").includes("ask which park they are starting from"),
  true
);

invariantCheck(
  "21. selected-resort routes remain authoritative only for the selected resort",
  /If the destination IS the selected resort[^\n]*the structured direct access is AUTHORITATIVE/.test(
    aiSource
  ) &&
    /function buildTransportationContext\(activePark, familyProfile\)/.test(aiSource) &&
    /route from the CURRENT PARK to the SELECTED RESORT only/.test(aiSource),
  true
);

featureCheck(
  "22. another resort or location uses neither dataset and stays on safe guidance",
  /If the destination is ANOTHER resort, a hotel the guest is not staying at/.test(aiSource) &&
    /do not reuse the selected resort's direct access as if it applied/.test(aiSource) &&
    /neither block applies — say current official guidance should be checked/.test(aiSource),
  true
);

featureCheck(
  "23. the old blanket park-to-park refusal is gone",
  !/Park-to-park routing is not represented in this dataset/.test(aiSource) &&
    !/Park-to-park routing is not represented/.test(aiSource),
  true
);

featureCheck(
  "24. the resort block defers to the verified park-to-park context",
  // It must still say it does not itself cover park-to-park — that is true — but
  // it must now redirect rather than refuse.
  /IGNORE this block and use the separate \\"Park-to-park transportation\\" block, which is verified/.test(
    aiSource
  ) &&
    /never covers park-to-park travel \(see the separate Park-to-park transportation block\)/.test(
      aiSource
    ),
  true
);

/* ------------------------------------------------------- 25-27. safety ----- */

featureCheck(
  "25. an unresolvable pair never silently becomes a bus",
  // The resolver still refuses unknown input, and the rules require saying so
  // rather than defaulting.
  DATA.resolveParkToParkRoute("epcot", "epcot") === null &&
    DATA.resolveParkToParkRoute("disney_springs", "epcot") === null &&
    /If a pair genuinely cannot be resolved from that block, say so and point to official guidance rather than inventing a route/.test(
      aiSource
    ),
  true
);

invariantCheck(
  "26. the live two-sentence answer limit is unchanged",
  // The backend limit lives in finalizeAIReply. Both of its sentence caps are
  // pinned so a change to either is caught, and no park-to-park exception may be
  // added alongside them.
  /function finalizeAIReply\(reply = "", message = ""\)/.test(aiSource) &&
    /getAnswerMode\(message\) === "live" && !isScheduleContextQuestion\(message\)[\s\S]{0,60}return getFirstSentences\(cleaned, 2\);/.test(
      aiSource
    ) &&
    /isFireworksViewingQuestion\(message\)[\s\S]{0,60}return getFirstSentences\(cleaned, 5\);/.test(
      aiSource
    ) &&
    // exactly two sentence caps exist — no new park-to-park carve-out
    (aiSource.match(/getFirstSentences\(cleaned, \d+\)/g) || []).length === 2 &&
    !/parkToPark[\s\S]{0,80}getFirstSentences/i.test(aiSource),
  true
);

featureCheck(
  "27. no natural-language route parser, network, storage, clock or randomness was added",
  (() => {
    const added = [
      sliceFunction("normalizeParkToParkParkId"),
      sliceFunction("describeParkToParkRoute"),
      sliceFunction("buildParkToParkTransportationContext"),
    ].join("\n");
    if (!added.trim()) return false;
    // No sentence parsing: the builder must not inspect a user message at all.
    const parses = /\bmessage\b|\.match\(|\.exec\(|RegExp|toLowerCase\(\)\.includes/.test(added);
    const impure =
      /fetch\(|axios|new Date|Date\.now|Math\.random|process\.env|localStorage|sessionStorage/.test(
        added
      );
    return !parses && !impure;
  })(),
  true
);

console.log("Protected behaviour preserved — INVARIANT REGRESSION GUARDS");

featureCheck(
  "the audited route module is imported, never re-declared in aiService",
  /require\(["']\.\.\/data\/parkToParkRoutes["']\)/.test(aiSource) &&
    !/const PARK_TO_PARK_ROUTES = \[/.test(aiSource),
  true
);

invariantCheck(
  "model invocation, history and response parsing are unchanged",
  /const OFF_TOPIC_REPLY =/.test(aiSource) &&
    /conversationHistory\.slice\(-6\)/.test(aiSource) &&
    /function summarizeHistory\(conversationHistory = \[\]\)/.test(aiSource),
  true
);

invariantCheck(
  "the resort profile block still renders its own directAccess",
  /- Direct access from current park \(\$\{activePark \|\| "unknown"\}\): \$\{formatList\(directAccess\)\}/.test(
    aiSource
  ),
  true
);

console.log("");
console.log(`  64C-3C load checks: ${loadPass} passed, ${loadFail} failed`);
console.log(`  64C-3C feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64C-3C invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
