/**
 * Rain confirmation for a bounded weather episode.
 *
 * TOHI's forecast can say rain is coming without knowing whether it has
 * actually started over the guest's head. When the structured weather state is
 * a forecast-only Rain Watch or Storm Watch, TOHI may ask the family once:
 *
 *   "We noticed rain may be moving in. Is it raining where you are?"
 *
 * WHAT THIS IS:
 *   A guest-confirmed *interpretation* layered on top of the forecast. The
 *   answer is remembered for the current weather episode only, and it expires
 *   on its own so TOHI cannot sit in Rain Mode after the sky clears.
 *
 * WHAT THIS IS NOT:
 *   - It does not edit the forecast. `applyRainConfirmationToWeather` returns a
 *     NEW object and preserves the provider's own reading under
 *     `forecastCurrentPrecipitation`, so raw data stays inspectable and
 *     recoverable.
 *   - It is not a new weather source, threshold or scoring rule. Confirmation
 *     only sets the field the codebase already treats as "precipitation is
 *     happening now", and every existing rain rule reacts on its own.
 *   - It is not a report to anywhere. Nothing here performs network I/O. The
 *     record below stays in this browser session.
 *   - It is not a learning system. One family's answer never moves a threshold.
 */

export const RAIN_CONFIRMATION_STORAGE_KEY = "tohi.rainConfirmation.v2";

/**
 * Two separate lifetimes, because they answer two different questions.
 *
 * EFFECT lifetime — how long a "yes" keeps steering recommendations. Rain does
 * not last forever, so this expires on its own and TOHI stops favouring indoor
 * moves.
 *
 * ANSWER MEMORY — how long TOHI stays quiet about an episode it has already
 * asked about. "Yes" and "Dismiss" end the question for that episode entirely;
 * only "Not yet" comes back, and only after a cooldown.
 *
 * Collapsing these into one number is what made a dismissal reappear after 30
 * minutes and a confirmation re-ask after 90.
 */

/** Guest-confirmed rain stops steering recommendations after this long. */
export const RAIN_CONFIRMATION_TTL_MINUTES = 90;

/** After "Not yet", leave the family alone for this long. */
export const RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES = 30;

/**
 * Absolute backstop on the record itself. An episode normally ends long before
 * this — the window passes, the park changes, the sky clears — but nothing
 * should be able to keep a stored answer alive indefinitely.
 */
export const RAIN_CONFIRMATION_RECORD_MAX_AGE_MINUTES = 6 * 60;

export const RAIN_CONFIRMATION_RESPONSES = {
  CONFIRMED: "confirmed",
  NOT_YET: "not_yet",
  DISMISSED: "dismissed",
};

const VALID_RESPONSES = Object.values(RAIN_CONFIRMATION_RESPONSES);
const MINUTE_MS = 60 * 1000;

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toTimestamp(value) {
  // Number(null) is 0 and Number("") is 0, both finite. Left unguarded, a null
  // "never ask again" sentinel would read back as an epoch-zero deadline that
  // every comparison is already past.
  if (value == null || value === "") return null;

  const time = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(time) ? time : null;
}

/**
 * The forecast hour a precipitation window points at, rounded to the hour so a
 * routine weather refresh that nudges the window by a few minutes is still the
 * same episode.
 */
function getWindowHourKey(window) {
  const time = window && typeof window === "object" ? window.time : null;
  const parsed = time ? Date.parse(time) : NaN;

  if (!Number.isFinite(parsed)) return "unscheduled";

  return new Date(Math.floor(parsed / (60 * MINUTE_MS)) * 60 * MINUTE_MS).toISOString();
}

/**
 * Identifies the weather episode a prompt belongs to.
 *
 * Returns null unless the structured weather state is a forecast-only watch —
 * clear weather, already-active rain and already-active storms all yield null,
 * so those can never produce a prompt.
 *
 * `weatherState` is the caller's existing `getRecommendationWeatherState`
 * result. This module deliberately does not re-derive weather.
 */
export function getRainConfirmationEpisode({
  weatherState,
  weather,
  parkId,
  tripDate,
} = {}) {
  if (!weatherState) return null;

  const safeParkId = cleanString(parkId);
  if (!safeParkId) return null;

  const isStormWatch = weatherState.forecastStormWatch === true;
  const isRainWatch = weatherState.forecastRainWatch === true;

  if (!isStormWatch && !isRainWatch) return null;

  const watchKind = isStormWatch ? "storm" : "rain";
  const safeTripDate = cleanString(tripDate) || "undated";
  const windowKey = getWindowHourKey(weather?.nextPrecipitationWindow);

  return {
    episodeId: `${safeParkId}|${safeTripDate}|${watchKind}|${windowKey}`,
    parkId: safeParkId,
    tripDate: safeTripDate,
    watchKind,
  };
}

