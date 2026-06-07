import { getCurrentTimeContext } from "./timeContext";
import { getResortProfile } from "../resortProfiles";

const FAMILY_PROFILE_STORAGE_KEY = "parkplan.familyProfile";
const DEFAULT_SYSTEM = "disney_wdw";

export const DEFAULT_FAMILY_PROFILE = {
  system: DEFAULT_SYSTEM,
  isSetupComplete: false,
  preferredName: null,
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "child_1", label: "Child 1", age: "", heightInches: "" },
    { id: "child_2", label: "Child 2", age: "", heightInches: "" },
  ],

  // Deprecated, but intentionally kept for one compatibility cycle.
  // rideRecommendations.js still reads this for height/rider-switch behavior.
  wholeGroupRidesTogether: "warn",

  thrillTolerance: "",
  pace: "balanced",
  heatSensitivity: "",
  waterRidePreference: "depends",
  stormTolerance: "brief_outdoor_ok",
  mobilityAccessibility: {
    usesStroller: false,
    usesWheelchair: false,
    mobilityNotes: "",
  },
  priorities: [],

  // Renamed from lightningLanePreference. This stays in the family profile
  // for one compatibility cycle, then moves to parkplan.tripPlan in 24E.
  paidQueueStrategy: "undecided",
  lightningLanePreference: "undecided",

  tripContext: {
    tripStartDate: "",
    tripEndDate: "",
    parkDays: 1,
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
    parkHopper: "unknown",
    parkDaySchedule: [],
  },

  // Plan Tune fields eventually move to parkplan.tripPlan.
  // Keep only the live future-facing fields here for now.
  planningPreferences: {
    ropeDropStyle: "flexible",
    middayBreakStyle: "flexible",
    diningStyle: "quick_service",
  },

  resortContext: {
    stayingOnProperty: "unknown",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "",
    transportationMode: "unknown",
  },
};

export const FAMILY_PRIORITY_OPTIONS = [
  { value: "headliners", label: "Big rides / headliners" },
  { value: "low_stress", label: "Low-stress family flow" },
  { value: "characters", label: "Characters" },
  { value: "shows_parades", label: "Shows / parades" },
  { value: "food_snacks", label: "Food / snacks" },
  { value: "young_kid_moments", label: "Younger-kid moments" },
];

export const PARK_OPTIONS_BY_SYSTEM = {
  disney_wdw: [
    { value: "magic_kingdom", label: "Magic Kingdom" },
    { value: "epcot", label: "EPCOT" },
    { value: "hollywood", label: "Hollywood Studios" },
    { value: "animal_kingdom", label: "Animal Kingdom" },
  ],
  universal_orlando: [],
  disney_dlr: [],
};

// Deprecated alias. Keep for one cycle so App.jsx and OnboardingFlow.jsx
// do not need to change during the schema-only commit.
export const DISNEY_PARK_OPTIONS = PARK_OPTIONS_BY_SYSTEM.disney_wdw;

export function getAgeRangeId(age, system = DEFAULT_SYSTEM) {
  const numericAge = Number(age);

  if (!Number.isFinite(numericAge)) return "unknown";

  if (system === "disney_wdw" || system === "disney_dlr") {
    if (numericAge <= 2) return "under_3";
    if (numericAge >= 3 && numericAge <= 9) return "child";

    return "adult";
  }

  // Universal-specific age/ticket rules can branch here when Universal ships.
  if (numericAge <= 2) return "under_3";
  if (numericAge >= 3 && numericAge <= 9) return "child";

  return "adult";
}

export function getAgeRangeLabel(ageClass, system = DEFAULT_SYSTEM) {
  if (system === "disney_wdw" || system === "disney_dlr") {
    if (ageClass === "under_3") return "Under 3 / no ticket";
    if (ageClass === "child") return "Disney child";
    if (ageClass === "adult") return "Disney adult";

    return "Age not set";
  }

  if (ageClass === "under_3") return "Under 3";
  if (ageClass === "child") return "Child";
  if (ageClass === "adult") return "Adult";

  return "Age not set";
}

