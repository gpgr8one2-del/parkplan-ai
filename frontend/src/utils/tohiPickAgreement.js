const REVIEW_VERDICTS = ["approve", "veto", "uncertain"];

const REVIEW_REASON_CODES = [
  "strong_fit",
  "family_mismatch",
  "location_mismatch",
  "weather_mismatch",
  "timing_mismatch",
  "insufficient_context",
];

const MAX_REASON_LENGTH = 240;
const MAX_SHORTLIST_SIZE = 3;

const AGREEMENT_STATUSES = {
  NOT_REQUESTED: "ai_review_not_requested",
  PENDING: "ai_review_pending",
  CONFIRMED: "pick_confirmed_ai",
  VETOED: "no_pick_ai_veto",
  UNCERTAIN: "no_pick_ai_uncertain",
  UNAVAILABLE: "pick_confirmed_ai_unavailable",
  INVALID_RESPONSE: "pick_confirmed_ai_invalid_response",
};

function cleanString(value, maxLength = 120) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

// Wait is bucketed into 10-minute bands so ordinary wait churn between data
// refreshes does not generate a new review request for the same pick.
function getWaitBand(wait) {
  const numericWait = Number(wait);

  if (!Number.isFinite(numericWait)) return "w_unknown";

  return `w${Math.max(0, Math.floor(numericWait / 10) * 10)}`;
}

// Serialize with sorted keys so object-key order can never change a signature.
function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}

// Freshness enters the signature as a coarse bucket so the aging clock alone
// does not invalidate a verdict every minute.
function getFreshnessBucket(waitDataFreshness) {
  const minutes = Number.parseInt(String(waitDataFreshness || ""), 10);

  if (!Number.isFinite(minutes)) return "unknown";
  if (minutes < 5) return "fresh";
  if (minutes < 15) return "recent";

  return "stale";
}

function getSignatureCandidateFacts(sanitizedCandidate = {}, { includeHints = false } = {}) {
  const facts = {
    rideId: sanitizedCandidate.rideId,
    sourceSlot: sanitizedCandidate.sourceSlot,
    waitBand: getWaitBand(sanitizedCandidate.wait),
    area: sanitizedCandidate.area,
    waitValueStatus: sanitizedCandidate.waitValueStatus,
    mustDo: sanitizedCandidate.mustDo === true,
  };

  if (includeHints) {
    facts.confidenceHints = { ...sanitizedCandidate.confidenceHints };
  }

  return facts;
}

// The signature is a canonical semantic digest of the sanitized review
// request: if any input the AI actually judges changes, the signature
// changes and a cached verdict stops applying. engineReason/engineCaution
// prose is deliberately excluded — its underlying evidence (slot, wait band,
// area, value status, must-do, hints) is already represented, and wording
// churn should not re-trigger reviews.
export function buildTohiPickReviewSignature(input = {}) {
  const candidate = input.candidate;

  if (!candidate || (!candidate.rideId && !candidate.name)) return null;

  const request = sanitizeTohiPickReviewRequest(input);

  return stableSerialize({
    top: getSignatureCandidateFacts(request.topCandidate, { includeHints: true }),
    shortlist: request.shortlist.map((entry) => getSignatureCandidateFacts(entry)),
    context: {
      activePark: request.context.activePark,
      currentLand: request.context.currentLand,
      weatherMode: request.context.weatherMode,
      dayPhase: request.context.dayPhase,
      freshnessBucket: getFreshnessBucket(request.context.waitDataFreshness),
      activity: request.context.currentActivity
        ? {
            type: request.context.currentActivity.type,
            rideName: request.context.currentActivity.rideName,
          }
        : null,
      family: request.context.compactFamilyContext,
    },
  });
}

function sanitizeReviewCandidate(candidate = {}) {
  return {
    rideId: candidate.rideId != null ? String(candidate.rideId) : null,
    name: cleanString(candidate.name, 160),
    sourceSlot: cleanString(candidate.sourceSlot, 40),
    wait: Number.isFinite(Number(candidate.wait)) ? Number(candidate.wait) : null,
    area: cleanString(candidate.area, 80),
    engineReason: cleanString(candidate.engineReason, 240),
    engineCaution: cleanString(candidate.engineCaution, 240),
    waitValueStatus: cleanString(
      candidate.waitValueStatus?.status || candidate.raw?.waitValueStatus?.status,
      40
    ),
    mustDo: candidate.mustDo?.isMustDo === true,
    confidenceHints: {
      sameArea: candidate.confidenceHints?.sameArea === true,
      waitKnown: candidate.confidenceHints?.waitKnown === true,
      mustDo: candidate.confidenceHints?.mustDo === true,
      indoorRelief: candidate.confidenceHints?.indoorRelief === true,
    },
  };
}

