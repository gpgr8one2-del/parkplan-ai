const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const MAX_ANALYTICS_KEEPALIVE_BYTES = 60000;

const activeRequests = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

function buildRequestKey(path, options = {}) {
  const method = options.method || "GET";
  let body = "";

  try {
    body = options.body ? stableStringify(JSON.parse(options.body)) : "";
  } catch {
    body = options.body || "";
  }

  return `${method}:${path}:${body}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiFetch(path, options = {}, config = {}) {
  const { retries = 2, timeoutMs = 8000, dedupe = true } = config;
  const key = buildRequestKey(path, options);

  if (dedupe && activeRequests.has(key)) return activeRequests.get(key);

  const requestPromise = (async () => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchWithTimeout(
          `${BASE_URL}${path}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
            ...options,
          },
          timeoutMs
        );

        if (!res.ok) {
          const body = await res.text();
          const error = new Error(`API ${path} -> ${res.status}: ${body}`);
          error.status = res.status;

          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw error;
          }

          throw error;
        }

        return await res.json();
      } catch (err) {
        lastError = err;

        if (attempt === retries) throw lastError;

        await sleep(300 * Math.pow(2, attempt));

        if (err.name === "AbortError" || err.status === 429) {
          await sleep(250);
        }
      }
    }

    throw lastError;
  })();

  if (dedupe) {
    activeRequests.set(key, requestPromise);
    requestPromise.finally(() => activeRequests.delete(key));
  }

  return requestPromise;
}

function getOrCreateAnonymousUserId() {
  const storageKey = "parkplan.anonymousUserId";

  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(storageKey, id);
    return id;
  } catch {
    return "anonymous_unavailable";
  }
}

