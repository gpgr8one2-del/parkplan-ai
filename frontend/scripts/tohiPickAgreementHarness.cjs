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

function loadAgreementModule() {
  const filename = path.join(frontendRoot, "src", "utils", "tohiPickAgreement.js");
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

const {
  buildTohiPickReviewSignature,
  sanitizeTohiPickReviewRequest,
  shouldRequestTohiPickReview,
  validateTohiPickReviewResponse,
  resolveTohiPickAgreementDecision,
  storeTohiPickReviewResult,
  getCachedTohiPickReviewResult,
  selectTohiPickReviewForSignature,
} = loadAgreementModule();

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

const TOP_CANDIDATE = {
  rideId: "r1",
  name: "Peter Pan's Flight",
  sourceSlot: "bestMove",
  wait: 20,
  area: "fantasyland",
  engineReason: "Short wait nearby.",
  engineCaution: null,
  mustDo: { isMustDo: true, reason: null },
  confidenceHints: { sameArea: true, waitKnown: true, mustDo: true, indoorRelief: false },
  raw: { waitValueStatus: { status: "great_value" } },
};

const SECOND_CANDIDATE = {
  rideId: "r2",
  name: "Haunted Mansion",
  sourceSlot: "backup",
  wait: 30,
  area: "liberty-square",
  mustDo: { isMustDo: false, reason: null },
  confidenceHints: { sameArea: false, waitKnown: true, mustDo: false, indoorRelief: true },
};

const STRONG_DECISION = {
  showPick: true,
  status: "pick_confirmed",
  candidate: TOP_CANDIDATE,
  reasonCodes: ["must_do_same_area_known_wait"],
  supportingSignals: ["must_do", "same_area", "wait_known"],
  blockingSignals: [],
};

const NO_PICK_DECISION = {
  showPick: false,
  status: "no_pick_not_strong",
  candidate: null,
  reasonCodes: ["no_strong_rule_matched"],
  supportingSignals: ["wait_known"],
  blockingSignals: ["no_strong_combination"],
};

function validReviewJson(overrides = {}) {
  return JSON.stringify({
    verdict: "approve",
    candidateId: "r1",
    reasonCode: "strong_fit",
    reason: "Nearby must-do with a short known wait fits this family well.",
    ...overrides,
  });
}

function resolveWith(validation) {
  return resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: { status: "complete", signature: "sig", validation },
  });
}

console.log("1. Valid approval for top candidate → confirmed");
{
  const validation = validateTohiPickReviewResponse(validReviewJson(), "r1");
  check("validation valid", validation.valid, true);
  const resolved = resolveWith(validation);
  check("status", resolved.status, "pick_confirmed_ai");
  check("showPick", resolved.showPick, true);
  check("candidate is deterministic top", resolved.candidate === TOP_CANDIDATE, true);
  check("fallback not used", resolved.usedDeterministicFallback, false);
}

console.log("2. Valid veto for top candidate → suppressed");
{
  const validation = validateTohiPickReviewResponse(
    validReviewJson({ verdict: "veto", reasonCode: "weather_mismatch", reason: "Storm risk makes this outdoor pick a poor fit right now." }),
    "r1"
  );
  check("validation valid", validation.valid, true);
  const resolved = resolveWith(validation);
  check("status", resolved.status, "no_pick_ai_veto");
  check("showPick", resolved.showPick, false);
  check("candidate", resolved.candidate, null);
}

console.log("3. Valid uncertain response → suppressed");
{
  const validation = validateTohiPickReviewResponse(
    validReviewJson({ verdict: "uncertain", reasonCode: "insufficient_context" }),
    "r1"
  );
  const resolved = resolveWith(validation);
  check("status", resolved.status, "no_pick_ai_uncertain");
  check("showPick", resolved.showPick, false);
}

console.log("4. Candidate ID mismatch → deterministic fallback");
{
  const validation = validateTohiPickReviewResponse(validReviewJson({ candidateId: "r2" }), "r1");
  check("validation invalid", validation.valid, false);
  check("invalidReason", validation.invalidReason, "candidate_mismatch");
  const resolved = resolveWith(validation);
  check("status", resolved.status, "pick_confirmed_ai_invalid_response");
  check("showPick preserved", resolved.showPick, true);
  check("fallback used", resolved.usedDeterministicFallback, true);
}

