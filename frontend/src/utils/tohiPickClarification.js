const CLARIFICATION_QUESTION_TYPE = "proximity_vs_must_do";

const CLARIFICATION_STATUSES = {
  NOT_NEEDED: "clarification_not_needed",
  NOT_SUPPORTED: "clarification_not_supported",
  AVAILABLE: "clarification_available",
  DISMISSED: "clarification_dismissed",
  NEARBY_CONFIRMED: "pick_confirmed_clarification_nearby",
  MUST_DO_CONFIRMED: "pick_confirmed_clarification_must_do",
  STALE: "clarification_stale",
};

const CLARIFICATION_ANSWERS = {
  STAY_NEARBY: "stay_nearby",
  GO_MUST_DO: "go_must_do",
  NOT_RIGHT_NOW: "not_right_now",
};

// The same "Nearby" evidence the shortlist tags already use: same land as the
// family, or inside the engine's existing close-proximity distance.
const NEARBY_PROXIMITY_DISTANCE = 0.35;

const SUPPORTABLE_WAIT_VALUES = new Set(["great_value", "good_value"]);

const CACHE_MAX_ENTRIES = 20;
const TERMINAL_STATUSES = new Set([
  CLARIFICATION_STATUSES.DISMISSED,
  CLARIFICATION_STATUSES.NEARBY_CONFIRMED,
  CLARIFICATION_STATUSES.MUST_DO_CONFIRMED,
]);

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}

function getWaitBand(wait) {
  const numericWait = Number(wait);

  if (!Number.isFinite(numericWait)) return "w_unknown";

  return `w${Math.max(0, Math.floor(numericWait / 10) * 10)}`;
}

function getCandidateId(candidate) {
  return candidate?.rideId != null ? String(candidate.rideId) : null;
}

function getWaitValueStatusKey(candidate = {}) {
  const status =
    candidate.waitValueStatus?.status ||
    candidate.raw?.waitValueStatus?.status ||
    null;

  return status ? String(status).trim().toLowerCase() : null;
}

function getProximityDistance(candidate = {}) {
  const distance = Number(
    candidate.raw?.proximityDistance ?? candidate.proximityDistance
  );

  return Number.isFinite(distance) ? distance : null;
}

function hasKnownWait(candidate = {}) {
  // No Number() coercion here: a null wait must never pass as a known 0-minute wait.
  return candidate.confidenceHints?.waitKnown === true || Number.isFinite(candidate.wait);
}

function isCandidateHardBlocked(candidate = {}) {
  if (candidate.eligibleForTohiPick === false) return true;
  if ((candidate.exclusionReasons || []).length > 0) return true;

  const activityState = candidate.activityState || {};

  return (
    activityState.completed === true ||
    activityState.skipped === true ||
    activityState.reported === true ||
    candidate.constraints?.heightEligible === false ||
    candidate.constraints?.accessEligible === false
  );
}

function isCandidateNearby(candidate = {}) {
  if (candidate.confidenceHints?.sameArea === true) return true;

  const distance = getProximityDistance(candidate);

  return distance !== null && distance <= NEARBY_PROXIMITY_DISTANCE;
}

function isMustDoCandidate(candidate = {}) {
  return candidate.mustDo?.isMustDo === true || candidate.confidenceHints?.mustDo === true;
}

// The must-do must be a genuinely farther option than the nearby candidate,
// using the same area/proximity evidence the engine already produced.
function isFartherThanNearby(mustDoCandidate, nearbyCandidate) {
  const mustDoDistance = getProximityDistance(mustDoCandidate);
  const nearbyDistance = getProximityDistance(nearbyCandidate);

  if (mustDoDistance !== null && nearbyDistance !== null) {
    return mustDoDistance > nearbyDistance;
  }

  return !isCandidateNearby(mustDoCandidate);
}

function candidateSignatureFacts(candidate) {
  return {
    rideId: getCandidateId(candidate),
    sourceSlot: candidate?.sourceSlot || null,
    waitBand: getWaitBand(candidate?.wait),
    area: candidate?.area || null,
    mustDo: isMustDoCandidate(candidate),
    waitValueStatus: getWaitValueStatusKey(candidate),
  };
}