function getOrCreateSessionId() {
  const storageKey = "parkplan.sessionId";

  try {
    const existingRaw = sessionStorage.getItem(storageKey);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;
    const now = Date.now();

    // Refresh session after 4 hours of inactivity / browser session weirdness.
    if (existing?.id && existing?.createdAt && now - existing.createdAt < 4 * 60 * 60 * 1000) {
      return existing.id;
    }

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${now}_${Math.random().toString(16).slice(2)}`;

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        id,
        createdAt: now,
      })
    );

    return id;
  } catch {
    return "session_unavailable";
  }
}

function sanitizeTimeContext(timeContext = {}) {
  if (!timeContext) return null;

  return removeEmptyFields({
    orlandoDate: timeContext.orlandoDate,
    orlandoTimeLabel: timeContext.orlandoTimeLabel,
    dayPhase: timeContext.dayPhase,
    planningMode: timeContext.planningMode,
    tripStatus: timeContext.tripStatus?.status,
  });
}

function getCoreProfileContext(familyProfile = {}) {
  if (!familyProfile) return null;

  return removeEmptyFields({
    adultCount: familyProfile.adultCount ?? null,
    childCount: familyProfile.childCount ?? null,
    partySize: familyProfile.partySize ?? null,
    shortestHeightInches: familyProfile.shortestHeightInches ?? null,
    hasSmallChildren: Boolean(familyProfile.hasSmallChildren),
    hasHeightLimitedRiders: Boolean(familyProfile.hasHeightLimitedRiders),
    tripStatus: familyProfile.tripAccessStatus?.status,
    resortArea:
      familyProfile.resortProfile?.areaLabel ||
      familyProfile.resortProfile?.area ||
      familyProfile.resortProfile?.resortArea ||
      familyProfile.resortProfile?.category ||
      null,
  });
}

function getFullProfileSnapshot(familyProfile = {}) {
  if (!familyProfile) return null;

  return removeEmptyFields({
    ...getCoreProfileContext(familyProfile),

    // Keep setup-level categories for profile completion analysis, but never
    // include child arrays, names, raw location, chat text, or full resort data.
    thrillTolerance: familyProfile.thrillTolerance,
    walkingTolerance: familyProfile.walkingTolerance,
    heatSensitivity: familyProfile.heatSensitivity,
    waterRidePreference: familyProfile.waterRidePreference,
    pace: familyProfile.pace,
    priorities: Array.isArray(familyProfile.priorities)
      ? familyProfile.priorities.slice(0, 12)
      : [],

    selectedParks: Array.isArray(familyProfile.tripContext?.selectedParks)
      ? familyProfile.tripContext.selectedParks.slice(0, 8)
      : [],
    firstPark: familyProfile.tripContext?.firstPark,
    priorityPark: familyProfile.tripContext?.priorityPark,
    parkHopper: familyProfile.tripContext?.parkHopper,

    planningMode: familyProfile.planningPreferences?.planningMode,
    ropeDropStyle: familyProfile.planningPreferences?.ropeDropStyle,
    middayBreakStyle: familyProfile.planningPreferences?.middayBreakStyle,

    stayingOnProperty: familyProfile.resortContext?.stayingOnProperty,
    resortId: familyProfile.resortContext?.resortId,
    transportationMode: familyProfile.resortContext?.transportationMode,
  });
}

function sanitizeRecommendation(recommendation = {}, slot = "") {
  if (!recommendation) return null;

  return removeEmptyFields({
    slot,
    rideId: recommendation.id,
    rideName: recommendation.name,
    waitTime: recommendation.waitTime ?? null,
    land: recommendation.land,
    waitValueStatus: recommendation.waitValueStatus?.status,
    recommendationScore: recommendation.recommendationScore,
    familyProfileModifier: recommendation.familyProfileModifier,
    planAheadRealityCheckModifier: recommendation.planAheadRealityCheckModifier,
    crossParkRealityModifier: recommendation.crossParkRealityModifier,
    crossParkSumCapAdjustment: recommendation.crossParkSumCapAdjustment,
    proximityDistance: recommendation.proximityDistance,
    heightWarning: Boolean(recommendation.heightWarning),
  });
}

function sanitizeLocationContext(locationContext = {}) {
  if (!locationContext) return null;

  return removeEmptyFields({
    source: locationContext.source || locationContext.type,
    landKey: locationContext.landKey || locationContext.land,
    landLabel: locationContext.landLabel,
    nearestAnchorName: locationContext.nearestAnchorName,
    nearestAnchorType: locationContext.nearestAnchorType,
    confidence: locationContext.confidence,
    distanceMeters: locationContext.distanceMeters,
  });
}

function truncateString(value, maxLength = 500) {
  if (typeof value !== "string") return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function normalizeOptionalString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}


function sanitizeMustDoExperience(experience = {}) {
  if (!experience || typeof experience !== "object") return undefined;

  const cleaned = removeEmptyFields({
    id: normalizeOptionalString(experience.id),
    name: truncateString(experience.name, 160),
    parkId: normalizeOptionalString(experience.parkId),
    type: normalizeOptionalString(experience.type),
    priority: normalizeOptionalString(experience.priority),
    land: normalizeOptionalString(experience.land),
    source: normalizeOptionalString(experience.source),
  });

  return cleaned.id && cleaned.name && cleaned.parkId ? cleaned : undefined;
}

function sanitizeTripPlanContext(tripPlan = {}) {
  if (!tripPlan || typeof tripPlan !== "object" || Array.isArray(tripPlan)) {
    return undefined;
  }

  const preferences =
    tripPlan.preferences && typeof tripPlan.preferences === "object"
      ? removeEmptyFields({
          startStrategy: normalizeOptionalString(tripPlan.preferences.startStrategy),
          breakPreference: normalizeOptionalString(tripPlan.preferences.breakPreference),
          diningStyle: normalizeOptionalString(tripPlan.preferences.diningStyle),
          showsImportance: normalizeOptionalString(tripPlan.preferences.showsImportance),
          nighttimeImportance: normalizeOptionalString(tripPlan.preferences.nighttimeImportance),
          paidQueueStrategy: normalizeOptionalString(tripPlan.preferences.paidQueueStrategy),
        })
      : {};

  const mustDoExperiences = Array.isArray(tripPlan.mustDoExperiences)
    ? tripPlan.mustDoExperiences
        .slice(0, 30)
        .map(sanitizeMustDoExperience)
        .filter(Boolean)
    : [];

  return removeEmptyFields({
    version: typeof tripPlan.version === "number" ? tripPlan.version : undefined,
    system: normalizeOptionalString(tripPlan.system),
    preferences,
    mustDoExperiences,
    updatedAt: normalizeOptionalString(tripPlan.updatedAt),
  });
}

function sanitizeDayGamePlanItem(item = {}) {
  if (!item || typeof item !== "object") return undefined;

  const cleaned = removeEmptyFields({
    id: normalizeOptionalString(item.id),
    order: typeof item.order === "number" ? item.order : undefined,
    eyebrow: truncateString(item.eyebrow, 80),
    title: truncateString(item.title, 180),
    body: truncateString(item.body, 700),
    detail: truncateString(item.detail, 500),
    priority: normalizeOptionalString(item.priority),
    priorityLabel: truncateString(item.priorityLabel, 80),
    generatedFrom:
      item.generatedFrom && typeof item.generatedFrom === "object"
        ? removeEmptyFields({
            startStrategy: normalizeOptionalString(item.generatedFrom.startStrategy),
            breakPreference: normalizeOptionalString(item.generatedFrom.breakPreference),
            diningStyle: normalizeOptionalString(item.generatedFrom.diningStyle),
            showsImportance: normalizeOptionalString(item.generatedFrom.showsImportance),
            nighttimeImportance: normalizeOptionalString(item.generatedFrom.nighttimeImportance),
            paidQueueStrategy: normalizeOptionalString(item.generatedFrom.paidQueueStrategy),
          })
        : undefined,
  });

  return cleaned.id || cleaned.title ? cleaned : undefined;
}

function sanitizeDayGamePlan(dayGamePlan = []) {
  if (!Array.isArray(dayGamePlan)) return [];

  return dayGamePlan.slice(0, 10).map(sanitizeDayGamePlanItem).filter(Boolean);
}

const MAX_CHAT_ACTIVITY_LOG_ENTRIES = 12;

function isSameLocalCalendarDay(value, referenceDate = new Date()) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
}

function cleanChatActivityText(value) {
  if (typeof value !== "string") return undefined;

  const cleaned = value.trim();
  return cleaned || undefined;
}

function formatChatActivityTime(value) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return undefined;
  }
}

function sanitizeChatActivityLog(activityLog = []) {
  if (!Array.isArray(activityLog)) return [];

  return activityLog
    .filter((entry) => entry?.type === "completed_ride")
    .filter((entry) => isSameLocalCalendarDay(entry?.completedAt))
    .slice(-MAX_CHAT_ACTIVITY_LOG_ENTRIES)
    .map((entry) => {
      const postedWaitAtStart = Number(entry?.postedWaitAtStart);
      const cleaned = {
        type: "completed_ride",
        rideId: entry?.rideId != null ? String(entry.rideId) : undefined,
        rideName: cleanChatActivityText(entry?.rideName),
        land: cleanChatActivityText(entry?.land),
        startedAt: cleanChatActivityText(entry?.startedAt),
        completedAt: cleanChatActivityText(entry?.completedAt),
        completedAtDisplay: formatChatActivityTime(entry?.completedAt),
      };

      if (Number.isFinite(postedWaitAtStart)) {
        cleaned.postedWaitAtStart = postedWaitAtStart;
      }

      return cleaned;
    })
    .filter((entry) => entry.rideName && entry.completedAt);
}

// Input honesty phase: mobility notes are no longer collected, and any value a
// guest saved before this phase must stop leaving the device. Nothing on the
// backend ever read the field, so removing it from the outbound payload changes
// no TOHI behavior.
//
// Deliberately narrow: this removes exactly one field. It is NOT a chat-payload
// privacy rewrite — child arrays, names, location and every other payload field
// are out of scope for this phase and are passed through unchanged.
//
// The stored object is never mutated. A guest sending a message must not have
// their saved profile edited as a side effect, so this copies rather than
// deletes in place.
function sanitizeChatFamilyProfile(familyProfile) {
  if (!familyProfile || typeof familyProfile !== "object" || Array.isArray(familyProfile)) {
    return familyProfile;
  }

  const mobility = familyProfile.mobilityAccessibility;

  if (!mobility || typeof mobility !== "object" || Array.isArray(mobility)) {
    return familyProfile;
  }

  if (!("mobilityNotes" in mobility)) {
    return familyProfile;
  }

  const safeMobility = { ...mobility };
  delete safeMobility.mobilityNotes;

  return {
    ...familyProfile,
    mobilityAccessibility: safeMobility,
  };
}

// Exported only so a harness can exercise this behavior directly. The production
// call path is unchanged: sendChatMessage still calls it internally.
export function sanitizeChatSessionData(sessionData = {}) {
  if (!sessionData || typeof sessionData !== "object" || Array.isArray(sessionData)) {
    return {};
  }

  const safeTripPlan = sanitizeTripPlanContext(sessionData.tripPlan);
  const safeMustDoExperiences = Array.isArray(sessionData.mustDoExperiences)
    ? sessionData.mustDoExperiences
        .slice(0, 30)
        .map(sanitizeMustDoExperience)
        .filter(Boolean)
    : safeTripPlan?.mustDoExperiences || [];
  const safeDayGamePlan = sanitizeDayGamePlan(sessionData.dayGamePlan);

  return removeEmptyFields({
    ...sessionData,
    activityLog: sanitizeChatActivityLog(sessionData.activityLog),

    // These are optional strings in the backend route. The app legitimately
    // starts with no selected land, but sending null fails Zod validation.
    activePark: normalizeOptionalString(sessionData.activePark),
    currentLand: normalizeOptionalString(sessionData.currentLand),

    // Commit 32: keep the AI handoff structured and bounded. The deterministic
    // Day Game Plan remains the source of truth; TOHI chat explains/adapts it.
    tripPlan: safeTripPlan,
    mustDoExperiences: safeMustDoExperiences,
    dayGamePlan: safeDayGamePlan,

    // Input honesty phase. Absent/null/malformed profiles pass straight through,
    // so this cannot change what an incomplete-setup guest sends.
    familyProfile: sanitizeChatFamilyProfile(sessionData.familyProfile),
  });
}

function sanitizeMetadata(value) {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    return value.slice(0, 30).map(sanitizeMetadata).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const cleaned = {};

    Object.entries(value).forEach(([key, item]) => {
      // Never allow obvious sensitive/raw fields into analytics metadata.
      //
      // The voice keys are defensive. Phase A2 deliberately sends no transcript
      // anywhere near analytics, but a spoken question is the same private text
      // a typed one is, so the drop list refuses it by name too — a later caller
      // cannot leak one by accident.
      if (
        [
          "message",
          "chat",
          "conversation",
          "conversationHistory",
          "email",
          "name",
          "childName",
          "lat",
          "lng",
          "latitude",
          "longitude",
          "rawPosition",
          "coords",
          "transcript",
          "transcription",
          "spokenText",
          "audio",
          "audioBlob",
          "recording",
          // A3 spoken replies. Defensive, exactly like the voice-input keys
          // above: this phase sends no reply text near analytics, but a spoken
          // answer is the same private content a typed one is, so the drop list
          // refuses it by name too.
          "speech",
          "speechText",
          "spokenReply",
          "ttsText",
          "audioUrl",
          "objectUrl",
        ].includes(key)
      ) {
        return;
      }

      const cleanedValue = sanitizeMetadata(item);

      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    });

    return Object.keys(cleaned).length ? cleaned : undefined;
  }

  if (typeof value === "string") return truncateString(value, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;

  return undefined;
}

function removeEmptyFields(object = {}) {
  const cleaned = {};

  Object.entries(object).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      cleaned[key] = value;
      return;
    }

    if (Array.isArray(value)) {
      cleaned[key] = value;
      return;
    }

    if (typeof value === "object") {
      const nested = removeEmptyFields(value);

      if (Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }

      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

function shouldIncludeFullProfileSnapshot(eventType) {
  return (
    eventType === "profile_completed" ||
    eventType === "profile_completion_blocked" ||
    eventType === "profile_updated" ||
    eventType === "app_opened"
  );
}

function shouldIncludeCoreProfileContext(eventType) {
  return (
    eventType.startsWith("recommendation_") ||
    eventType === "ride_issue_reported" ||
    eventType === "ai_chat_sent" ||
    eventType === "location_detected" ||
    eventType === "location_failed" ||
    eventType.startsWith("mini_game_")
  );
}

function shouldIncludeTimeContext(eventType) {
  return (
    eventType === "profile_completed" ||
    eventType === "profile_completion_blocked" ||
    eventType.startsWith("recommendation_") ||
    eventType === "ride_issue_reported" ||
    eventType === "ai_chat_sent" ||
    eventType === "location_detected" ||
    eventType === "location_failed"
  );
}

function shouldIncludeRecommendation(eventType, payload = {}) {
  return Boolean(
    payload.recommendation &&
      (eventType.startsWith("recommendation_") || eventType === "ride_issue_reported")
  );
}

function shouldIncludeLocationContext(eventType, payload = {}) {
  return Boolean(
    payload.locationContext &&
      (eventType === "location_detected" ||
        eventType === "location_failed" ||
        eventType === "manual_location_selected" ||
        eventType.startsWith("recommendation_") ||
        eventType === "ride_issue_reported")
  );
}

function buildAnalyticsEvent(eventType, payload = {}) {
  const baseEvent = {
    eventType,
    sessionId: getOrCreateSessionId(),
    anonymousUserId: getOrCreateAnonymousUserId(),
    timestamp: new Date().toISOString(),

    activePark: normalizeOptionalString(payload.activePark),
    currentLand: normalizeOptionalString(payload.currentLand),
    source: normalizeOptionalString(payload.source),
    screen: normalizeOptionalString(payload.screen),

    profileComplete: payload.profileComplete,
    devPreviewFullApp: payload.devPreviewFullApp,
    action: sanitizeMetadata(payload.action),
    metadata: sanitizeMetadata(payload.metadata),
  };

  if (shouldIncludeTimeContext(eventType)) {
    baseEvent.timeContext = sanitizeTimeContext(payload.timeContext);
  }

  if (shouldIncludeFullProfileSnapshot(eventType)) {
    baseEvent.familyProfileSnapshot = getFullProfileSnapshot(payload.familyProfile);
    baseEvent.coreProfileContext = getCoreProfileContext(payload.familyProfile);
  } else if (shouldIncludeCoreProfileContext(eventType)) {
    baseEvent.coreProfileContext = getCoreProfileContext(payload.familyProfile);
  }

  if (shouldIncludeRecommendation(eventType, payload)) {
    baseEvent.recommendation = sanitizeRecommendation(
      payload.recommendation,
      payload.recommendationSlot
    );
  }

  if (shouldIncludeLocationContext(eventType, payload)) {
    baseEvent.locationContext = sanitizeLocationContext(payload.locationContext);
  }

  return removeEmptyFields(baseEvent);
}

/**
 * Anonymous product analytics.
 *
 * Privacy guardrails:
 * - Do not send names, emails, raw GPS coordinates, child names, or full AI chat text.
 * - Use behavior signals only: actions, profile categories, recommendation decisions.
 * - Only include family/time/location context on events where that context is actually useful.
 * - This is fire-and-forget so analytics never breaks the guest experience.
 */
export function trackEvent(eventType, payload = {}) {
  const event = buildAnalyticsEvent(eventType, payload);

  let body = JSON.stringify(event);

  // Browser keepalive requests have practical payload limits. If a future event
  // accidentally grows too large, strip optional fields rather than risking UX.
  if (body.length > MAX_ANALYTICS_KEEPALIVE_BYTES) {
    const compactEvent = removeEmptyFields({
      eventType: event.eventType,
      sessionId: event.sessionId,
      anonymousUserId: event.anonymousUserId,
      timestamp: event.timestamp,
      activePark: normalizeOptionalString(event.activePark),
      currentLand: normalizeOptionalString(event.currentLand),
      source: normalizeOptionalString(event.source),
      screen: normalizeOptionalString(event.screen),
      profileComplete: event.profileComplete,
      devPreviewFullApp: event.devPreviewFullApp,
      metadata: {
        accessPlan: event.metadata?.accessPlan,
        compacted: true,
        originalBytes: body.length,
      },
    });

    body = JSON.stringify(compactEvent);
  }

  // Do not use apiFetch here. Events should not retry aggressively or block UX.
  fetch(`${BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("TOHI analytics event failed", err);
    }
  });
}

