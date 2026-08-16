#!/usr/bin/env node

// TOHI transportation context authority (64C-2).
//
// The defect this phase fixes: a family staying at Port Orleans French Quarter,
// standing in Magic Kingdom, asked "Is the monorail the fastest way back?" and
// TOHI answered Monorail -> Transportation and Ticket Center -> transfer to a
// bus, then called it the "standard route". The structured data says the route
// is a direct bus, and that resort has no monorail in any field.
//
// The cause was not missing data. buildTransportationContext took only
// activePark and emitted a hardcoded block that, at Magic Kingdom, described
// Wilderness Lodge, Contemporary, Polynesian and Grand Floridian — all
// monorail/boat resorts — regardless of where the family was actually staying.
//
// HOW THESE CLAIMS ARE ESTABLISHED
//
// The real backend builders are EXECUTED against the real committed resort data.
// Source-text searching would be worthless here: the old code contained the
// string "directAccess" too, and still produced a contradicting prompt. What
// matters is the rendered block, so that is what every assertion below reads.
//
// The builders are extracted verbatim rather than required, because
// backend/services/aiService.js imports the Anthropic SDK and the backend's
// node_modules are not installed in this workspace. The extraction fails loudly
// if any piece is missing.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-fix
// baseline. INVARIANT REGRESSION GUARDS protect what this phase must not touch.

const fs = require("fs");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");

const aiSource = fs.readFileSync(
  path.join(repoRoot, "backend", "services", "aiService.js"),
  "utf8"
);
const resortSource = fs.readFileSync(
  path.join(frontendRoot, "src", "resortProfiles.js"),
  "utf8"
);

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

/* ------------------------------------------------- the real resort dataset -- */

const RESORTS = (() => {
  try {
    const mod = new Function(
      `${resortSource.replace(/export /g, "")}
      return { DISNEY_RESORT_PROFILES, getResortProfile };`
    )();
    return mod;
  } catch (err) {
    console.log(`       resort data failed to load: ${err.message}`);
    return null;
  }
})();

/* --------------------------------------------- the real backend builders -- */

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

// Present on both sides of this phase.
const REQUIRED = [sliceFunction("formatList"), sliceFunction("buildTransportationContext")];

// Added by 64C-2. Optional so this harness also runs against the pinned
// baseline, which is what lets the invariant guards prove they hold on BOTH
// sides rather than only afterwards.
const ADDED = [
  sliceObjectConst("DIRECT_ROUTE_LABELS"),
  sliceObjectConst("TRANSFER_ROUTE_LABELS"),
  sliceFunction("describeStructuredRoute"),
].filter(Boolean);

const BUILDERS = (() => {
  if (REQUIRED.some((p) => !p) || !RESORTS) return null;
  try {
    return new Function(
      `${ADDED.join("\n\n")}
      ${REQUIRED.join("\n\n")}
      return { buildTransportationContext, formatList };`
    )();
  } catch (err) {
    console.log(`       backend builders failed to load: ${err.message}`);
    return null;
  }
})();

console.log("TOHI transportation context authority (64C-2) — FEATURE-DISCRIMINATING");

check(
  "the real backend builders and resort data loaded and were executed",
  BUILDERS !== null,
  true
);

// buildTransportationContext gained a second parameter in 64C-2. Calling it with
// both is safe on the baseline too — the extra argument is simply ignored there,
// so the baseline renders its old park-only block and the feature assertions
// below fail on it rather than crashing.
function renderFor(parkId, resortId) {
  if (!BUILDERS) return "";
  const profile = resortId ? RESORTS.getResortProfile(resortId) : null;
  return BUILDERS.buildTransportationContext(parkId, { resortProfile: profile });
}

const PARKS = ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"];

/* ------------------------------------------------------- the defect case -- */

const POFQ_MK = renderFor("magic_kingdom", "port_orleans_french_quarter");

featureCheck(
  "1. Magic Kingdom -> Port Orleans French Quarter renders the structured direct bus",
  POFQ_MK.includes("Port Orleans") &&
    POFQ_MK.includes("Structured direct access, current park to the selected resort: bus") &&
    /DIRECT route\(s\), no transfer required: direct Disney bus/.test(POFQ_MK),
  true
);

