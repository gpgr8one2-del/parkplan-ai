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