export async function fetchParkData(parkId, options = {}) {
  const { force = false } = options;

  const path =
    `/api/park-data?parkId=${encodeURIComponent(parkId)}` +
    (force ? "&force=true" : "");

  return apiFetch(
    path,
    { method: "GET" },
    {
      retries: 2,
      timeoutMs: force ? 12000 : 8000,
      dedupe: !force,
    }
  );
}

export async function fetchWeather(options = {}) {
  const { force = false, parkId = "" } = options;

  const params = new URLSearchParams();

  if (parkId) {
    params.set("parkId", parkId);
  }

  if (force) {
    params.set("force", "true");
  }

  const queryString = params.toString();
  const path = `/api/weather${queryString ? `?${queryString}` : ""}`;

  return apiFetch(
    path,
    { method: "GET" },
    {
      retries: 2,
      timeoutMs: force ? 12000 : 8000,
      dedupe: !force,
    }
  );
}

export async function sendTohiPickReview(reviewRequest) {
  // Veto review is advisory: no retries, and a frontend timeout slightly above
  // the backend's 8s review timeout so the backend can answer cleanly first.
  return apiFetch(
    "/api/tohi-pick-review",
    {
      method: "POST",
      body: JSON.stringify(reviewRequest || {}),
    },
    { retries: 0, timeoutMs: 10000, dedupe: false }
  );
}