featureCheck(
  "2. the POFQ block forbids the monorail/TTC answer and any speed claim",
  // Every clause the reported answer violated, asserted on the rendered block.
  POFQ_MK.includes("No transfer is indicated for this route") &&
    /Transportation and Ticket Center hop/.test(POFQ_MK) &&
    POFQ_MK.includes("Do not claim fastest, quickest") &&
    // and the block must not itself mention a monorail for this resort
    !/monorail/i.test(POFQ_MK),
  true
);

featureCheck(
  "3. the guest's own resort drives the block — no park-only resort roll-call",
  // The old block named these four at Magic Kingdom no matter who was staying
  // where. None may appear for a guest who is not at them.
  !/Wilderness Lodge|Contemporary|Polynesian|Grand Floridian|Pop Century/i.test(POFQ_MK),
  true
);

/* --------------------------------------------------- direct-mode coverage -- */

const DIRECT_CASES = [
  ["3. Contemporary from Magic Kingdom: walking AND monorail direct", "magic_kingdom", "contemporary", ["walking path", "monorail"]],
  ["4a. Riviera from EPCOT: Skyliner direct", "epcot", "riviera", ["Disney Skyliner"]],
  ["4b. Riviera from Hollywood Studios: Skyliner direct", "hollywood", "riviera", ["Disney Skyliner"]],
  ["5. Wilderness Lodge from Magic Kingdom: boat direct", "magic_kingdom", "wilderness_lodge", ["boat / water taxi"]],
  ["6. BoardWalk from EPCOT: walking direct", "epcot", "boardwalk", ["walking path"]],
  ["7. All-Star from Animal Kingdom: bus direct", "animal_kingdom", "all_star_movies", ["direct Disney bus"]],
];

for (const [label, park, resort, expectedLabels] of DIRECT_CASES) {
  const block = renderFor(park, resort);
  featureCheck(
    label,
    expectedLabels.every((l) => block.includes(l)) &&
      /DIRECT route\(s\), no transfer required:/.test(block) &&
      block.includes("No transfer is indicated for this route"),
    true
  );
}

/* ------------------------------------------------- transfer-mode coverage -- */

featureCheck(
  "8. Contemporary -> EPCOT is transfer-marked, and the transfer is allowed",
  (() => {
    const block = renderFor("epcot", "contemporary");
    return (
      block.includes("TRANSFER-REQUIRED route(s): monorail with a transfer") &&
      block.includes("A transfer is genuinely required here") &&
      // the "no transfer" sentence must NOT appear when one is required
      !block.includes("No transfer is indicated for this route")
    );
  })(),
  true
);

featureCheck(
  "9. walking_to_ttc is transfer-marked wherever it is a structured route",
  (() => {
    if (!BUILDERS) return false;
    let seen = 0;
    for (const profile of RESORTS.DISNEY_RESORT_PROFILES) {
      for (const park of PARKS) {
        const modes = profile.directAccess?.[park] || [];
        if (!modes.includes("walking_to_ttc")) continue;
        seen += 1;
        const block = renderFor(park, profile.id);
        if (!/TRANSFER-REQUIRED route\(s\):[^\n]*Transportation and Ticket Center/.test(block)) {
          return false;
        }
        // it must never be listed among the direct routes
        const directLine = (block.match(/- DIRECT route\(s\)[^\n]*/) || [""])[0];
        if (/Transportation and Ticket Center/.test(directLine)) return false;
      }
    }
    // Polynesian -> Magic Kingdom is the one occurrence; if the data ever loses
    // it this fails rather than passing by testing nothing.
    return seen > 0;
  })(),
  true
);