// Deprecated aliases. Keep for one cycle.
export function getDisneyAgeClass(age) {
  return getAgeRangeId(age, "disney_wdw");
}

export function getDisneyAgeLabel(ageClass) {
  return getAgeRangeLabel(ageClass, "disney_wdw");
}

function getDateAccessStatus(tripContext = {}) {
  return getCurrentTimeContext({
    familyProfile: {
      tripContext,
      planningPreferences: DEFAULT_FAMILY_PROFILE.planningPreferences,
    },
  }).tripStatus;
}

function getParkOptionsForSystem(system = DEFAULT_SYSTEM) {
  return PARK_OPTIONS_BY_SYSTEM[system] || PARK_OPTIONS_BY_SYSTEM.disney_wdw;
}

export function getParkLabel(parkId, system = DEFAULT_SYSTEM) {
  return getParkOptionsForSystem(system).find((park) => park.value === parkId)?.label || "Not set";
}

function toBoolean(value) {
  return value === true || value === "true" || value === "yes";
}

function normalizePreferredName(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.slice(0, 40) : null;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numeric));
}

function deriveTripLengthDays(tripContext = {}) {
  const start = tripContext.tripStartDate ? new Date(tripContext.tripStartDate) : null;
  const end = tripContext.tripEndDate ? new Date(tripContext.tripEndDate) : null;

  if (
    start &&
    end &&
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end.getTime() >= start.getTime()
  ) {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.min(21, Math.round(diffMs / 86400000) + 1));
  }

  return clampNumber(tripContext.tripLengthDays, 1, 21, 1);
}

function mapWalkingToleranceToPace(value) {
  if (value === "low") return "leisurely";
  if (value === "medium") return "balanced";
  if (value === "high") return "energetic";

  return "";
}

function mapPaceToWalkingTolerance(value) {
  if (value === "leisurely" || value === "relaxed") return "low";
  if (value === "balanced") return "medium";
  if (value === "energetic" || value === "maximize") return "high";

  return "";
}

function normalizePace(profile = {}) {
  const directPace = profile.pace;

  if (directPace === "leisurely" || directPace === "balanced" || directPace === "energetic") {
    return directPace;
  }

  if (directPace === "relaxed") return "leisurely";
  if (directPace === "maximize") return "energetic";

  const migratedPace = mapWalkingToleranceToPace(profile.walkingTolerance);
  return migratedPace || DEFAULT_FAMILY_PROFILE.pace;
}