function sanitizeFamilyContext(profile) {
  if (!profile || typeof profile !== "object") return null;

  return {
    partySize: Number.isFinite(Number(profile.partySize)) ? Number(profile.partySize) : null,
    adults: Number.isFinite(Number(profile.adultCount)) ? Number(profile.adultCount) : null,
    kids: Number.isFinite(Number(profile.childCount)) ? Number(profile.childCount) : null,
    hasSmallChildren: profile.hasSmallChildren === true,
    hasHeightLimitedRiders: profile.hasHeightLimitedRiders === true,
    thrillTolerance: cleanString(profile.thrillTolerance, 40),
    heatSensitivity: cleanString(profile.heatSensitivity, 40),
    pace: cleanString(profile.pace, 40),
  };
}

export function sanitizeTohiPickReviewRequest({
  candidate,
  candidates,
  activePark,
  currentLand,
  weatherMode,
  dayPhase,
  waitAgeMinutes,
  currentActivity,
  familyContext,
} = {}) {
  const shortlist = (Array.isArray(candidates) ? candidates : [])
    .filter(Boolean)
    .slice(0, MAX_SHORTLIST_SIZE)
    .map(sanitizeReviewCandidate);

  const numericAge = Number(waitAgeMinutes);

  return {
    topCandidate: sanitizeReviewCandidate(candidate || {}),
    shortlist,
    context: {
      activePark: cleanString(activePark, 60),
      currentLand: cleanString(currentLand, 60),
      weatherMode: cleanString(weatherMode?.mode || weatherMode, 40) || "normal",
      dayPhase: cleanString(dayPhase, 40),
      waitDataFreshness: Number.isFinite(numericAge)
        ? `${Math.max(0, Math.round(numericAge))} min old`
        : "unknown",
      currentActivity: currentActivity?.type
        ? {
            type: cleanString(currentActivity.type, 40),
            rideName: cleanString(currentActivity.rideName, 160),
          }
        : null,
      compactFamilyContext: sanitizeFamilyContext(familyContext),
    },
  };
}

export function shouldRequestTohiPickReview({
  isPlanTabActive,
  decision,
  signature,
  requestedSignatures,
  cache,
} = {}) {
  if (isPlanTabActive !== true) return false;
  if (!decision || decision.showPick !== true || !decision.candidate) return false;
  if (!signature) return false;

  if (
    requestedSignatures &&
    typeof requestedSignatures.has === "function" &&
    requestedSignatures.has(signature)
  ) {
    return false;
  }

  if (cache && typeof cache.has === "function" && cache.has(signature)) {
    return false;
  }

  return true;
}

const REVIEW_CACHE_MAX_ENTRIES = 20;

// Only settled review outcomes are cacheable. Pending is a transient state.
const TERMINAL_REVIEW_STATUSES = new Set(["complete", "unavailable"]);

export function storeTohiPickReviewResult(
  cache,
  signature,
  result,
  maxEntries = REVIEW_CACHE_MAX_ENTRIES
) {
  if (!cache || typeof cache.set !== "function") return;
  if (!signature || !result || !TERMINAL_REVIEW_STATUSES.has(result.status)) return;

  if (cache.has(signature)) cache.delete(signature);
  cache.set(signature, { ...result, signature });

  const boundedMax = Math.max(1, Number(maxEntries) || REVIEW_CACHE_MAX_ENTRIES);

  while (cache.size > boundedMax) {
    const oldestSignature = cache.keys().next().value;
    cache.delete(oldestSignature);
  }
}

export function getCachedTohiPickReviewResult(cache, signature) {
  if (!cache || typeof cache.get !== "function" || !signature) return null;

  return cache.get(signature) || null;
}