featureCheck(
  "10. skyliner_via_epcot is classified as a transfer and never rendered as a route",
  // A genuine property of this dataset: skyliner_via_epcot appears only in the
  // resort-wide transportation list (Beach Club, Yacht Club, BoardWalk) and in
  // no directAccess array. So it must never appear as a route, and must be
  // carried in the descriptive "other modes" line instead — which is exactly
  // what "descriptive only, never overrides directAccess" means in practice.
  (() => {
    if (!BUILDERS || !ADDED.length) return false;
    let classifier;
    try {
      classifier = new Function(
        `${ADDED.join("\n\n")}\nreturn describeStructuredRoute;`
      )();
    } catch (err) {
      return false; // absent on the pre-fix baseline
    }
    if (classifier("skyliner_via_epcot").requiresTransfer !== true) return false;

    let seen = 0;
    for (const profile of RESORTS.DISNEY_RESORT_PROFILES) {
      if (!(profile.transportation || []).includes("skyliner_via_epcot")) continue;
      seen += 1;
      const block = renderFor("epcot", profile.id);
      // present as descriptive context...
      if (!/Other modes that exist at this resort[^\n]*skyliner_via_epcot/.test(block)) {
        return false;
      }
      // ...and never as a direct or transfer ROUTE
      const routeLines = (block.match(/- (?:DIRECT|TRANSFER-REQUIRED) route\(s\)[^\n]*/g) || []).join(" ");
      if (/skyliner/i.test(routeLines)) return false;
    }
    return seen === 3;
  })(),
  true
);

/* ------------------------------------------------------ unknown / missing -- */

featureCheck(
  "11. a missing profile yields an explicit unavailable state, not a route",
  (() => {
    const block = renderFor("magic_kingdom", null);
    return (
      block.includes("Structured route data is UNAVAILABLE") &&
      block.includes("This block never covers park-to-park travel or any other destination") &&
      block.includes("My Disney Experience") &&
      !/DIRECT route\(s\)/.test(block) &&
      !/\b(bus|monorail|skyliner|water taxi)\b/i.test(block)
    );
  })(),
  true
);

featureCheck(
  "12. a park with no structured route yields unknown, with no invented route",
  (() => {
    if (!BUILDERS) return false;
    const profile = RESORTS.getResortProfile("port_orleans_french_quarter");
    const block = BUILDERS.buildTransportationContext("universal_studios", {
      resortProfile: profile,
    });
    return (
      block.includes("Structured route data for this park is UNAVAILABLE") &&
      block.includes("Do not infer a route from geography") &&
      block.includes("This block never covers park-to-park travel or any other destination") &&
      block.includes("My Disney Experience") &&
      !/DIRECT route\(s\)/.test(block)
    );
  })(),
  true
);

featureCheck(
  "13a. the rendered block declares its own destination scope",
  // The block covers exactly one journey. It must say so in its header and in an
  // explicit scope line, so the model cannot read it as a general answer.
  /Transportation context — route from the CURRENT PARK to the SELECTED RESORT only:/.test(
    POFQ_MK
  ) &&
    POFQ_MK.includes("Structured direct access, current park to the selected resort:") &&
    POFQ_MK.includes("DESTINATION SCOPE:") &&
    POFQ_MK.includes("IGNORE this block as the answer"),
  true
);

featureCheck(
  "13b. a park-to-park question must not be answered from the selected-resort route",
  POFQ_MK.includes("For a park-to-park question, another resort, or any other destination") &&
    POFQ_MK.includes("Say current official guidance should be checked") &&
    // and the system rules must forbid mentioning it as the answer
    /If the question is PARK-TO-PARK: do not apply or even mention the selected-resort route as the answer/.test(
      aiSource
    ) &&
    /Park-to-park routing is not represented in this dataset/.test(aiSource),
  true
);

featureCheck(
  "13c. another resort or destination must not reuse the selected resort's directAccess",
  /If the destination is ANOTHER resort, a hotel the guest is not staying at/.test(aiSource) &&
    /do not reuse the selected resort's direct access as if it applied/.test(aiSource) &&
    /not verified by the trip setup/.test(aiSource),
  true
);

featureCheck(
  "13d. an ambiguous destination requires clarification, not the resort route",
  /If the destination is AMBIGUOUS[^\n]*ask which destination the guest means/.test(aiSource) &&
    /Do not silently answer with the selected-resort route/.test(aiSource) &&
    POFQ_MK.includes("If the destination is unclear, ask which destination the guest means"),
  true
);