console.log("5. Malformed JSON / extra prose → deterministic fallback");
{
  const malformed = validateTohiPickReviewResponse("{not valid json", "r1");
  check("malformed invalid", malformed.valid, false);
  const prose = validateTohiPickReviewResponse(`Sure! ${validReviewJson()}`, "r1");
  check("extra prose invalid", prose.valid, false);
  check("prose invalidReason", prose.invalidReason, "extra_prose_or_not_json");
  const resolved = resolveWith(prose);
  check("showPick preserved", resolved.showPick, true);
  check("status", resolved.status, "pick_confirmed_ai_invalid_response");
}

console.log("6. Invalid verdict → deterministic fallback");
{
  const validation = validateTohiPickReviewResponse(validReviewJson({ verdict: "reject" }), "r1");
  check("validation invalid", validation.valid, false);
  check("invalidReason", validation.invalidReason, "invalid_verdict");
  check("showPick preserved", resolveWith(validation).showPick, true);
}

console.log("7. Invalid reasonCode → deterministic fallback");
{
  const validation = validateTohiPickReviewResponse(
    validReviewJson({ reasonCode: "vibes_mismatch" }),
    "r1"
  );
  check("validation invalid", validation.valid, false);
  check("invalidReason", validation.invalidReason, "invalid_reason_code");
  check("showPick preserved", resolveWith(validation).showPick, true);
}

console.log("8. Overlong reason → deterministic fallback");
{
  const validation = validateTohiPickReviewResponse(
    validReviewJson({ reason: "x".repeat(300) }),
    "r1"
  );
  check("validation invalid", validation.valid, false);
  check("invalidReason", validation.invalidReason, "reason_too_long");
  check("showPick preserved", resolveWith(validation).showPick, true);
}

console.log("9. AI unavailable → deterministic fallback");
{
  const resolved = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: { status: "unavailable", signature: "sig", validation: null },
  });
  check("status", resolved.status, "pick_confirmed_ai_unavailable");
  check("showPick preserved", resolved.showPick, true);
  check("fallback used", resolved.usedDeterministicFallback, true);
}

console.log("10. Timeout/network failure → deterministic fallback");
{
  const resolved = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: { status: "unavailable", signature: "sig", unavailableReason: "request_failed" },
  });
  check("status", resolved.status, "pick_confirmed_ai_unavailable");
  check("showPick preserved", resolved.showPick, true);
  const pending = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: { status: "pending", signature: "sig" },
  });
  check("pending keeps pick visible", pending.showPick, true);
  check("pending status", pending.status, "ai_review_pending");
}

console.log("11. No 60A strong pick → no review requested");
{
  const wants = shouldRequestTohiPickReview({
    isPlanTabActive: true,
    decision: NO_PICK_DECISION,
    signature: "sig",
    requestedSignatures: new Set(),
  });
  check("no request", wants, false);
  const resolved = resolveTohiPickAgreementDecision({
    decision: NO_PICK_DECISION,
    review: { status: "idle" },
  });
  check("status", resolved.status, "ai_review_not_requested");
  check("showPick", resolved.showPick, false);
}

console.log("12. Plan tab inactive → no review requested");
{
  const wants = shouldRequestTohiPickReview({
    isPlanTabActive: false,
    decision: STRONG_DECISION,
    signature: "sig",
    requestedSignatures: new Set(),
  });
  check("no request", wants, false);
}

console.log("13. Identical signature → no duplicate review");
{
  const requested = new Set();
  const signature = buildTohiPickReviewSignature({
    candidate: TOP_CANDIDATE,
    activePark: "magic-kingdom",
    currentLand: "fantasyland",
    weatherMode: { mode: "normal" },
  });
  const first = shouldRequestTohiPickReview({
    isPlanTabActive: true,
    decision: STRONG_DECISION,
    signature,
    requestedSignatures: requested,
  });
  requested.add(signature);
  const second = shouldRequestTohiPickReview({
    isPlanTabActive: true,
    decision: STRONG_DECISION,
    signature,
    requestedSignatures: requested,
  });
  check("first request allowed", first, true);
  check("duplicate blocked", second, false);
}