// Review state may only judge the signature it belongs to. A cached terminal
// result for the current signature wins; a live result is honored only when
// its signature matches; anything else is treated as not yet requested.
export function selectTohiPickReviewForSignature({ signature, cache, liveReview } = {}) {
  if (!signature) return { status: "idle" };

  const cached = getCachedTohiPickReviewResult(cache, signature);
  if (cached) return cached;

  if (liveReview && liveReview.signature === signature) return liveReview;

  return { status: "idle" };
}

export const TOHI_PICK_REVIEW_CACHE_MAX_ENTRIES = REVIEW_CACHE_MAX_ENTRIES;

export function validateTohiPickReviewResponse(rawResponse, expectedCandidateId) {
  const invalid = (invalidReason) => ({
    valid: false,
    verdict: null,
    reasonCode: null,
    reason: null,
    invalidReason,
  });

  let parsed = rawResponse;

  if (typeof rawResponse === "string") {
    const trimmed = rawResponse.trim();

    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return invalid("extra_prose_or_not_json");
    }

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return invalid("json_parse_failed");
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return invalid("not_an_object");
  }

  if (!REVIEW_VERDICTS.includes(parsed.verdict)) return invalid("invalid_verdict");
  if (!REVIEW_REASON_CODES.includes(parsed.reasonCode)) return invalid("invalid_reason_code");

  const candidateId = parsed.candidateId != null ? String(parsed.candidateId) : "";

  if (!expectedCandidateId || candidateId !== String(expectedCandidateId)) {
    return invalid("candidate_mismatch");
  }

  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

  if (!reason) return invalid("missing_reason");
  if (reason.length > MAX_REASON_LENGTH) return invalid("reason_too_long");

  return {
    valid: true,
    verdict: parsed.verdict,
    reasonCode: parsed.reasonCode,
    reason,
    invalidReason: null,
  };
}

// AI review is veto-only. Whatever the review says, the only candidate this
// resolver can ever surface is the deterministic decision's own candidate.
export function resolveTohiPickAgreementDecision({ decision, review } = {}) {
  const base = {
    candidate: null,
    verdict: null,
    reasonCode: null,
    reason: null,
    invalidReason: null,
    usedDeterministicFallback: false,
  };

  if (!decision || decision.showPick !== true || !decision.candidate) {
    return { ...base, showPick: false, status: AGREEMENT_STATUSES.NOT_REQUESTED };
  }

  const candidate = decision.candidate;
  const status = review?.status;

  if (!status || status === "idle") {
    return { ...base, showPick: true, status: AGREEMENT_STATUSES.NOT_REQUESTED, candidate };
  }

  if (status === "pending") {
    return { ...base, showPick: true, status: AGREEMENT_STATUSES.PENDING, candidate };
  }

  if (status === "complete") {
    const validation = review.validation;

    if (!validation || validation.valid !== true) {
      return {
        ...base,
        showPick: true,
        status: AGREEMENT_STATUSES.INVALID_RESPONSE,
        candidate,
        invalidReason: validation?.invalidReason || "invalid_response",
        usedDeterministicFallback: true,
      };
    }

    if (validation.verdict === "approve") {
      return {
        ...base,
        showPick: true,
        status: AGREEMENT_STATUSES.CONFIRMED,
        candidate,
        verdict: validation.verdict,
        reasonCode: validation.reasonCode,
        reason: validation.reason,
      };
    }

    return {
      ...base,
      showPick: false,
      status:
        validation.verdict === "veto"
          ? AGREEMENT_STATUSES.VETOED
          : AGREEMENT_STATUSES.UNCERTAIN,
      verdict: validation.verdict,
      reasonCode: validation.reasonCode,
      reason: validation.reason,
    };
  }

  // "unavailable" and anything unrecognized preserve the deterministic pick.
  return {
    ...base,
    showPick: true,
    status: AGREEMENT_STATUSES.UNAVAILABLE,
    candidate,
    usedDeterministicFallback: true,
  };
}

export const TOHI_PICK_AGREEMENT_STATUSES = { ...AGREEMENT_STATUSES };
export const TOHI_PICK_REVIEW_VERDICTS = [...REVIEW_VERDICTS];
export const TOHI_PICK_REVIEW_REASON_CODES = [...REVIEW_REASON_CODES];
export const TOHI_PICK_REVIEW_MAX_REASON_LENGTH = MAX_REASON_LENGTH;