featureCheck(
  "13e. the route is stated first ONLY for the selected-resort journey",
  // The unconditional "state the structured direct route first" is gone from
  // both the rules and the rendered block.
  !/^- State the structured direct route first, by name, before discussing anything else\.$/m.test(
    aiSource
  ) &&
    /If the destination IS the selected resort[^\n]*State that route first/.test(aiSource) &&
    POFQ_MK.includes(
      "State this route first ONLY when the guest is asking how to reach or return to this selected resort"
    ),
  true
);

featureCheck(
  "13f. no rule claims to apply to EVERY transportation question",
  // The over-broad framing is replaced by destination-aware rules.
  !/apply to EVERY transportation question/.test(aiSource) &&
    /Transportation routing rules \(apply whenever transportation is discussed\)/.test(
      aiSource
    ) &&
    /FIRST identify the DESTINATION being asked about/.test(aiSource),
  true
);

featureCheck(
  "14. no comparative timing claim is permitted anywhere a route is rendered",
  PARKS.every((park) =>
    RESORTS.DISNEY_RESORT_PROFILES.every((p) => {
      const block = renderFor(park, p.id);
      return (
        block.includes("Do not claim fastest, quickest") &&
        block.includes("the option that avoids a transfer")
      );
    })
  ),
  true
);

/* ------------------------------------------- system prompt routing rules -- */

featureCheck(
  "15. the system prompt makes structured access authoritative FOR THE SELECTED-RESORT JOURNEY",
  // Authority is real but scoped: it governs the current park -> selected resort
  // journey, and the decision order starts by identifying the destination.
  /FIRST identify the DESTINATION being asked about/.test(aiSource) &&
    /It is authoritative for that journey and for nothing else/.test(aiSource) &&
    /If the destination IS the selected resort[^\n]*the structured direct access is AUTHORITATIVE/.test(
      aiSource
    ) &&
    /Describe a transfer ONLY when the structured mode explicitly marks one/.test(aiSource) &&
    /Never say a route runs only "if one is running"/.test(aiSource) &&
    /answer from the same structured data and correct any earlier unsupported route/.test(
      aiSource
    ),
  true
);

featureCheck(
  "16. the park-only geography instructions were removed, leaving no conflict",
  // These taught mode-by-geography inference and competed with the data.
  !/From Magic Kingdom, Wilderness Lodge is a nearby resort\/lunch-break option/.test(
    aiSource
  ) &&
    !/Skyliner logic mainly applies to EPCOT, Hollywood Studios, Riviera/.test(aiSource) &&
    !/- Contemporary, Polynesian, and Grand Floridian are also nearby MK-area resort options/.test(
      aiSource
    ),
  true
);

featureCheck(
  "17. the builder is actually called with the family profile",
  /buildTransportationContext\(activePark, familyProfile\)/.test(aiSource) &&
    /function buildTransportationContext\(activePark, familyProfile\)/.test(aiSource),
  true
);

/* ------------------------- 21 resorts x 4 parks, every structured value -- */

featureCheck(
  "18. all 21 resorts x 4 parks: every structured value is represented faithfully",
  (() => {
    if (!BUILDERS) return false;
    const DIRECT = ["bus", "monorail", "skyliner", "walking", "water_taxi"];
    const TRANSFER = ["monorail_transfer", "walking_to_ttc", "skyliner_via_epcot"];
    let checked = 0;

    for (const profile of RESORTS.DISNEY_RESORT_PROFILES) {
      for (const park of PARKS) {
        const modes = profile.directAccess?.[park] || [];
        if (!modes.length) continue;
        const block = renderFor(park, profile.id);
        checked += 1;

        // the raw structured values are always echoed
        if (!block.includes("Structured direct access, current park to the selected resort:")) return false;
        for (const mode of modes) {
          if (!block.includes(mode.replace(/_/g, "_"))) {
            // the raw value appears in the echoed list
            if (!block.includes(mode)) return false;
          }
        }

        const hasDirect = modes.some((m) => DIRECT.includes(m));
        const hasTransfer = modes.some((m) => TRANSFER.includes(m));

        // a direct mode must never be labelled a transfer
        if (hasDirect && !/DIRECT route\(s\), no transfer required:/.test(block)) return false;
        // a transfer-marked mode must never be labelled direct
        if (hasTransfer && !/TRANSFER-REQUIRED route\(s\):/.test(block)) return false;
        // and the "no transfer indicated" line appears only when none is marked
        if (hasTransfer === block.includes("No transfer is indicated for this route")) {
          return false;
        }
      }
    }

    return checked === RESORTS.DISNEY_RESORT_PROFILES.length * PARKS.length && checked === 84;
  })(),
  true
);