/**
 * Bounded record of one answer. Deliberately contains no coordinates, no
 * profile fields, no names and no free text — only the episode it belongs to,
 * which of three fixed answers was given, and when.
 */
export function buildRainConfirmationRecord({ episode, response, now }) {
  if (!episode || !VALID_RESPONSES.includes(response)) return null;

  const respondedAt = toTimestamp(now);
  if (respondedAt == null) return null;

  const isConfirmed = response === RAIN_CONFIRMATION_RESPONSES.CONFIRMED;
  const isNotYet = response === RAIN_CONFIRMATION_RESPONSES.NOT_YET;

  return {
    version: 2,
    episodeId: episode.episodeId,
    parkId: episode.parkId,
    tripDate: episode.tripDate,
    watchKind: episode.watchKind,
    response,
    respondedAt,

    // Only a "yes" ever steers recommendations, and only for a while.
    effectExpiresAt: isConfirmed
      ? respondedAt + RAIN_CONFIRMATION_TTL_MINUTES * MINUTE_MS
      : null,

    // null means "do not ask again for this episode at all".
    promptCooldownUntil: isNotYet
      ? respondedAt + RAIN_CONFIRMATION_NOT_YET_COOLDOWN_MINUTES * MINUTE_MS
      : null,

    recordExpiresAt:
      respondedAt + RAIN_CONFIRMATION_RECORD_MAX_AGE_MINUTES * MINUTE_MS,
  };
}

/** Drops anything unrecognised, so a corrupted or hand-edited value is inert. */
export function normalizeRainConfirmationRecord(record) {
  if (!record || typeof record !== "object") return null;
  if (record.version !== 2) return null;
  if (!VALID_RESPONSES.includes(record.response)) return null;

  const episodeId = cleanString(record.episodeId);
  const respondedAt = toTimestamp(record.respondedAt);
  const recordExpiresAt = toTimestamp(record.recordExpiresAt);

  if (!episodeId || respondedAt == null || recordExpiresAt == null) return null;

  // Both may legitimately be absent: a dismissal has no effect window, and a
  // confirmation or dismissal has no cooldown because it never asks again.
  const effectExpiresAt = toTimestamp(record.effectExpiresAt);
  const promptCooldownUntil = toTimestamp(record.promptCooldownUntil);

  return {
    version: 2,
    episodeId,
    parkId: cleanString(record.parkId),
    tripDate: cleanString(record.tripDate),
    watchKind: record.watchKind === "storm" ? "storm" : "rain",
    response: record.response,
    respondedAt,
    effectExpiresAt,
    promptCooldownUntil,
    recordExpiresAt,
  };
}

function isRecordForEpisode(record, episode) {
  return Boolean(record && episode && record.episodeId === episode.episodeId);
}

/** Past the absolute backstop on the stored record itself. */
function isRecordExpired(record, now) {
  const time = toTimestamp(now);
  if (time == null || !record) return true;

  return time >= record.recordExpiresAt;
}

/**
 * Whether the app is in a state where the question is appropriate at all.
 *
 * `tripPlan` is never null in practice — normalizeTripPlan always returns a
 * shaped object — so its presence proves nothing about whether the family has a
 * plan. `lastGeneratedAt` is the signal the plan surfaces already treat as "a
 * real plan exists": until it is set, getTripPlanFreshnessStatus reports
 * needs_refresh precisely because the plan has never been locked to a day
 * context.
 */
export function canAskRainConfirmation({
  activeScreen = "",
  isProfileIncomplete = false,
  activePark = "",
  weather = null,
  tripPlan = null,
} = {}) {
  if (activeScreen === "family_profile") return false;
  if (isProfileIncomplete) return false;
  if (!cleanString(activePark)) return false;
  if (!weather) return false;

  return Boolean(tripPlan?.lastGeneratedAt);
}

/**
 * Whether to show the prompt.
 *
 * `canAsk` carries the caller's own eligibility (a real active park, a plan in
 * progress, onboarding finished). This function never asks without it.
 */
export function shouldAskRainConfirmation({
  episode,
  record,
  now,
  canAsk = true,
} = {}) {
  if (!canAsk || !episode) return false;

  const safeRecord = normalizeRainConfirmationRecord(record);

  // A different episode — a new day, another park, a materially different
  // window — is allowed to ask again.
  if (!isRecordForEpisode(safeRecord, episode)) return true;

  // The stored answer has outlived its backstop and no longer speaks for
  // anything.
  if (isRecordExpired(safeRecord, now)) return true;

  // Answered for this episode. A null cooldown means "yes" or "dismiss": the
  // question is settled for this episode no matter how long it runs, and in
  // particular regardless of whether a confirmation is still steering
  // recommendations.
  if (safeRecord.promptCooldownUntil == null) return false;

  const time = toTimestamp(now);
  if (time == null) return false;

  return time >= safeRecord.promptCooldownUntil;
}