export async function sendChatMessage(message, sessionData) {
  const safeMessage = String(message || "").trim();
  const safeSessionData = sanitizeChatSessionData(sessionData);

  return apiFetch(
    "/api/ai-chat",
    {
      method: "POST",
      body: JSON.stringify({ message: safeMessage, sessionData: safeSessionData }),
    },
    // AI chat should not retry after a client-side abort. Retrying creates
    // duplicate backend Claude calls and makes the app feel flaky in the park.
    // Keep the frontend timeout longer than the backend AI timeout so the
    // backend can return a clean failure instead of the frontend falling back early.
    { retries: 0, timeoutMs: 18000, dedupe: false }
  );
}

/**
 * TOHI Voice — send one recording for transcription.
 *
 * Deliberately NOT routed through apiFetch. apiFetch is the JSON path: it sets
 * a JSON Content-Type, builds a dedupe key by parsing the body as JSON, can
 * retry, and raises errors whose message embeds the response body. None of that
 * is right for audio, and bending apiFetch to suit one binary caller would
 * change behaviour for every unrelated request. This uses the shared
 * fetchWithTimeout directly and leaves apiFetch untouched.
 *
 * Guarantees this function makes:
 *   - the raw Blob is the body — never JSON, base64, or browser multipart
 *   - the real recorded Content-Type travels with it
 *   - exactly one attempt: no retry, no dedupe, no queue
 *   - a bounded timeout slightly above the backend's own 15s provider timeout,
 *     so the backend gets to answer with its own bounded failure first
 *   - nothing is logged: not the audio, not the transcript, not headers, not
 *     the response body
 *   - the caller sees only a bounded category, never an upstream message
 *
 * Rejects with an Error carrying `.category`, one of the VOICE_ERRORS values.
 */