featureCheck(
  "19. breakStrategy never determines the mode, and general modes never override",
  (() => {
    if (!BUILDERS) return false;
    for (const profile of RESORTS.DISNEY_RESORT_PROFILES) {
      for (const park of PARKS) {
        const modes = profile.directAccess?.[park] || [];
        if (!modes.length) continue;
        const block = renderFor(park, profile.id);

        // breakStrategy is present but explicitly labelled as tone only
        if (profile.breakStrategy?.[park]) {
          if (!block.includes("does NOT determine the mode")) return false;
        }
        // any resort-wide mode that is NOT this park's route is marked descriptive
        const other = (profile.transportation || []).filter((m) => !modes.includes(m));
        if (other.length && !block.includes("must never override the structured direct access")) {
          return false;
        }
      }
    }
    return true;
  })(),
  true
);

console.log("Protected behaviour preserved — INVARIANT REGRESSION GUARDS");

invariantCheck(
  "the resort dataset is unchanged: 21 resorts, complete for all four parks",
  RESORTS !== null &&
    RESORTS.DISNEY_RESORT_PROFILES.length === 21 &&
    RESORTS.DISNEY_RESORT_PROFILES.every((p) =>
      PARKS.every((park) => Array.isArray(p.directAccess?.[park]) && p.directAccess[park].length)
    ),
  true
);

invariantCheck(
  "the resort profile context block still renders directAccess",
  /- Direct access from current park \(\$\{activePark \|\| "unknown"\}\): \$\{formatList\(directAccess\)\}/.test(
    aiSource
  ),
  true
);

invariantCheck(
  "model invocation, response parsing and the off-topic path are unchanged",
  /const OFF_TOPIC_REPLY =/.test(aiSource) &&
    /function summarizeHistory\(conversationHistory = \[\]\)/.test(aiSource) &&
    /conversationHistory\.slice\(-6\)/.test(aiSource),
  true
);

invariantCheck(
  "the transportation builder adds no network, storage, clock or randomness",
  (() => {
    const fnSource = sliceFunction("buildTransportationContext");
    return (
      fnSource.length > 0 &&
      !/fetch\(|axios|localStorage|sessionStorage|new Date|Date\.now|Math\.random/.test(fnSource)
    );
  })(),
  true
);

invariantCheck(
  "no new hardcoded Disney route dataset was introduced",
  // Only the structured values that already exist in resortProfiles.js may be
  // labelled. A new route table would mean labels for values the data does not
  // carry.
  (() => {
    if (!BUILDERS) return false;
    const labelled = new Set();
    for (const m of aiSource.matchAll(/^\s{2}(\w+):\s*"/gm)) labelled.add(m[1]);
    // Every value the dataset actually carries, from BOTH structured fields.
    // skyliner_via_epcot lives only in transportation[], so a directAccess-only
    // comparison would wrongly call its label an invented route.
    const structured = new Set();
    for (const p of RESORTS.DISNEY_RESORT_PROFILES) {
      (p.transportation || []).forEach((m) => structured.add(m));
      for (const park of Object.keys(p.directAccess || {})) {
        (p.directAccess[park] || []).forEach((m) => structured.add(m));
      }
    }
    // On the pre-fix baseline no label maps exist, so no route table was
    // introduced and the claim holds trivially.
    const directSrc = sliceObjectConst("DIRECT_ROUTE_LABELS");
    const transferSrc = sliceObjectConst("TRANSFER_ROUTE_LABELS");
    if (!directSrc && !transferSrc) return true;

    const routeLabels = [
      ...Object.keys(new Function(`${directSrc}\nreturn DIRECT_ROUTE_LABELS;`)()),
      ...Object.keys(new Function(`${transferSrc}\nreturn TRANSFER_ROUTE_LABELS;`)()),
    ];
    return routeLabels.every((m) => structured.has(m));
  })(),
  true
);

console.log("");
console.log(`  64C-2 feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64C-2 invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