export function buildTohiPickClarificationSignature({
  confirmedActivePark,
  currentLand,
  dateString,
  nearbyCandidate,
  mustDoCandidate,
  candidates,
  browsingAnotherPark,
} = {}) {
  if (!nearbyCandidate || !mustDoCandidate) return null;

  return stableSerialize({
    questionType: CLARIFICATION_QUESTION_TYPE,
    park: String(confirmedActivePark || ""),
    land: String(currentLand || ""),
    dateString: String(dateString || ""),
    ambiguity: browsingAnotherPark === true,
    nearby: candidateSignatureFacts(nearbyCandidate),
    mustDo: candidateSignatureFacts(mustDoCandidate),
    shortlist: (Array.isArray(candidates) ? candidates : [])
      .filter(Boolean)
      .map((candidate) => candidateSignatureFacts(candidate)),
  });
}

export function evaluateTohiPickClarification({
  decision,
  candidates,
  isPlanTabActive,
  browsingAnotherPark,
  presencePromptActive,
  confirmedActivePark,
  currentLand,
  currentActivity,
  dateString,
} = {}) {
  const base = {
    eligible: false,
    questionType: null,
    signature: null,
    nearbyCandidate: null,
    mustDoCandidate: null,
    supportingSignals: [],
    blockingSignals: [],
    reasonUnavailable: null,
  };
  const notSupported = (reason) => ({
    ...base,
    status: CLARIFICATION_STATUSES.NOT_SUPPORTED,
    blockingSignals: [reason],
    reasonUnavailable: reason,
  });

  if (decision?.showPick === true) {
    return {
      ...base,
      status: CLARIFICATION_STATUSES.NOT_NEEDED,
      reasonUnavailable: "strong_pick_present",
    };
  }

  if (isPlanTabActive !== true) return notSupported("plan_inactive");
  if (!confirmedActivePark) return notSupported("park_context_invalid");
  if (browsingAnotherPark === true) return notSupported("browsing_other_park");
  if (presencePromptActive === true) return notSupported("park_presence_ambiguous");
  if (!currentLand) return notSupported("location_unknown");
  if (currentActivity?.type === "in_line") return notSupported("currently_in_line");

  // Only genuine "not strong enough" outcomes may fall back to a question.
  // Broken context (ineligible data, empty shortlist, uncertain location)
  // never earns a clarification.
  const decisionStatus = decision?.status || "";
  const clarifiableStatuses = new Set([
    "no_pick_not_strong",
    "no_pick_insufficient_evidence",
  ]);

  if (!clarifiableStatuses.has(decisionStatus)) {
    return notSupported(decisionStatus ? `decision_${decisionStatus}` : "no_decision");
  }

  const shortlist = (Array.isArray(candidates) ? candidates : []).filter(Boolean);
  const usable = shortlist.filter((candidate) => !isCandidateHardBlocked(candidate));

  if (usable.length < 2) return notSupported("shortlist_too_small");

  const nearbyCandidate =
    usable.find((candidate) => hasKnownWait(candidate) && isCandidateNearby(candidate)) ||
    null;

  if (!nearbyCandidate) return notSupported("no_nearby_candidate");

  const nearbyId = getCandidateId(nearbyCandidate);
  const mustDoCandidate =
    usable.find((candidate) => {
      if (getCandidateId(candidate) === nearbyId) return false;
      if (!isMustDoCandidate(candidate)) return false;
      if (!hasKnownWait(candidate)) return false;
      if (!SUPPORTABLE_WAIT_VALUES.has(getWaitValueStatusKey(candidate) || "")) return false;

      return isFartherThanNearby(candidate, nearbyCandidate);
    }) || null;

  if (!mustDoCandidate) return notSupported("no_supported_must_do");

  const signature = buildTohiPickClarificationSignature({
    confirmedActivePark,
    currentLand,
    dateString,
    nearbyCandidate,
    mustDoCandidate,
    candidates: shortlist,
    browsingAnotherPark,
  });

  return {
    ...base,
    eligible: true,
    status: CLARIFICATION_STATUSES.AVAILABLE,
    questionType: CLARIFICATION_QUESTION_TYPE,
    signature,
    nearbyCandidate,
    mustDoCandidate,
    supportingSignals: [
      nearbyCandidate.confidenceHints?.sameArea === true
        ? "nearby_same_area"
        : "nearby_close_distance",
      "must_do_marked",
      `must_do_${getWaitValueStatusKey(mustDoCandidate)}`,
      "waits_known",
    ],
  };
}

