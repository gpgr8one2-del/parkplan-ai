import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { formatCloseTimeLabel } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";
import { getRideMeta } from "./rideMetadata";
import { shouldShowRideInWaitList } from "./attractionDisplayFilters";
import { getResortOptions, getResortProfile } from "./resortProfiles";
import { getMiniGameForContext, MINI_GAME_TYPES } from "./data/miniGames/magicKingdomMiniGames";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";

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

const DEFAULT_FAMILY_PROFILE = {
  isSetupComplete: false,
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "child_1", label: "Child 1", age: "", heightInches: "" },
    { id: "child_2", label: "Child 2", age: "", heightInches: "" },
  ],
  wholeGroupRidesTogether: "warn",
  thrillTolerance: "mixed",
  walkingTolerance: "medium",
  heatSensitivity: "medium",
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

function getTodayDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getDateAccessStatus(tripContext = {}) {
  const today = getTodayDateString();
  const start = tripContext.tripStartDate || "";
  const end = tripContext.tripEndDate || "";

  if (!start || !end) {
    return {
      hasDates: false,
      isBeforeTrip: false,
      isDuringTrip: false,
      isAfterTrip: false,
      status: "dates_missing",
      message: "Trip dates are not set yet.",
    };
  }

  if (today < start) {
    return {
      hasDates: true,
      isBeforeTrip: true,
      isDuringTrip: false,
      isAfterTrip: false,
      status: "before_trip",
      message: "Trip is upcoming.",
    };
  }

  if (today > end) {
    return {
      hasDates: true,
      isBeforeTrip: false,
      isDuringTrip: false,
      isAfterTrip: true,
      status: "after_trip",
      message: "Trip dates have passed.",
    };
  }

  return {
    hasDates: true,
    isBeforeTrip: false,
    isDuringTrip: true,
    isAfterTrip: false,
    status: "during_trip",
    message: "Trip is active today.",
  };
}

