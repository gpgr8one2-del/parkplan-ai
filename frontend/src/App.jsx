import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage, trackEvent } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { getCurrentTimeContext } from "./utils/timeContext";
import { buildAccessState } from "./utils/accessControl";
import {
  PARKS,
  LAND_OPTIONS,
  getSafeLandForPark,
  formatLandLabel,
} from "./data/parkAreas";
import {
  DEFAULT_FAMILY_PROFILE,
  FAMILY_PRIORITY_OPTIONS,
  DISNEY_PARK_OPTIONS,
  getDisneyAgeClass,
  getDisneyAgeLabel,
  getParkLabel,
  getFamilyProfileCompletion,
  normalizeFamilyProfile,
  buildFamilyProfileSummary,
  readStoredFamilyProfile,
  writeStoredFamilyProfile,
} from "./utils/familyProfile";
import { formatCloseTimeLabel } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";
import { getRideMeta } from "./rideMetadata";
import { shouldShowRideInWaitList } from "./attractionDisplayFilters";
import { getResortOptions } from "./resortProfiles";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { RecommendationCard } from "./components/RecommendationCard";
import { WaitTimesList } from "./components/WaitTimesList";
import { WhileYouWaitCard } from "./components/WhileYouWaitCard";
import BottomTabs from "./components/BottomTabs";
import { colors } from "./theme";
import { useMiniGames } from "./hooks/useMiniGames";

const STORAGE_KEY = "parkplan.state";
const AUTO_REFRESH_MS = 3 * 60 * 1000;

// Testing safety valve: while building, Gabe can still preview and test the full app.
// This must never appear in production because it makes the onboarding gate meaningless.
const DEV_ALLOW_FULL_APP_WITHOUT_PROFILE = process.env.NODE_ENV !== "production";
const DEV_PREVIEW_STORAGE_KEY = "parkplan.devPreviewFullApp";

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


const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 18% 0%, rgba(124, 58, 237, 0.11) 0%, rgba(124, 58, 237, 0.03) 28%, transparent 48%), radial-gradient(circle at 88% 8%, rgba(245, 158, 11, 0.20) 0%, rgba(245, 158, 11, 0.05) 30%, transparent 52%), linear-gradient(180deg, #FFF4E6 0%, #FFF9F1 52%, #F3E8FF 100%)",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  color: colors.text,
};

const shell = { maxWidth: 900, margin: "0 auto", padding: 18 };

const card = {
  background: "rgba(255,255,255,0.94)",
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 24,
  padding: 16,
  boxShadow: "0 14px 34px rgba(28, 25, 23, 0.08)",
  marginBottom: 14,
};

const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: `1px solid ${colors.cardBorder}`,
  background: colors.card,
  color: colors.text,
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  background: "rgba(255,255,255,0.78)",
  border: `1px solid ${colors.cardBorder}`,
  color: colors.text,
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const premiumHeroCard = {
  ...card,
  background:
    "radial-gradient(circle at 92% 2%, rgba(124, 58, 237, 0.22) 0%, rgba(124, 58, 237, 0.06) 34%, transparent 58%), radial-gradient(circle at 8% 0%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.07) 36%, transparent 62%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #F3E8FF 100%)",
  border: "1px solid rgba(124, 58, 237, 0.18)",
  borderRadius: 30,
  boxShadow: "0 20px 52px rgba(91, 33, 182, 0.13)",
};

const premiumBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid rgba(124, 58, 237, 0.18)",
  background: "rgba(124, 58, 237, 0.10)",
  color: colors.purpleDeep,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const lockedCardStyle = {
  ...card,
  border: `1px dashed ${colors.cardBorder}`,
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.94) 0%, #FFF9F1 100%)",
  boxShadow: "0 10px 24px rgba(28, 25, 23, 0.05)",
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
  familyProfile,
  recommendations = {},
}) {
  const bestMove = recommendations.bestMove;
  const backup = recommendations.backup;
  const planAhead = recommendations.planAhead;

  const resortName =
    familyProfile?.resortProfile?.name ||
    familyProfile?.resortContext?.resortName ||
    familyProfile?.resortContext?.offPropertyHotelName ||
    "";

  const breakStrategy =
    familyProfile?.resortProfile?.breakStrategy?.[activePark] || "";

  const directAccess =
    familyProfile?.resortProfile?.directAccess?.[activePark] || [];

  const lines = [
    "TOHI Offline Help",
    "",
    "I’m having trouble reaching AI chat right now, so I do not want to pretend I fully understood the question.",
    "",
    "Here is the safest read from the live app engine right now:",
  ];

  if (currentActivityContext?.type === "in_line") {
    const elapsed = currentActivityContext.elapsedMinutesInLine;
    const posted = currentActivityContext.postedWaitAtStart;

    lines.push(
      "",
      `Current status: You are marked in line for ${currentActivityContext.rideName || "a ride"}${
        posted != null ? `, with a ${posted}-minute posted wait when you joined` : ""
      }${elapsed != null ? `, and about ${elapsed} minutes elapsed` : ""}.`
    );
  }

  if (bestMove?.name) {
    lines.push(
      "",
      `Best Move showing now: ${bestMove.name}${
        bestMove.waitTime != null ? ` (${bestMove.waitTime} min)` : ""
      }.`
    );
  } else if (backup?.name) {
    lines.push(
      "",
      `Smart Backup showing now: ${backup.name}${
        backup.waitTime != null ? ` (${backup.waitTime} min)` : ""
      }.`
    );
  } else {
    lines.push(
      "",
      "No strong ride move is showing right now. That usually means this is a good moment to reset instead of forcing the next attraction."
    );
  }

  if (planAhead?.name) {
    lines.push(
      `Plan Ahead note: keep ${planAhead.name} on your radar${
        planAhead.waitTime != null ? `; current posted wait is ${planAhead.waitTime} min` : ""
      }.`
    );
  }

  if (breakStrategy) {
    lines.push("", `Resort break guidance for ${resortName || "your resort"}: ${breakStrategy}`);
  } else if (resortName) {
    lines.push(
      "",
      `Resort break guidance: ${resortName} is your selected resort. If the family is fading, only leave the park if transportation is realistic and you can protect enough return time.`
    );
  } else {
    lines.push(
      "",
      "Pacing guidance: if the family is tired, choose shade, AC, water, food, or a quiet seated reset before chasing another far ride."
    );
  }

  if (directAccess.length) {
    lines.push(`Known direct access from this park: ${directAccess.join(", ")}.`);
  }

  if (weatherMode?.mode && weatherMode.mode !== "normal") {
    lines.push(
      "",
      `Weather mode is active: ${weatherMode.label || weatherMode.mode}. Favor indoor, shaded, or low-walking choices until conditions improve.`
    );
  }

  lines.push("", "Try sending your message again in a minute once the signal improves.");

  return lines.join("\n");
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
  const [activeTab, setActiveTab] = useState("home");
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
        devAllowFullAppWithoutProfile: DEV_ALLOW_FULL_APP_WITHOUT_PROFILE,
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


  function renderTabPlaceholderCard({ eyebrow, title, body, primaryActionLabel, onPrimaryAction }) {
    return (
      <section
        style={{
          ...card,
          background: "#FFFFFF",
          border: "1px solid #EFE7DA",
          boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: "#7C3AED" }}>
          {eyebrow}
        </div>
        <h2
          style={{
            margin: "8px 0 6px",
            color: "#1C1917",
            fontSize: 24,
            letterSpacing: -0.4,
          }}
        >
          {title}
        </h2>
        <p style={{ margin: 0, color: "#78716C", fontSize: 14, lineHeight: 1.5 }}>
          {body}
        </p>

        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            style={{
              ...button,
              marginTop: 14,
              background: "#7C3AED",
              color: "white",
              borderColor: "#7C3AED",
            }}
          >
            {primaryActionLabel}
          </button>
        )}
      </section>
    );
  }

  function renderLockedFeatureCard({ title, body, actionLabel = "Finish trip setup" }) {
    return (
      <section style={lockedCardStyle}>
        <div style={{ fontSize: 12, fontWeight: 900, color: colors.purple }}>
          PERSONALIZED FEATURE
        </div>
        <h3 style={{ margin: "6px 0 6px" }}>{title}</h3>
        <p style={{ margin: 0, color: colors.muted, fontSize: 14, lineHeight: 1.45 }}>
          {body}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setActiveScreen("family_profile")}
            style={{
              ...button,
              background: colors.purpleDeep,
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
                color: colors.purple,
                borderColor: colors.purpleSoft,
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
          style={{ ...actionButton, color: colors.success }}
        >
          ✓ Done
        </button>

        <button
          onClick={() => handleSkip(ride.id)}
          style={{ ...actionButton, color: colors.muted }}
        >
          Skip
        </button>

        <button
          onClick={() => handleReportRideIssue(ride)}
          style={{
            ...actionButton,
            color: "#92400E",
            borderColor: colors.amberSoft,
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
        <div style={{ fontSize: 12, color: colors.purple, fontWeight: 900 }}>
          SHOWTIMES
        </div>

        <p
          style={{
            margin: "5px 0 0",
            color: colors.text,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {showProfile.showtimes.join(" · ")}
        </p>

        {showProfile.recommendedShowtimes?.length > 0 && (
          <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
            Best target: {showProfile.recommendedShowtimes.join(" or ")}
          </p>
        )}

        {(showProfile.arrivalBufferMinutes || showProfile.middayArrivalBufferMinutes) && (
          <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
            Arrival buffer:{" "}
            {showProfile.middayArrivalBufferMinutes
              ? `${showProfile.arrivalBufferMinutes || 15}–${showProfile.middayArrivalBufferMinutes} min depending on heat/crowds`
              : `${showProfile.arrivalBufferMinutes} min`}
          </p>
        )}

        {showProfile.verifyDailySchedule && (
          <p style={{ margin: "6px 0 0", color: "#92400E", fontSize: 12 }}>
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
            familyProfile: familyProfileSummary,
            recommendations,
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
    <>
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

        <div style={{ ...shell, paddingBottom: 80 }}>
          {activeTab === "home" && (
            <>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 88% 8%, rgba(124, 58, 237, 0.34) 0%, rgba(124, 58, 237, 0.12) 24%, transparent 46%), radial-gradient(circle at 8% 0%, rgba(245, 158, 11, 0.30) 0%, rgba(245, 158, 11, 0.10) 32%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF4D8 45%, #F3E8FF 100%)",
            border: "1px solid rgba(124, 58, 237, 0.16)",
            borderRadius: 32,
            padding: "26px 22px 20px",
            marginBottom: 14,
            boxShadow: "0 22px 58px rgba(91, 33, 182, 0.16)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 130,
              height: 130,
              borderRadius: "999px",
              background: "rgba(251, 113, 133, 0.18)",
              right: -42,
              bottom: -54,
              filter: "blur(2px)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 86,
              height: 86,
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.16)",
              right: 38,
              top: 38,
              filter: "blur(1px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(124, 58, 237, 0.10)",
                color: colors.purpleDeep,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.8,
                marginBottom: 14,
              }}
            >
              ✨ TODAY&apos;S GAME PLAN
            </div>

            <img
              src="/tohi-logo.png"
              alt="TOHI"
              style={{
                display: "block",
                width: 146,
                maxWidth: "50vw",
                height: "auto",
                marginBottom: 16,
              }}
            />

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                color: colors.text,
                letterSpacing: -0.6,
                lineHeight: 1.18,
                fontWeight: 900,
              }}
            >
              Here&apos;s what matters right now.
            </h1>

            <p
              style={{
                margin: "9px 0 18px",
                color: colors.muted,
                fontSize: 15,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              TOHI is watching the heat, waits, and walking so your family can keep the day feeling good.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              height: 1,
              background: "rgba(124, 58, 237, 0.14)",
              margin: "0 -22px 14px",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <MapPin size={16} style={{ color: colors.purple }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>
                {parkData?.parkName || "Choose a park"}
              </span>

              {weather?.tempF != null && (
                <span style={{ fontSize: 13, color: colors.muted }}>
                  · {weather.tempF}°F
                </span>
              )}

              {closeTimeLabel && (
                <span style={{ fontSize: 13, color: colors.muted }}>
                  · closes {closeTimeLabel}
                </span>
              )}

              <FreshnessBadge
                source={parkData?.source}
                ageMs={parkData?.ageMs}
                fetchedAt={parkData?.fetchedAt}
              />
            </div>

            <button
              style={{
                ...button,
                padding: "7px 13px",
                fontSize: 12,
                background: "rgba(255, 255, 255, 0.88)",
                boxShadow: "0 8px 18px rgba(91, 33, 182, 0.10)",
              }}
              onClick={() => loadData(true)}
              disabled={loading}
            >
              <RefreshCw size={12} /> {loading ? "Loading" : "Refresh"}
            </button>
          </div>

          {(parkData?.source || error) && (
            <div style={{ marginTop: 10 }}>
              <DataStatusBanner source={parkData?.source} />

              {error && (
                <p
                  style={{
                    color: colors.error,
                    fontWeight: 700,
                    margin: "6px 0 0",
                    fontSize: 13,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
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
                  background: activePark === park.id ? colors.purple : colors.card,
                  color: activePark === park.id ? "white" : colors.text,
                  borderColor: activePark === park.id ? colors.purple : colors.cardBorder,
                  whiteSpace: "nowrap",
                }}
              >
                {park.name}
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
            border: "1px solid rgba(56, 189, 248, 0.24)",
            borderRadius: 28,
            boxShadow: "0 16px 38px rgba(2, 132, 199, 0.09)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 104,
              height: 104,
              borderRadius: "999px",
              right: -42,
              bottom: -48,
              background: "rgba(124, 58, 237, 0.10)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(56, 189, 248, 0.16)",
                    color: "#0369A1",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 8,
                  }}
                >
                  <CloudSun size={13} /> PARK CONDITIONS
                </div>

                <h3
                  style={{
                    margin: 0,
                    color: colors.text,
                    fontSize: 23,
                    letterSpacing: -0.4,
                    lineHeight: 1.15,
                  }}
                >
                  Weather + comfort
                </h3>
              </div>

              <FreshnessBadge
                source={weather?.source}
                ageMs={weather?.ageMs}
                fetchedAt={weather?.fetchedAt}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 13,
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.82)",
                border: `1px solid ${colors.cardBorder}`,
                boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "baseline",
                }}
              >
                {weather?.tempF != null && (
                  <strong
                    style={{
                      color: "#0369A1",
                      fontSize: 28,
                      lineHeight: 1,
                      letterSpacing: -0.8,
                    }}
                  >
                    {weather.tempF}°F
                  </strong>
                )}

                {weather?.feelsLikeF != null && (
                  <span
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    feels like {weather.feelsLikeF}°F
                  </span>
                )}

                {weather?.humidity != null && (
                  <span
                    style={{
                      padding: "5px 8px",
                      borderRadius: 999,
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#0369A1",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {weather.humidity}% humidity
                  </span>
                )}

                {weather?.stormMode && (
                  <span
                    style={{
                      padding: "5px 8px",
                      borderRadius: 999,
                      background: colors.amberSoft,
                      color: "#92400E",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    Storm watch
                  </span>
                )}
              </div>

              <p
                style={{
                  margin: "8px 0 0",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {weather?.summary
                  ? weather.summary
                  : buildWeatherDisplay(weather)}
              </p>
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              TOHI will favor lower-walking, indoor, shaded, or reset-friendly moves
              when heat or storms start working against the family.
            </p>

            <DataStatusBanner source={weather?.source} />
          </div>
        </section>

        <section
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.20) 0%, rgba(245, 158, 11, 0.06) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
            border: "1px solid rgba(245, 158, 11, 0.22)",
            borderRadius: 28,
            boxShadow: "0 16px 38px rgba(245, 158, 11, 0.10)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 96,
              height: 96,
              borderRadius: "999px",
              right: -38,
              top: -44,
              background: "rgba(124, 58, 237, 0.10)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 9px",
                borderRadius: 999,
                background: colors.amberSoft,
                color: "#92400E",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.7,
                marginBottom: 8,
              }}
            >
              TRIP TIMING
            </div>

            <h3
              style={{
                margin: 0,
                color: colors.text,
                fontSize: 23,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              Day mode
            </h3>

            <p
              style={{
                margin: "9px 0 0",
                color: colors.text,
                fontSize: 15,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              {timeContext.summary}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <span
                style={{
                  padding: "6px 9px",
                  borderRadius: 999,
                  background: colors.purpleSoft,
                  color: colors.purpleDeep,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Mode: {timeContext.planningMode.replace(/_/g, " ")}
              </span>

              <span
                style={{
                  padding: "6px 9px",
                  borderRadius: 999,
                  background: hasPersonalizedAccess
                    ? colors.successSoft
                    : colors.coralSoft,
                  color: hasPersonalizedAccess ? colors.success : "#E11D48",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Personalization: {hasPersonalizedAccess ? "active" : "setup needed"}
              </span>
            </div>
          </div>
        </section>

        {weatherMode.mode !== "normal" && (
          <section
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(145deg, #FFFFFF 0%, #FEF3C7 100%)",
              border: "1px solid rgba(245, 158, 11, 0.28)",
              borderRadius: 28,
              boxShadow: "0 16px 38px rgba(245, 158, 11, 0.12)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 9px",
                borderRadius: 999,
                background: colors.amberSoft,
                color: "#92400E",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.7,
                marginBottom: 8,
              }}
            >
              WEATHER STRATEGY
            </div>

            <h3
              style={{
                margin: 0,
                color: colors.text,
                fontSize: 22,
                letterSpacing: -0.3,
              }}
            >
              {weatherMode.label}
            </h3>

            <p
              style={{
                color: colors.muted,
                margin: "8px 0 0",
                lineHeight: 1.45,
              }}
            >
              {weatherMode.message}
            </p>

            {recoverySuggestions.length > 0 && (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {recoverySuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 18,
                      border: `1px solid ${colors.cardBorder}`,
                      background: "rgba(255,255,255,0.78)",
                      boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                    }}
                  >
                    <strong style={{ color: colors.text }}>{item.title}</strong>
                    <p style={{ margin: "6px 0 0", color: colors.muted }}>
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
              background: colors.purpleSoft,
            }}
          >
            <div style={{ fontSize: 12, color: colors.purple, fontWeight: 900 }}>
              CURRENTLY IN LINE
            </div>

            <h3 style={{ margin: "5px 0", fontSize: 20 }}>
              {currentActivity.rideName}
            </h3>

            <p style={{ margin: "0 0 8px", color: colors.muted }}>
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

            <p style={{ margin: "0 0 12px", color: colors.text }}>
              I’ll stop recommending this against itself while you’re waiting. Mark it
              done when you finish, or cancel if you leave the line.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => handleDone(currentActivity.rideId)}
                style={{ ...button, color: colors.success, borderColor: colors.successSoft }}
              >
                ✓ Mark Done
              </button>

              <button
                onClick={handleCancelCurrentActivity}
                style={{ ...button, color: colors.muted }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {currentActivity?.type === "in_line" && (
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
        )}

        {hasPersonalizedAccess ? (
          <section
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 92% 0%, rgba(5, 150, 105, 0.14) 0%, rgba(5, 150, 105, 0.04) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 28,
              boxShadow: "0 18px 44px rgba(28, 25, 23, 0.09)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 116,
                height: 116,
                borderRadius: "999px",
                right: -44,
                top: -50,
                background: "rgba(124, 58, 237, 0.10)",
              }}
            />

            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: colors.successSoft,
                  color: colors.success,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.7,
                  marginBottom: 9,
                }}
              >
                BEST NEXT MOVE
              </div>

              <h3
                style={{
                  margin: 0,
                  color: colors.text,
                  fontSize: 25,
                  letterSpacing: -0.5,
                  lineHeight: 1.15,
                }}
              >
                What should we do next?
              </h3>

              <p
                style={{
                  margin: "7px 0 14px",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                TOHI uses your park area, waits, weather, and family setup to avoid
                sending everyone on a bad walk.
              </p>

              <div
                style={{
                  marginBottom: 14,
                  padding: 13,
                  borderRadius: 22,
                  border: "1px solid rgba(124, 58, 237, 0.16)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.88) 0%, #F3E8FF 100%)",
                  boxShadow: "0 10px 24px rgba(124, 58, 237, 0.08)",
                }}
              >
                <label
                  htmlFor="current-land"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 950,
                    color: colors.purpleDeep,
                    marginBottom: 7,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Current park area
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
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 16,
                    padding: "11px 12px",
                    fontWeight: 850,
                    background: colors.card,
                    color: colors.text,
                    boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
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
                    marginTop: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    style={{
                      ...actionButton,
                      color: "#0369A1",
                      borderColor: "rgba(56, 189, 248, 0.28)",
                      background: "rgba(255,255,255,0.82)",
                    }}
                  >
                    <MapPin size={13} />{" "}
                    {locationLoading ? "Finding you..." : "Use My Location"}
                  </button>

                  <span style={{ color: colors.muted, fontSize: 12 }}>
                    Optional — helps avoid unnecessary walking.
                  </span>
                </div>

                {(locationAutoEnabled || lastAutoUpdateAt || lastLocationUpdateAt) && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.muted,
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
                      margin: "8px 0 0",
                      color: colors.success,
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 800,
                    }}
                  >
                    {locationMessage}
                  </p>
                )}

                {locationError && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.error,
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 800,
                    }}
                  >
                    {locationError}
                  </p>
                )}

                <p
                  style={{
                    margin: "8px 0 0",
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Pick the closest area. It does not need to be perfect — it just
                  helps TOHI avoid bad cross-park recommendations.
                </p>
              </div>

              {(reportedRideIssueIds.length > 0 || hiddenRideCount > 0) && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  {reportedRideIssueIds.length > 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(245, 158, 11, 0.28)",
                        background: colors.amberSoft,
                        color: "#92400E",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      Avoiding {reportedRideIssueIds.length} reported ride
                      {reportedRideIssueIds.length === 1 ? "" : "s"}
                    </div>
                  )}

                  {hiddenRideCount > 0 && (
                    <button
                      onClick={handleResetRecs}
                      style={{
                        ...actionButton,
                        color: colors.muted,
                        background: "rgba(255,255,255,0.74)",
                      }}
                    >
                      Reset hidden rides ({hiddenRideCount})
                    </button>
                  )}
                </div>
              )}

              {recommendations.needsLocation || !currentLand ? (
                <div
                  style={{
                    padding: 15,
                    borderRadius: 22,
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    background:
                      "linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
                    boxShadow: "0 12px 28px rgba(2, 132, 199, 0.08)",
                  }}
                >
                  <strong style={{ color: colors.text }}>
                    Pick where you are first.
                  </strong>
                  <p
                    style={{
                      margin: "7px 0 0",
                      color: colors.muted,
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    TOHI can show wait times without your location, but personalized
                    next moves need your current park area so we do not send your
                    family on a bad walk.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={locationLoading}
                      style={{
                        ...button,
                        background:
                          "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                        color: "white",
                        borderColor: "rgba(124, 58, 237, 0.28)",
                        boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
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
                    padding: 15,
                    borderRadius: 22,
                    border: `1px solid ${colors.cardBorder}`,
                    background:
                      "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
                  }}
                >
                  <strong>No strong recommendation right now.</strong>
                  <p style={{ margin: "7px 0 0", color: colors.muted, lineHeight: 1.45 }}>
                    Refresh wait data, reset hidden rides, or use this as a good
                    moment for a nearby indoor break, snack, restroom stop, or
                    quick regroup.
                  </p>
                </div>
              )}
            </div>
          </section>

        ) : (
          renderLockedFeatureCard({
            title: "Personalized Best Move is locked until setup is finished",
            body:
              "Without your family profile, TOHI cannot safely know height limits, thrill comfort, heat sensitivity, resort-break realism, or what kind of day you are trying to protect.",
          })
        )}

            </>
          )}

          {activeTab === "waits" && (
            <>
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
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#7C3AED",
                      }}
                    >
                      WAITS
                    </div>
                    <h2 style={{ margin: "6px 0 4px", color: "#1C1917" }}>
                      Live Wait Times
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: colors.muted,
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      Browse all visible attractions, refresh live data, and use ride actions
                      without cluttering the Home dashboard.
                    </p>
                  </div>

                  <button style={button} onClick={() => loadData(true)} disabled={loading}>
                    <RefreshCw size={14} /> {loading ? "Loading" : "Refresh"}
                  </button>
                </div>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Live wait data can lag the official park app during reopenings or
                  weather delays. Verify headliner status before walking across the park.
                </p>
              </section>

              <WaitTimesList
                rides={sortedRides}
                activeRideId={activeRideId}
                activePark={activePark}
                card={card}
                formatLandLabel={formatLandLabel}
                renderShowtimeInfo={renderShowtimeInfo}
                renderRideActions={renderRideActions}
              />
            </>
          )}

          {activeTab === "plan" && (
            <>
              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.06) 34%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #FEF3C7 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.24)",
                  borderRadius: 28,
                  boxShadow: "0 18px 44px rgba(245, 158, 11, 0.12)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -44,
                    bottom: -48,
                    background: "rgba(124, 58, 237, 0.10)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(245, 158, 11, 0.14)",
                      color: "#92400E",
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    ✨ TRIP RHYTHM
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: colors.text,
                      fontSize: 27,
                      letterSpacing: -0.6,
                      lineHeight: 1.15,
                    }}
                  >
                    Your calm trip plan
                  </h2>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxWidth: 620,
                    }}
                  >
                    Keep the day simple, realistic, and flexible. This is where TOHI
                    will help shape the trip before the park and protect family energy
                    once you are there.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveScreen("family_profile")}
                    style={{
                      ...button,
                      marginTop: 15,
                      background:
                        "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                      color: "white",
                      borderColor: "rgba(124, 58, 237, 0.28)",
                      boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
                    }}
                  >
                    {profileCompletion.isComplete ? "Review Trip Setup" : "Finish Trip Setup"}
                  </button>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: colors.amberSoft,
                    color: "#92400E",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 8,
                  }}
                >
                  PLANNING STATUS
                </div>

                <p
                  style={{
                    margin: 0,
                    color: colors.text,
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.4,
                  }}
                >
                  {timeContext.summary}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 12,
                  }}
                >
                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: colors.purpleSoft,
                      color: colors.purpleDeep,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Mode: {timeContext.planningMode.replace(/_/g, " ")}
                  </span>

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: access.canUseAiChat ? colors.successSoft : colors.coralSoft,
                      color: access.canUseAiChat ? colors.success : "#E11D48",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    AI: {access.canUseAiChat ? "available" : "locked"}
                  </span>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(124, 58, 237, 0.10)",
                    color: colors.purpleDeep,
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 10,
                  }}
                >
                  COMING NEXT
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  {[
                    ["Day-before plan preview", "Know the big priorities before you enter the park."],
                    ["Morning priority plan", "Start strong without turning the day into a race."],
                    ["Resort-break timing", "Protect rest when the family starts fading."],
                    ["Must-do moments", "Keep the emotional wins from getting lost in the chaos."],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        background: "rgba(255, 255, 255, 0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      <strong style={{ color: colors.text }}>{title}</strong>
                      <p
                        style={{
                          margin: "5px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "tohi" &&
            (access.canUseAiChat ? (
              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 4%, rgba(124, 58, 237, 0.20) 0%, rgba(124, 58, 237, 0.05) 30%, transparent 54%), linear-gradient(155deg, #FFFFFF 0%, #FFF7ED 48%, #F3E8FF 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                  borderRadius: 28,
                  boxShadow: "0 18px 46px rgba(91, 33, 182, 0.12)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -38,
                    top: -44,
                    background: "rgba(56, 189, 248, 0.14)",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 96,
                    height: 96,
                    borderRadius: "999px",
                    left: -42,
                    bottom: -46,
                    background: "rgba(245, 158, 11, 0.14)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 16,
                          display: "grid",
                          placeItems: "center",
                          background:
                            "linear-gradient(145deg, rgba(124,58,237,0.16), rgba(245,158,11,0.14))",
                          border: "1px solid rgba(124, 58, 237, 0.16)",
                          color: colors.purple,
                          boxShadow: "0 10px 24px rgba(124, 58, 237, 0.10)",
                        }}
                      >
                        <MessageCircle size={20} />
                      </div>

                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: "rgba(124, 58, 237, 0.10)",
                            color: colors.purpleDeep,
                            fontSize: 11,
                            fontWeight: 950,
                            letterSpacing: 0.7,
                          }}
                        >
                          ✨ TOHI COMPANION
                        </div>
                        <h2
                          style={{
                            margin: "8px 0 0",
                            color: colors.text,
                            fontSize: 26,
                            letterSpacing: -0.5,
                            lineHeight: 1.15,
                          }}
                        >
                          Ask TOHI
                        </h2>
                      </div>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: "0 0 14px",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxWidth: 620,
                    }}
                  >
                    Ask what to do next, how to handle heat or storms, whether a resort
                    break is realistic, or how to keep the day calm without overdoing it.
                  </p>

                  {chat.length === 0 && (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      {[
                        "What should we do next without wearing everyone out?",
                        "Should we take a break or keep going?",
                        "What if storms hit this afternoon?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setMessage(prompt)}
                          style={{
                            ...button,
                            justifyContent: "flex-start",
                            textAlign: "left",
                            borderRadius: 18,
                            padding: "10px 12px",
                            background: "rgba(255, 255, 255, 0.72)",
                            borderColor: "rgba(124, 58, 237, 0.14)",
                            color: colors.text,
                            boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {chat.length === 0 && (
                      <div
                        style={{
                          padding: 13,
                          borderRadius: 18,
                          border: `1px solid ${colors.cardBorder}`,
                          background: "rgba(255, 255, 255, 0.68)",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.45,
                        }}
                      >
                        TOHI uses your park, weather, family setup, current activity,
                        and recommendations to answer with real trip context.
                      </div>
                    )}

                    {chat.map((msg, idx) => {
                      const isUser = msg.role === "user";

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: isUser ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "88%",
                              padding: "11px 12px",
                              borderRadius: isUser
                                ? "18px 18px 6px 18px"
                                : "18px 18px 18px 6px",
                              background: isUser
                                ? "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)"
                                : "rgba(255, 255, 255, 0.82)",
                              border: isUser
                                ? "1px solid rgba(124, 58, 237, 0.26)"
                                : `1px solid ${colors.cardBorder}`,
                              color: isUser ? "white" : colors.text,
                              boxShadow: isUser
                                ? "0 12px 24px rgba(124, 58, 237, 0.16)"
                                : "0 10px 22px rgba(28, 25, 23, 0.05)",
                              fontSize: 14,
                              lineHeight: 1.45,
                            }}
                          >
                            <strong>{isUser ? "You" : "TOHI"}: </strong>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleChatSubmit}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 14,
                      padding: 8,
                      borderRadius: 999,
                      background: "rgba(255, 255, 255, 0.76)",
                      border: `1px solid ${colors.cardBorder}`,
                      boxShadow: "0 12px 24px rgba(28, 25, 23, 0.06)",
                    }}
                  >
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask TOHI..."
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        outline: "none",
                        borderRadius: 999,
                        padding: "9px 10px",
                        color: colors.text,
                        background: "transparent",
                        fontWeight: 700,
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        ...button,
                        background:
                          "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                        color: "white",
                        borderColor: "rgba(124, 58, 237, 0.26)",
                        boxShadow: "0 10px 20px rgba(124, 58, 237, 0.18)",
                      }}
                      disabled={chatLoading}
                    >
                      <Send size={14} /> {chatLoading ? "..." : "Send"}
                    </button>
                  </form>
                </div>
              </section>
            ) : (
              renderLockedFeatureCard({
                title: "TOHI guidance needs your trip setup",
                body:
                  "TOHI needs your trip setup so it can answer with your family, resort, height, and park context.",
                actionLabel: "Finish trip setup",
              })
            ))}

          {activeTab === "profile" && (
            <>
              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 2%, rgba(124, 58, 237, 0.22) 0%, rgba(124, 58, 237, 0.06) 34%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #F3E8FF 52%, #FFF7ED 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.20)",
                  borderRadius: 28,
                  boxShadow: "0 18px 44px rgba(124, 58, 237, 0.12)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 116,
                    height: 116,
                    borderRadius: "999px",
                    right: -46,
                    bottom: -52,
                    background: "rgba(56, 189, 248, 0.13)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(124, 58, 237, 0.12)",
                      color: colors.purpleDeep,
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    FAMILY CONTEXT
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: colors.text,
                      fontSize: 27,
                      letterSpacing: -0.6,
                      lineHeight: 1.15,
                    }}
                  >
                    Family setup
                  </h2>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxWidth: 620,
                    }}
                  >
                    TOHI uses your family profile to protect height limits, thrill
                    comfort, walking tolerance, heat sensitivity, resort-break realism,
                    and the kind of day you are trying to have.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveScreen("family_profile")}
                    style={{
                      ...button,
                      marginTop: 15,
                      background:
                        "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                      color: "white",
                      borderColor: "rgba(124, 58, 237, 0.28)",
                      boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
                    }}
                  >
                    {profileCompletion.isComplete ? "Review Setup" : "Finish Setup"}
                  </button>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: profileCompletion.isComplete
                      ? colors.successSoft
                      : colors.amberSoft,
                    color: profileCompletion.isComplete ? colors.success : "#92400E",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 12,
                  }}
                >
                  {profileCompletion.isComplete ? "SETUP COMPLETE" : "SETUP NEEDED"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Party",
                      `${familyProfileSummary.partySize || 0} guests · ${
                        familyProfileSummary.adultCount || 0
                      } adults · ${familyProfileSummary.childCount || 0} kids`,
                    ],
                    [
                      "Youngest groups",
                      `${familyProfileSummary.ageSummary?.under3Count || 0} under 3 · ${
                        familyProfileSummary.ageSummary?.childCount || 0
                      } Disney child · ${
                        familyProfileSummary.ageSummary?.disneyAdultCount || 0
                      } Disney adult`,
                    ],
                    [
                      "Shortest rider",
                      familyProfileSummary.shortestHeightInches != null
                        ? `${familyProfileSummary.shortestHeightInches}" tall`
                        : familyProfileSummary.childCount > 0
                        ? "Child height not set"
                        : "Adults only",
                    ],
                    [
                      "Resort",
                      familyProfileSummary.resortProfile?.name ||
                        familyProfileSummary.resortContext?.resortName ||
                        familyProfileSummary.resortContext?.offPropertyHotelName ||
                        "Not set",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        background: "rgba(255, 255, 255, 0.82)",
                        border: `1px solid ${colors.cardBorder}`,
                        boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          color: colors.muted,
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.5,
                          marginBottom: 5,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </div>
                      <strong
                        style={{
                          display: "block",
                          color: colors.text,
                          fontSize: 14,
                          lineHeight: 1.25,
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>

              {familyProfile.childCount > 0 && (
                <section
                  style={{
                    ...card,
                    background:
                      "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
                    border: "1px solid rgba(124, 58, 237, 0.18)",
                    boxShadow: "0 12px 30px rgba(124, 58, 237, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(124, 58, 237, 0.10)",
                      color: colors.purpleDeep,
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    CHILD RIDER DETAILS
                  </div>

                  <div style={{ display: "grid", gap: 9 }}>
                    {familyProfile.children.map((child, index) => {
                      const ageClass = getDisneyAgeClass(child.age);
                      const heightValue =
                        child.heightInches !== "" && child.heightInches != null
                          ? `${child.heightInches}" tall`
                          : "height not set";

                      return (
                        <div
                          key={child.id || index}
                          style={{
                            padding: 12,
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.82)",
                            border: `1px solid ${colors.cardBorder}`,
                          }}
                        >
                          <strong style={{ color: colors.text }}>
                            Child {index + 1}: age {child.age || "not set"} · {heightValue}
                          </strong>
                          <p
                            style={{
                              margin: "5px 0 0",
                              color: colors.muted,
                              fontSize: 13,
                              lineHeight: 1.4,
                            }}
                          >
                            {getDisneyAgeLabel(ageClass)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {familyProfileSummary.shortestHeightInches != null && (
                    <p
                      style={{
                        margin: "10px 0 0",
                        color:
                          familyProfileSummary.shortestHeightInches < 38
                            ? colors.error
                            : familyProfileSummary.shortestHeightInches < 44
                            ? "#92400E"
                            : colors.success,
                        fontSize: 13,
                        fontWeight: 850,
                        lineHeight: 1.45,
                      }}
                    >
                      {familyProfileSummary.shortestHeightInches < 38
                        ? "Height note: some family thrill rides will not be whole-family options yet."
                        : familyProfileSummary.shortestHeightInches < 44
                        ? "Height note: several mid-tier thrill rides may work, but bigger headliners still need filtering."
                        : "Height note: most major height-gated rides should be available, but TOHI will still check each ride."}
                    </p>
                  )}
                </section>
              )}

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
                  border: "1px solid rgba(56, 189, 248, 0.26)",
                  boxShadow: "0 12px 30px rgba(2, 132, 199, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(56, 189, 248, 0.16)",
                    color: "#0369A1",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 10,
                  }}
                >
                  TRIP CONTEXT
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  {[
                    [
                      "Selected parks",
                      familyProfileSummary.tripContext?.selectedParks?.length
                        ? familyProfileSummary.tripContext.selectedParks
                            .map((park) => getParkLabel(park))
                            .join(" · ")
                        : "Not set",
                    ],
                    [
                      "First park",
                      getParkLabel(familyProfileSummary.tripContext?.firstPark),
                    ],
                    [
                      "Priority park",
                      getParkLabel(familyProfileSummary.tripContext?.priorityPark),
                    ],
                    [
                      "Transportation",
                      familyProfileSummary.resortContext?.transportationMode &&
                      familyProfileSummary.resortContext.transportationMode !== "unknown"
                        ? familyProfileSummary.resortContext.transportationMode
                        : "Not set",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.82)",
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      <div
                        style={{
                          color: colors.muted,
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.5,
                          marginBottom: 5,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </div>
                      <strong
                        style={{
                          display: "block",
                          color: colors.text,
                          fontSize: 14,
                          lineHeight: 1.3,
                        }}
                      >
                        {value || "Not set"}
                      </strong>
                    </div>
                  ))}
                </div>

                {familyProfileSummary.resortProfile?.transportation?.length > 0 && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: colors.muted,
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    Resort transportation:{" "}
                    {familyProfileSummary.resortProfile.transportation.join(", ")}
                  </p>
                )}
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: colors.amberSoft,
                    color: "#92400E",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 10,
                  }}
                >
                  FAMILY PRIORITIES
                </div>

                {familyProfileSummary.priorities?.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {familyProfileSummary.priorities.map((priority) => {
                      const label =
                        FAMILY_PRIORITY_OPTIONS.find((item) => item.value === priority)
                          ?.label || priority;

                      return (
                        <span
                          key={priority}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 999,
                            background: "rgba(124, 58, 237, 0.10)",
                            color: colors.purpleDeep,
                            border: "1px solid rgba(124, 58, 237, 0.16)",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.45,
                    }}
                  >
                    No priorities selected yet. Add at least one so TOHI does not feel generic.
                  </p>
                )}
              </section>

              {!profileCompletion.isComplete && (
                <section
                  style={{
                    ...card,
                    background:
                      "linear-gradient(145deg, #FFFFFF 0%, #FEF3C7 100%)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                    boxShadow: "0 12px 30px rgba(245, 158, 11, 0.10)",
                  }}
                >
                  <strong style={{ color: "#92400E" }}>Still needed</strong>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {profileCompletion.missing?.length
                      ? profileCompletion.missing.join(", ")
                      : "Finish setup so TOHI can unlock personalized recommendations."}
                  </p>
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
                  <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 13 }}>
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
                    style={{ ...button, marginTop: 10, color: colors.purple }}
                  >
                    Turn Off Preview Gate Bypass
                  </button>
                </section>
              )}
            </>
          )}

      </div>
      </main>

      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default App;