console.log("14. Signature changes when the top candidate changes");
{
  const base = {
    activePark: "magic-kingdom",
    currentLand: "fantasyland",
    weatherMode: { mode: "normal" },
  };
  const sigA = buildTohiPickReviewSignature({ ...base, candidate: TOP_CANDIDATE });
  const sigASame = buildTohiPickReviewSignature({ ...base, candidate: { ...TOP_CANDIDATE } });
  const sigB = buildTohiPickReviewSignature({ ...base, candidate: SECOND_CANDIDATE });
  check("same candidate, same signature", sigA, sigASame);
  check("different candidate, different signature", sigA !== sigB, true);
  check("no candidate, no signature", buildTohiPickReviewSignature({ ...base, candidate: null }), null);
}

console.log("15. Later shortlist candidate is never promoted");
{
  const vetoNamingSecond = validateTohiPickReviewResponse(
    validReviewJson({ verdict: "veto", candidateId: "r2", reasonCode: "location_mismatch" }),
    "r1"
  );
  check("response naming second candidate is invalid", vetoNamingSecond.valid, false);
  const resolved = resolveWith(vetoNamingSecond);
  check("top candidate preserved, not replaced", resolved.candidate === TOP_CANDIDATE, true);
  const approved = resolveWith(validateTohiPickReviewResponse(validReviewJson(), "r1"));
  check("approval surfaces only the top candidate", approved.candidate === TOP_CANDIDATE, true);
  check("approval never surfaces the second candidate", approved.candidate === SECOND_CANDIDATE, false);
}

console.log("16. Input objects are not mutated");
{
  const candidate = JSON.parse(JSON.stringify(TOP_CANDIDATE));
  const shortlist = [JSON.parse(JSON.stringify(TOP_CANDIDATE)), JSON.parse(JSON.stringify(SECOND_CANDIDATE))];
  const familyContext = { partySize: 4, adultCount: 2, childCount: 2, hasSmallChildren: true };
  Object.freeze(candidate);
  Object.freeze(familyContext);
  shortlist.forEach(Object.freeze);

  const before = JSON.stringify({ candidate, shortlist, familyContext });
  const request = sanitizeTohiPickReviewRequest({
    candidate,
    candidates: shortlist,
    activePark: "magic-kingdom",
    currentLand: "fantasyland",
    weatherMode: { mode: "hot" },
    dayPhase: "midday",
    waitAgeMinutes: 3,
    currentActivity: { type: "in_line", rideName: "Space Mountain" },
    familyContext,
  });
  const decision = { ...STRONG_DECISION, candidate };
  Object.freeze(decision);
  resolveTohiPickAgreementDecision({
    decision,
    review: { status: "complete", signature: "sig", validation: validateTohiPickReviewResponse(validReviewJson(), "r1") },
  });

  check("inputs unchanged", JSON.stringify({ candidate, shortlist, familyContext }), before);
  check("request has bounded shortlist", request.shortlist.length <= 3, true);
  check("request top candidate id", request.topCandidate.rideId, "r1");
  check("request omits raw profile fields", "children" in (request.context.compactFamilyContext || {}), false);
}

const SIG_BASE = {
  candidate: TOP_CANDIDATE,
  candidates: [TOP_CANDIDATE, SECOND_CANDIDATE],
  activePark: "magic-kingdom",
  currentLand: "fantasyland",
  weatherMode: { mode: "normal" },
  dayPhase: "midday",
  waitAgeMinutes: 3,
  currentActivity: null,
  familyContext: { partySize: 4, adultCount: 2, childCount: 2 },
};

function sig(overrides = {}) {
  return buildTohiPickReviewSignature({ ...SIG_BASE, ...overrides });
}

console.log("17. Signature reflects top-candidate semantics");
{
  const base = sig();
  const noMustDo = sig({
    candidate: {
      ...TOP_CANDIDATE,
      mustDo: { isMustDo: false, reason: null },
      confidenceHints: { ...TOP_CANDIDATE.confidenceHints, mustDo: false },
    },
  });
  check("mustDo change alters signature", base !== noMustDo, true);

  const differentValue = sig({
    candidate: { ...TOP_CANDIDATE, raw: { waitValueStatus: { status: "good_value" } } },
  });
  check("waitValueStatus change alters signature", base !== differentValue, true);

  const differentHints = sig({
    candidate: {
      ...TOP_CANDIDATE,
      confidenceHints: { ...TOP_CANDIDATE.confidenceHints, sameArea: false },
    },
  });
  check("confidence hint change alters signature", base !== differentHints, true);
}