function getParkLabel(parkId) {
  return DISNEY_PARK_OPTIONS.find((park) => park.value === parkId)?.label || "Not set";
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
    console.warn("ParkPlan: could not save family profile", err);
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
    console.warn("ParkPlan: could not save state", err);
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

    return `I’m having trouble reaching AI chat right now, but here’s the safe ParkPlan call: since ${elapsedText} for ${rideName} and ${postedText}, don’t automatically bail unless the line has stopped, someone feels overheated, or the kids are close to a true meltdown. If the line is moving and this ride matters to your family, try to finish it, then make food, water, and AC the immediate next move.`;
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
  const [familyProfileStep, setFamilyProfileStep] = useState(1);

  const [currentLand, setCurrentLand] = useState(() => getDefaultLandForPark("magic_kingdom"));
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activeMiniGameType, setActiveMiniGameType] = useState("trivia");
  const [miniGameSeed, setMiniGameSeed] = useState(0);
  const [revealedTriviaAnswer, setRevealedTriviaAnswer] = useState(false);

  const isRestoringParkState = useRef(false);

  useEffect(() => {
    writeStoredFamilyProfile(familyProfile);
  }, [familyProfile]);

  const familyProfileSummary = useMemo(() => {
    return buildFamilyProfileSummary(familyProfile);
  }, [familyProfile]);

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

        return null;
      } finally {
        if (!silent) {
          setLocationLoading(false);
        }
      }
    },
    [activePark]
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

    setCurrentLand(getSafeLandForPark(activePark, saved.currentLand));
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

    return {
      type: safeDetectedLocation ? "gps" : "manual_land",
      land: currentLand,
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
    });
  }, [
    activePark,
    parkData,
    weather,
    locationContextForDecisions,
    completedRideIds,
    recommendationAvoidedRideIds,
    familyProfileSummary,
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

  const activeMiniGame = useMemo(() => {
    if (currentActivity?.type !== "in_line") return null;

    return getMiniGameForContext({
      parkId: activePark,
      land: currentActivity.land || currentLand,
      rideName: currentActivity.rideName,
      gameType: activeMiniGameType,
      seed: miniGameSeed,
    });
  }, [
    activePark,
    activeMiniGameType,
    currentActivity,
    currentLand,
    miniGameSeed,
  ]);

  const currentActivityContext = useMemo(() => {
    return buildCurrentActivityContext(currentActivity);
  }, [currentActivity]);

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
    setFamilyProfile((prev) =>
      normalizeFamilyProfile({
        ...prev,
        isSetupComplete: true,
      })
    );
    setActiveScreen("main");
  }

  function handleInLine(ride) {
    if (!ride?.id) return;

    const id = String(ride.id);

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

    setReportedRideIssueIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleCancelCurrentActivity() {
    setCurrentActivity(null);
  }

  function handleMiniGameTypeChange(type) {
    setActiveMiniGameType(type);
    setMiniGameSeed(0);
    setRevealedTriviaAnswer(false);
  }

  function handleNextMiniGame() {
    setMiniGameSeed((prev) => prev + 1);
    setRevealedTriviaAnswer(false);
  }

  async function handleUseMyLocation() {
    await updateUserLocation({ silent: false });
  }

  function handleResetRecs() {
    setCompletedRideIds([]);
    setSkippedRideIds([]);
    setReportedRideIssueIds([]);
    setCurrentActivity(null);
  }

  function renderFamilyProfileScreen() {
    const summary = familyProfileSummary;
    const shortestHeightText =
      summary.shortestHeightInches != null
        ? `${summary.shortestHeightInches} in shortest child rider`
        : summary.childCount > 0
        ? "child height not set yet"
        : "no child height needed";

    const stepTitle =
      familyProfileStep === 1
        ? "Quick trip setup"
        : familyProfileStep === 2
        ? "Planning style"
        : "Resort and travel details";

    const stepDescription =
      familyProfileStep === 1
        ? "Start with only the essentials: who is going, how many days, and which parks matter."
        : familyProfileStep === 2
        ? "This is the meat and potatoes: how ParkPlan should help before the trip and in the park."
        : "Resort context helps ParkPlan avoid bad transportation and break advice.";

    return (
      <main style={page}>
        <div style={shell}>
          <header style={{ padding: "18px 0" }}>
            <button
              type="button"
              onClick={() => setActiveScreen("main")}
              style={{
                ...button,
                marginBottom: 12,
                color: "#64748b",
              }}
            >
              ← Back to park
            </button>

            <h1 style={{ fontSize: 34, margin: 0, letterSpacing: -1 }}>
              Family Profile
            </h1>
            <p style={{ color: "#64748b", marginTop: 6, lineHeight: 1.45 }}>
              Tell ParkPlan who is in your group so it can avoid bad recommendations,
              protect energy, and stop treating every family like the same family.
            </p>
          </header>

          <section style={card}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFamilyProfileStep(step)}
                  style={{
                    ...button,
                    flex: 1,
                    background: familyProfileStep === step ? "#0f172a" : "white",
                    color: familyProfileStep === step ? "white" : "#0f172a",
                    borderRadius: 14,
                  }}
                >
                  {step}
                </button>
              ))}
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                marginBottom: 14,
              }}
            >
              <strong>{stepTitle}</strong>
              <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13 }}>
                {stepDescription}
              </p>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
                {summary.partySize} guests · {summary.ageSummary.under3Count} under 3 ·{" "}
                {summary.ageSummary.childCount} Disney child ·{" "}
                {summary.ageSummary.disneyAdultCount} Disney adult · {shortestHeightText}
              </p>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
                First park: {getParkLabel(summary.tripContext.firstPark)} · Priority park:{" "}
                {getParkLabel(summary.tripContext.priorityPark)} · {summary.tripAccessStatus.message}
              </p>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
                Planning: {summary.planningPreferences.planningMode.replace(/_/g, " ")} ·
                Rope drop: {summary.planningPreferences.ropeDropStyle.replace(/_/g, " ")} ·
                Breaks: {summary.planningPreferences.middayBreakStyle.replace(/_/g, " ")}
              </p>
            </div>

            {familyProfileStep === 1 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <strong>Who’s in your group?</strong>
                  <p style={{ margin: "5px 0 10px", color: "#64748b", fontSize: 13 }}>
                    Adults do not need height entry. We only need children’s ages and
                    heights so ParkPlan can avoid rides they cannot ride.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <label
                      htmlFor="adult-count"
                      style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}
                    >
                      Adults
                      <select
                        id="adult-count"
                        value={familyProfile.adultCount}
                        onChange={(e) => handleAdultCountChange(e.target.value)}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label
                      htmlFor="child-count"
                      style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}
                    >
                      Children
                      <select
                        id="child-count"
                        value={familyProfile.childCount}
                        onChange={(e) => handleChildCountChange(e.target.value)}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        {Array.from({ length: 13 }, (_, index) => index).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {familyProfile.childCount > 0 ? (
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      {familyProfile.children.map((child, index) => {
                        const ageClass = getDisneyAgeClass(child.age);

                        return (
                          <div
                            key={child.id}
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              border: "1px solid #e2e8f0",
                              background: "white",
                            }}
                          >
                            <strong style={{ display: "block", marginBottom: 8 }}>
                              Child {index + 1}
                            </strong>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 8,
                              }}
                            >
                              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
                                Age
                                <input
                                  type="number"
                                  min="0"
                                  max="17"
                                  value={child.age}
                                  onChange={(e) => handleChildChange(index, "age", e.target.value)}
                                  placeholder="ex: 7"
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 12,
                                    padding: "9px 10px",
                                  }}
                                />
                              </label>

                              <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
                                Height in inches
                                <input
                                  type="number"
                                  min="0"
                                  max="72"
                                  value={child.heightInches}
                                  onChange={(e) =>
                                    handleChildChange(index, "heightInches", e.target.value)
                                  }
                                  placeholder="ex: 42"
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 12,
                                    padding: "9px 10px",
                                  }}
                                />
                              </label>
                            </div>

                            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                              {getDisneyAgeLabel(ageClass)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                      }}
                    >
                      <strong>Adults-only group</strong>
                      <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13 }}>
                        No child heights needed. ParkPlan will not apply child-height
                        restrictions unless you add children later.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <strong>Trip length and parks</strong>
                  <p style={{ margin: "5px 0 10px", color: "#64748b", fontSize: 13 }}>
                    Dates help control when AI chat should be available later and let
                    ParkPlan understand whether this is pre-trip planning or an active park day.
                  </p>

                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Trip start date
                        <input
                          type="date"
                          value={familyProfile.tripContext.tripStartDate}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                tripStartDate: e.target.value,
                                tripEndDate:
                                  familyProfile.tripContext.tripEndDate &&
                                  familyProfile.tripContext.tripEndDate < e.target.value
                                    ? e.target.value
                                    : familyProfile.tripContext.tripEndDate,
                              },
                            })
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 14,
                            padding: "10px 12px",
                            fontWeight: 800,
                            background: "white",
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Trip end date
                        <input
                          type="date"
                          value={familyProfile.tripContext.tripEndDate}
                          min={familyProfile.tripContext.tripStartDate || undefined}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                tripEndDate: e.target.value,
                              },
                            })
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 14,
                            padding: "10px 12px",
                            fontWeight: 800,
                            background: "white",
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Total trip length
                      <select
                        value={familyProfile.tripContext.tripLengthDays}
                        onChange={(e) =>
                          updateFamilyProfile({
                            tripContext: {
                              ...familyProfile.tripContext,
                              tripLengthDays: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        {Array.from({ length: 14 }, (_, index) => index + 1).map((days) => (
                          <option key={days} value={days}>
                            {days} {days === 1 ? "day" : "days"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Park days
                      <select
                        value={familyProfile.tripContext.parkDays}
                        onChange={(e) =>
                          updateFamilyProfile({
                            tripContext: {
                              ...familyProfile.tripContext,
                              parkDays: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        {Array.from({ length: 14 }, (_, index) => index + 1).map((days) => (
                          <option key={days} value={days}>
                            {days} {days === 1 ? "park day" : "park days"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Park Hopper?
                      <select
                        value={familyProfile.tripContext.parkHopper}
                        onChange={(e) =>
                          updateFamilyProfile({
                            tripContext: {
                              ...familyProfile.tripContext,
                              parkHopper: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="unknown">Not sure yet</option>
                        <option value="no">No — one park per day</option>
                        <option value="yes">Yes — planning to park hop</option>
                      </select>
                    </label>
                  </div>

                  <p style={{ margin: "12px 0 8px", color: "#475569", fontSize: 13, fontWeight: 900 }}>
                    Which parks are part of this trip?
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {DISNEY_PARK_OPTIONS.map((option) => {
                      const selected = familyProfile.tripContext.selectedParks.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelectedParkToggle(option.value)}
                          style={{
                            ...actionButton,
                            background: selected ? "#0f172a" : "white",
                            color: selected ? "white" : "#0f172a",
                            borderColor: selected ? "#0f172a" : "#cbd5e1",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {familyProfile.tripContext.selectedParks.length > 0 && (
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Which park do you want to do first?
                        <select
                          value={familyProfile.tripContext.firstPark || ""}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                firstPark: e.target.value,
                              },
                            })
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 14,
                            padding: "10px 12px",
                            fontWeight: 800,
                            background: "white",
                          }}
                        >
                          <option value="">Not sure yet</option>
                          {DISNEY_PARK_OPTIONS.filter((park) =>
                            familyProfile.tripContext.selectedParks.includes(park.value)
                          ).map((park) => (
                            <option key={park.value} value={park.value}>
                              {park.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Main priority park
                        <select
                          value={familyProfile.tripContext.priorityPark || ""}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                priorityPark: e.target.value,
                              },
                            })
                          }
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 14,
                            padding: "10px 12px",
                            fontWeight: 800,
                            background: "white",
                          }}
                        >
                          <option value="">Not sure yet</option>
                          {DISNEY_PARK_OPTIONS.filter((park) =>
                            familyProfile.tripContext.selectedParks.includes(park.value)
                          ).map((park) => (
                            <option key={park.value} value={park.value}>
                              {park.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFamilyProfileStep(2)}
                  style={{
                    ...button,
                    background: "#0f172a",
                    color: "white",
                    justifySelf: "start",
                  }}
                >
                  Next: Park Style
                </button>
              </div>
            )}

            {familyProfileStep === 2 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <strong>Planning help</strong>
                  <p style={{ margin: "5px 0 10px", color: "#64748b", fontSize: 13 }}>
                    This keeps the app from being vanilla. Day-before planning should
                    feel different from day-of in-park rescue mode.
                  </p>

                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      What kind of help do you want most?
                      <select
                        value={familyProfile.planningPreferences.planningMode}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              planningMode: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="low_stress">Low-stress guidance / avoid meltdowns</option>
                        <option value="balanced">Balanced plan / smart but flexible</option>
                        <option value="maximize">Maximize rides and value</option>
                        <option value="first_timer">First-timer handholding</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Day-before help
                      <select
                        value={familyProfile.planningPreferences.dayBeforeHelp}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              dayBeforeHelp: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="yes">Yes — help me prep the night before</option>
                        <option value="minimal">Minimal — only important reminders</option>
                        <option value="no">No — day-of only</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Day-of help
                      <select
                        value={familyProfile.planningPreferences.dayOfHelp}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              dayOfHelp: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="yes">Yes — actively guide us in the park</option>
                        <option value="light">Light touch — only major moments</option>
                        <option value="no">No — I’ll check manually</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Rope drop style
                      <select
                        value={familyProfile.planningPreferences.ropeDropStyle}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              ropeDropStyle: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="hardcore">Hardcore — front of pack</option>
                        <option value="flexible">Flexible — early, but not stressful</option>
                        <option value="slow_morning">Slow morning — do not force rope drop</option>
                        <option value="not_sure">Not sure yet</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Midday break style
                      <select
                        value={familyProfile.planningPreferences.middayBreakStyle}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              middayBreakStyle: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="resort_break">Prefer resort/pool break</option>
                        <option value="in_park_reset">Prefer in-park AC/food reset</option>
                        <option value="flexible">Flexible based on heat and crowds</option>
                        <option value="push_through">Usually push through</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Food strategy
                      <select
                        value={familyProfile.planningPreferences.diningStyle}
                        onChange={(e) =>
                          updateFamilyProfile({
                            planningPreferences: {
                              ...familyProfile.planningPreferences,
                              diningStyle: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="quick_service">Quick service / mobile order</option>
                        <option value="table_service">Table-service breaks</option>
                        <option value="snack_based">Snack-based / flexible</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Should ParkPlan keep the whole group together for ride recommendations?
                    <select
                      value={familyProfile.wholeGroupRidesTogether}
                      onChange={(e) =>
                        updateFamilyProfile({ wholeGroupRidesTogether: e.target.value })
                      }
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="yes">Yes, only recommend rides everyone can do</option>
                      <option value="warn">Warn me if not everyone can ride</option>
                      <option value="rider_switch">We’re okay splitting up / Rider Switch</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Thrill tolerance
                    <select
                      value={familyProfile.thrillTolerance}
                      onChange={(e) => updateFamilyProfile({ thrillTolerance: e.target.value })}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="low">Low — avoid intense rides</option>
                      <option value="mixed">Mixed — balance thrills and family rides</option>
                      <option value="high">High — thrill rides are a priority</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Walking tolerance
                    <select
                      value={familyProfile.walkingTolerance}
                      onChange={(e) => updateFamilyProfile({ walkingTolerance: e.target.value })}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="low">Low — minimize backtracking</option>
                      <option value="medium">Medium — normal family pace</option>
                      <option value="high">High — we can cover ground</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Heat / fatigue sensitivity
                    <select
                      value={familyProfile.heatSensitivity}
                      onChange={(e) => updateFamilyProfile({ heatSensitivity: e.target.value })}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="low">Low — we handle heat well</option>
                      <option value="medium">Medium — watch our energy</option>
                      <option value="high">High — prioritize shade, AC, food, breaks</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Water rides
                    <select
                      value={familyProfile.waterRidePreference}
                      onChange={(e) =>
                        updateFamilyProfile({ waterRidePreference: e.target.value })
                      }
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="yes">Yes, we like water rides</option>
                      <option value="depends">Depends on heat / timing</option>
                      <option value="avoid">Avoid getting wet</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                    Family pace
                    <select
                      value={familyProfile.pace}
                      onChange={(e) => updateFamilyProfile({ pace: e.target.value })}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="relaxed">Relaxed — fewer things, less stress</option>
                      <option value="balanced">Balanced — smart but flexible</option>
                      <option value="maximize">Maximize — help us do a lot</option>
                    </select>
                  </label>
                </div>

                <div>
                  <strong>What matters most this trip?</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {FAMILY_PRIORITY_OPTIONS.map((option) => {
                      const selected = familyProfile.priorities.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handlePriorityToggle(option.value)}
                          style={{
                            ...actionButton,
                            background: selected ? "#6d28d9" : "white",
                            color: selected ? "white" : "#6d28d9",
                            borderColor: "#c4b5fd",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setFamilyProfileStep(1)}
                    style={{ ...button, color: "#64748b" }}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => setFamilyProfileStep(3)}
                    style={{
                      ...button,
                      background: "#0f172a",
                      color: "white",
                    }}
                  >
                    Next: Resort Details
                  </button>
                </div>
              </div>
            )}

            {familyProfileStep === 3 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <strong>Trip context</strong>
                  <p style={{ margin: "5px 0 10px", color: "#64748b", fontSize: 13 }}>
                    Resort context helps ParkPlan give realistic break, rope-drop, and
                    transportation advice.
                  </p>

                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Staying on Disney property?
                      <select
                        value={familyProfile.resortContext.stayingOnProperty}
                        onChange={(e) => {
                          const stayingOnProperty = e.target.value;

                          updateFamilyProfile({
                            resortContext: {
                              ...familyProfile.resortContext,
                              stayingOnProperty,
                              resortId:
                                stayingOnProperty === "yes"
                                  ? familyProfile.resortContext.resortId
                                  : "",
                              resortName:
                                stayingOnProperty === "yes"
                                  ? familyProfile.resortContext.resortName
                                  : "",
                            },
                          });
                        }}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="unknown">Not sure / skip for now</option>
                        <option value="yes">Yes, Disney resort</option>
                        <option value="no">No, off-property hotel</option>
                      </select>
                    </label>

                    {familyProfile.resortContext.stayingOnProperty === "yes" && (
                      <>
                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Disney resort
                          <select
                            value={familyProfile.resortContext.resortId}
                            onChange={(e) => {
                              const resortId = e.target.value;
                              const selectedResort = getResortProfile(resortId);

                              updateFamilyProfile({
                                resortContext: {
                                  ...familyProfile.resortContext,
                                  stayingOnProperty: "yes",
                                  resortId,
                                  resortName: selectedResort?.name || "",
                                },
                              });
                            }}
                            style={{
                              border: "1px solid #cbd5e1",
                              borderRadius: 14,
                              padding: "10px 12px",
                              fontWeight: 800,
                              background: "white",
                            }}
                          >
                            <option value="">Select your Disney resort</option>
                            {resortOptions.map((resort) => (
                              <option key={resort.value} value={resort.value}>
                                {resort.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        {familyProfileSummary.resortProfile && (
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              border: "1px solid #bbf7d0",
                              background: "#f0fdf4",
                            }}
                          >
                            <strong>{familyProfileSummary.resortProfile.name}</strong>
                            <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13 }}>
                              {familyProfileSummary.resortProfile.areaLabel} · Transportation:{" "}
                              {familyProfileSummary.resortProfile.transportation.join(", ")}
                            </p>

                            {familyProfileSummary.resortProfile.breakStrategy?.[activePark] && (
                              <p style={{ margin: "6px 0 0", color: "#166534", fontSize: 13 }}>
                                Current park break note:{" "}
                                {familyProfileSummary.resortProfile.breakStrategy[activePark]}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {familyProfile.resortContext.stayingOnProperty === "no" && (
                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Off-property hotel name
                        <input
                          value={familyProfile.resortContext.offPropertyHotelName}
                          onChange={(e) =>
                            updateFamilyProfile({
                              resortContext: {
                                ...familyProfile.resortContext,
                                offPropertyHotelName: e.target.value,
                              },
                            })
                          }
                          placeholder="ex: hotel name or area"
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        />
                      </label>
                    )}

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Main transportation today
                      <select
                        value={familyProfile.resortContext.transportationMode}
                        onChange={(e) =>
                          updateFamilyProfile({
                            resortContext: {
                              ...familyProfile.resortContext,
                              transportationMode: e.target.value,
                            },
                          })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="unknown">Not sure / depends</option>
                        <option value="bus">Bus</option>
                        <option value="monorail">Monorail</option>
                        <option value="skyliner">Skyliner</option>
                        <option value="boat">Boat</option>
                        <option value="walking">Walking</option>
                        <option value="car">Car / rideshare</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                      Lightning Lane / Single Pass preference
                      <select
                        value={familyProfile.lightningLanePreference}
                        onChange={(e) =>
                          updateFamilyProfile({ lightningLanePreference: e.target.value })
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 14,
                          padding: "10px 12px",
                          fontWeight: 800,
                          background: "white",
                        }}
                      >
                        <option value="undecided">Undecided</option>
                        <option value="avoid_paid">Avoid paid options if possible</option>
                        <option value="open_to_paid">Open if it protects the day</option>
                        <option value="use_paid">Plan around paid access</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                  }}
                >
                  <strong>Disney classification reminder</strong>
                  <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13 }}>
                    Ages 0–2 are under 3 / no ticket. Ages 3–9 are Disney child.
                    Ages 10+ count as Disney adults for tickets and dining.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setFamilyProfileStep(2)}
                    style={{ ...button, color: "#64748b" }}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleFamilyProfileDone}
                    style={{
                      ...button,
                      background: "#0f172a",
                      color: "white",
                    }}
                  >
                    Save Family Profile
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
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

  function renderLineTimeCompanion() {
    if (currentActivity?.type !== "in_line") return null;

    if (!activeMiniGame) return null;

    return (
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 18,
          border: "1px solid #c4b5fd",
          background: "#faf5ff",
        }}
      >
        <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
          LINE TIME COMPANION
        </div>

        <h4 style={{ margin: "5px 0 6px", fontSize: 18 }}>
          A quick family game while you wait
        </h4>

        <p style={{ margin: "0 0 10px", color: "#475569", fontSize: 13 }}>
          No scores. No pressure. Just a tiny way to laugh, look around, and make the line feel shorter.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {MINI_GAME_TYPES.map((game) => (
            <button
              key={game.key}
              onClick={() => handleMiniGameTypeChange(game.key)}
              style={{
                ...actionButton,
                background: activeMiniGameType === game.key ? "#6d28d9" : "white",
                color: activeMiniGameType === game.key ? "white" : "#6d28d9",
                borderColor: "#c4b5fd",
              }}
            >
              {game.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 16,
            border: "1px solid #ddd6fe",
            background: "white",
          }}
        >
          <strong>{activeMiniGame.title}</strong>

          {activeMiniGame.type === "trivia" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.question}
              </p>

              <div style={{ display: "grid", gap: 8 }}>
                {activeMiniGame.choices.map((choice) => {
                  const isCorrect = choice === activeMiniGame.answer;

                  return (
                    <button
                      key={choice}
                      onClick={() => setRevealedTriviaAnswer(true)}
                      style={{
                        ...button,
                        borderRadius: 14,
                        textAlign: "left",
                        background:
                          revealedTriviaAnswer && isCorrect ? "#dcfce7" : "white",
                        borderColor:
                          revealedTriviaAnswer && isCorrect ? "#86efac" : "#e2e8f0",
                        color:
                          revealedTriviaAnswer && isCorrect ? "#166534" : "#0f172a",
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>

              {!revealedTriviaAnswer ? (
                <button
                  onClick={() => setRevealedTriviaAnswer(true)}
                  style={{ ...button, marginTop: 10, color: "#6d28d9" }}
                >
                  Show Answer
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 14,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <strong style={{ color: "#166534" }}>
                    Answer: {activeMiniGame.answer}
                  </strong>
                  <p style={{ margin: "6px 0 0", color: "#334155" }}>
                    {activeMiniGame.fact}
                  </p>
                </div>
              )}
            </>
          )}

          {activeMiniGame.type === "look_around" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.task}
              </p>
              <p style={{ margin: "0 0 10px", color: "#64748b" }}>
                Hint: {activeMiniGame.hint}
              </p>
              <button style={{ ...button, color: "#166534" }}>
                Found it!
              </button>
            </>
          )}

          {activeMiniGame.type === "family_vote" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.prompt}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {activeMiniGame.options.map((option) => (
                  <button
                    key={option}
                    style={{
                      ...button,
                      borderRadius: 14,
                      textAlign: "left",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeMiniGame.type === "would_you_rather" && (
            <p style={{ margin: "8px 0", color: "#334155", fontWeight: 800 }}>
              {activeMiniGame.prompt}
            </p>
          )}

          <button
            onClick={handleNextMiniGame}
            style={{ ...button, marginTop: 12, color: "#6d28d9" }}
          >
            Give us another one
          </button>
        </div>
      </div>
    );
  }

  function renderWhileYouWaitCard() {
    const items = whileYouWaitContent?.whileWaiting || [];

    if (!items.length) {
      return null;
    }

    return (
      <section
        style={{
          ...card,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
        }}
      >
        <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
          WHILE YOU WAIT
        </div>

        <h3 style={{ margin: "5px 0 10px", fontSize: 20 }}>
          Little details to make the line better
        </h3>

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid #dbeafe",
                background: "rgba(255,255,255,.75)",
              }}
            >
              <strong>{item.title}</strong>
              <p style={{ margin: "6px 0 0", color: "#334155" }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {renderLineTimeCompanion()}
      </section>
    );
  }

  async function handleChatSubmit(e) {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) return;

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
    recommendations.worthTheWalk ||
    recommendations.planAhead ||
    recommendations.waitOnThis;

  const hasAnyRecommendation = Boolean(primaryRecommendation);

  if (activeScreen === "family_profile") {
    return renderFamilyProfileScreen();
  }

  return (
    <main style={page}>
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
                ParkPlan AI
              </h1>
              <p style={{ color: "#64748b", marginTop: 6 }}>
                Smart park planning for Disney World and Universal Orlando.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveScreen("family_profile")}
              style={{
                ...button,
                color: familyProfileSummary.isSetupComplete ? "#166534" : "#9a3412",
                borderColor: familyProfileSummary.isSetupComplete ? "#bbf7d0" : "#fed7aa",
                whiteSpace: "nowrap",
              }}
            >
              {familyProfileSummary.isSetupComplete ? "Family Profile" : "Set Up Family"}
            </button>
          </div>
        </header>

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
                onClick={() => setActivePark(park.id)}
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

        {renderWhileYouWaitCard()}

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
              value={currentLand}
              onChange={(e) => setCurrentLand(e.target.value)}
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

          {hasAnyRecommendation ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 18,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                }}
              >
                <div style={{ fontSize: 12, color: "#166534", fontWeight: 900 }}>
                  BEST MOVE
                </div>
                <h4 style={{ margin: "4px 0", fontSize: 20 }}>
                  {primaryRecommendation.name}
                </h4>
                <p style={{ margin: 0, color: "#166534", fontWeight: 800 }}>
                  {primaryRecommendation.waitTime} min wait
                </p>
                <p style={{ margin: "8px 0 0", color: "#334155" }}>
                  Why: {primaryRecommendation.reason || "best available option based on current conditions"}.
                </p>
                {renderShowtimeInfo(primaryRecommendation)}
                {renderRideActions(primaryRecommendation)}
              </div>

              {recommendations.backup && recommendations.backup.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
                    SMART BACKUP
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.backup.name}
                  </h4>
                  <p style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
                    {recommendations.backup.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    Why: {recommendations.backup.reason}.
                  </p>
                  {renderShowtimeInfo(recommendations.backup)}
                  {renderRideActions(recommendations.backup)}
                </div>
              )}

              {recommendations.worthTheWalk && recommendations.worthTheWalk.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #ddd6fe",
                    background: "#f5f3ff",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
                    WORTH THE WALK
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.worthTheWalk.name}
                  </h4>
                  <p style={{ margin: 0, color: "#6d28d9", fontWeight: 800 }}>
                    {recommendations.worthTheWalk.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    Not nearby, but the current wait is strong enough that it may be worth crossing over for.
                  </p>
                  {renderShowtimeInfo(recommendations.worthTheWalk)}
                  {renderRideActions(recommendations.worthTheWalk)}
                </div>
              )}

              {recommendations.planAhead && recommendations.planAhead.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 900 }}>
                    PLAN AHEAD
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.planAhead.name}
                  </h4>
                  <p style={{ margin: 0, color: "#991b1b", fontWeight: 800 }}>
                    {recommendations.planAhead.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    {recommendations.planAhead.planAheadReason ||
                      "This ride usually needs a strategy. Consider Lightning Lane, rope drop, late night, or watching for a rare dip."}
                  </p>
                  {renderShowtimeInfo(recommendations.planAhead)}
                  {renderRideActions(recommendations.planAhead)}
                </div>
              )}

              {recommendations.waitOnThis && recommendations.waitOnThis.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #fed7aa",
                    background: "#fff7ed",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>
                    WAIT ON THIS
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.waitOnThis.name}
                  </h4>
                  <p style={{ margin: 0, color: "#9a3412", fontWeight: 800 }}>
                    {recommendations.waitOnThis.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    This wait is higher than this ride is usually worth. Check again later when crowds shift.
                  </p>
                  {renderShowtimeInfo(recommendations.waitOnThis)}
                  {renderRideActions(recommendations.waitOnThis)}
                </div>
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

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Wait Times</h3>

          <p style={{ marginTop: -4, color: "#64748b", fontSize: 13 }}>
            Riding something that is not on a recommendation card? Mark it here so
            ParkPlan can keep up with your real day.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {sortedRides.map((ride) => {
              const isActiveRide = activeRideId === String(ride.id);

              return (
                <div
                  key={ride.id}
                  style={{
                    padding: 12,
                    border: isActiveRide ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
                    borderRadius: 16,
                    background: isActiveRide ? "#f5f3ff" : "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <strong>{ride.name}</strong>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {formatLandLabel(activePark, ride.land)} · {ride.isOpen ? "Open" : "Closed"}
                      </div>
                    </div>

                    <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                      {ride.waitTime} min
                    </div>
                  </div>

                  {renderShowtimeInfo(ride)}
                  {renderRideActions(ride)}
                </div>
              );
            })}
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={18} />
            <h3 style={{ margin: 0 }}>AI Park Assistant</h3>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {chat.length === 0 && (
              <p style={{ color: "#64748b" }}>
                Ask what to ride next, how to handle weather, or how to plan your
                afternoon.
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
                <strong>{msg.role === "user" ? "You" : "ParkPlan AI"}: </strong>
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
              placeholder="Ask ParkPlan AI..."
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
      </div>
    </main>
  );
}

export default App;
