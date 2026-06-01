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

function sanitizeMetadata(value) {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    return value.slice(0, 30).map(sanitizeMetadata).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const cleaned = {};

    Object.entries(value).forEach(([key, item]) => {
      // Never allow obvious sensitive/raw fields into analytics metadata.
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

    activePark: payload.activePark,
    currentLand: payload.currentLand,
    source: payload.source,
    screen: payload.screen,

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
      activePark: event.activePark,
      currentLand: event.currentLand,
      source: event.source,
      screen: event.screen,
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
  const { force = false } = options;

  const path = "/api/weather" + (force ? "?force=true" : "");

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

export async function sendChatMessage(message, sessionData) {
  return apiFetch(
    "/api/ai-chat",
    {
      method: "POST",
      body: JSON.stringify({ message, sessionData }),
    },
    // AI chat should not retry after a client-side abort. Retrying creates
    // duplicate backend Claude calls and makes the app feel flaky in the park.
    // Keep the frontend timeout longer than the backend AI timeout so the
    // backend can return a clean failure instead of the frontend falling back early.
    { retries: 0, timeoutMs: 18000, dedupe: false }
  );
}