export async function transcribeVoiceRecording(blob, contentType) {
  const fail = (category) => {
    const error = new Error(category);
    error.category = category;
    return error;
  };

  if (!blob || typeof blob.size !== "number" || blob.size <= 0) {
    throw fail("empty_audio");
  }

  if (typeof contentType !== "string" || !contentType.trim()) {
    throw fail("unsupported_audio");
  }

  let res;

  try {
    res = await fetchWithTimeout(
      `${BASE_URL}/api/voice/transcribe`,
      {
        method: "POST",
        // Exactly the recorded type. No JSON header is merged in.
        headers: { "Content-Type": contentType },
        body: blob,
      },
      // Backend provider timeout is 15s; stay just above it.
      18000
    );
  } catch {
    // Abort, DNS, offline, TLS — all converge on one bounded category. The
    // underlying error is not surfaced or logged.
    throw fail("voice_unavailable");
  }

  if (!res || res.ok !== true) {
    const status = res && typeof res.status === "number" ? res.status : 0;

    if (status === 413) throw fail("audio_too_large");
    if (status === 415) throw fail("unsupported_audio");
    if (status === 429) throw fail("rate_limited");
    if (status === 400) throw fail("empty_audio");

    // 503 and anything else the client cannot act on. The response body is
    // never read, so no upstream text can escape through this path.
    throw fail("voice_unavailable");
  }

  let payload;

  try {
    payload = await res.json();
  } catch {
    throw fail("voice_unavailable");
  }

  if (!payload || typeof payload !== "object" || typeof payload.transcript !== "string") {
    throw fail("voice_unavailable");
  }

  // Trimmed here so a blank-but-valid transcript reaches the caller as the empty
  // string it is, and can be recognised as silence rather than submitted.
  return { transcript: payload.transcript.trim() };
}