function normalizePriorities(priorities = []) {
  if (!Array.isArray(priorities)) return [];

  const normalized = priorities
    .map((priority) => {
      if (priority === "bluey_younger_kids") return "young_kid_moments";
      if (priority === "princesses") return "characters";
      if (priority === "ac_breaks") return "low_stress";

      return priority;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function normalizeMobilityAccessibility(value = {}) {
  return {
    usesStroller: toBoolean(value.usesStroller),
    usesWheelchair: toBoolean(value.usesWheelchair),
    mobilityNotes: String(value.mobilityNotes || "").slice(0, 300),
  };
}

function hasMeaningfulSelection(value, emptyValue = "undecided") {
  const normalizedValue = String(value ?? "").trim();

  return Boolean(normalizedValue && normalizedValue !== emptyValue);
}

function normalizePaidQueueStrategy(profile = {}) {
  // 24C compatibility rule:
  // Current OnboardingFlow.jsx still writes legacy lightningLanePreference.
  // The new paidQueueStrategy default is "undecided", so it must not win over
  // a real legacy value like "yes", "no", "multi_pass", etc.
  if (hasMeaningfulSelection(profile.lightningLanePreference)) {
    return profile.lightningLanePreference;
  }

  if (hasMeaningfulSelection(profile.paidQueueStrategy)) {
    return profile.paidQueueStrategy;
  }

  return (
    profile.lightningLanePreference ||
    profile.paidQueueStrategy ||
    DEFAULT_FAMILY_PROFILE.paidQueueStrategy
  );
}

/* -------------------------------------------------------------------------- */
/* Park Day Schedule — schema foundation (44A)                               */
/* -------------------------------------------------------------------------- */

const SELECTABLE_TRIP_PARK_IDS = [
  "magic_kingdom",
  "epcot",
  "hollywood",
  "animal_kingdom",
];

function isSelectableTripParkId(parkId) {
  return SELECTABLE_TRIP_PARK_IDS.includes(String(parkId || ""));
}

function isValidDateString(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T12:00:00`);
  return Number.isFinite(d.getTime());
}

function addDaysToTripDateString(dateString, daysToAdd) {
  if (!isValidDateString(dateString)) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + daysToAdd));
  return d.toISOString().slice(0, 10);
}

function normalizeParkDayScheduleItem(item, index, fallbackParkId, fallbackDate) {
  return {
    dayNumber: index + 1,
    date: isValidDateString(item?.date) ? item.date : fallbackDate || "",
    primaryParkId: isSelectableTripParkId(item?.primaryParkId)
      ? item.primaryParkId
      : (isSelectableTripParkId(fallbackParkId) ? fallbackParkId : "magic_kingdom"),
    secondaryParkId: isSelectableTripParkId(item?.secondaryParkId)
      ? item.secondaryParkId
      : "",
    notes: typeof item?.notes === "string" ? item.notes.slice(0, 160) : "",
  };
}

function buildDefaultParkDaySchedule(normalizedTripContext = {}) {
  const tripLength = Math.max(
    1,
    Math.min(
      21,
      Number(normalizedTripContext.tripLengthDays) ||
        Number(normalizedTripContext.parkDays) ||
        1
    )
  );

  // Build selectable parks list from context fields
  let selectedParks = [];

  const selectionIds = normalizedTripContext.parkSelectionIds;
  if (Array.isArray(selectionIds) && selectionIds.length) {
    selectedParks = selectionIds.filter(isSelectableTripParkId);
  }

  if (!selectedParks.length) {
    const fallback = [
      normalizedTripContext.firstParkId,
      normalizedTripContext.firstPark,
    ].find(isSelectableTripParkId);
    selectedParks = fallback ? [fallback] : ["magic_kingdom"];
  }

  // Day 1 prefers firstParkId / firstPark if valid and selectable
  const day1Park =
    [normalizedTripContext.firstParkId, normalizedTripContext.firstPark].find(
      isSelectableTripParkId
    ) ||
    selectedParks[0] ||
    "magic_kingdom";

  // Rotate the selected parks array so day 1 starts at day1Park
  const day1Index = selectedParks.indexOf(day1Park);
  const rotation =
    day1Index >= 0
      ? [...selectedParks.slice(day1Index), ...selectedParks.slice(0, day1Index)]
      : [day1Park, ...selectedParks];

  const startDate = normalizedTripContext.tripStartDate || "";

  return Array.from({ length: tripLength }, (_, index) => ({
    dayNumber: index + 1,
    date: isValidDateString(startDate)
      ? addDaysToTripDateString(startDate, index)
      : "",
    primaryParkId: rotation[index % rotation.length],
    secondaryParkId: "",
    notes: "",
  }));
}

export function normalizeParkDaySchedule(rawSchedule, normalizedTripContext = {}) {
  const defaults = buildDefaultParkDaySchedule(normalizedTripContext);

  if (!Array.isArray(rawSchedule) || rawSchedule.length === 0) {
    return defaults;
  }

  return defaults.map((defaultItem, index) => {
    const existing = rawSchedule[index];
    if (!existing || typeof existing !== "object") return defaultItem;
    return normalizeParkDayScheduleItem(
      existing,
      index,
      defaultItem.primaryParkId,
      defaultItem.date
    );
  });
}

function buildTripContextWithCompatibility(tripContext = {}) {
  // 24C compatibility rule:
  // Current OnboardingFlow.jsx still writes legacy selectedParks / firstPark /
  // priorityPark. Until 24D updates the UI bindings, those legacy fields must
  // win when present. Otherwise the new default parkSelectionIds array would
  // keep snapping the setup back to Magic Kingdom.
  const legacySelectedParks = Array.isArray(tripContext.selectedParks)
    ? tripContext.selectedParks
    : null;

  const nextParkSelectionIds =
    legacySelectedParks && legacySelectedParks.length
      ? legacySelectedParks
      : Array.isArray(tripContext.parkSelectionIds) && tripContext.parkSelectionIds.length
      ? tripContext.parkSelectionIds
      : DEFAULT_FAMILY_PROFILE.tripContext.parkSelectionIds;

  const parkSelectionIds = Array.from(new Set(nextParkSelectionIds));
  const fallbackPark = parkSelectionIds[0] || "magic_kingdom";

  const firstParkId =
    tripContext.firstPark ||
    tripContext.firstParkId ||
    fallbackPark;

  const mostImportantParkId =
    tripContext.priorityPark ||
    tripContext.mostImportantParkId ||
    fallbackPark;

  const normalizedTripContext = {
    tripStartDate: tripContext.tripStartDate || "",
    tripEndDate: tripContext.tripEndDate || "",
    parkDays: clampNumber(tripContext.parkDays, 1, 21, 1),
    parkSelectionIds,
    firstParkId,
    mostImportantParkId,
    parkHopper: tripContext.parkHopper || "unknown",
  };

  const tripLengthDays = deriveTripLengthDays({
    ...tripContext,
    ...normalizedTripContext,
  });

  const contextForSchedule = {
    ...normalizedTripContext,
    tripLengthDays,
  };

  const parkDaySchedule = normalizeParkDaySchedule(
    tripContext.parkDaySchedule,
    contextForSchedule
  );

  return {
    ...normalizedTripContext,

    // Deprecated aliases. These keep current App.jsx, OnboardingFlow.jsx,
    // aiService.js, and any existing saved state working until 24D/24E.
    tripLengthDays,
    selectedParks: parkSelectionIds,
    firstPark: firstParkId,
    priorityPark: mostImportantParkId,

    parkDaySchedule,
  };
}

function buildPlanningPreferencesWithCompatibility(planningPreferences = {}) {
  return {
    ropeDropStyle:
      planningPreferences.startStrategy ||
      planningPreferences.ropeDropStyle ||
      DEFAULT_FAMILY_PROFILE.planningPreferences.ropeDropStyle,
    middayBreakStyle:
      planningPreferences.breakPreference ||
      planningPreferences.middayBreakStyle ||
      DEFAULT_FAMILY_PROFILE.planningPreferences.middayBreakStyle,
    diningStyle:
      planningPreferences.diningStyle ||
      DEFAULT_FAMILY_PROFILE.planningPreferences.diningStyle,
  };
}

export function getFamilyProfileCompletion(profile = {}) {
  const safeProfile = normalizeFamilyProfile(profile);
  const missing = [];

  if (!safeProfile.adultCount || safeProfile.adultCount < 1) {
    missing.push("adult count");
  }

  if (safeProfile.childCount > 0) {
    const missingChildAge = safeProfile.children.some((child) => child.age === "");
    const missingChildHeight = safeProfile.children.some(
      (child) => child.heightInches === ""
    );

    if (missingChildAge) missing.push("child ages");
    if (missingChildHeight) missing.push("child heights");
  }

  if (!safeProfile.tripContext.tripStartDate || !safeProfile.tripContext.tripEndDate) {
    missing.push("trip dates");
  }

  if (!safeProfile.thrillTolerance) {
    missing.push("ride comfort");
  }

  if (!safeProfile.pace) {
    missing.push("pace");
  }

  if (!safeProfile.heatSensitivity) {
    missing.push("heat sensitivity");
  }

  if (!safeProfile.waterRidePreference) {
    missing.push("water ride preference");
  }

  if (!safeProfile.stormTolerance) {
    missing.push("storm comfort");
  }

  if (!safeProfile.priorities?.length) {
    missing.push("trip priorities");
  }

  if (!safeProfile.tripContext.parkSelectionIds?.length) {
    missing.push("parks");
  }

  if (!safeProfile.tripContext.firstParkId) {
    missing.push("first park");
  }

  if (!safeProfile.tripContext.mostImportantParkId) {
    missing.push("priority park");
  }

  if (
    safeProfile.resortContext.stayingOnProperty === "yes" &&
    !safeProfile.resortContext.resortId
  ) {
    missing.push("Disney resort");
  }

  if (
    safeProfile.resortContext.stayingOnProperty === "no" &&
    !safeProfile.resortContext.offPropertyHotelName
  ) {
    missing.push("hotel / area");
  }

  // 24C hotfix:
  // Before 24D, the current onboarding UI may still be writing the legacy
  // tripLengthDays field instead of tripStartDate/tripEndDate. Do not keep
  // completed or otherwise valid legacy profiles locked out of TOHI chat just
  // because the schema moved faster than the UI.
  const compatibilityMissing = missing.filter((item) => item !== "trip dates");

  const isComplete =
    missing.length === 0 ||
    safeProfile.isSetupComplete === true ||
    compatibilityMissing.length === 0;

  return {
    isComplete,
    missing: isComplete ? [] : compatibilityMissing,
    strictMissing: missing,
  };
}

export function normalizeFamilyProfile(profile = {}) {
  const merged = {
    ...DEFAULT_FAMILY_PROFILE,
    ...profile,
    system: profile.system || DEFAULT_FAMILY_PROFILE.system,
    tripContext: {
      ...DEFAULT_FAMILY_PROFILE.tripContext,
      ...(profile.tripContext || {}),
    },
    planningPreferences: {
      ...DEFAULT_FAMILY_PROFILE.planningPreferences,
      ...(profile.planningPreferences || {}),
    },
    resortContext: {
      ...DEFAULT_FAMILY_PROFILE.resortContext,
      ...(profile.resortContext || {}),
    },
    mobilityAccessibility: {
      ...DEFAULT_FAMILY_PROFILE.mobilityAccessibility,
      ...(profile.mobilityAccessibility || {}),
    },
  };

  // Backward compatibility: older saved profiles used partySize + guests.
  const oldGuests = Array.isArray(profile.guests) ? profile.guests : [];
  const oldAdults = oldGuests.filter((guest) => getAgeRangeId(guest.age, merged.system) === "adult");
  const oldChildren = oldGuests.filter((guest) => getAgeRangeId(guest.age, merged.system) !== "adult");

  const adultCount = Math.max(
    1,
    Math.min(
      12,
      Number(merged.adultCount) ||
        oldAdults.length ||
        Math.max(1, Number(merged.partySize || 0) - oldChildren.length) ||
        1
    )
  );

  const childCount = Math.max(
    0,
    Math.min(
      12,
      Number(merged.childCount) ||
        oldChildren.length ||
        (Array.isArray(merged.children) ? merged.children.length : 0) ||
        0
    )
  );

  const existingChildren =
    Array.isArray(merged.children) && merged.children.length
      ? merged.children
      : oldChildren;

  const children = Array.from({ length: childCount }, (_, index) => {
    const existing = existingChildren[index] || {};

    return {
      id: existing.id || `child_${index + 1}`,
      label: existing.label || `Child ${index + 1}`,
      age: existing.age ?? "",
      heightInches: existing.heightInches ?? "",
    };
  });

  const pace = normalizePace(merged);
  const walkingToleranceAlias =
    merged.walkingTolerance || mapPaceToWalkingTolerance(pace) || "medium";

  const tripContext = buildTripContextWithCompatibility(merged.tripContext);
  const paidQueueStrategy = normalizePaidQueueStrategy(merged);

  return {
    ...merged,
    system: merged.system || DEFAULT_SYSTEM,
    preferredName: normalizePreferredName(merged.preferredName),
    adultCount,
    childCount,
    partySize: adultCount + childCount,
    children,
    tripContext,
    planningPreferences: buildPlanningPreferencesWithCompatibility(merged.planningPreferences),
    mobilityAccessibility: normalizeMobilityAccessibility(merged.mobilityAccessibility),
    pace,
    waterRidePreference: merged.waterRidePreference || DEFAULT_FAMILY_PROFILE.waterRidePreference,
    stormTolerance: merged.stormTolerance || DEFAULT_FAMILY_PROFILE.stormTolerance,
    priorities: (() => {
      const normalizedPriorities = normalizePriorities(merged.priorities);

      // Do not let the 24C priority cleanup accidentally lock out an existing
      // completed profile if its only old priorities were removed in the rename.
      // "low_stress" is the safest fallback because it aligns with TOHI's core
      // family-energy mission and avoids thrill/optimization bias.
      if (!normalizedPriorities.length && merged.isSetupComplete) {
        return ["low_stress"];
      }

      return normalizedPriorities;
    })(),
    paidQueueStrategy,

    // Deprecated aliases retained for one compatibility cycle.
    walkingTolerance: walkingToleranceAlias,
    lightningLanePreference: paidQueueStrategy,

    // Keep guests available for any older logic, but do not ask adults for height.
    guests: [
      ...Array.from({ length: adultCount }, (_, index) => ({
        id: `adult_${index + 1}`,
        label: `Adult ${index + 1}`,
        age: 10,
        heightInches: "",
        isAdultPlaceholder: true,
      })),
      ...children,
    ],
  };
}

export function buildFamilyProfileSummary(profile) {
  const safeProfile = normalizeFamilyProfile(profile);
  const children = safeProfile.children || [];

  const childAgeSummary = children.reduce(
    (summary, child) => {
      const ageClass = getAgeRangeId(child.age, safeProfile.system);

      if (ageClass === "under_3") summary.under3Count += 1;
      if (ageClass === "child") summary.childCount += 1;
      if (ageClass === "adult") summary.disneyAdultChildCount += 1;

      return summary;
    },
    { under3Count: 0, childCount: 0, disneyAdultChildCount: 0 }
  );

  const ageSummary = {
    under3Count: childAgeSummary.under3Count,
    childCount: childAgeSummary.childCount,
    disneyAdultCount: safeProfile.adultCount + childAgeSummary.disneyAdultChildCount,
  };

  const validHeights = children
    .map((child) => Number(child.heightInches))
    .filter((height) => Number.isFinite(height) && height > 0);

  const shortestHeightInches = validHeights.length
    ? Math.min(...validHeights)
    : null;

  const resortProfile = getResortProfile(safeProfile.resortContext?.resortId);
  const tripAccessStatus = getDateAccessStatus(safeProfile.tripContext);
  const completion = getFamilyProfileCompletion(safeProfile);

  return {
    ...safeProfile,
    isSetupComplete: completion.isComplete,
    resortProfile,
    tripAccessStatus,
    ageSummary,
    shortestHeightInches,
    hasUnder3: ageSummary.under3Count > 0,
    hasSmallChildren: ageSummary.under3Count > 0 || ageSummary.childCount > 0,
    hasHeightLimitedRiders:
      shortestHeightInches != null && shortestHeightInches < 48,
  };
}

export function readStoredFamilyProfile() {
  try {
    const raw = localStorage.getItem(FAMILY_PROFILE_STORAGE_KEY);
    return normalizeFamilyProfile(raw ? JSON.parse(raw) : DEFAULT_FAMILY_PROFILE);
  } catch {
    return normalizeFamilyProfile(DEFAULT_FAMILY_PROFILE);
  }
}

export function writeStoredFamilyProfile(profile) {
  try {
    localStorage.setItem(
      FAMILY_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizeFamilyProfile(profile))
    );
  } catch (err) {
    console.warn("TOHI: could not save family profile", err);
  }
}