// Answers can only ever surface the two predetermined candidates. There is no
// path to another shortlist entry, and no path outside the shortlist.
export function resolveTohiPickClarificationAnswer(evaluation, answer) {
  if (!evaluation || evaluation.eligible !== true) return null;

  if (answer === CLARIFICATION_ANSWERS.STAY_NEARBY) {
    return {
      status: CLARIFICATION_STATUSES.NEARBY_CONFIRMED,
      answer,
      candidate: evaluation.nearbyCandidate,
      explanation: "You chose to stay nearby.",
    };
  }

  if (answer === CLARIFICATION_ANSWERS.GO_MUST_DO) {
    return {
      status: CLARIFICATION_STATUSES.MUST_DO_CONFIRMED,
      answer,
      candidate: evaluation.mustDoCandidate,
      explanation: "You chose to prioritize a must-do.",
    };
  }

  if (answer === CLARIFICATION_ANSWERS.NOT_RIGHT_NOW) {
    return {
      status: CLARIFICATION_STATUSES.DISMISSED,
      answer,
      candidate: null,
      explanation: null,
    };
  }

  return null;
}

export function storeTohiPickClarificationResult(
  cache,
  signature,
  result,
  maxEntries = CACHE_MAX_ENTRIES
) {
  if (!cache || typeof cache.set !== "function") return;
  if (!signature || !result || !TERMINAL_STATUSES.has(result.status)) return;

  if (cache.has(signature)) cache.delete(signature);
  cache.set(signature, { status: result.status, answer: result.answer || null, signature });

  const boundedMax = Math.max(1, Number(maxEntries) || CACHE_MAX_ENTRIES);

  while (cache.size > boundedMax) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedTohiPickClarificationResult(cache, signature) {
  if (!cache || typeof cache.get !== "function" || !signature) return null;

  return cache.get(signature) || null;
}

// A stored answer only ever applies to its own signature, and the clarified
// candidate is re-derived from the *current* evaluation, so a stale answer can
// never surface a candidate that is no longer in the live shortlist.
export function selectTohiPickClarificationForSignature({ evaluation, cache } = {}) {
  if (!evaluation) return { status: CLARIFICATION_STATUSES.NOT_SUPPORTED, candidate: null };

  if (evaluation.eligible !== true) {
    return { status: evaluation.status, candidate: null, evaluation };
  }

  const cached = getCachedTohiPickClarificationResult(cache, evaluation.signature);

  if (!cached) {
    return { status: CLARIFICATION_STATUSES.AVAILABLE, candidate: null, evaluation };
  }

  if (cached.status === CLARIFICATION_STATUSES.DISMISSED) {
    return { status: CLARIFICATION_STATUSES.DISMISSED, candidate: null, evaluation };
  }

  const resolved = resolveTohiPickClarificationAnswer(evaluation, cached.answer);

  if (!resolved || !resolved.candidate) {
    return { status: CLARIFICATION_STATUSES.STALE, candidate: null, evaluation };
  }

  return {
    status: resolved.status,
    candidate: resolved.candidate,
    answer: resolved.answer,
    explanation: resolved.explanation,
    evaluation,
  };
}

export const TOHI_PICK_CLARIFICATION_STATUSES = { ...CLARIFICATION_STATUSES };
export const TOHI_PICK_CLARIFICATION_ANSWERS = { ...CLARIFICATION_ANSWERS };
export const TOHI_PICK_CLARIFICATION_QUESTION_TYPE = CLARIFICATION_QUESTION_TYPE;
