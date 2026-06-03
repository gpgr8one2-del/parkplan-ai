const TRIP_PLAN_STORAGE_KEY = "parkplan.tripPlan";

export const DEFAULT_TRIP_PLAN = {
  version: 1,
  system: "disney_wdw",
  preferences: {
    startStrategy: "moderate_morning",
    breakPreference: "in_park_rest",
    diningStyle: "quick_service",
    showsImportance: "medium",
    nighttimeImportance: "if_we_re_still_here",
    paidQueueStrategy: "undecided",
  },
  mustDoExperiences: [],
  parkDays: [],
  derivedPlan: null,
  lastGeneratedAt: null,
  freshnessContext: null,
  schemaLockedAt: "2026-06-03",
  updatedAt: null,
};

const VALID_VALUES = {
  startStrategy: ["rope_drop", "moderate_morning", "late_start", "evening_only"],
  breakPreference: ["no_break", "resort_return", "in_park_rest", "kids_nap_window"],
  diningStyle: ["quick_service", "table_service_planned", "mixed", "snack_through_day"],
  showsImportance: ["low", "medium", "high"],
  nighttimeImportance: ["must_see_fireworks", "if_we_re_still_here", "kids_will_be_done"],
  paidQueueStrategy: ["undecided", "avoid_paid", "open_to_paid", "use_paid"],
  mustDoPriority: ["must_do", "would_love", "nice_if_possible"],
};

function safePreferenceValue(field, value) {
  return VALID_VALUES[field]?.includes(value)
    ? value
    : DEFAULT_TRIP_PLAN.preferences[field];
}

function normalizeMustDoExperience(experience = {}) {
  if (!experience || typeof experience !== "object") return null;

  const id = experience.id != null ? String(experience.id) : "";
  const name = typeof experience.name === "string" ? experience.name.trim() : "";
  const parkId = typeof experience.parkId === "string" ? experience.parkId.trim() : "";

  if (!id || !name || !parkId) return null;

  return {
    id,
    name,
    parkId,
    type: typeof experience.type === "string" && experience.type.trim()
      ? experience.type.trim()
      : "experience",
    priority: VALID_VALUES.mustDoPriority.includes(experience.priority)
      ? experience.priority
      : "must_do",
    land: typeof experience.land === "string" ? experience.land : "",
    source: typeof experience.source === "string" ? experience.source : "plan_tab",
  };
}