/**
 * TOHI Voice — render one reply as speech.
 *
 * Deliberately NOT routed through apiFetch, for the same reasons the
 * transcription helper avoids it: apiFetch can retry, dedupes by JSON body, and
 * raises errors whose message embeds the response body. This uses the shared
 * fetchWithTimeout directly and leaves apiFetch untouched.
 *
 * Guarantees this function makes:
 *   - exactly one attempt: no retry, no dedupe, no queue
 *   - a bounded timeout slightly above the backend's own 10s provider timeout
 *   - nothing is logged: not the reply text, not the audio, not headers, not
 *     the response body
 *   - the caller sees only a bounded category, never an upstream message
 *   - the returned Blob is audio the caller owns and must revoke
 *
 * Rejects with an Error carrying `.category`, one of the SPEECH_ERRORS values.
 */
export async function synthesizeSpeechAudio(text) {
  const fail = (category) => {
    const error = new Error(category);
    error.category = category;
    return error;
  };

  const safeText = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

  if (!safeText) throw fail("empty_text");
  if (safeText.length > 600) throw fail("text_too_long");

  let res;

  try {
    res = await fetchWithTimeout(
      `${BASE_URL}/api/voice/speak`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: safeText }),
      },
      // Backend provider timeout is 10s; stay just above it.
      13000
    );
  } catch {
    // Abort, DNS, offline, TLS — all converge on one bounded category. The
    // underlying error is not surfaced or logged.
    throw fail("speech_unavailable");
  }

  if (!res || res.ok !== true) {
    const status = res && typeof res.status === "number" ? res.status : 0;

    if (status === 400) throw fail("empty_text");
    if (status === 413) throw fail("text_too_long");
    if (status === 429) throw fail("rate_limited");

    // 503 and anything else the client cannot act on. The response body is
    // never read, so no upstream text can escape through this path.
    throw fail("speech_unavailable");
  }

  // The success contract is checked before the body is touched. A response that
  // does not claim MP3 is not audio this phase asked for, whatever it contains.
  const declaredType = res.headers?.get?.("content-type");
  const mediaType =
    typeof declaredType === "string" ? declaredType.split(";")[0].trim().toLowerCase() : "";

  if (mediaType !== "audio/mpeg") throw fail("speech_unavailable");

  // Content-Length is advisory, but when present it lets an oversized body be
  // refused BEFORE it is read into memory. A malformed value is refused too:
  // a header we cannot trust is not a header we act on.
  const declaredLength = res.headers?.get?.("content-length");

  if (typeof declaredLength === "string" && declaredLength.trim() !== "") {
    const claimed = Number(declaredLength);

    if (!Number.isFinite(claimed) || !Number.isInteger(claimed) || claimed < 0) {
      throw fail("speech_unavailable");
    }
    if (claimed > 2 * 1024 * 1024) throw fail("speech_unavailable");
  }

  let blob;

  try {
    blob = await res.blob();
  } catch {
    throw fail("speech_unavailable");
  }

  if (!blob || typeof blob.size !== "number" || blob.size <= 0) {
    throw fail("speech_unavailable");
  }

  // The real ceiling, applied to what actually arrived rather than to what the
  // header claimed.
  if (blob.size > 2 * 1024 * 1024) throw fail("speech_unavailable");

  // Defense in depth. A blank blob type is accepted — some browsers leave it
  // empty even for a correctly labelled response — but a stated type must be
  // the right one.
  const blobType = typeof blob.type === "string" ? blob.type.trim() : "";

  if (blobType && blobType.split(";")[0].trim().toLowerCase() !== "audio/mpeg") {
    throw fail("speech_unavailable");
  }

  return blob;
}
