const PROMPT_TYPES = {
  MANUAL_HOP: "manual_hop",
  DETECTED_ARRIVAL: "detected_arrival",
};

function cleanParkId(parkId) {
  if (typeof parkId !== "string") return "";
  return parkId.trim();
}

function promptKey(type, parkId) {
  return `${type}:${parkId}`;
}

export function getTodaysPlannedParks({ scheduledParkForToday, planningPark } = {}) {
  const primary = cleanParkId(scheduledParkForToday?.parkId) || cleanParkId(planningPark);
  const secondary = cleanParkId(scheduledParkForToday?.secondaryParkId);

  const planned = [];
  if (primary) planned.push(primary);
  if (secondary && secondary !== primary) planned.push(secondary);

  return planned;
}

export function createInitialParkPresence({
  scheduledParkForToday,
  planningPark,
  dateString,
} = {}) {
  const plannedParkIds = getTodaysPlannedParks({ scheduledParkForToday, planningPark });
  const confirmedActivePark = plannedParkIds[0] || cleanParkId(planningPark) || "";

  return {
    dateString: String(dateString || ""),
    plannedParkIds,
    confirmedActivePark,
    browsedPark: confirmedActivePark,
    detectedPark: null,
    prompt: null,
    dismissedPrompts: [],
  };
}

export function canConfirmParkPresence(presence, parkId) {
  const safeParkId = cleanParkId(parkId);

  if (!presence || !safeParkId) return false;

  return (presence.plannedParkIds || []).includes(safeParkId);
}

export function shouldPromptForManualParkChange(presence, parkId) {
  const safeParkId = cleanParkId(parkId);

  if (!presence || !safeParkId) return false;
  if (safeParkId === presence.confirmedActivePark) return false;
  if (!canConfirmParkPresence(presence, safeParkId)) return false;

  return !(presence.dismissedPrompts || []).includes(
    promptKey(PROMPT_TYPES.MANUAL_HOP, safeParkId)
  );
}

// Detection is evidence only: it may create a prompt, never a transition.
// Only a trusted high-confidence park-level signal for a park that is already
// planned today is allowed to prompt, and only once per day per park.
export function shouldPromptForDetectedPark(presence, detectedParkEvidence = {}) {
  const safeParkId = cleanParkId(detectedParkEvidence.parkId);

  if (!presence || !safeParkId) return false;
  if (detectedParkEvidence.confidence !== "high") return false;
  if (safeParkId === presence.confirmedActivePark) return false;
  if (!canConfirmParkPresence(presence, safeParkId)) return false;

  return !(presence.dismissedPrompts || []).includes(
    promptKey(PROMPT_TYPES.DETECTED_ARRIVAL, safeParkId)
  );
}

export function selectBrowsedPark(presence, parkId) {
  const safeParkId = cleanParkId(parkId);

  if (!presence || !safeParkId) return presence;
  if (presence.browsedPark === safeParkId) return presence;

  // Selecting a park again after browsing elsewhere is a new browsing action,
  // so an earlier "Just checking" no longer suppresses the manual prompt.
  const manualKey = promptKey(PROMPT_TYPES.MANUAL_HOP, safeParkId);
  const dismissedPrompts = (presence.dismissedPrompts || []).filter(
    (key) => key !== manualKey
  );
  const nextPresence = { ...presence, browsedPark: safeParkId, dismissedPrompts };

  return {
    ...nextPresence,
    prompt: shouldPromptForManualParkChange(nextPresence, safeParkId)
      ? { type: PROMPT_TYPES.MANUAL_HOP, parkId: safeParkId }
      : null,
  };
}

export function registerDetectedPark(presence, detectedParkEvidence = {}) {
  if (!presence) return presence;

  if (!shouldPromptForDetectedPark(presence, detectedParkEvidence)) {
    return presence;
  }

  const safeParkId = cleanParkId(detectedParkEvidence.parkId);

  return {
    ...presence,
    detectedPark: safeParkId,
    prompt: { type: PROMPT_TYPES.DETECTED_ARRIVAL, parkId: safeParkId },
  };
}

export function confirmActivePark(presence, parkId) {
  const safeParkId = cleanParkId(parkId);

  if (!presence) return presence;
  if (!canConfirmParkPresence(presence, safeParkId)) return presence;

  return {
    ...presence,
    confirmedActivePark: safeParkId,
    browsedPark: safeParkId,
    detectedPark: null,
    prompt: null,
  };
}

export function dismissParkPresencePrompt(presence) {
  if (!presence || !presence.prompt) return presence;

  const key = promptKey(presence.prompt.type, presence.prompt.parkId);
  const dismissedPrompts = (presence.dismissedPrompts || []).includes(key)
    ? presence.dismissedPrompts
    : [...(presence.dismissedPrompts || []), key];

  return {
    ...presence,
    detectedPark: null,
    prompt: null,
    dismissedPrompts,
  };
}

export function deriveRecommendationPark(presence, fallbackParkId = "") {
  return presence?.confirmedActivePark || cleanParkId(fallbackParkId);
}

export function deriveBrowsedPark(presence, fallbackParkId = "") {
  return presence?.browsedPark || cleanParkId(fallbackParkId);
}

export function isBrowsingAnotherPark(presence, browsedParkId) {
  if (!presence?.confirmedActivePark) return false;

  const safeParkId = cleanParkId(browsedParkId) || presence.browsedPark;

  return Boolean(safeParkId) && safeParkId !== presence.confirmedActivePark;
}

// Persistence is only trusted for the same trip day with the same planned
// park set; anything else falls back to a fresh initial presence so a prior
// day's confirmed park can never leak into today.
export function restoreParkPresence(stored, { scheduledParkForToday, planningPark, dateString } = {}) {
  const fresh = createInitialParkPresence({ scheduledParkForToday, planningPark, dateString });

  if (!stored || typeof stored !== "object") return fresh;
  if (String(stored.dateString || "") !== fresh.dateString) return fresh;

  const storedPlanned = Array.isArray(stored.plannedParkIds) ? stored.plannedParkIds : [];
  const samePlan =
    storedPlanned.length === fresh.plannedParkIds.length &&
    storedPlanned.every((parkId, index) => parkId === fresh.plannedParkIds[index]);

  if (!samePlan) return fresh;
  if (!fresh.plannedParkIds.includes(cleanParkId(stored.confirmedActivePark))) return fresh;

  // A restore re-anchors browsing to the confirmed park: browsing is a live,
  // in-session action, so a reload must never resume a browsing state or a
  // pending prompt from before the reload.
  return {
    ...fresh,
    confirmedActivePark: cleanParkId(stored.confirmedActivePark),
    browsedPark: cleanParkId(stored.confirmedActivePark),
    dismissedPrompts: Array.isArray(stored.dismissedPrompts)
      ? stored.dismissedPrompts.filter((key) => typeof key === "string")
      : [],
  };
}

export const PARK_PRESENCE_PROMPT_TYPES = { ...PROMPT_TYPES };
