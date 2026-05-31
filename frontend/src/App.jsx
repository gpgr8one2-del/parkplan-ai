import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage, trackEvent } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { getCurrentTimeContext } from "./utils/timeContext";
import { formatCloseTimeLabel } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";
import { getRideMeta } from "./rideMetadata";
import { shouldShowRideInWaitList } from "./attractionDisplayFilters";
import { getResortOptions, getResortProfile } from "./resortProfiles";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { RecommendationCard } from "./components/RecommendationCard";
import { WaitTimesList } from "./components/WaitTimesList";
import { WhileYouWaitCard } from "./components/WhileYouWaitCard";
import { useMiniGames } from "./hooks/useMiniGames";

const PARKS = [
  { id: "magic_kingdom", name: "Magic Kingdom" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood", name: "Hollywood Studios" },
  { id: "animal_kingdom", name: "Animal Kingdom" },
  { id: "universal_sf", name: "Universal Studios Florida" },
  { id: "islands", name: "Islands of Adventure" },
  { id: "epic_universe", name: "Epic Universe" },
];

const LAND_OPTIONS = {
  magic_kingdom: [
    {
      value: "main_street",
      label: "Main Street / near entrance, shops, castle hub",
    },
    {
      value: "adventureland",
      label: "Adventureland / near Pirates, Jungle Cruise, Aladdin",
    },
    {
      value: "frontierland",
      label: "Frontierland / near Big Thunder, Tiana’s, Country Bears",
    },
    {
      value: "liberty_square",
      label: "Liberty Square / near Haunted Mansion, Hall of Presidents",
    },
    {
      value: "fantasyland",
      label: "Fantasyland / near Peter Pan, Small World, Seven Dwarfs, Little Mermaid",
    },
    {
      value: "tomorrowland",
      label: "Tomorrowland / near Space Mountain, TRON, Buzz, PeopleMover",
    },
  ],

  epcot: [
    {
      value: "world_celebration",
      label: "World Celebration / near Spaceship Earth, Connections, Creations",
    },
    {
      value: "world_discovery",
      label: "World Discovery / near Guardians, Test Track, Mission: SPACE",
    },
    {
      value: "world_nature",
      label: "World Nature / near Soarin’, The Land, The Seas, Moana",
    },
    {
      value: "world_showcase_west",
      label: "World Showcase West / near Remy, France, UK, Canada",
    },
    {
      value: "world_showcase_center",
      label: "World Showcase Center / near America, Japan, Italy, Morocco",
    },
    {
      value: "world_showcase_east",
      label: "World Showcase East / near Frozen, Mexico, Norway, China",
    },
  ],

  hollywood: [
    {
      value: "hollywood_boulevard",
      label: "Hollywood Boulevard / near Mickey & Minnie’s Runaway Railway",
    },
    {
      value: "sunset_boulevard",
      label: "Sunset Boulevard / near Tower of Terror, Rock ’n’ Roller",
    },
    {
      value: "echo_lake",
      label: "Echo Lake / near Star Tours, Frozen Sing-Along, Backlot Express",
    },
    {
      value: "grand_avenue",
      label: "Grand Avenue / near BaseLine, ABC Commissary side",
    },
    {
      value: "star_wars_galaxys_edge",
      label: "Galaxy’s Edge / near Rise, Falcon, Docking Bay 7",
    },
    {
      value: "toy_story_land",
      label: "Toy Story Land / near Slinky, Toy Story Mania, Alien Saucers",
    },
    {
      value: "animation_courtyard",
      label: "Animation Courtyard / near Disney Junior, Walt Disney Presents area",
    },
    {
      value: "commissary_lane",
      label: "Commissary Lane / near ABC Commissary, Sci-Fi Dine-In",
    },
  ],

  animal_kingdom: [
    {
      value: "oasis",
      label: "Oasis / near front entrance, ticket tapstiles, Oasis trails",
    },
    {
      value: "discovery_island",
      label: "Discovery Island / near Tree of Life, Zootopia, Nemo, Adventurers Outpost, Flame Tree",
    },
    {
      value: "pandora",
      label: "Pandora / near Flight of Passage, Na’vi River Journey, Satu’li Canteen",
    },
    {
      value: "africa",
      label: "Africa / near Kilimanjaro Safaris, Festival of the Lion King, Gorilla Falls, Harambe",
    },
    {
      value: "asia",
      label: "Asia / near Expedition Everest, Kali River Rapids, Maharajah Jungle Trek, Yak & Yeti",
    },
    {
      value: "rafikis_planet_watch",
      label: "Rafiki’s Planet Watch / near Bluey’s Wild World, Animation Experience, Affection Section",
    },
    {
      value: "tropical_americas_construction",
      label: "Tropical Americas construction / former DinoLand side, near Nemo theater path",
    },
  ],
};

function getDefaultLandForPark(parkId) {
  return LAND_OPTIONS[parkId]?.[0]?.value || "";
}

function getSafeLandForPark(parkId, land) {
  const options = LAND_OPTIONS[parkId] || [];
  const hasLand = options.some((option) => option.value === land);

  return hasLand ? land : getDefaultLandForPark(parkId);
}

const STORAGE_KEY = "parkplan.state";
const FAMILY_PROFILE_STORAGE_KEY = "parkplan.familyProfile";

const AUTO_REFRESH_MS = 3 * 60 * 1000;

// Testing safety valve: while building, Gabe can still preview and test the full app.
// This must never appear in production because it makes the onboarding gate meaningless.
const DEV_ALLOW_FULL_APP_WITHOUT_PROFILE = process.env.NODE_ENV !== "production";
const DEV_PREVIEW_STORAGE_KEY = "parkplan.devPreviewFullApp";

const DEFAULT_FAMILY_PROFILE = {
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

const FAMILY_PRIORITY_OPTIONS = [
  { value: "headliners", label: "Big rides / headliners" },
  { value: "low_stress", label: "Low-stress family flow" },
  { value: "characters", label: "Characters" },
  { value: "princesses", label: "Princesses" },
  { value: "shows_parades", label: "Shows / parades" },
  { value: "food_snacks", label: "Food / snacks" },
  { value: "bluey_younger_kids", label: "Bluey / younger-kid moments" },
  { value: "ac_breaks", label: "AC / recovery breaks" },
];

const DISNEY_PARK_OPTIONS = [
  { value: "magic_kingdom", label: "Magic Kingdom" },
  { value: "epcot", label: "EPCOT" },
  { value: "hollywood", label: "Hollywood Studios" },
  { value: "animal_kingdom", label: "Animal Kingdom" },
];

function getDisneyAgeClass(age) {
  const numericAge = Number(age);

  if (!Number.isFinite(numericAge)) return "unknown";
  if (numericAge <= 2) return "under_3";
  if (numericAge >= 3 && numericAge <= 9) return "child";

  return "adult";
}

function getDisneyAgeLabel(ageClass) {
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

function getParkLabel(parkId) {
  return DISNEY_PARK_OPTIONS.find((park) => park.value === parkId)?.label || "Not set";
}

function getFamilyProfileCompletion(profile = {}) {
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

function readDevPreviewFullApp() {
  if (!DEV_ALLOW_FULL_APP_WITHOUT_PROFILE) return false;

  try {
    return localStorage.getItem(DEV_PREVIEW_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDevPreviewFullApp(enabled) {
  try {
    if (!DEV_ALLOW_FULL_APP_WITHOUT_PROFILE) {
      localStorage.removeItem(DEV_PREVIEW_STORAGE_KEY);
      return;
    }

    localStorage.setItem(DEV_PREVIEW_STORAGE_KEY, enabled ? "true" : "false");
  } catch (err) {
    console.warn("TOHI: could not save dev preview flag", err);
  }
}

function normalizeFamilyProfile(profile = {}) {
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

function buildFamilyProfileSummary(profile) {
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

function readStoredFamilyProfile() {
  try {
    const raw = localStorage.getItem(FAMILY_PROFILE_STORAGE_KEY);
    return normalizeFamilyProfile(raw ? JSON.parse(raw) : DEFAULT_FAMILY_PROFILE);
  } catch {
    return normalizeFamilyProfile(DEFAULT_FAMILY_PROFILE);
  }
}

function writeStoredFamilyProfile(profile) {
  try {
    localStorage.setItem(
      FAMILY_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizeFamilyProfile(profile))
    );
  } catch (err) {
    console.warn("TOHI: could not save family profile", err);
  }
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff7ed 0%, #f8fafc 100%)",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  color: "#0f172a",
};

const shell = { maxWidth: 900, margin: "0 auto", padding: 18 };

const card = {
  background: "rgba(255,255,255,.92)",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 16,
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  marginBottom: 14,
};

const button = {
  border: "1px solid #e2e8f0",
  background: "white",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const actionButton = {
  background: "rgba(255,255,255,.72)",
  border: "1px solid #dbeafe",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const premiumHeroCard = {
  ...card,
  background:
    "radial-gradient(circle at top left, #ffedd5 0%, #ffffff 42%, #eef2ff 100%)",
  border: "1px solid #fed7aa",
  boxShadow: "0 18px 45px rgba(124, 58, 237, .14)",
};

const premiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const lockedCardStyle = {
  ...card,
  border: "1px dashed #cbd5e1",
  background: "rgba(248,250,252,.92)",
  boxShadow: "none",
};

const celebrationOverlayStyle = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  zIndex: 9999,
};

const celebrationPieceBase = {
  position: "absolute",
  bottom: "-30px",
  width: 14,
  height: 18,
  borderRadius: "999px 999px 999px 999px",
  opacity: 0,
  animationName: "tohiFloatCelebrate",
  animationDuration: "1150ms",
  animationTimingFunction: "ease-out",
  animationFillMode: "forwards",
};

function readStoredParkState(parkId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return stored[parkId] || {};
  } catch {
    return {};
  }
}

function writeStoredParkState(parkId, parkState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    stored[parkId] = parkState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.warn("TOHI: could not save state", err);
  }
}

function formatActivityStartTime(isoString) {
  if (!isoString) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function formatAutoUpdateTime(isoString) {
  if (!isoString) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function getElapsedMinutesSince(isoString) {
  if (!isoString) return null;

  const startedAtMs = new Date(isoString).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return null;
  }

  const elapsedMs = Date.now() - startedAtMs;

  if (elapsedMs < 0) {
    return 0;
  }

  return Math.max(0, Math.round(elapsedMs / 60000));
}

function buildCurrentActivityContext(currentActivity) {
  if (!currentActivity) return null;

  const elapsedMinutes =
    currentActivity.type === "in_line"
      ? getElapsedMinutesSince(currentActivity.startedAt)
      : null;

  return {
    ...currentActivity,
    elapsedMinutesInLine: elapsedMinutes,
    summary:
      currentActivity.type === "in_line"
        ? `User is currently in line for ${currentActivity.rideName}. Posted wait when joined: ${
            currentActivity.postedWaitAtStart ?? "unknown"
          } minutes. Elapsed time in line: ${
            elapsedMinutes ?? "unknown"
          } minutes.`
        : null,
  };
}

function buildLocalChatFallback({
  activePark,
  weatherMode,
  currentActivityContext,
}) {
  if (currentActivityContext?.type === "in_line") {
    const elapsed = currentActivityContext.elapsedMinutesInLine;
    const posted = currentActivityContext.postedWaitAtStart;
    const rideName = currentActivityContext.rideName || "this ride";
    const elapsedText =
      elapsed != null ? `you’ve already waited about ${elapsed} minutes` : "you’re already in line";
    const postedText =
      posted != null ? `the posted wait was ${posted} minutes when you joined` : "I do not have the original posted wait";

    return `I’m having trouble reaching AI chat right now, but here’s the safe TOHI call: since ${elapsedText} for ${rideName} and ${postedText}, don’t automatically bail unless the line has stopped, someone feels overheated, or the kids are close to a true meltdown. If the line is moving and this ride matters to your family, try to finish it, then make food, water, and AC the immediate next move.`;
  }

  if (weatherMode?.mode && weatherMode.mode !== "normal") {
    return `I’m having trouble reaching AI chat right now, but based on current weather mode, keep the plan simple: favor nearby indoor options, water, shade, food, or a seated reset before chasing a farther ride.`;
  }

  return "I’m having trouble reaching AI chat right now. Try again in a minute. If the family is tired or hot, use this as a good moment for water, AC, food, or a nearby low-stress ride before making a big walk.";
}

function buildWeatherDisplay(weather) {
  if (!weather) return "Loading weather...";

  const parts = [];

  if (weather.tempF != null) {
    parts.push(`${weather.tempF}°F`);
  }

  if (
    weather.feelsLikeF != null &&
    weather.tempF != null &&
    Math.abs(weather.feelsLikeF - weather.tempF) >= 2
  ) {
    parts.push(`feels like ${weather.feelsLikeF}°F`);
  }

  if (weather.humidity != null) {
    parts.push(`${weather.humidity}% humidity`);
  }

  if (weather.summary) {
    parts.push(weather.summary);
  }

  if (weather.stormMode) {
    parts.push("Storm Mode active");
  }

  return parts.length ? parts.join(" · ") : "Loading weather...";
}

function formatLandLabel(parkId, land) {
  const labels = {
    magic_kingdom: {
      main_street: "Main Street, U.S.A.",
      adventureland: "Adventureland",
      frontierland: "Frontierland",
      liberty_square: "Liberty Square",
      fantasyland: "Fantasyland",
      tomorrowland: "Tomorrowland",
    },

    epcot: {
      world_celebration: "World Celebration",
      world_discovery: "World Discovery",
      world_nature: "World Nature",
      world_showcase_west: "World Showcase West / France-UK-Canada",
      world_showcase_center: "World Showcase Center / America-Japan-Italy",
      world_showcase_east: "World Showcase East / Mexico-Norway-China",
      world_showcase: "World Showcase",
      "American Adventure Pavilion": "American Adventure Pavilion",
    },

    hollywood: {
      hollywood_boulevard: "Hollywood Boulevard",
      sunset_boulevard: "Sunset Boulevard",
      echo_lake: "Echo Lake",
      grand_avenue: "Grand Avenue",
      star_wars_galaxys_edge: "Star Wars: Galaxy’s Edge",
      toy_story_land: "Toy Story Land",
      animation_courtyard: "Animation Courtyard",
      commissary_lane: "Commissary Lane",
    },

    animal_kingdom: {
      oasis: "Oasis",
      discovery_island: "Discovery Island",
      pandora: "Pandora",
      africa: "Africa",
      asia: "Asia",
      rafikis_planet_watch: "Rafiki’s Planet Watch",
      tropical_americas_construction: "Tropical Americas Construction",
    },
  };

  return labels[parkId]?.[land] || land || "Unknown area";
}

function getRideMetaForDisplay(parkId, ride) {
  return getRideMeta(parkId, ride?.id ?? ride?.name) || getRideMeta(parkId, ride?.name);
}

function getRecommendationSlotForRide(recommendations = {}, rideId) {
  if (rideId == null) return "";

  const targetId = String(rideId);
  const slots = [
    ["bestMove", recommendations.bestMove],
    ["backup", recommendations.backup],
    ["worthTheWalk", recommendations.worthTheWalk],
    ["planAhead", recommendations.planAhead],
    ["waitOnThis", recommendations.waitOnThis],
  ];

  const match = slots.find(([, ride]) => ride?.id != null && String(ride.id) === targetId);

  return match?.[0] || "wait_times";
}

function getRecommendationForRide(recommendations = {}, rideId) {
  if (rideId == null) return null;

  const targetId = String(rideId);

  return (
    [
      recommendations.bestMove,
      recommendations.backup,
      recommendations.worthTheWalk,
      recommendations.planAhead,
      recommendations.waitOnThis,
    ].find((ride) => ride?.id != null && String(ride.id) === targetId) || null
  );
}

function buildAccessState({ profileCompletion, devPreviewFullApp, timeContext }) {
  const profileComplete = Boolean(profileCompletion?.isComplete);
  const isDevPreviewing = Boolean(
    DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && devPreviewFullApp
  );
  const hasPersonalizedAccess = profileComplete || isDevPreviewing;
  const aiAllowedByTime = Boolean(timeContext?.aiAccess?.shouldAllowAi);

  const setupReason = profileComplete
    ? "Trip setup is complete."
    : "Finish trip setup to unlock personalized guidance.";

  const aiLockedReason = !hasPersonalizedAccess
    ? "Finish trip setup before using AI guidance."
    : !aiAllowedByTime && !isDevPreviewing
    ? timeContext?.aiAccess?.reason ||
      "AI guidance is not available for this trip timing yet."
    : "AI guidance is available.";

  return {
    plan: isDevPreviewing ? "dev_preview" : profileComplete ? "personalized" : "basic",
    isDevPreviewing,
    profileComplete,

    canViewWaitTimes: true,
    canUseRecommendations: hasPersonalizedAccess,
    canUseAiChat: isDevPreviewing || (hasPersonalizedAccess && aiAllowedByTime),
    canUseMiniGames: true,
    canUseDayOfGuidance: hasPersonalizedAccess,

    setupReason,
    recommendationLockedReason: setupReason,
    aiLockedReason,
  };
}

function App() {
  const [activePark, setActivePark] = useState("magic_kingdom");
  const [parkData, setParkData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationAutoEnabled, setLocationAutoEnabled] = useState(false);
  const [lastAutoUpdateAt, setLastAutoUpdateAt] = useState("");
  const [lastLocationUpdateAt, setLastLocationUpdateAt] = useState("");
  const [detectedLocationContext, setDetectedLocationContext] = useState(null);
  const [familyProfile, setFamilyProfile] = useState(() => readStoredFamilyProfile());
  const [activeScreen, setActiveScreen] = useState(() =>
    readStoredFamilyProfile().isSetupComplete ? "main" : "family_profile"
  );
  const [devPreviewFullApp, setDevPreviewFullApp] = useState(() =>
    readDevPreviewFullApp()
  );
  const [familyProfileStep, setFamilyProfileStep] = useState(1);

  const [currentLand, setCurrentLand] = useState(null);
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);

  const isRestoringParkState = useRef(false);

  useEffect(() => {
    writeStoredFamilyProfile(familyProfile);
  }, [familyProfile]);

  useEffect(() => {
    writeDevPreviewFullApp(devPreviewFullApp);
  }, [devPreviewFullApp]);

  const familyProfileSummary = useMemo(() => {
    return buildFamilyProfileSummary(familyProfile);
  }, [familyProfile]);

  const profileCompletion = useMemo(() => {
    return getFamilyProfileCompletion(familyProfileSummary);
  }, [familyProfileSummary]);

  const isProfileIncomplete = !profileCompletion.isComplete;

  const timeContext = useMemo(() => {
    return getCurrentTimeContext({
      activePark,
      familyProfile: familyProfileSummary,
    });
  }, [activePark, familyProfileSummary]);

  const access = useMemo(
    () =>
      buildAccessState({
        profileCompletion,
        devPreviewFullApp,
        timeContext,
      }),
    [profileCompletion, devPreviewFullApp, timeContext]
  );

  const hasPersonalizedAccess = access.canUseRecommendations;

  const resortOptions = useMemo(() => {
    return getResortOptions();
  }, []);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setError("");

      try {
        const [park, weatherData] = await Promise.all([
          fetchParkData(activePark, { force }),
          fetchWeather({ force }),
        ]);

        setParkData(park);
        setWeather(weatherData);
      } catch (err) {
        setError(err.message || "Could not load app data.");
      } finally {
        setLoading(false);
      }
    },
    [activePark]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const updateUserLocation = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLocationLoading(true);
        setLocationMessage("");
        setLocationError("");
      }

      try {
        const position = await getCurrentPosition();
        const detectedZone = detectNearestLocationZone({
          parkId: activePark,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        if (!detectedZone) {
          if (!silent) {
            setLocationError(
              "I could not match your location to this park yet. Pick the closest area manually for now."
            );
          }
          return null;
        }

        const structuredLocation = {
          source: "gps",
          parkId: activePark,
          landKey: detectedZone.landKey,
          landLabel: detectedZone.landLabel,
          nearestAnchorName: detectedZone.anchorName,
          nearestAnchorId: detectedZone.anchorId,
          nearestAnchorType: detectedZone.anchorType,
          distanceMeters: detectedZone.distanceMeters,
          confidence: detectedZone.confidence,
          updatedAt: new Date().toISOString(),
        };

        setDetectedLocationContext(structuredLocation);

        // Do not let low-confidence GPS yank families into the wrong land.
        if (detectedZone.confidence !== "low") {
          setCurrentLand(getSafeLandForPark(activePark, detectedZone.landKey));
        }

        const nowIso = structuredLocation.updatedAt;
        setLastLocationUpdateAt(nowIso);

        if (!silent || detectedZone.confidence !== "low") {
          setLocationMessage(
            `${detectedZone.message} ${
              detectedZone.confidence === "low"
                ? "If that does not look right, pick the closest area manually."
                : "Not right? Pick another area manually."
            }`
          );
        }

        setLocationError("");
        setLocationAutoEnabled(true);

        trackEvent("location_detected", {
          activePark,
          currentLand: detectedZone.landKey,
          screen: activeScreen,
          profileComplete: profileCompletion.isComplete,
          devPreviewFullApp,
          familyProfile: familyProfileSummary,
          timeContext,
          locationContext: structuredLocation,
          source: silent ? "auto_location_refresh" : "use_my_location",
          metadata: {
            confidence: detectedZone.confidence,
            nearestAnchorName: detectedZone.anchorName,
            distanceMeters: detectedZone.distanceMeters,
          },
        });

        return detectedZone;
      } catch (err) {
        const denied =
          err?.code === 1 ||
          String(err?.message || "").toLowerCase().includes("denied");

        if (!silent) {
          setLocationError(
            denied
              ? "Location permission was denied. No problem — pick the closest area manually."
              : "I could not get your location right now. Pick the closest area manually."
          );
        }

        if (denied) {
          setLocationAutoEnabled(false);
          setDetectedLocationContext(null);
        }

        trackEvent("location_failed", {
          activePark,
          currentLand,
          screen: activeScreen,
          profileComplete: profileCompletion.isComplete,
          devPreviewFullApp,
          familyProfile: familyProfileSummary,
          timeContext,
          source: silent ? "auto_location_refresh" : "use_my_location",
          metadata: {
            denied,
            message: err?.message || "unknown",
          },
        });

        return null;
      } finally {
        if (!silent) {
          setLocationLoading(false);
        }
      }
    },
    [
      activePark,
      activeScreen,
      currentLand,
      devPreviewFullApp,
      familyProfileSummary,
      profileCompletion.isComplete,
      timeContext,
    ]
  );

  useEffect(() => {
    const runAutoRefresh = async () => {
      if (document.visibilityState !== "visible") return;

      await loadData(true);
      setLastAutoUpdateAt(new Date().toISOString());

      if (locationAutoEnabled) {
        await updateUserLocation({ silent: true });
      }
    };

    const intervalId = setInterval(runAutoRefresh, AUTO_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runAutoRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData, locationAutoEnabled, updateUserLocation]);

  useEffect(() => {
    isRestoringParkState.current = true;

    const saved = readStoredParkState(activePark);

    setCurrentLand(saved.currentLand ? getSafeLandForPark(activePark, saved.currentLand) : null);
    setCompletedRideIds(saved.completedRideIds || []);
    setSkippedRideIds(saved.skippedRideIds || []);
    setReportedRideIssueIds(saved.reportedRideIssueIds || []);
    setCurrentActivity(saved.currentActivity || null);
    setLocationMessage("");
    setLocationError("");
    setLastLocationUpdateAt("");
    setDetectedLocationContext(null);

    setTimeout(() => {
      isRestoringParkState.current = false;
    }, 0);
  }, [activePark]);

  useEffect(() => {
    if (isRestoringParkState.current) return;

    writeStoredParkState(activePark, {
      currentLand,
      completedRideIds,
      skippedRideIds,
      reportedRideIssueIds,
      currentActivity,
    });
  }, [
    activePark,
    currentLand,
    completedRideIds,
    skippedRideIds,
    reportedRideIssueIds,
    currentActivity,
  ]);

  const sortedRides = useMemo(() => {
    return [...(parkData?.rides || [])]
      .filter((ride) => shouldShowRideInWaitList(activePark, ride))
      .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0));
  }, [parkData, activePark]);

  const activeRideId =
    currentActivity?.type === "in_line" && currentActivity?.rideId != null
      ? String(currentActivity.rideId)
      : null;

  const recommendationAvoidedRideIds = useMemo(() => {
    const ids = new Set([
      ...skippedRideIds.map(String),
      ...reportedRideIssueIds.map(String),
    ]);

    if (activeRideId) {
      ids.add(activeRideId);
    }

    return Array.from(ids);
  }, [skippedRideIds, reportedRideIssueIds, activeRideId]);

  const locationContextForDecisions = useMemo(() => {
    const safeDetectedLocation =
      detectedLocationContext?.parkId === activePark ? detectedLocationContext : null;

    if (!safeDetectedLocation && !currentLand) {
      return null;
    }

    return {
      type: safeDetectedLocation ? "gps" : "manual_land",
      land: safeDetectedLocation?.landKey || currentLand,
      landKey: safeDetectedLocation?.landKey || currentLand,
      landLabel:
        safeDetectedLocation?.landLabel ||
        LAND_OPTIONS[activePark]?.find((option) => option.value === currentLand)?.label ||
        formatLandLabel(activePark, currentLand),
      locationMessage,
      detectedLocation: safeDetectedLocation,
      source: safeDetectedLocation ? "gps" : "manual",
      nearestAnchorName: safeDetectedLocation?.nearestAnchorName || null,
      nearestAnchorId: safeDetectedLocation?.nearestAnchorId || null,
      nearestAnchorType: safeDetectedLocation?.nearestAnchorType || null,
      distanceMeters: safeDetectedLocation?.distanceMeters ?? null,
      confidence: safeDetectedLocation?.confidence || null,
      updatedAt: safeDetectedLocation?.updatedAt || null,
    };
  }, [activePark, currentLand, detectedLocationContext, locationMessage]);

  const recommendations = useMemo(() => {
    return getNextBestRides({
      parkId: activePark,
      rides: parkData?.rides || [],
      weather,
      locationContext: locationContextForDecisions,
      completedRideIds,
      skippedRideIds: recommendationAvoidedRideIds,
      familyProfile: familyProfileSummary,
      timeContext,
    });
  }, [
    activePark,
    parkData,
    weather,
    locationContextForDecisions,
    completedRideIds,
    recommendationAvoidedRideIds,
    familyProfileSummary,
    timeContext,
  ]);

  const weatherMode = useMemo(() => {
    return getWeatherMode(weather);
  }, [weather]);

  const recoverySuggestions = useMemo(() => {
    return getRecoverySuggestions({
      parkId: activePark,
      weather,
      currentLand,
    });
  }, [activePark, weather, currentLand]);

  const closeTimeLabel = useMemo(() => {
    return formatCloseTimeLabel(activePark);
  }, [activePark]);

  const whileYouWaitContent = useMemo(() => {
    if (currentActivity?.type !== "in_line") return null;

    return getRideExperienceContent(activePark, currentActivity.rideName);
  }, [activePark, currentActivity]);

  const currentActivityContext = useMemo(() => {
    return buildCurrentActivityContext(currentActivity);
  }, [currentActivity]);

  const trackAppEvent = useCallback(
    (eventType, payload = {}) => {
      trackEvent(eventType, {
        activePark,
        currentLand,
        screen: activeScreen,
        profileComplete: profileCompletion.isComplete,
        devPreviewFullApp,
        familyProfile: familyProfileSummary,
        timeContext,
        locationContext: locationContextForDecisions,
        ...payload,
        metadata: {
          accessPlan: access.plan,
          ...(payload.metadata || {}),
        },
      });
    },
    [
      activePark,
      currentLand,
      activeScreen,
      profileCompletion.isComplete,
      devPreviewFullApp,
      familyProfileSummary,
      timeContext,
      locationContextForDecisions,
      access.plan,
    ]
  );

  const {
    activeMiniGame,
    activeMiniGameType,
    revealedTriviaAnswer,
    selectedTriviaChoice,
    selectedFamilyVoteOption,
    lookAroundFound,
    celebrationPieces,
    handleMiniGameTypeChange,
    handleTriviaChoice,
    handleLookAroundFound,
    handleFamilyVote,
    handleNextMiniGame,
    showTriviaAnswer,
  } = useMiniGames({
    activePark,
    currentLand,
    currentActivity,
    trackAppEvent,
  });

  useEffect(() => {
    trackAppEvent(activeScreen === "family_profile" ? "profile_screen_viewed" : "main_screen_viewed", {
      source: "screen",
      metadata: {
        familyProfileStep,
        accessPlan: access.plan,
        canUseRecommendations: access.canUseRecommendations,
        canUseAiChat: access.canUseAiChat,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen]);

  function updateFamilyProfile(patch) {
    setFamilyProfile((prev) => normalizeFamilyProfile({ ...prev, ...patch }));
  }

  function handleAdultCountChange(nextAdultCount) {
    setFamilyProfile((prev) =>
      normalizeFamilyProfile({
        ...prev,
        adultCount: nextAdultCount,
      })
    );
  }

  function handleChildCountChange(nextChildCount) {
    setFamilyProfile((prev) =>
      normalizeFamilyProfile({
        ...prev,
        childCount: nextChildCount,
      })
    );
  }

  function handleChildChange(index, field, value) {
    setFamilyProfile((prev) => {
      const safeProfile = normalizeFamilyProfile(prev);
      const children = [...safeProfile.children];

      children[index] = {
        ...children[index],
        [field]: value,
      };

      return normalizeFamilyProfile({
        ...safeProfile,
        children,
      });
    });
  }

  function handlePriorityToggle(priorityValue) {
    setFamilyProfile((prev) => {
      const safeProfile = normalizeFamilyProfile(prev);
      const priorities = new Set(safeProfile.priorities || []);

      if (priorities.has(priorityValue)) {
        priorities.delete(priorityValue);
      } else {
        priorities.add(priorityValue);
      }

      return normalizeFamilyProfile({
        ...safeProfile,
        priorities: Array.from(priorities),
      });
    });
  }

  function handleSelectedParkToggle(parkValue) {
    setFamilyProfile((prev) => {
      const safeProfile = normalizeFamilyProfile(prev);
      const selectedParks = new Set(safeProfile.tripContext?.selectedParks || []);

      if (selectedParks.has(parkValue)) {
        selectedParks.delete(parkValue);
      } else {
        selectedParks.add(parkValue);
      }

      const nextSelectedParks = Array.from(selectedParks);
      const fallbackPark = nextSelectedParks[0] || "";

      return normalizeFamilyProfile({
        ...safeProfile,
        tripContext: {
          ...safeProfile.tripContext,
          selectedParks: nextSelectedParks,
          firstPark: nextSelectedParks.includes(safeProfile.tripContext.firstPark)
            ? safeProfile.tripContext.firstPark
            : fallbackPark,
          priorityPark: nextSelectedParks.includes(safeProfile.tripContext.priorityPark)
            ? safeProfile.tripContext.priorityPark
            : fallbackPark,
        },
      });
    });
  }

  function handleFamilyProfileDone() {
    const completion = getFamilyProfileCompletion(familyProfile);

    trackAppEvent(completion.isComplete ? "profile_completed" : "profile_completion_blocked", {
      source: "profile_setup",
      profileComplete: completion.isComplete,
      metadata: {
        missing: completion.missing,
        familyProfileStep,
      },
    });

    setFamilyProfile((prev) =>
      normalizeFamilyProfile({
        ...prev,
        isSetupComplete: completion.isComplete,
      })
    );

    if (completion.isComplete || (DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && devPreviewFullApp)) {
      setActiveScreen("main");
    }
  }

  function handleInLine(ride) {
    if (!ride?.id) return;

    const id = String(ride.id);
    const recommendationSlot = getRecommendationSlotForRide(recommendations, id);
    const recommendation = getRecommendationForRide(recommendations, id) || ride;

    trackAppEvent("recommendation_in_line_clicked", {
      source: recommendationSlot === "wait_times" ? "wait_times" : "recommendation_card",
      recommendationSlot,
      recommendation,
      action: {
        type: "in_line",
        label: "In Line",
      },
      metadata: {
        rideId: id,
        rideName: ride.name,
      },
    });

    setCurrentActivity({
      type: "in_line",
      rideId: id,
      rideName: ride.name || "Selected attraction",
      land: ride.land || "",
      startedAt: new Date().toISOString(),
      postedWaitAtStart: ride.waitTime ?? null,
    });

    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));
  }

  function handleDone(rideId) {
    if (rideId == null) return;
    const id = String(rideId);
    const recommendationSlot = getRecommendationSlotForRide(recommendations, id);
    const recommendation = getRecommendationForRide(recommendations, id);

    trackAppEvent("recommendation_done_clicked", {
      source: recommendationSlot === "wait_times" ? "wait_times" : "recommendation_card",
      recommendationSlot,
      recommendation,
      action: {
        type: "done",
        label: "Done",
      },
      metadata: {
        rideId: id,
      },
    });

    setCompletedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleSkip(rideId) {
    if (rideId == null) return;
    const id = String(rideId);
    const recommendationSlot = getRecommendationSlotForRide(recommendations, id);
    const recommendation = getRecommendationForRide(recommendations, id);

    trackAppEvent("recommendation_skipped", {
      source: recommendationSlot === "wait_times" ? "wait_times" : "recommendation_card",
      recommendationSlot,
      recommendation,
      action: {
        type: "skip",
        label: "Skip",
      },
      metadata: {
        rideId: id,
      },
    });

    setSkippedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleReportRideIssue(ride) {
    if (!ride?.id) return;

    const id = String(ride.id);
    const recommendationSlot = getRecommendationSlotForRide(recommendations, id);
    const recommendation = getRecommendationForRide(recommendations, id) || ride;

    trackAppEvent("ride_issue_reported", {
      source: recommendationSlot === "wait_times" ? "wait_times" : "recommendation_card",
      recommendationSlot,
      recommendation,
      action: {
        type: "report_issue",
        label: "Report Issue",
      },
      metadata: {
        rideId: id,
        rideName: ride.name,
      },
    });

    setReportedRideIssueIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleCancelCurrentActivity() {
    trackAppEvent("current_activity_cancelled", {
      source: "while_you_wait",
      action: {
        type: "cancel_current_activity",
        label: "Cancel",
      },
      metadata: {
        rideId: currentActivity?.rideId,
        rideName: currentActivity?.rideName,
        elapsedMinutesInLine: currentActivityContext?.elapsedMinutesInLine,
      },
    });

    setCurrentActivity(null);
  }

  async function handleUseMyLocation() {
    await updateUserLocation({ silent: false });
  }

  function handleResetRecs() {
    trackAppEvent("recommendation_state_reset", {
      source: "recommendation_controls",
      action: {
        type: "reset",
        label: "Reset recommendations",
      },
      metadata: {
        completedCount: completedRideIds.length,
        skippedCount: skippedRideIds.length,
        reportedIssueCount: reportedRideIssueIds.length,
      },
    });

    setCompletedRideIds([]);
    setSkippedRideIds([]);
    setReportedRideIssueIds([]);
    setCurrentActivity(null);
  }


  function renderLockedFeatureCard({ title, body, actionLabel = "Finish trip setup" }) {
    return (
      <section style={lockedCardStyle}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#7c3aed" }}>
          PERSONALIZED FEATURE
        </div>
        <h3 style={{ margin: "6px 0 6px" }}>{title}</h3>
        <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.45 }}>
          {body}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setActiveScreen("family_profile")}
            style={{
              ...button,
              background: "#0f172a",
              color: "white",
            }}
          >
            {actionLabel}
          </button>

          {DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && (
            <button
              type="button"
              onClick={() => setDevPreviewFullApp(true)}
              style={{
                ...button,
                color: "#7c3aed",
                borderColor: "#ddd6fe",
              }}
            >
              Dev Preview
            </button>
          )}
        </div>
      </section>
    );
  }

  function renderRideActions(ride) {
    if (!ride?.id) return null;

    const isActiveRide = activeRideId === String(ride.id);

    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => handleInLine(ride)}
          disabled={isActiveRide}
          style={{
            ...actionButton,
            color: isActiveRide ? "#94a3b8" : "#6d28d9",
            borderColor: isActiveRide ? "#e2e8f0" : "#ddd6fe",
            cursor: isActiveRide ? "not-allowed" : "pointer",
          }}
        >
          {isActiveRide ? "In Line Now" : "In Line"}
        </button>

        <button
          onClick={() => handleDone(ride.id)}
          style={{ ...actionButton, color: "#166534" }}
        >
          ✓ Done
        </button>

        <button
          onClick={() => handleSkip(ride.id)}
          style={{ ...actionButton, color: "#64748b" }}
        >
          Skip
        </button>

        <button
          onClick={() => handleReportRideIssue(ride)}
          style={{
            ...actionButton,
            color: "#9a3412",
            borderColor: "#fed7aa",
          }}
        >
          Report Issue
        </button>
      </div>
    );
  }

  function renderShowtimeInfo(ride) {
    const meta = getRideMetaForDisplay(activePark, ride);
    const showProfile = ride?.showProfile || meta?.showProfile;

    if (!showProfile?.showtimes?.length) return null;

    return (
      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 14,
          border: "1px solid #e9d5ff",
          background: "rgba(250,245,255,.75)",
        }}
      >
        <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
          SHOWTIMES
        </div>

        <p
          style={{
            margin: "5px 0 0",
            color: "#334155",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {showProfile.showtimes.join(" · ")}
        </p>

        {showProfile.recommendedShowtimes?.length > 0 && (
          <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
            Best target: {showProfile.recommendedShowtimes.join(" or ")}
          </p>
        )}

        {(showProfile.arrivalBufferMinutes || showProfile.middayArrivalBufferMinutes) && (
          <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
            Arrival buffer:{" "}
            {showProfile.middayArrivalBufferMinutes
              ? `${showProfile.arrivalBufferMinutes || 15}–${showProfile.middayArrivalBufferMinutes} min depending on heat/crowds`
              : `${showProfile.arrivalBufferMinutes} min`}
          </p>
        )}

        {showProfile.verifyDailySchedule && (
          <p style={{ margin: "6px 0 0", color: "#9a3412", fontSize: 12 }}>
            Verify in My Disney Experience. Showtimes can change by day.
          </p>
        )}
      </div>
    );
  }


  async function handleChatSubmit(e) {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) return;

    trackAppEvent("ai_chat_sent", {
      source: "ai_chat",
      action: {
        type: "send_chat",
        label: "Send",
      },
      metadata: {
        messageLength: trimmed.length,
        hasCurrentActivity: Boolean(currentActivityContext),
      },
    });

    const nextChat = [...chat, { role: "user", content: trimmed }];
    setChat(nextChat);
    setMessage("");
    setChatLoading(true);

    try {
      const res = await sendChatMessage(trimmed, {
        activePark,
        weather,
        weatherMode,
        recommendations,
        conversationHistory: nextChat.slice(-6),
        completedRideIds,
        skippedRideIds,
        reportedRideIssueIds,
        currentLand,
        familyProfile: familyProfileSummary,
        timeContext,
        locationContext: locationContextForDecisions,
        currentActivity: currentActivityContext,
        currentActivityContext,
        parkPlanBehaviorHints: {
          inLineDecisionRule:
            "If the user is already in line and asks whether to leave, do not give a hard leave-the-line recommendation unless safety, overheating, true meltdown risk, ride closure, or a stalled line clearly outweighs the ride value. If elapsed line time, line movement, or must-do status is missing, ask one quick clarifying question or give stay-vs-leave thresholds.",
          familyEnergyRule:
            "When kids are tired, hungry, hot, or cranky, balance ride value against family energy. Recommend food, water, AC, and resort breaks when appropriate, but respect high-value waits and sunk wait time.",
        },
      });

      setChat([...nextChat, { role: "assistant", content: res.reply }]);
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: buildLocalChatFallback({
            activePark,
            weatherMode,
            currentActivityContext,
          }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const landOptions = LAND_OPTIONS[activePark] || [];
  const hiddenRideCount =
    completedRideIds.length +
    skippedRideIds.length +
    reportedRideIssueIds.length +
    (currentActivity ? 1 : 0);

  const primaryRecommendation =
    recommendations.bestMove ||
    recommendations.backup ||
    recommendations.worthTheWalk;

  const hasAnyRecommendation = Boolean(primaryRecommendation);

  useEffect(() => {
    if (!hasPersonalizedAccess) return;

    const cards = [
      ["bestMove", recommendations.bestMove],
      ["backup", recommendations.backup],
      ["worthTheWalk", recommendations.worthTheWalk],
      ["planAhead", recommendations.planAhead],
      ["waitOnThis", recommendations.waitOnThis],
    ].filter(([, ride]) => ride?.id);

    if (!cards.length) return;

    cards.forEach(([slot, ride]) => {
      trackAppEvent("recommendation_shown", {
        source: "recommendation_card",
        recommendationSlot: slot,
        recommendation: ride,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPersonalizedAccess,
    recommendations.bestMove?.id,
    recommendations.backup?.id,
    recommendations.worthTheWalk?.id,
    recommendations.planAhead?.id,
    recommendations.waitOnThis?.id,
  ]);

  if (activeScreen === "family_profile") {
    return (
      <OnboardingFlow
        familyProfileSummary={familyProfileSummary}
        familyProfileStep={familyProfileStep}
        familyProfile={familyProfile}
        isProfileIncomplete={isProfileIncomplete}
        setActiveScreen={setActiveScreen}
        setFamilyProfileStep={setFamilyProfileStep}
        setDevPreviewFullApp={setDevPreviewFullApp}
        devPreviewFullApp={devPreviewFullApp}
        profileCompletion={profileCompletion}
        updateFamilyProfile={updateFamilyProfile}
        handleAdultCountChange={handleAdultCountChange}
        handleChildCountChange={handleChildCountChange}
        handleChildChange={handleChildChange}
        handlePriorityToggle={handlePriorityToggle}
        handleSelectedParkToggle={handleSelectedParkToggle}
        handleFamilyProfileDone={handleFamilyProfileDone}
        trackAppEvent={trackAppEvent}
        getDisneyAgeClass={getDisneyAgeClass}
        getDisneyAgeLabel={getDisneyAgeLabel}
        getParkLabel={getParkLabel}
        page={page}
        shell={shell}
        card={card}
        button={button}
        actionButton={actionButton}
        premiumHeroCard={premiumHeroCard}
        premiumBadge={premiumBadge}
        DISNEY_PARK_OPTIONS={DISNEY_PARK_OPTIONS}
        FAMILY_PRIORITY_OPTIONS={FAMILY_PRIORITY_OPTIONS}
        DEV_ALLOW_FULL_APP_WITHOUT_PROFILE={DEV_ALLOW_FULL_APP_WITHOUT_PROFILE}
        resortOptions={resortOptions}
      />
    );
  }

  return (
    <main style={page}>
      <style>
        {`
          @keyframes tohiFloatCelebrate {
            0% {
              opacity: 0;
              transform: translate3d(0, 0, 0) scale(.75) rotate(0deg);
            }
            12% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: translate3d(var(--tohi-drift), -92vh, 0) scale(1.15) rotate(var(--tohi-rotate));
            }
          }
        `}
      </style>

      {celebrationPieces.length > 0 && (
        <div style={celebrationOverlayStyle}>
          {celebrationPieces.map((piece) => (
            <div
              key={piece.id}
              style={{
                ...celebrationPieceBase,
                left: `${piece.left}%`,
                fontSize: piece.size,
                animationDelay: `${piece.delay}ms`,
                "--tohi-drift": `${piece.drift}px`,
                "--tohi-rotate": `${piece.rotate}deg`,
              }}
            >
              {piece.shape}
            </div>
          ))}
        </div>
      )}

      <div style={shell}>
        <header style={{ padding: "18px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -1 }}>
                TOHI
              </h1>
              <p style={{ color: "#64748b", marginTop: 6 }}>
                A calm family park companion for Disney World and Universal Orlando.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveScreen("family_profile")}
              style={{
                ...button,
                color: profileCompletion.isComplete ? "#166534" : "#9a3412",
                borderColor: profileCompletion.isComplete ? "#bbf7d0" : "#fed7aa",
                whiteSpace: "nowrap",
              }}
            >
              {profileCompletion.isComplete ? "Trip Setup" : "Finish Setup"}
            </button>
          </div>
        </header>

        {isProfileIncomplete && !hasPersonalizedAccess && (
          <section style={premiumHeroCard}>
            <span style={premiumBadge}>Basic Wait Times Mode</span>
            <h2 style={{ margin: "10px 0 6px", fontSize: 24 }}>
              Finish setup to unlock the real TOHI experience
            </h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
              You can still browse live waits and weather, but personalized Best Move,
              TOHI guidance, height filtering, resort-break logic, and day-of support need
              your family trip setup first.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setActiveScreen("family_profile")}
                style={{
                  ...button,
                  background: "#0f172a",
                  color: "white",
                }}
              >
                Finish Trip Setup
              </button>

              {DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && (
                <button
                  type="button"
                  onClick={() => {
                    trackAppEvent("dev_preview_enabled", {
                      source: "locked_feature",
                      metadata: {
                        missing: profileCompletion.missing,
                      },
                    });
                    setDevPreviewFullApp(true);
                  }}
                  style={{
                    ...button,
                    color: "#7c3aed",
                    borderColor: "#ddd6fe",
                  }}
                >
                  Dev Preview Full App
                </button>
              )}
            </div>
          </section>
        )}

        {isProfileIncomplete && access.isDevPreviewing && DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && (
          <section
            style={{
              ...card,
              border: "1px solid #ddd6fe",
              background: "#f5f3ff",
            }}
          >
            <strong style={{ color: "#6d28d9" }}>Developer Preview Active</strong>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>
              You are seeing the full app even though the guest profile is incomplete.
              Normal guests would only see basic wait times until setup is finished.
            </p>
            <button
              type="button"
              onClick={() => {
                trackAppEvent("dev_preview_disabled", {
                  source: "developer_preview_banner",
                });
                setDevPreviewFullApp(false);
              }}
              style={{ ...button, marginTop: 10, color: "#6d28d9" }}
            >
              Turn Off Preview Gate Bypass
            </button>
          </section>
        )}

        <section style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <MapPin size={18} />
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {parkData?.parkName || "Choose a park"}
                </h2>
                <FreshnessBadge
                  source={parkData?.source}
                  ageMs={parkData?.ageMs}
                  fetchedAt={parkData?.fetchedAt}
                />
              </div>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13 }}>
                {sortedRides.length} rides loaded
                {closeTimeLabel ? ` · closes ${closeTimeLabel}` : ""}
              </p>
            </div>

            <button style={button} onClick={() => loadData(true)} disabled={loading}>
              <RefreshCw size={14} /> {loading ? "Loading" : "Refresh"}
            </button>
          </div>

          <DataStatusBanner source={parkData?.source} />

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Live wait data can occasionally lag the official park app during ride
            reopenings or weather delays. Refresh before walking across the park
            for a headliner.
          </p>

          {error && (
            <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
          )}
        </section>

        <section style={card}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {PARKS.map((park) => (
              <button
                key={park.id}
                onClick={() => {
                  trackAppEvent("park_selected", {
                    source: "park_tabs",
                    activePark: park.id,
                    metadata: {
                      previousPark: activePark,
                      nextPark: park.id,
                    },
                  });

                  setActivePark(park.id);
                }}
                style={{
                  ...button,
                  background: activePark === park.id ? "#0f172a" : "white",
                  color: activePark === park.id ? "white" : "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                {park.name}
              </button>
            ))}
          </div>
        </section>

        <section style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CloudSun size={18} />
              <strong>Orlando Weather</strong>
            </div>

            <FreshnessBadge
              source={weather?.source}
              ageMs={weather?.ageMs}
              fetchedAt={weather?.fetchedAt}
            />
          </div>

          <p style={{ margin: "10px 0 0", color: "#334155" }}>
            {buildWeatherDisplay(weather)}
          </p>

          <DataStatusBanner source={weather?.source} />
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>Planning Status</strong>
          </div>

          <p style={{ margin: "10px 0 0", color: "#334155" }}>
            {timeContext.summary}
          </p>

          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Mode: {timeContext.planningMode.replace(/_/g, " ")} · AI:{" "}
            {access.canUseAiChat ? "available" : "not available"} · {access.aiLockedReason}
          </p>
        </section>

        {weatherMode.mode !== "normal" && (
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>{weatherMode.label}</h3>
            <p style={{ color: "#334155", marginTop: 0 }}>
              {weatherMode.message}
            </p>

            {recoverySuggestions.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                {recoverySuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid #fde68a",
                      background: "#fffbeb",
                    }}
                  >
                    <strong>{item.title}</strong>
                    <p style={{ margin: "6px 0 0", color: "#475569" }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {currentActivity?.type === "in_line" && (
          <section
            style={{
              ...card,
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
            }}
          >
            <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
              CURRENTLY IN LINE
            </div>

            <h3 style={{ margin: "5px 0", fontSize: 20 }}>
              {currentActivity.rideName}
            </h3>

            <p style={{ margin: "0 0 8px", color: "#475569" }}>
              {currentActivity.postedWaitAtStart != null
                ? `Posted wait when you joined: ${currentActivity.postedWaitAtStart} min`
                : "You marked this as your current line."}
              {currentActivity.startedAt
                ? ` · Started around ${formatActivityStartTime(currentActivity.startedAt)}`
                : ""}
              {currentActivityContext?.elapsedMinutesInLine != null
                ? ` · About ${currentActivityContext.elapsedMinutesInLine} min in line`
                : ""}
            </p>

            <p style={{ margin: "0 0 12px", color: "#334155" }}>
              I’ll stop recommending this against itself while you’re waiting. Mark it
              done when you finish, or cancel if you leave the line.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => handleDone(currentActivity.rideId)}
                style={{ ...button, color: "#166534", borderColor: "#bbf7d0" }}
              >
                ✓ Mark Done
              </button>

              <button
                onClick={handleCancelCurrentActivity}
                style={{ ...button, color: "#64748b" }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <WhileYouWaitCard
          whileYouWaitContent={whileYouWaitContent}
          activeMiniGame={activeMiniGame}
          activeMiniGameType={activeMiniGameType}
          revealedTriviaAnswer={revealedTriviaAnswer}
          selectedTriviaChoice={selectedTriviaChoice}
          selectedFamilyVoteOption={selectedFamilyVoteOption}
          lookAroundFound={lookAroundFound}
          handleMiniGameTypeChange={handleMiniGameTypeChange}
          handleTriviaChoice={handleTriviaChoice}
          handleLookAroundFound={handleLookAroundFound}
          handleFamilyVote={handleFamilyVote}
          handleNextMiniGame={handleNextMiniGame}
          showTriviaAnswer={showTriviaAnswer}
          card={card}
          button={button}
          actionButton={actionButton}
        />

        {hasPersonalizedAccess ? (
          <section style={card}>
          <h3 style={{ marginTop: 0 }}>Best Move Right Now</h3>

          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="current-land"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              What are you closest to?
            </label>
            <select
              id="current-land"
              value={currentLand || ""}
              onChange={(e) => {
                const nextLand = e.target.value || null;

                setCurrentLand(nextLand);
                setDetectedLocationContext(null);
                setLocationAutoEnabled(false);
                setLocationMessage(
                  nextLand
                    ? "Using your selected park area. You can update it anytime."
                    : ""
                );

                trackAppEvent("manual_location_selected", {
                  source: "current_land_dropdown",
                  currentLand: nextLand,
                  metadata: {
                    nextLand,
                  },
                });
              }}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                padding: "10px 12px",
                fontWeight: 700,
                background: "white",
                color: "#0f172a",
              }}
            >
              <option value="">Pick where you are now</option>
              {landOptions.map((land) => (
                <option key={land.value} value={land.value}>
                  {land.label}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locationLoading}
                style={{
                  ...actionButton,
                  color: "#1d4ed8",
                  borderColor: "#bfdbfe",
                }}
              >
                <MapPin size={13} />{" "}
                {locationLoading ? "Finding you..." : "Use My Location"}
              </button>

              <span style={{ color: "#64748b", fontSize: 12 }}>
                Optional. Used only to estimate your nearby park area.
              </span>
            </div>

            {(locationAutoEnabled || lastAutoUpdateAt || lastLocationUpdateAt) && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                Auto-updates while the app is open
                {lastAutoUpdateAt
                  ? ` · waits/weather ${formatAutoUpdateTime(lastAutoUpdateAt)}`
                  : ""}
                {lastLocationUpdateAt
                  ? ` · location ${formatAutoUpdateTime(lastLocationUpdateAt)}`
                  : ""}
              </p>
            )}

            {locationMessage && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#166534",
                  fontSize: 12,
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {locationMessage}
              </p>
            )}

            {locationError && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#b91c1c",
                  fontSize: 12,
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {locationError}
              </p>
            )}

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Pick the closest area. It does not need to be perfect, but it helps
              avoid bad cross-park recommendations.
            </p>
          </div>

          {reportedRideIssueIds.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                marginBottom: 12,
              }}
            >
              <strong>Ride issue reported</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                I’ll avoid recommending reported rides for now. Use reset to bring
                them back once things look normal.
              </p>
            </div>
          )}

          {hiddenRideCount > 0 && (
            <button
              onClick={handleResetRecs}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: 12,
                textDecoration: "underline",
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
              }}
            >
              Reset recommendations ({hiddenRideCount} hidden)
            </button>
          )}

          {recommendations.needsLocation || !currentLand ? (
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
              }}
            >
              <strong>Pick where you are first.</strong>
              <p style={{ margin: "6px 0 0", color: "#334155" }}>
                TOHI can show wait times without your location, but personalized next
                moves need your current park area so we do not send your family on a
                bad cross-park walk.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locationLoading}
                  style={{
                    ...button,
                    background: "#0f172a",
                    color: "white",
                  }}
                >
                  {locationLoading ? "Finding you..." : "Use My Location"}
                </button>
              </div>
            </div>
          ) : hasAnyRecommendation ? (
            <div style={{ display: "grid", gap: 10 }}>
              <RecommendationCard
                title="BEST MOVE"
                ride={primaryRecommendation}
                reason={`Why: ${
                  primaryRecommendation.reason ||
                  "best available option based on current conditions"
                }.`}
                color="#166534"
                borderColor="#bbf7d0"
                background="#f0fdf4"
                titleSize={20}
                renderShowtimeInfo={renderShowtimeInfo}
                renderRideActions={renderRideActions}
              />

              {recommendations.backup && recommendations.backup.id !== primaryRecommendation?.id && (
                <RecommendationCard
                  title="SMART BACKUP"
                  ride={recommendations.backup}
                  reason={`Why: ${recommendations.backup.reason}.`}
                  color="#1d4ed8"
                  borderColor="#bfdbfe"
                  background="#eff6ff"
                  renderShowtimeInfo={renderShowtimeInfo}
                  renderRideActions={renderRideActions}
                />
              )}

              {recommendations.worthTheWalk && recommendations.worthTheWalk.id !== primaryRecommendation?.id && (
                <RecommendationCard
                  title="WORTH THE WALK"
                  ride={recommendations.worthTheWalk}
                  reason="Not nearby, but the current wait is strong enough that it may be worth crossing over for."
                  color="#6d28d9"
                  borderColor="#ddd6fe"
                  background="#f5f3ff"
                  renderShowtimeInfo={renderShowtimeInfo}
                  renderRideActions={renderRideActions}
                />
              )}

              {recommendations.planAhead && recommendations.planAhead.id !== primaryRecommendation?.id && (
                <RecommendationCard
                  title="PLAN AHEAD"
                  ride={recommendations.planAhead}
                  reason={
                    recommendations.planAhead.planAheadReason ||
                    "This ride usually needs a strategy. Consider Lightning Lane, rope drop, late night, or watching for a rare dip."
                  }
                  color="#991b1b"
                  borderColor="#fecaca"
                  background="#fef2f2"
                  renderShowtimeInfo={renderShowtimeInfo}
                  renderRideActions={renderRideActions}
                />
              )}

              {recommendations.waitOnThis && recommendations.waitOnThis.id !== primaryRecommendation?.id && (
                <RecommendationCard
                  title="WAIT ON THIS"
                  ride={recommendations.waitOnThis}
                  reason="This wait is higher than this ride is usually worth. Check again later when crowds shift."
                  color="#9a3412"
                  borderColor="#fed7aa"
                  background="#fff7ed"
                  renderShowtimeInfo={renderShowtimeInfo}
                  renderRideActions={renderRideActions}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <strong>No strong recommendation right now.</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Refresh wait data, reset hidden rides, or use this as a good
                moment for a nearby indoor break, snack, restroom stop, or
                quick regroup.
              </p>
            </div>
          )}
        </section>

        ) : (
          renderLockedFeatureCard({
            title: "Personalized Best Move is locked until setup is finished",
            body:
              "Without your family profile, TOHI cannot safely know height limits, thrill comfort, heat sensitivity, resort-break realism, or what kind of day you are trying to protect.",
          })
        )}

        <WaitTimesList
          rides={sortedRides}
          activeRideId={activeRideId}
          activePark={activePark}
          card={card}
          formatLandLabel={formatLandLabel}
          renderShowtimeInfo={renderShowtimeInfo}
          renderRideActions={renderRideActions}
        />

        {access.canUseAiChat ? (
          <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={18} />
            <h3 style={{ margin: 0 }}>TOHI Assistant</h3>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {chat.length === 0 && (
              <p style={{ color: "#64748b" }}>
                Ask what to ride next, how to handle heat or weather, or how to keep your
                family’s day moving without overdoing it.
              </p>
            )}

            {chat.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  background: msg.role === "user" ? "#e0f2fe" : "#f1f5f9",
                }}
              >
                <strong>{msg.role === "user" ? "You" : "TOHI"}: </strong>
                {msg.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleChatSubmit}
            style={{ display: "flex", gap: 8, marginTop: 12 }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask TOHI..."
              style={{
                flex: 1,
                border: "1px solid #cbd5e1",
                borderRadius: 999,
                padding: "10px 12px",
              }}
            />
            <button style={button} disabled={chatLoading}>
              <Send size={14} /> {chatLoading ? "..." : "Send"}
            </button>
          </form>
        </section>
        ) : (
          renderLockedFeatureCard({
            title: access.profileComplete
              ? "AI guidance is not available for this trip timing yet"
              : "AI guidance needs your trip setup",
            body: access.aiLockedReason,
            actionLabel: access.profileComplete ? "Review Trip Setup" : "Set up AI guidance",
          })
        )}
      </div>
    </main>
  );
}

export default App;
