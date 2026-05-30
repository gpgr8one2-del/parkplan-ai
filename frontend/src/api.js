const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

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
  return {
    orlandoDate: timeContext.orlandoDate,
    orlandoTimeLabel: timeContext.orlandoTimeLabel,
    dayPhase: timeContext.dayPhase,
    planningMode: timeContext.planningMode,
    tripStatus: timeContext.tripStatus?.status,
  };
}

function sanitizeFamilyProfileSnapshot(familyProfile = {}) {
  return {
    adultCount: familyProfile.adultCount ?? null,
    childCount: familyProfile.childCount ?? null,
    partySize: familyProfile.partySize ?? null,
    shortestHeightInches: familyProfile.shortestHeightInches ?? null,
    hasSmallChildren: familyProfile.hasSmallChildren,

    thrillTolerance: familyProfile.thrillTolerance,
    walkingTolerance: familyProfile.walkingTolerance,
    heatSensitivity: familyProfile.heatSensitivity,
    waterRidePreference: familyProfile.waterRidePreference,
    pace: familyProfile.pace,
    priorities: familyProfile.priorities || [],

    selectedParks: familyProfile.tripContext?.selectedParks || [],
    firstPark: familyProfile.tripContext?.firstPark,
    priorityPark: familyProfile.tripContext?.priorityPark,
    parkHopper: familyProfile.tripContext?.parkHopper,

    planningMode: familyProfile.planningPreferences?.planningMode,
    ropeDropStyle: familyProfile.planningPreferences?.ropeDropStyle,
    middayBreakStyle: familyProfile.planningPreferences?.middayBreakStyle,

    stayingOnProperty: familyProfile.resortContext?.stayingOnProperty,
    resortId: familyProfile.resortContext?.resortId,
    transportationMode: familyProfile.resortContext?.transportationMode,
  };
}

function sanitizeRecommendation(recommendation = {}, slot = "") {
  if (!recommendation) return null;

  return {
    slot,
    rideId: recommendation.id,
    rideName: recommendation.name,
    waitTime: recommendation.waitTime ?? null,
    land: recommendation.land,
    waitValueStatus: recommendation.waitValueStatus?.status,
    recommendationScore: recommendation.recommendationScore,
    familyProfileModifier: recommendation.familyProfileModifier,
    planAheadRealityCheckModifier: recommendation.planAheadRealityCheckModifier,
    heightWarning: Boolean(recommendation.heightWarning),
  };
}

function sanitizeLocationContext(locationContext = {}) {
  if (!locationContext) return null;

  return {
    source: locationContext.source || locationContext.type,
    landKey: locationContext.landKey || locationContext.land,
    landLabel: locationContext.landLabel,
    nearestAnchorName: locationContext.nearestAnchorName,
    nearestAnchorType: locationContext.nearestAnchorType,
    confidence: locationContext.confidence,
    distanceMeters: locationContext.distanceMeters,
  };
}

/**
 * Anonymous product analytics.
 *
 * Privacy guardrails:
 * - Do not send names, emails, raw GPS coordinates, child names, or full AI chat text.
 * - Use behavior signals only: actions, profile categories, recommendation decisions.
 * - This is fire-and-forget so analytics never breaks the guest experience.
 */
export function trackEvent(eventType, payload = {}) {
  const event = {
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

    timeContext: sanitizeTimeContext(payload.timeContext),
    familyProfileSnapshot: sanitizeFamilyProfileSnapshot(payload.familyProfile),
    recommendation: payload.recommendation
      ? sanitizeRecommendation(payload.recommendation, payload.recommendationSlot)
      : undefined,
    action: payload.action,
    locationContext: sanitizeLocationContext(payload.locationContext),
    metadata: payload.metadata,
  };

  // Do not use apiFetch here. Events should not retry aggressively or block UX.
  fetch(`${BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ParkPlan analytics event failed", err);
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
    { retries: 1, timeoutMs: 12000, dedupe: false }
  );
}
