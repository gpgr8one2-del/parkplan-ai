#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

const frontendRoot = path.resolve(__dirname, "..");
const frontendRequire = createRequire(path.join(frontendRoot, "package.json"));
const babel = frontendRequire("@babel/core");
const moduleTransformPlugin = frontendRequire.resolve(
  "@babel/plugin-transform-modules-commonjs"
);

function loadTohiPick() {
  const filename = path.join(frontendRoot, "src", "utils", "tohiPick.js");
  const source = fs.readFileSync(filename, "utf8");
  const { code } = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });

  const moduleShim = { exports: {} };

  vm.runInNewContext(
    code,
    {
      module: moduleShim,
      exports: moduleShim.exports,
      require: frontendRequire,
      console,
      Date,
    },
    { filename }
  );

  return moduleShim.exports;
}

const { buildTohiPickCandidates, evaluateTohiPickFinalDecision } = loadTohiPick();

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

const ELIGIBLE = { eligible: true, reasons: [], missing: [], warnings: [] };

function buildCandidates({
  currentArea = "fantasyland",
  bestMove,
  backup,
  worthTheWalk,
  mustDos = [],
} = {}) {
  return buildTohiPickCandidates({
    activePark: "magic-kingdom",
    currentArea,
    recommendations: { bestMove, backup, worthTheWalk },
    mustDos,
  }).candidates;
}

console.log("1. Ineligible input → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: { eligible: false, reasons: ["wait_data_unusable"], warnings: [] },
    candidates: buildCandidates({
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 25, area: "fantasyland" },
    }),
  });
  check("status", result.status, "no_pick_ineligible");
  check("showPick", result.showPick, false);
  check("candidate", result.candidate, null);
}

console.log("2. No candidates → no pick");
{
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates: [] });
  check("status", result.status, "no_pick_no_candidate");
  check("showPick", result.showPick, false);
}

console.log("3. Location uncertainty → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: { ...ELIGIBLE, warnings: ["location_not_confirmed"] },
    candidates: buildCandidates({
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 25, area: "fantasyland" },
    }),
  });
  check("status", result.status, "no_pick_location_uncertain");
  check("showPick", result.showPick, false);
}

console.log("4. First candidate with only one weak signal → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: buildCandidates({
      currentArea: "frontierland",
      backup: { id: "r2", name: "Haunted Mansion", waitTime: 30, area: "liberty-square" },
    }),
  });
  check("status", result.status, "no_pick_insufficient_evidence");
  check("showPick", result.showPick, false);
  check("supporting is wait_known only", result.supportingSignals.join(","), "wait_known");
}

console.log("5. Same-area + known-wait + must-do → confirmed");
{
  const candidates = buildCandidates({
    backup: { id: "r2", name: "Haunted Mansion", waitTime: 30, area: "fantasyland" },
    currentArea: "fantasyland",
    mustDos: [{ id: "r2", name: "Haunted Mansion" }],
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("status", result.status, "pick_confirmed");
  check("showPick", result.showPick, true);
  check("rule", result.reasonCodes.includes("must_do_same_area_known_wait"), true);
  check("candidate is candidates[0]", result.candidate === candidates[0], true);
}

console.log("6. Same-area + known-wait + favorable wait value → confirmed");
{
  const candidates = buildCandidates({
    bestMove: {
      id: "r1",
      name: "Peter Pan's Flight",
      waitTime: 20,
      area: "fantasyland",
      waitValueStatus: { status: "great_value" },
    },
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("status", result.status, "pick_confirmed");
  check("showPick", result.showPick, true);
  check("rule", result.reasonCodes.includes("same_area_known_wait_favorable_value"), true);
  check("candidate is candidates[0]", result.candidate === candidates[0], true);
}

console.log("7. Weather/indoor signal alone → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    weatherMode: { mode: "storm" },
    candidates: buildCandidates({
      currentArea: "frontierland",
      backup: { id: "r3", name: "Mickey's PhilharMagic", area: "fantasyland", indoor: true },
    }),
  });
  check("status", result.status, "no_pick_insufficient_evidence");
  check("showPick", result.showPick, false);
  check("blocking has weather_support_only", result.blockingSignals.includes("weather_support_only"), true);
  check("blocking has wait_unknown", result.blockingSignals.includes("wait_unknown"), true);
}

console.log("8. Unknown wait with no must-do evidence → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: buildCandidates({
      bestMove: { id: "r1", name: "Peter Pan's Flight", area: "fantasyland" },
    }),
  });
  check("showPick", result.showPick, false);
  check("status", result.status, "no_pick_not_strong");
  check("blocking has wait_unknown", result.blockingSignals.includes("wait_unknown"), true);
}