console.log("18. Signature reflects shortlist and context semantics");
{
  const base = sig();
  check("shortlist change alters signature", base !== sig({ candidates: [TOP_CANDIDATE] }), true);
  check("dayPhase change alters signature", base !== sig({ dayPhase: "evening" }), true);
  check(
    "current activity change alters signature",
    base !== sig({ currentActivity: { type: "in_line", rideName: "Space Mountain" } }),
    true
  );
  check(
    "family context change alters signature",
    base !== sig({ familyContext: { partySize: 5, adultCount: 2, childCount: 3 } }),
    true
  );
}

console.log("19. Canonical serialization ignores object-key order");
{
  const reorderedCandidate = {
    raw: { waitValueStatus: { status: "great_value" } },
    confidenceHints: { indoorRelief: false, mustDo: true, waitKnown: true, sameArea: true },
    mustDo: { reason: null, isMustDo: true },
    engineCaution: null,
    engineReason: "Short wait nearby.",
    area: "fantasyland",
    wait: 20,
    sourceSlot: "bestMove",
    name: "Peter Pan's Flight",
    rideId: "r1",
  };
  const reorderedFamily = { childCount: 2, adultCount: 2, partySize: 4 };
  check(
    "key order does not change signature",
    sig(),
    sig({ candidate: reorderedCandidate, familyContext: reorderedFamily })
  );
}

console.log("20. Wait banding inside the signature");
{
  const at21 = sig({ candidate: { ...TOP_CANDIDATE, wait: 21 } });
  const at24 = sig({ candidate: { ...TOP_CANDIDATE, wait: 24 } });
  const at31 = sig({ candidate: { ...TOP_CANDIDATE, wait: 31 } });
  check("same band keeps signature", at21, at24);
  check("band crossing changes signature", at21 !== at31, true);
}

console.log("21. Cached veto is reused when a signature returns");
{
  const cache = new Map();
  const sigA = sig();
  const vetoValidation = validateTohiPickReviewResponse(
    validReviewJson({ verdict: "veto", reasonCode: "weather_mismatch" }),
    "r1"
  );
  storeTohiPickReviewResult(cache, sigA, {
    status: "complete",
    signature: sigA,
    validation: vetoValidation,
    unavailableReason: null,
  });

  const cached = getCachedTohiPickReviewResult(cache, sigA);
  check("cached veto retrievable after leaving and returning", Boolean(cached), true);

  const selected = selectTohiPickReviewForSignature({
    signature: sigA,
    cache,
    liveReview: { status: "pending", signature: "signature-B" },
  });
  const resolved = resolveTohiPickAgreementDecision({ decision: STRONG_DECISION, review: selected });
  check("cached veto still suppresses pick", resolved.showPick, false);
  check("cached veto status", resolved.status, "no_pick_ai_veto");
  check(
    "no new request for cached signature",
    shouldRequestTohiPickReview({
      isPlanTabActive: true,
      decision: STRONG_DECISION,
      signature: sigA,
      requestedSignatures: new Set(),
      cache,
    }),
    false
  );
}

console.log("22. Cached approval is restored when a signature returns");
{
  const cache = new Map();
  const sigA = sig();
  storeTohiPickReviewResult(cache, sigA, {
    status: "complete",
    signature: sigA,
    validation: validateTohiPickReviewResponse(validReviewJson(), "r1"),
    unavailableReason: null,
  });

  const selected = selectTohiPickReviewForSignature({ signature: sigA, cache, liveReview: null });
  const resolved = resolveTohiPickAgreementDecision({ decision: STRONG_DECISION, review: selected });
  check("cached approval restored", resolved.status, "pick_confirmed_ai");
  check("showPick", resolved.showPick, true);
  check(
    "no duplicate request",
    shouldRequestTohiPickReview({
      isPlanTabActive: true,
      decision: STRONG_DECISION,
      signature: sigA,
      requestedSignatures: new Set(),
      cache,
    }),
    false
  );
}