/**
 * The confirmation that should currently colour recommendations, or null.
 *
 * Only a live "confirmed" answer for the episode in front of the guest counts,
 * so an expired answer, a dismissal, a "not yet", another park or another day
 * all resolve to null without needing a separate cleanup pass.
 */
export function getActiveRainConfirmation({ episode, record, now } = {}) {
  const safeRecord = normalizeRainConfirmationRecord(record);

  if (!safeRecord) return null;
  if (safeRecord.response !== RAIN_CONFIRMATION_RESPONSES.CONFIRMED) return null;
  if (!isRecordForEpisode(safeRecord, episode)) return null;
  if (isRecordExpired(safeRecord, now)) return null;

  // The effect window is what expires here — not the answer itself. Once this
  // passes TOHI stops favouring indoor moves, while still remembering that this
  // episode was already asked about.
  const time = toTimestamp(now);
  if (time == null) return null;
  if (safeRecord.effectExpiresAt == null) return null;
  if (time >= safeRecord.effectExpiresAt) return null;

  return safeRecord;
}

/**
 * Whether a stored record has become obsolete and should be forgotten.
 *
 * Deliberately NOT time-based for the two answers that settle an episode. This
 * runs on every tick, so treating the effect window as obsolescence deleted a
 * dismissal after 30 minutes and a confirmation after 90 — and a deleted record
 * is an unanswered one, so the prompt came back inside the same episode.
 *
 * What genuinely makes a record obsolete is the episode it describes ending: a
 * different park, a different trip date, a materially different window, weather
 * that is no longer a watch at all, or the provider reporting precipitation
 * itself. Plus the absolute backstop, so nothing lives forever.
 */
export function isRainConfirmationObsolete({
  record,
  episode,
  weatherState,
  now,
} = {}) {
  const safeRecord = normalizeRainConfirmationRecord(record);
  if (!safeRecord) return false;

  if (isRecordExpired(safeRecord, now)) return true;

  // The provider now reports precipitation itself. Its reading takes over, and
  // any earlier "not yet" must not survive to argue with it.
  if (weatherState?.activeRain === true || weatherState?.activeStorm === true) {
    return true;
  }

  // No live watch, or a watch belonging to a different park, date or window.
  return !isRecordForEpisode(safeRecord, episode);
}

/**
 * Layers a guest confirmation over the forecast WITHOUT editing it.
 *
 * Returns a new object. `currentPrecipitation` — the field this codebase
 * already treats as "precipitation is happening now" — becomes true, and the
 * provider's own value is preserved under `forecastCurrentPrecipitation`.
 * `summary`, `rainRisk` and `nextPrecipitationWindow` are passed through
 * untouched, so the forecast can still be displayed and reasoned about as
 * forecast. `guestConfirmedRain` marks the provenance for anything that needs
 * to tell the two apart.
 */
export function applyRainConfirmationToWeather(weather, confirmation) {
  if (!weather || !confirmation) return weather;

  return {
    ...weather,
    currentPrecipitation: true,
    guestConfirmedRain: true,
    guestConfirmedRainAt: confirmation.respondedAt,
    guestConfirmedRainExpiresAt: confirmation.effectExpiresAt,
    forecastCurrentPrecipitation: weather.currentPrecipitation ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Session persistence                                                        */
/* -------------------------------------------------------------------------- */

/*
 * sessionStorage, not localStorage: the answer describes conditions outside
 * right now, so it should not outlive the browsing session even if the expiry
 * maths were ever wrong. Every accessor is guarded — storage can throw in
 * private modes — and a failure degrades to "no record", never to an error.
 */

export function readStoredRainConfirmation() {
  try {
    const raw = sessionStorage.getItem(RAIN_CONFIRMATION_STORAGE_KEY);
    return raw ? normalizeRainConfirmationRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeStoredRainConfirmation(record) {
  const safeRecord = normalizeRainConfirmationRecord(record);

  try {
    if (!safeRecord) {
      sessionStorage.removeItem(RAIN_CONFIRMATION_STORAGE_KEY);
      return null;
    }

    sessionStorage.setItem(RAIN_CONFIRMATION_STORAGE_KEY, JSON.stringify(safeRecord));
    return safeRecord;
  } catch {
    return safeRecord;
  }
}

export function clearStoredRainConfirmation() {
  try {
    sessionStorage.removeItem(RAIN_CONFIRMATION_STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
