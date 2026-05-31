import { getCurrentTimeContext } from "./timeContext";
import { getResortProfile } from "../resortProfiles";

const FAMILY_PROFILE_STORAGE_KEY = "parkplan.familyProfile";

export const DEFAULT_FAMILY_PROFILE = {
  isSetupComplete: false,
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "child_1", label: "Child 1", age: "", heightInches: "" },
    { id: "child_2", label: "Child 2", age: "", heightInches: "" },
  ],
  wholeGroupRidesTogether: "warn",
  thrillTolerance: "",
  walkingTolerance: "",
  heatSensitivity: "",
  waterRidePreference: "depends",
  pace: "balanced",
  priorities: [],
  tripContext: {
    tripStartDate: "",
    tripEndDate: "",
    tripLengthDays: 1,
    parkDays: 1,
    selectedParks: ["magic_kingdom"],
    firstPark: "magic_kingdom",
    priorityPark: "magic_kingdom",
    parkHopper: "unknown",
  },
  planningPreferences: {
    planningMode: "balanced",
    dayBeforeHelp: "yes",
    dayOfHelp: "yes",
    ropeDropStyle: "flexible",
    arrivalStyle: "not_sure",
    middayBreakStyle: "flexible",
    napOrPoolBreak: "maybe",
    diningStyle: "quick_service",
    mustDoMode: "balanced",
    aiTone: "calm_direct",
  },
  resortContext: {
    stayingOnProperty: "unknown",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "",
    transportationMode: "unknown",
  },
  lightningLanePreference: "undecided",
};

export const FAMILY_PRIORITY_OPTIONS = [
  { value: "headliners", label: "Big rides / headliners" },
  { value: "low_stress", label: "Low-stress family flow" },
  { value: "characters", label: "Characters" },
  { value: "princesses", label: "Princesses" },
  { value: "shows_parades", label: "Shows / parades" },
  { value: "food_snacks", label: "Food / snacks" },
  { value: "bluey_younger_kids", label: "Bluey / younger-kid moments" },
  { value: "ac_breaks", label: "AC / recovery breaks" },
];

export const DISNEY_PARK_OPTIONS = [
  { value: "magic_kingdom", label: "Magic Kingdom" },
  { value: "epcot", label: "EPCOT" },
  { value: "hollywood", label: "Hollywood Studios" },
  { value: "animal_kingdom", label: "Animal Kingdom" },
];

export function getDisneyAgeClass(age) {
  const numericAge = Number(age);

  if (!Number.isFinite(numericAge)) return "unknown";
  if (numericAge <= 2) return "under_3";
  if (numericAge >= 3 && numericAge <= 9) return "child";

  return "adult";
}

export function getDisneyAgeLabel(ageClass) {
  if (ageClass === "under_3") return "Under 3 / no ticket";
  if (ageClass === "child") return "Disney child";
  if (ageClass === "adult") return "Disney adult";

  return "Age not set";
}

function getDateAccessStatus(tripContext = {}) {
  return getCurrentTimeContext({
    familyProfile: {
      tripContext,
      planningPreferences: DEFAULT_FAMILY_PROFILE.planningPreferences,
    },
  }).tripStatus;
}

export function getParkLabel(parkId) {
  return DISNEY_PARK_OPTIONS.find((park) => park.value === parkId)?.label || "Not set";
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

  if (!safeProfile.walkingTolerance) {
    missing.push("walking pace");
  }

  if (!safeProfile.heatSensitivity) {
    missing.push("heat sensitivity");
  }

  if (!safeProfile.priorities?.length) {
    missing.push("trip priorities");
  }

  if (!safeProfile.tripContext.selectedParks?.length) {
    missing.push("parks");
  }

  if (!safeProfile.tripContext.firstPark) {
    missing.push("first park");
  }

  if (!safeProfile.tripContext.priorityPark) {
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

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

export function normalizeFamilyProfile(profile = {}) {
  const merged = {
    ...DEFAULT_FAMILY_PROFILE,
    ...profile,
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
  };

  // Backward compatibility: older saved profiles used partySize + guests.
  const oldGuests = Array.isArray(profile.guests) ? profile.guests : [];
  const oldAdults = oldGuests.filter((guest) => getDisneyAgeClass(guest.age) === "adult");
  const oldChildren = oldGuests.filter((guest) => getDisneyAgeClass(guest.age) !== "adult");

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

  return {
    ...merged,
    adultCount,
    childCount,
    partySize: adultCount + childCount,
    tripContext: {
      ...merged.tripContext,
      tripStartDate: merged.tripContext?.tripStartDate || "",
      tripEndDate: merged.tripContext?.tripEndDate || "",
      tripLengthDays: Math.max(1, Math.min(21, Number(merged.tripContext?.tripLengthDays) || 1)),
      parkDays: Math.max(1, Math.min(21, Number(merged.tripContext?.parkDays) || 1)),
      selectedParks: Array.isArray(merged.tripContext?.selectedParks)
        ? merged.tripContext.selectedParks
        : [],
      firstPark: merged.tripContext?.firstPark || "",
      priorityPark: merged.tripContext?.priorityPark || "",
      parkHopper: merged.tripContext?.parkHopper || "unknown",
    },
    planningPreferences: {
      ...DEFAULT_FAMILY_PROFILE.planningPreferences,
      ...(merged.planningPreferences || {}),
    },
    children,
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
    priorities: Array.isArray(merged.priorities) ? merged.priorities : [],
  };
}

export function buildFamilyProfileSummary(profile) {
  const safeProfile = normalizeFamilyProfile(profile);
  const children = safeProfile.children || [];

  const childAgeSummary = children.reduce(
    (summary, child) => {
      const ageClass = getDisneyAgeClass(child.age);

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

  return {
    ...safeProfile,
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