console.log("23. Cached unavailable/invalid results preserve deterministic fallback");
{
  const cache = new Map();
  storeTohiPickReviewResult(cache, "sig-unavailable", {
    status: "unavailable",
    signature: "sig-unavailable",
    validation: null,
    unavailableReason: "request_failed",
  });
  storeTohiPickReviewResult(cache, "sig-invalid", {
    status: "complete",
    signature: "sig-invalid",
    validation: validateTohiPickReviewResponse("{not json", "r1"),
    unavailableReason: null,
  });

  const unavailableResolved = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: selectTohiPickReviewForSignature({ signature: "sig-unavailable", cache, liveReview: null }),
  });
  check("cached unavailable keeps pick", unavailableResolved.showPick, true);
  check("cached unavailable status", unavailableResolved.status, "pick_confirmed_ai_unavailable");

  const invalidResolved = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: selectTohiPickReviewForSignature({ signature: "sig-invalid", cache, liveReview: null }),
  });
  check("cached invalid keeps pick", invalidResolved.showPick, true);
  check("cached invalid status", invalidResolved.status, "pick_confirmed_ai_invalid_response");
}

console.log("24. Stale responses cannot judge the current signature");
{
  const cache = new Map();
  const staleTerminal = {
    status: "complete",
    signature: "signature-A",
    validation: validateTohiPickReviewResponse(
      validReviewJson({ verdict: "veto", reasonCode: "timing_mismatch" }),
      "r1"
    ),
    unavailableReason: null,
  };

  const selected = selectTohiPickReviewForSignature({
    signature: "signature-B",
    cache,
    liveReview: staleTerminal,
  });
  check("stale live result is ignored for current signature", selected.status, "idle");
  const resolved = resolveTohiPickAgreementDecision({ decision: STRONG_DECISION, review: selected });
  check("current signature keeps deterministic pick", resolved.showPick, true);
  check("status is not_requested", resolved.status, "ai_review_not_requested");

  storeTohiPickReviewResult(cache, "signature-A", staleTerminal);
  check("stale result cached under its own signature", Boolean(getCachedTohiPickReviewResult(cache, "signature-A")), true);
  check("stale result not cached under current signature", getCachedTohiPickReviewResult(cache, "signature-B"), null);
  const backToA = selectTohiPickReviewForSignature({ signature: "signature-A", cache, liveReview: null });
  check(
    "returning to original signature reuses cached veto",
    resolveTohiPickAgreementDecision({ decision: STRONG_DECISION, review: backToA }).status,
    "no_pick_ai_veto"
  );
}

console.log("25. Cache stays bounded and skips non-terminal states");
{
  const cache = new Map();
  for (let i = 0; i < 25; i += 1) {
    storeTohiPickReviewResult(cache, `sig-${i}`, {
      status: "unavailable",
      signature: `sig-${i}`,
      validation: null,
      unavailableReason: "request_failed",
    });
  }
  check("cache bounded to 20 entries", cache.size, 20);
  check("oldest entry evicted", getCachedTohiPickReviewResult(cache, "sig-0"), null);
  check("newest entry retained", Boolean(getCachedTohiPickReviewResult(cache, "sig-24")), true);

  storeTohiPickReviewResult(cache, "sig-pending", { status: "pending", signature: "sig-pending" });
  check("pending is never cached", getCachedTohiPickReviewResult(cache, "sig-pending"), null);
}

console.log("26. Cached results still cannot promote another candidate");
{
  const cache = new Map();
  const mismatch = validateTohiPickReviewResponse(
    validReviewJson({ candidateId: "r2", verdict: "approve" }),
    "r1"
  );
  storeTohiPickReviewResult(cache, "sig-mismatch", {
    status: "complete",
    signature: "sig-mismatch",
    validation: mismatch,
    unavailableReason: null,
  });
  const resolved = resolveTohiPickAgreementDecision({
    decision: STRONG_DECISION,
    review: selectTohiPickReviewForSignature({ signature: "sig-mismatch", cache, liveReview: null }),
  });
  check("mismatched approval falls back to deterministic top", resolved.candidate === TOP_CANDIDATE, true);
  check("status", resolved.status, "pick_confirmed_ai_invalid_response");
}

console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