console.log("9. Normal recommendation candidates remain untouched");
{
  const bestMove = {
    id: "r1",
    name: "Peter Pan's Flight",
    waitTime: 20,
    area: "fantasyland",
    waitValueStatus: { status: "great_value" },
  };
  Object.freeze(bestMove);
  Object.freeze(bestMove.waitValueStatus);

  const candidates = buildCandidates({ bestMove });
  const snapshotBefore = JSON.stringify(candidates);
  evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("candidates unchanged", JSON.stringify(candidates), snapshotBefore);
  check("raw slot object unchanged", JSON.stringify(bestMove), JSON.stringify({
    id: "r1",
    name: "Peter Pan's Flight",
    waitTime: 20,
    area: "fantasyland",
    waitValueStatus: { status: "great_value" },
  }));
}

console.log("10. Helper never promotes a later candidate");
{
  const candidates = buildCandidates({
    currentArea: "fantasyland",
    bestMove: { id: "r1", name: "Big Thunder Mountain", area: "frontierland" },
    backup: {
      id: "r2",
      name: "Peter Pan's Flight",
      waitTime: 15,
      area: "fantasyland",
      waitValueStatus: { status: "great_value" },
    },
    mustDos: [{ id: "r2", name: "Peter Pan's Flight" }],
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("shortlist has strong second candidate", candidates.length >= 2, true);
  check("showPick stays false", result.showPick, false);
  check("no candidate promoted", result.candidate, null);
}

console.log("11. Cross-area Best Move + must-do + known wait + favorable value → confirmed");
{
  const candidates = buildCandidates({
    currentArea: "frontierland",
    bestMove: {
      id: "r1",
      name: "Peter Pan's Flight",
      waitTime: 20,
      area: "fantasyland",
      waitValueStatus: { status: "great_value" },
    },
    mustDos: [{ id: "r1", name: "Peter Pan's Flight" }],
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("status", result.status, "pick_confirmed");
  check("showPick", result.showPick, true);
  check("rule", result.reasonCodes.includes("best_move_must_do_known_wait_favorable_value"), true);
  check("candidate is candidates[0]", result.candidate === candidates[0], true);
}

console.log("12. Cross-area Worth the Walk + must-do + known wait + favorable value → confirmed");
{
  const candidates = buildCandidates({
    currentArea: "frontierland",
    worthTheWalk: {
      id: "r4",
      name: "Seven Dwarfs Mine Train",
      waitTime: 35,
      area: "fantasyland",
      waitValueStatus: { status: "good_value" },
    },
    mustDos: [{ id: "r4", name: "Seven Dwarfs Mine Train" }],
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("candidate slot is worthTheWalk", candidates[0].sourceSlot, "worthTheWalk");
  check("status", result.status, "pick_confirmed");
  check("showPick", result.showPick, true);
  check("rule", result.reasonCodes.includes("worth_the_walk_must_do_known_wait_favorable_value"), true);
  check("candidate is candidates[0]", result.candidate === candidates[0], true);
}

console.log("13. Cross-area favorable value without must-do → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: buildCandidates({
      currentArea: "frontierland",
      bestMove: {
        id: "r1",
        name: "Peter Pan's Flight",
        waitTime: 20,
        area: "fantasyland",
        waitValueStatus: { status: "great_value" },
      },
    }),
  });
  check("showPick", result.showPick, false);
  check("status", result.status, "no_pick_not_strong");
}

console.log("14. Cross-area must-do without favorable value → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    candidates: buildCandidates({
      currentArea: "frontierland",
      bestMove: { id: "r1", name: "Peter Pan's Flight", waitTime: 20, area: "fantasyland" },
      mustDos: [{ id: "r1", name: "Peter Pan's Flight" }],
    }),
  });
  check("showPick", result.showPick, false);
  check("status", result.status, "no_pick_not_strong");
}

console.log("15. Cross-area indoor relief during active weather → no pick");
{
  const result = evaluateTohiPickFinalDecision({
    eligibility: ELIGIBLE,
    weatherMode: { mode: "storm" },
    candidates: buildCandidates({
      currentArea: "frontierland",
      bestMove: {
        id: "r3",
        name: "Mickey's PhilharMagic",
        waitTime: 10,
        area: "fantasyland",
        indoor: true,
      },
    }),
  });
  check("showPick", result.showPick, false);
  check("status", result.status, "no_pick_not_strong");
}

console.log("16. Strong cross-area second candidate never replaces weak top candidate");
{
  const candidates = buildCandidates({
    currentArea: "frontierland",
    bestMove: { id: "r1", name: "Big Thunder Mountain", area: "adventureland" },
    worthTheWalk: {
      id: "r4",
      name: "Seven Dwarfs Mine Train",
      waitTime: 35,
      area: "fantasyland",
      waitValueStatus: { status: "good_value" },
    },
    mustDos: [{ id: "r4", name: "Seven Dwarfs Mine Train" }],
  });
  const result = evaluateTohiPickFinalDecision({ eligibility: ELIGIBLE, candidates });
  check("shortlist has strong second candidate", candidates.length >= 2, true);
  check("top candidate is the weak one", candidates[0].rideId, "r1");
  check("showPick stays false", result.showPick, false);
  check("no candidate promoted", result.candidate, null);
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