function normalizeMustDoExperiences(experiences = []) {
  if (!Array.isArray(experiences)) return [];

  const seen = new Set();
  const normalized = [];

  experiences.forEach((experience) => {
    const safeExperience = normalizeMustDoExperience(experience);
    if (!safeExperience) return;

    const key = `${safeExperience.parkId}:${safeExperience.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    normalized.push(safeExperience);
  });

  return normalized.slice(0, 30);
}

export function normalizeTripPlan(tripPlan = {}) {
  const safePlan = tripPlan && typeof tripPlan === "object" ? tripPlan : {};
  const safePreferences =
    safePlan.preferences && typeof safePlan.preferences === "object"
      ? safePlan.preferences
      : {};

  const preferences = Object.keys(DEFAULT_TRIP_PLAN.preferences).reduce(
    (nextPreferences, field) => ({
      ...nextPreferences,
      [field]: safePreferenceValue(field, safePreferences[field]),
    }),
    {}
  );

  return {
    ...DEFAULT_TRIP_PLAN,
    ...safePlan,
    version: 1,
    system: safePlan.system || DEFAULT_TRIP_PLAN.system,
    preferences,
    mustDoExperiences: normalizeMustDoExperiences(safePlan.mustDoExperiences),
    parkDays: Array.isArray(safePlan.parkDays) ? safePlan.parkDays : [],
    derivedPlan: safePlan.derivedPlan || null,
    lastGeneratedAt: safePlan.lastGeneratedAt || null,
    freshnessContext:
      safePlan.freshnessContext && typeof safePlan.freshnessContext === "object"
        ? safePlan.freshnessContext
        : null,
    schemaLockedAt: safePlan.schemaLockedAt || DEFAULT_TRIP_PLAN.schemaLockedAt,
    updatedAt: safePlan.updatedAt || null,
  };
}

export function readStoredTripPlan() {
  try {
    const raw = localStorage.getItem(TRIP_PLAN_STORAGE_KEY);
    return normalizeTripPlan(raw ? JSON.parse(raw) : DEFAULT_TRIP_PLAN);
  } catch {
    return normalizeTripPlan(DEFAULT_TRIP_PLAN);
  }
}

export function writeStoredTripPlan(tripPlan) {
  try {
    localStorage.setItem(
      TRIP_PLAN_STORAGE_KEY,
      JSON.stringify(normalizeTripPlan(tripPlan))
    );
  } catch (err) {
    console.warn("TOHI: could not save trip plan", err);
  }
}

export function updateTripPlanPreferences(tripPlan, preferencePatch = {}) {
  return normalizeTripPlan({
    ...tripPlan,
    preferences: {
      ...(tripPlan?.preferences || {}),
      ...preferencePatch,
    },
    updatedAt: new Date().toISOString(),
  });
}

export function updateTripPlanMustDoExperiences(tripPlan, mustDoExperiences = []) {
  return normalizeTripPlan({
    ...tripPlan,
    mustDoExperiences,
    updatedAt: new Date().toISOString(),
  });
}

export function toggleTripPlanMustDoExperience(tripPlan, experience) {
  const safePlan = normalizeTripPlan(tripPlan);
  const safeExperience = normalizeMustDoExperience(experience);

  if (!safeExperience) {
    return safePlan;
  }

  const targetKey = `${safeExperience.parkId}:${safeExperience.id}`;
  const existing = safePlan.mustDoExperiences || [];
  const alreadySelected = existing.some(
    (item) => `${item.parkId}:${item.id}` === targetKey
  );

  return updateTripPlanMustDoExperiences(
    safePlan,
    alreadySelected
      ? existing.filter((item) => `${item.parkId}:${item.id}` !== targetKey)
      : [...existing, safeExperience]
  );
}


function normalizeContextString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getComparableContextValue(context = {}, field) {
  const value = context?.[field];

  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return normalizeContextString(value);
}

function getPlanAgeMinutes(lastGeneratedAt) {
  if (!lastGeneratedAt) return null;

  const generatedMs = new Date(lastGeneratedAt).getTime();

  if (!Number.isFinite(generatedMs)) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - generatedMs) / 60000));
}

function getMustDoCount(tripPlan = {}) {
  return Array.isArray(tripPlan.mustDoExperiences) ? tripPlan.mustDoExperiences.length : 0;
}

export function createTripPlanFreshnessContext({
  activePark = "",
  timeContext = {},
  weatherMode = {},
  familyProfile = {},
  tripPlan = {},
} = {}) {
  return {
    activePark: normalizeContextString(activePark),
    dayPhase: normalizeContextString(timeContext?.dayPhase),
    planningMode: normalizeContextString(timeContext?.planningMode),
    tripStatus: normalizeContextString(timeContext?.tripStatus?.status || timeContext?.tripStatus),
    weatherMode: normalizeContextString(weatherMode?.mode || "normal"),
    heatSensitivity: normalizeContextString(familyProfile?.heatSensitivity),
    walkingTolerance: normalizeContextString(familyProfile?.walkingTolerance),
    pace: normalizeContextString(familyProfile?.pace),
    shortestHeightInches:
      familyProfile?.shortestHeightInches != null
        ? Number(familyProfile.shortestHeightInches)
        : null,
    mustDoCount: getMustDoCount(tripPlan),
  };
}

export function updateTripPlanFreshnessContext(tripPlan, freshnessContext = {}) {
  const now = new Date().toISOString();

  return normalizeTripPlan({
    ...tripPlan,
    freshnessContext,
    lastGeneratedAt: now,
    updatedAt: now,
  });
}

export function getTripPlanFreshnessStatus({
  tripPlan = {},
  currentContext = {},
  staleAfterMinutes = 90,
} = {}) {
  const safePlan = normalizeTripPlan(tripPlan);
  const reasons = [];
  const generatedContext = safePlan.freshnessContext || null;
  const ageMinutes = getPlanAgeMinutes(safePlan.lastGeneratedAt);

  if (!safePlan.lastGeneratedAt || !generatedContext) {
    return {
      status: "needs_refresh",
      isStale: true,
      severity: "attention",
      title: "Plan may need a quick refresh",
      message: "This plan has not been refreshed against your current park, timing, and weather yet.",
      reasons: ["Refresh once so TOHI can lock this plan to the current day context."],
      ageMinutes,
      lastGeneratedAt: safePlan.lastGeneratedAt || null,
    };
  }

  const updatedMs = safePlan.updatedAt ? new Date(safePlan.updatedAt).getTime() : null;
  const generatedMs = safePlan.lastGeneratedAt ? new Date(safePlan.lastGeneratedAt).getTime() : null;

  if (
    Number.isFinite(updatedMs) &&
    Number.isFinite(generatedMs) &&
    updatedMs > generatedMs + 1000
  ) {
    reasons.push("Trip tune or must-dos changed since the plan was refreshed.");
  }

  const comparisons = [
    ["activePark", "Active park changed."],
    ["dayPhase", "The day has moved into a new timing window."],
    ["planningMode", "Trip timing mode changed."],
    ["weatherMode", "Weather conditions changed."],
    ["heatSensitivity", "Family heat sensitivity changed."],
    ["walkingTolerance", "Walking tolerance changed."],
    ["pace", "Family pace changed."],
    ["shortestHeightInches", "Shortest rider height changed."],
    ["mustDoCount", "Must-do selections changed."],
  ];

  comparisons.forEach(([field, reason]) => {
    const previous = getComparableContextValue(generatedContext, field);
    const current = getComparableContextValue(currentContext, field);

    if (previous !== current) {
      reasons.push(reason);
    }
  });

  if (ageMinutes != null && ageMinutes >= staleAfterMinutes) {
    reasons.push(`Plan was last refreshed about ${ageMinutes} minutes ago.`);
  }

  const uniqueReasons = [...new Set(reasons)];

  if (!uniqueReasons.length) {
    return {
      status: "fresh",
      isStale: false,
      severity: "ok",
      title: "Plan is current",
      message: "This plan is matched to the current park, timing, weather, and setup.",
      reasons: [],
      ageMinutes,
      lastGeneratedAt: safePlan.lastGeneratedAt,
    };
  }

  return {
    status: "needs_refresh",
    isStale: true,
    severity: uniqueReasons.length >= 2 ? "attention" : "watch",
    title: "Plan may need a quick refresh",
    message: "Something important changed since this plan was last refreshed.",
    reasons: uniqueReasons.slice(0, 4),
    ageMinutes,
    lastGeneratedAt: safePlan.lastGeneratedAt,
  };
}

