import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage, trackEvent } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { generatePackingChecklist } from "./utils/packingChecklist";
import { generateDayGamePlan } from "./utils/dayGamePlan";
import { generatePlanNudges } from "./utils/planNudges";
import {
  readStoredTripPlan,
  writeStoredTripPlan,
  updateTripPlanPreferences,
  toggleTripPlanMustDoExperience,
  createTripPlanFreshnessContext,
  getTripPlanFreshnessStatus,
  updateTripPlanFreshnessContext,
} from "./utils/tripPlan";
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
import { formatCloseTimeLabel, getParkHoursForDate } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";
import { getRideMeta, getParkRides } from "./rideMetadata";
import { shouldShowRideInWaitList } from "./attractionDisplayFilters";
import { getResortOptions } from "./resortProfiles";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { RecommendationCard } from "./components/RecommendationCard";
import { WaitTimesList } from "./components/WaitTimesList";
import { WhileYouWaitCard } from "./components/WhileYouWaitCard";
import { PlanTab } from "./components/PlanTab";
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

const DEBUG_SNAPSHOT_STORAGE_KEY = "parkplan.debugSnapshot";

function readDebugSnapshotEnabled() {
  try {
    return localStorage.getItem(DEBUG_SNAPSHOT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDebugSnapshotEnabled(enabled) {
  try {
    localStorage.setItem(DEBUG_SNAPSHOT_STORAGE_KEY, enabled ? "true" : "false");
  } catch (err) {
    console.warn("TOHI: could not save debug snapshot flag", err);
  }
}

function dbFmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === "object") return "{…}";
  return String(v);
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
      `Resort break guidance: ${resortName} is your selected resort. If the family is fading, only leave the park if transportation is realistic and you can leave enough return time.`
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

function getTimeOfDayGreeting(preferredName, date = new Date()) {
  const hour = date.getHours();
  const dayPart = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = String(preferredName || "").trim();

  return name ? `Good ${dayPart}, ${name}.` : `Good ${dayPart}.`;
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


function stripMarkdown(text) {
  return String(text || "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}





function isPlanningModeQuestion(text = "") {
  const value = String(text || "").toLowerCase();

  return (
    value.includes("full game plan") ||
    value.includes("gameplan") ||
    value.includes("game plan") ||
    value.includes("plan the rest of") ||
    value.includes("rest of our day") ||
    value.includes("full plan") ||
    value.includes("build a plan") ||
    value.includes("build me a plan") ||
    value.includes("compare") ||
    value.includes("tradeoff") ||
    value.includes("trade off") ||
    value.includes("explain why") ||
    value.includes("why is") ||
    value.includes("walk me through") ||
    value.includes("strategy for the day") ||
    value.includes("morning strategy") ||
    value.includes("evening strategy")
  );
}

function isLiveModeQuestion(text = "") {
  // Safe default: if the family did not clearly ask for a planning-style answer,
  // keep it brief for real in-park use.
  return !isPlanningModeQuestion(text);
}

function getFirstSentences(text = "", maxSentences = 2) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);

  if (sentences?.length) {
    return sentences.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
  }

  return cleaned;
}

function cleanAssistantReply(text = "", userMessage = "") {
  const cleaned = stripMarkdown(text);

  if (isLiveModeQuestion(userMessage)) {
    return getFirstSentences(cleaned, 2);
  }

  return cleaned;
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


function getExperienceTypeForPlan(ride = {}) {
  const name = String(ride?.name || "").toLowerCase();

  if (ride?.showProfile || name.includes("festival") || name.includes("parade") || name.includes("fireworks")) {
    return "show";
  }

  if (name.includes("meet") || name.includes("character") || name.includes("princess")) {
    return "character";
  }

  return "ride";
}

function buildMustDoExperienceOptions({ activePark, rides = [] }) {
  const liveRideById = new Map();
  const liveRideByName = new Map();

  (rides || []).forEach((ride) => {
    if (!ride) return;

    if (ride.id != null) {
      liveRideById.set(String(ride.id), ride);
    }

    if (ride.name) {
      liveRideByName.set(String(ride.name).toLowerCase(), ride);
    }
  });

  return getParkRides(activePark)
    .map(([id, meta]) => {
      const name = meta?.displayName || String(id);
      const liveRide = liveRideById.get(String(id)) || liveRideByName.get(String(name).toLowerCase()) || null;

      return {
        id: String(id),
        name,
        parkId: activePark,
        type: getExperienceTypeForPlan({ ...liveRide, ...meta, name }),
        land: meta?.land || liveRide?.land || "",
        source: "ride_metadata",
        waitTime: liveRide?.waitTime ?? null,
        isOpen: liveRide?.isOpen ?? null,
        tags: Array.isArray(meta?.tags) ? meta.tags : [],
        planningCategory: meta?.planningProfile?.category || "",
        paidAccess: meta?.planningProfile?.paidAccess || "none",
        earlyEntry: meta?.earlyEntry || null,
        ropeDrop: meta?.ropeDrop || null,
      };
    })
    .filter((experience) => experience.name && experience.planningCategory !== "context_only")
    .sort((a, b) => {
      const aHeadliner = a.tags.includes("headliner") ? 0 : 1;
      const bHeadliner = b.tags.includes("headliner") ? 0 : 1;

      if (aHeadliner !== bHeadliner) return aHeadliner - bHeadliner;
      return a.name.localeCompare(b.name);
    });
}


function isSelectableParkId(parkId) {
  const park = PARKS.find((item) => item.id === parkId);
  return Boolean(park && park.selectable !== false);
}

function getSafePlanningParkId(parkId, fallback = "magic_kingdom") {
  if (isSelectableParkId(parkId)) return parkId;
  if (isSelectableParkId(fallback)) return fallback;

  return PARKS.find((park) => park.selectable !== false)?.id || "magic_kingdom";
}

function getPlanningParkFromProfile(profile = {}) {
  const tripContext = profile?.tripContext || {};
  const selectedParks = Array.isArray(tripContext.parkSelectionIds)
    ? tripContext.parkSelectionIds
    : Array.isArray(tripContext.selectedParks)
    ? tripContext.selectedParks
    : [];

  return getSafePlanningParkId(
    tripContext.firstParkId || tripContext.firstPark || selectedParks[0],
    selectedParks.find(isSelectableParkId) || "magic_kingdom"
  );
}

function getScheduledParkForDate(profile = {}, todayDateString = "") {
  const schedule = profile?.tripContext?.parkDaySchedule;

  if (!todayDateString || !Array.isArray(schedule) || schedule.length === 0) {
    return null;
  }

  const scheduledDay = schedule.find((day) => day?.date === todayDateString);

  if (!scheduledDay || !isSelectableParkId(scheduledDay.primaryParkId)) {
    return null;
  }

  return {
    dayNumber: scheduledDay.dayNumber,
    date: scheduledDay.date,
    parkId: scheduledDay.primaryParkId,
    secondaryParkId: isSelectableParkId(scheduledDay.secondaryParkId)
      ? scheduledDay.secondaryParkId
      : "",
  };
}

function getPlanningParkDecisionFromProfile(profile = {}, todayDateString = "") {
  const fallbackPark = getPlanningParkFromProfile(profile);
  const scheduledParkForToday = getScheduledParkForDate(profile, todayDateString);

  if (scheduledParkForToday?.parkId) {
    return {
      parkId: getSafePlanningParkId(scheduledParkForToday.parkId, fallbackPark),
      source: "park_day_schedule",
      fallbackPark,
      scheduledParkForToday,
    };
  }

  return {
    parkId: fallbackPark,
    source: "profile_fallback",
    fallbackPark,
    scheduledParkForToday: null,
  };
}

function getParkNameById(parkId) {
  return PARKS.find((park) => park.id === parkId)?.name || parkId || "the park";
}

function getParkPlanLabel({ primaryParkId, secondaryParkId, fallbackParkId } = {}) {
  const primaryPark = primaryParkId || fallbackParkId || "";
  const primaryLabel = primaryPark ? getParkNameById(primaryPark) : "the park";
  const secondaryLabel = secondaryParkId ? getParkNameById(secondaryParkId) : "";

  return secondaryLabel ? `${primaryLabel}, then ${secondaryLabel}` : primaryLabel;
}

function getScheduledParkPlanLabel(scheduledPark = {}, fallbackParkId = "") {
  return getParkPlanLabel({
    primaryParkId: scheduledPark?.parkId,
    secondaryParkId: scheduledPark?.secondaryParkId,
    fallbackParkId,
  });
}


function getParkDayScheduleDays(profile = {}) {
  const schedule = profile?.tripContext?.parkDaySchedule;

  if (!Array.isArray(schedule)) {
    return [];
  }

  return schedule
    .filter((day) => day?.date)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildParkDayScheduleStatus({
  familyProfile = {},
  todayDateString = "",
  scheduledParkForToday = null,
  fallbackParkId = "",
} = {}) {
  const scheduleDays = getParkDayScheduleDays(familyProfile);
  const scheduleCount = scheduleDays.length;
  const firstDay = scheduleDays[0] || null;
  const lastDay = scheduleDays[scheduleDays.length - 1] || null;
  const todayDate = String(todayDateString || "");
  const fallbackLabel = fallbackParkId ? getParkNameById(fallbackParkId) : "your profile fallback park";
  const scheduledPlanLabel = scheduledParkForToday?.parkId
    ? getScheduledParkPlanLabel(scheduledParkForToday, fallbackParkId)
    : "";

  const base = {
    hasSchedule: scheduleCount > 0,
    scheduleCount,
    todayDate,
    firstScheduleDate: firstDay?.date || "",
    lastScheduleDate: lastDay?.date || "",
    fallbackParkId,
    fallbackParkLabel: fallbackLabel,
    scheduledParkId: scheduledParkForToday?.parkId || "",
    scheduledSecondaryParkId: scheduledParkForToday?.secondaryParkId || "",
    scheduledDayNumber: scheduledParkForToday?.dayNumber || null,
    scheduledPlanLabel,
  };

  if (!scheduleCount) {
    return {
      ...base,
      status: "no_schedule",
      label: "No park-day schedule set",
      guidance: `No park-day schedule is saved, so TOHI is using ${fallbackLabel} from your profile as the planning park.`,
    };
  }

  if (scheduledParkForToday?.parkId) {
    return {
      ...base,
      status: "active_today",
      label: scheduledParkForToday?.dayNumber
        ? `Trip day ${scheduledParkForToday.dayNumber} is scheduled`
        : "Today has a saved park plan",
      guidance: `Today's saved park plan is ${scheduledPlanLabel || getParkNameById(scheduledParkForToday.parkId)}.`,
    };
  }

  if (todayDate && firstDay?.date && todayDate < firstDay.date) {
    return {
      ...base,
      status: "before_trip_schedule",
      label: "Park schedule starts soon",
      guidance: `Your saved park-day schedule starts on ${firstDay.date}. Until then, TOHI is using ${fallbackLabel} from your profile as the planning park.`,
    };
  }

  if (todayDate && lastDay?.date && todayDate > lastDay.date) {
    return {
      ...base,
      status: "after_trip_schedule",
      label: "Saved schedule has ended",
      guidance: `Your saved park-day schedule ended on ${lastDay.date}, so TOHI is using ${fallbackLabel} from your profile as the planning park.`,
    };
  }

  return {
    ...base,
    status: "missing_today",
    label: "No park scheduled for today",
    guidance: `Your saved park-day schedule does not include today, so TOHI is using ${fallbackLabel} from your profile as the planning park.`,
  };
}

function formatMustDoCountLabel(count) {
  const numericCount = Number(count) || 0;
  if (numericCount === 1) return "1 must-do";
  return `${numericCount} must-dos`;
}

function formatMustDoNameList(experiences = [], max = 3) {
  const names = experiences
    .map((experience) => experience?.name)
    .filter(Boolean)
    .slice(0, max);

  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function getMustDosForParkFromTripPlan(tripPlan = {}, parkId = "") {
  if (!parkId || !Array.isArray(tripPlan?.mustDoExperiences)) {
    return [];
  }

  return tripPlan.mustDoExperiences.filter(
    (experience) => experience?.parkId === parkId
  );
}

function buildSecondParkMustDoSummary({ tripPlan = {}, secondaryParkId = "" } = {}) {
  const experiences = getMustDosForParkFromTripPlan(tripPlan, secondaryParkId);
  const count = experiences.length;
  const label = formatMustDoNameList(experiences, 3);

  return {
    count,
    label,
    hasMustDos: count > 0,
    names: experiences.map((experience) => experience?.name).filter(Boolean),
  };
}

function buildParkHopperContext({
  scheduledParkForToday = null,
  timeContext = {},
  planTabState = {},
  tripPlan = {},
} = {}) {
  const primaryParkId = scheduledParkForToday?.parkId || "";
  const secondaryParkId = scheduledParkForToday?.secondaryParkId || "";

  if (!primaryParkId || !secondaryParkId) {
    return {
      hasSecondPark: false,
      status: "none",
      label: "No second park set",
      guidance: "",
      shouldConsiderSecondPark: false,
      primaryParkId,
      secondaryParkId: "",
      primaryParkLabel: primaryParkId ? getParkNameById(primaryParkId) : "",
      secondaryParkLabel: "",
      secondParkMustDos: {
        count: 0,
        label: "",
        hasMustDos: false,
        names: [],
      },
      secondParkPriority: "none",
    };
  }

  const primaryParkLabel = getParkNameById(primaryParkId);
  const secondaryParkLabel = getParkNameById(secondaryParkId);
  const totalMinutes = Number(timeContext?.orlandoTotalMinutes);
  const dayPhase = String(timeContext?.dayPhase || "");
  const isAfterPrimaryParkClose = Boolean(planTabState?.isAfterParkClose);
  const secondParkMustDos = buildSecondParkMustDoSummary({
    tripPlan,
    secondaryParkId,
  });
  const secondParkPriority = secondParkMustDos.hasMustDos
    ? "has_must_dos"
    : "flexible_no_must_dos";
  const mustDoCountLabel = formatMustDoCountLabel(secondParkMustDos.count);
  const secondParkMustDoContext = secondParkMustDos.hasMustDos
    ? `${secondaryParkLabel} has ${mustDoCountLabel} saved: ${secondParkMustDos.label}.`
    : `${secondaryParkLabel} has no must-dos saved yet, so treat the hop as flexible instead of pressure.`;

  const base = {
    hasSecondPark: true,
    primaryParkId,
    secondaryParkId,
    primaryParkLabel,
    secondaryParkLabel,
    secondParkMustDos,
    secondParkPriority,
  };

  if (isAfterPrimaryParkClose) {
    return {
      ...base,
      status: "late_day_check",
      label: "Late-day hopper check",
      shouldConsiderSecondPark: true,
      guidance: `${primaryParkLabel} is at or past its listed close. ${secondaryParkLabel} can still make sense only if it is still open, the family has energy, and the move supports something that still matters. ${secondParkMustDoContext}`,
    };
  }

  if (!Number.isFinite(totalMinutes)) {
    return {
      ...base,
      status: "context_only",
      label: "Second park is set",
      shouldConsiderSecondPark: false,
      guidance: `${secondaryParkLabel} is set as the second park today. Treat it as context until TOHI has a clearer time-of-day read. ${secondParkMustDoContext}`,
    };
  }

  if (totalMinutes < 12 * 60) {
    return {
      ...base,
      status: "primary_focus",
      label: "Primary park first",
      shouldConsiderSecondPark: false,
      guidance: `Start by protecting the ${primaryParkLabel} plan. Do not let the second park pull the family away before the first park has had a fair chance to deliver. ${secondParkMustDoContext}`,
    };
  }

  if (totalMinutes < 15 * 60) {
    return {
      ...base,
      status: "reset_before_hop",
      label: "Reset before hopping",
      shouldConsiderSecondPark: false,
      guidance: `${secondaryParkLabel} is still on the plan, but this is usually the window to check food, water, heat, and family energy before committing to a hop. ${secondParkMustDoContext}`,
    };
  }

  if (totalMinutes < 17 * 60) {
    return {
      ...base,
      status: "evaluate_hop",
      label: "Evaluate the hop",
      shouldConsiderSecondPark: true,
      guidance: `This is the first real window to consider ${secondaryParkLabel}. Hop only if ${primaryParkLabel} has delivered enough value and the family still has enough energy for the transfer. ${secondParkMustDoContext}`,
    };
  }

  if (dayPhase === "late_evening" || totalMinutes >= 19 * 60) {
    return {
      ...base,
      status: "evening_only_if_worth_it",
      label: "Only hop if it is worth it",
      shouldConsiderSecondPark: true,
      guidance: `${secondaryParkLabel} is the second park, but late hops should be intentional: a must-do, nighttime goal, food plan, or clear family-energy win. ${secondParkMustDoContext}`,
    };
  }

  return {
    ...base,
    status: "second_park_window",
    label: "Second park window",
    shouldConsiderSecondPark: true,
    guidance: `${secondaryParkLabel} can become relevant now if the family still feels good. Keep it optional, not automatic. ${secondParkMustDoContext}`,
  };
}

function buildLiveParkContext({
  activePark = "",
  planningPark = "",
  scheduledParkForToday = null,
  todayPlannedParkLabel = "",
  parkHopperContext = {},
} = {}) {
  const activeParkId = activePark || "";
  const planningParkId = planningPark || "";
  const scheduledPrimaryParkId = scheduledParkForToday?.parkId || planningParkId || "";
  const scheduledSecondaryParkId = scheduledParkForToday?.secondaryParkId || "";
  const activeParkLabel = activeParkId ? getParkNameById(activeParkId) : "the live park";
  const planningParkLabel = planningParkId ? getParkNameById(planningParkId) : "the planned park";
  const scheduledPrimaryParkLabel = scheduledPrimaryParkId
    ? getParkNameById(scheduledPrimaryParkId)
    : planningParkLabel;
  const scheduledSecondaryParkLabel = scheduledSecondaryParkId
    ? getParkNameById(scheduledSecondaryParkId)
    : "";
  const planLabel = todayPlannedParkLabel || scheduledPrimaryParkLabel || planningParkLabel;
  const isViewingPlanningPark = Boolean(activeParkId && planningParkId && activeParkId === planningParkId);
  const isViewingScheduledPrimaryPark = Boolean(
    activeParkId && scheduledPrimaryParkId && activeParkId === scheduledPrimaryParkId
  );
  const isViewingScheduledSecondPark = Boolean(
    activeParkId && scheduledSecondaryParkId && activeParkId === scheduledSecondaryParkId
  );
  const isLiveParkMismatch = Boolean(activeParkId && planningParkId && activeParkId !== planningParkId);
  const secondParkMustDoCount = Number(parkHopperContext?.secondParkMustDos?.count || 0);
  const secondParkMustDoLabel = parkHopperContext?.secondParkMustDos?.label || "";
  const secondParkHasMustDos = secondParkMustDoCount > 0;

  const base = {
    activeParkId,
    activeParkLabel,
    planningParkId,
    planningParkLabel,
    scheduledPrimaryParkId,
    scheduledPrimaryParkLabel,
    scheduledSecondaryParkId,
    scheduledSecondaryParkLabel,
    isViewingPlanningPark,
    isViewingScheduledPrimaryPark,
    isViewingScheduledSecondPark,
    isLiveParkMismatch,
  };

  if (!activeParkId) {
    return {
      ...base,
      status: "unknown",
      label: "Live park not set",
      guidance: "Choose a live park so Right Now can use the correct wait times.",
      showNotice: false,
    };
  }

  if (isViewingScheduledSecondPark) {
    const mustDoContext = secondParkHasMustDos
      ? ` It has ${formatMustDoCountLabel(secondParkMustDoCount)} saved: ${secondParkMustDoLabel}.`
      : " It does not have saved must-dos yet, so keep the hop flexible.";

    return {
      ...base,
      status: "viewing_second_park",
      label: "Viewing your second park",
      guidance: `You’re viewing ${activeParkLabel} live waits. Today’s plan is ${planLabel}, and ${activeParkLabel} is the second park.${mustDoContext} Right Now moves are using ${activeParkLabel}.`,
      showNotice: true,
    };
  }

  if (isViewingPlanningPark || isViewingScheduledPrimaryPark) {
    return {
      ...base,
      status: "viewing_planned_park",
      label: "Viewing planned park",
      guidance: `You’re viewing ${activeParkLabel} live waits, which matches today’s planning park. Right Now moves are using ${activeParkLabel}.`,
      showNotice: false,
    };
  }

  if (isLiveParkMismatch) {
    return {
      ...base,
      status: "viewing_different_park",
      label: "Viewing a different live park",
      guidance: `You’re viewing ${activeParkLabel} live waits, while today’s plan is ${planLabel}. Right Now moves are using ${activeParkLabel}; the Plan tab is still anchored to ${planningParkLabel}.`,
      showNotice: true,
    };
  }

  return {
    ...base,
    status: "live_only",
    label: "Live park view",
    guidance: `Right Now moves are using ${activeParkLabel} live waits.`,
    showNotice: false,
  };
}
function getMinutesFromDateValue(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  const timeMs = date.getTime();

  if (!Number.isFinite(timeMs)) return null;

  return date.getHours() * 60 + date.getMinutes();
}

function formatPlanTimeLabel(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  } catch {
    return "";
  }
}

function buildPlanTabState({ activePark, timeContext = {} } = {}) {
  const tripStatus = timeContext?.tripStatus || {};
  const now = new Date(timeContext?.nowIso || Date.now());
  const parkHours = getParkHoursForDate(activePark, now);
  const openMinutes = getMinutesFromDateValue(parkHours?.open);
  const closeMinutes = getMinutesFromDateValue(parkHours?.close);
  const nowMinutes = Number(timeContext?.orlandoTotalMinutes);
  const hasReliableParkWindow =
    Number.isFinite(nowMinutes) && openMinutes != null && closeMinutes != null;

  const base = {
    parkId: activePark || "",
    tripStatus: tripStatus.status || "unknown",
    parkOpenLabel: formatPlanTimeLabel(parkHours?.open),
    parkCloseLabel: formatPlanTimeLabel(parkHours?.close),
    orlandoTimeLabel: timeContext?.orlandoTimeLabel || "",
    dayPhase: timeContext?.dayPhase || "",
    planningMode: timeContext?.planningMode || "",
    isBeforeParkOpen: false,
    isAfterParkClose: false,
  };

  if (!tripStatus.hasDates) {
    return {
      ...base,
      mode: "pre_trip",
      label: "Pre-trip",
      headline: "Trip planning view.",
      detail: "Set trip dates when you are ready so TOHI can shift into morning and park-day views.",
      isPreTrip: true,
      isMorningOf: false,
      isInPark: false,
    };
  }

  if (tripStatus.isBeforeTrip || tripStatus.isDayBeforeTrip) {
    return {
      ...base,
      mode: "pre_trip",
      label: tripStatus.isDayBeforeTrip ? "Day before" : "Pre-trip",
      headline: tripStatus.isDayBeforeTrip ? "Tomorrow prep view." : "Trip planning view.",
      detail: "Use this space to check priorities, tune the day, and get the bag ready.",
      isPreTrip: true,
      isMorningOf: false,
      isInPark: false,
    };
  }

  if (tripStatus.isAfterTrip) {
    return {
      ...base,
      mode: "pre_trip",
      label: "Trip dates passed",
      headline: "Trip dates have passed.",
      detail: "Update your trip dates when you are ready to plan the next park day.",
      isPreTrip: true,
      isMorningOf: false,
      isInPark: false,
      isAfterTrip: true,
    };
  }

  if (tripStatus.isDuringTrip && hasReliableParkWindow) {
    if (nowMinutes < openMinutes) {
      return {
        ...base,
        mode: "morning_of",
        label: "Morning of",
        headline: "Morning check-in.",
        detail: parkHours?.open
          ? `${getParkNameById(activePark)} opens around ${formatPlanTimeLabel(parkHours.open)}. This is the window for a clear first move.`
          : "This is the window for a clear first move before the park opens.",
        isPreTrip: false,
        isMorningOf: true,
        isInPark: false,
        isBeforeParkOpen: true,
      };
    }

    if (nowMinutes >= closeMinutes) {
      return {
        ...base,
        mode: "in_park",
        label: "Park day wrap-up",
        headline: "Park day wrap-up.",
        detail: "Keep this light and use it to check what still matters before calling the day.",
        isPreTrip: false,
        isMorningOf: false,
        isInPark: true,
        isAfterParkClose: true,
      };
    }

    return {
      ...base,
      mode: "in_park",
      label: "In park",
      headline: "In-park reference.",
      detail: "Keep this light while the Right Now tab handles live moves.",
      isPreTrip: false,
      isMorningOf: false,
      isInPark: true,
    };
  }

  if (tripStatus.isDuringTrip) {
    const morningLike =
      timeContext?.dayPhase === "overnight" ||
      timeContext?.dayPhase === "early_morning" ||
      timeContext?.planningMode === "day_of_rope_drop";

    return {
      ...base,
      mode: morningLike ? "morning_of" : "in_park",
      label: morningLike ? "Morning of" : "In park",
      headline: morningLike ? "Morning check-in." : "In-park reference.",
      detail: morningLike
        ? "This is the window for a clear first move before the park opens."
        : "Keep this light while the Right Now tab handles live moves.",
      isPreTrip: false,
      isMorningOf: morningLike,
      isInPark: !morningLike,
    };
  }

  return {
    ...base,
    mode: "pre_trip",
    label: "Pre-trip",
    headline: "Trip planning view.",
    detail: "Use this space to check priorities, tune the day, and get the bag ready.",
    isPreTrip: true,
    isMorningOf: false,
    isInPark: false,
  };
}






function hasSpecificRidePlaceOrActionInMessage(message = "") {
  const text = String(message || "").toLowerCase();

  // "Where should we go to get AC/food/a break?" is not open-ended.
  // It has a clear goal, so send it to AI instead of re-asking the energy question.
  if (/where should we go to\s+(get|find|have|take|grab|cool|rest|eat)/.test(text)) {
    return true;
  }

  if (
    text.includes("where should we go") &&
    (text.includes("ac") ||
      text.includes("air condition") ||
      text.includes("cool") ||
      text.includes("food") ||
      text.includes("snack") ||
      text.includes("eat") ||
      text.includes("rest") ||
      text.includes("break"))
  ) {
    return true;
  }

  const specificTerms = [
    "tron",
    "seven dwarfs",
    "mine train",
    "space mountain",
    "big thunder",
    "tiana",
    "haunted mansion",
    "peter pan",
    "jungle cruise",
    "pirates",
    "small world",
    "peoplemover",
    "carousel of progress",
    "buzz",
    "winnie",
    "pooh",
    "dumbo",
    "barnstormer",
    "guardians",
    "cosmic rewind",
    "remy",
    "ratatouille",
    "frozen",
    "soarin",
    "test track",
    "rise of the resistance",
    "slinky",
    "tower of terror",
    "rock n roller",
    "rock 'n'",
    "flight of passage",
    "safari",
    "everest",
    "festival of fantasy",
    "fireworks",
    "parade",
    "show",
    "restaurant",
    "quick service",
    "snack",
    "food",
    "eat",
    "lunch",
    "dinner",
    "resort break",
    "break",
    "leave",
    "stay",
    "wait",
    "line",
    "tomorrowland",
    "fantasyland",
    "frontierland",
    "adventureland",
    "liberty square",
    "main street",
    "ac",
    "air conditioning",
    "air-conditioned",
    "cool down",
    "cool off",
    "rest",
  ];

  return specificTerms.some((term) => text.includes(term));
}

function isPlanningDepthQuestion(message = "") {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("full game plan") ||
    text.includes("gameplan") ||
    text.includes("game plan") ||
    text.includes("plan the rest of") ||
    text.includes("rest of our day") ||
    text.includes("full plan") ||
    text.includes("build a plan") ||
    text.includes("build me a plan") ||
    text.includes("compare") ||
    text.includes("tradeoff") ||
    text.includes("trade off") ||
    text.includes("explain why") ||
    text.includes("walk me through")
  );
}

function isOpenEndedLiveStrategyQuestion(message = "") {
  const text = String(message || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[?.!]+$/g, "")
    .trim();

  if (!text) return false;
  if (isPlanningDepthQuestion(text)) return false;
  if (hasSpecificRidePlaceOrActionInMessage(text)) return false;

  const exactOpenEndedQuestions = new Set([
    "what should we do next",
    "what should we do next based on our plan",
    "what do we do next",
    "what do we do next based on our plan",
    "what next",
    "what's next",
    "whats next",
    "what now",
    "what's the call",
    "whats the call",
    "help",
    "help us decide",
    "where should we go",
    "where should we go next",
    "not sure what to do",
    "we're lost",
    "were lost",
    "what's good right now",
    "whats good right now",
    "thoughts",
    "worth it",
  ]);

  if (exactOpenEndedQuestions.has(text)) {
    return true;
  }

  // Safe default for vague, in-park language: ask one human question first.
  const vagueLivePhrases = [
    "what should",
    "what do",
    "what next",
    "what now",
    "where should",
    "help",
    "lost",
    "not sure",
    "thoughts",
    "what's good",
    "whats good",
    "based on our plan",
  ];

  return vagueLivePhrases.some((phrase) => text.includes(phrase));
}

function isAwaitingLiveStateAnswer(chatHistory = []) {
  const lastAssistantMessage = [...(chatHistory || [])]
    .reverse()
    .find((msg) => msg.role === "assistant");

  return lastAssistantMessage?.isLiveStateQuestion === true;
}

function isWithinLiveStateFollowupWindow(chatHistory = [], maxUserMessages = 3) {
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  const lastLiveStateIndex = history
    .map((msg, index) => ({ msg, index }))
    .reverse()
    .find(({ msg }) => msg.role === "assistant" && msg.isLiveStateQuestion === true)?.index;

  if (lastLiveStateIndex == null) return false;

  const messagesAfter = history.slice(lastLiveStateIndex + 1);
  const userMessagesAfter = messagesAfter.filter((msg) => msg.role === "user").length;

  // The first answer plus the next couple of follow-ups are part of the same
  // live conversation. Do not restart the clarification loop yet.
  return userMessagesAfter > 0 && userMessagesAfter <= maxUserMessages;
}

function familyStateTextIncludesAny(text = "", patterns = []) {
  return patterns.some((pattern) => text.includes(pattern));
}

function inferLatestLiveFamilyState(message = "", chatHistory = []) {
  const sourceText = String(message || "").trim();
  const text = sourceText.toLowerCase();
  const cameFromLiveStateQuestion =
    isAwaitingLiveStateAnswer(chatHistory) || isWithinLiveStateFollowupWindow(chatHistory, 3);

  const readyPatterns = [
    "ready",
    "ready for one",
    "one more",
    "keep going",
    "keep moving",
    "still going",
    "good to go",
    "we're good",
    "were good",
    "we are good",
    "up for it",
    "want to ride",
    "do a ride",
    "another ride",
  ];

  const tiredPatterns = [
    "tired",
    "exhausted",
    "wiped",
    "beat",
    "drained",
    "fading",
    "starting to fade",
    "low energy",
    "energy is low",
    "done walking",
    "cranky",
    "meltdown",
    "melting down",
    "overwhelmed",
    "overstimulated",
  ];

  const hotPatterns = [
    "hot",
    "overheated",
    "too hot",
    "need ac",
    "need a/c",
    "need air",
    "air conditioning",
    "cool down",
    "cool off",
    "shade",
  ];

  const hungryPatterns = [
    "hungry",
    "starving",
    "need food",
    "needs food",
    "food",
    "eat",
    "lunch",
    "dinner",
    "snack",
  ];

  const bathroomPatterns = ["bathroom", "restroom", "potty"];
  const waterPatterns = ["water", "thirsty", "dehydrated", "drink"];
  const calmPatterns = ["calm", "quiet", "sensory", "overstimulated", "overwhelmed"];
  const windDownPatterns = [
    "wind down",
    "winding down",
    "done",
    "leave",
    "head out",
    "back to hotel",
    "back to resort",
    "call it",
    "call it a day",
  ];

  const needs = [];
  if (familyStateTextIncludesAny(text, hungryPatterns)) needs.push("food");
  if (familyStateTextIncludesAny(text, hotPatterns)) needs.push("ac_or_shade");
  if (familyStateTextIncludesAny(text, bathroomPatterns)) needs.push("bathroom");
  if (familyStateTextIncludesAny(text, waterPatterns)) needs.push("water");
  if (familyStateTextIncludesAny(text, calmPatterns)) needs.push("calm");
  if (
    familyStateTextIncludesAny(text, tiredPatterns) ||
    text.includes("need a break") ||
    text.includes("needs a break") ||
    text.includes("rest")
  ) {
    needs.push("rest");
  }

  const wantsOneMore = familyStateTextIncludesAny(text, readyPatterns);
  const isTired = familyStateTextIncludesAny(text, tiredPatterns);
  const isHot = familyStateTextIncludesAny(text, hotPatterns);
  const isHungry = familyStateTextIncludesAny(text, hungryPatterns);
  const isWindingDown = familyStateTextIncludesAny(text, windDownPatterns);

  let energy = "unknown";
  if (isWindingDown || isTired) energy = "tired";
  else if (isHot || isHungry) energy = "fading";
  else if (wantsOneMore) energy = "ready";

  let intent = "unknown";
  if (isWindingDown) intent = "wind_down";
  else if (isTired || isHot || isHungry || needs.includes("rest") || needs.includes("calm")) intent = "reset";
  else if (wantsOneMore) intent = "one_more_ride";

  const uniqueNeeds = Array.from(new Set(needs));
  const recoveryMode =
    energy === "tired" ||
    energy === "fading" ||
    intent === "reset" ||
    uniqueNeeds.some((need) => ["food", "ac_or_shade", "water", "rest", "calm", "bathroom"].includes(need));

  const confidence =
    cameFromLiveStateQuestion && (energy !== "unknown" || uniqueNeeds.length || intent !== "unknown")
      ? "strong"
      : energy !== "unknown" || uniqueNeeds.length || intent !== "unknown"
      ? "normal"
      : "none";

  const summary =
    confidence === "none"
      ? ""
      : `Family state from latest chat: energy=${energy}; intent=${intent}; needs=${
          uniqueNeeds.length ? uniqueNeeds.join(", ") : "none"
        }.`;

  return {
    sourceText,
    source: cameFromLiveStateQuestion ? "live_state_answer" : "user_message",
    cameFromLiveStateQuestion,
    energy,
    needs: uniqueNeeds,
    intent,
    recoveryMode,
    confidence,
    shouldRecommendNow: cameFromLiveStateQuestion,
    summary,
  };
}

function getLiveStateClarifyingQuestionForContext({
  familyProfile = {},
  timeContext = {},
} = {}) {
  const hasYoungKids =
    familyProfile.hasSmallChildren ||
    familyProfile.hasUnder3 ||
    familyProfile.ageSummary?.under3Count > 0 ||
    familyProfile.ageSummary?.childCount > 0;

  const dayPhase = String(timeContext?.dayPhase || "").toLowerCase();
  const planningMode = String(timeContext?.planningMode || "").toLowerCase();

  if (dayPhase.includes("morning") || planningMode.includes("rope")) {
    return hasYoungKids
      ? "How are the little ones doing — ready to hit something big, or do we need to ease in?"
      : "How's everyone feeling — ready to hit something big, or do we need to ease in?";
  }

  if (
    dayPhase.includes("evening") ||
    planningMode.includes("evening") ||
    planningMode.includes("night")
  ) {
    return "How's the crew feeling — ready for one more, or starting to wind down?";
  }

  return hasYoungKids
    ? "How are the little ones holding up — still going, or starting to fade?"
    : "How's everyone's energy right now — still going, or starting to fade?";
}

function shouldAskFrontendLiveStateQuestion(message = "", chatHistory = []) {
  if (isAwaitingLiveStateAnswer(chatHistory)) return false;
  if (isWithinLiveStateFollowupWindow(chatHistory)) return false;

  return isOpenEndedLiveStrategyQuestion(message);
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
  const [initialFamilyProfileState] = useState(() => {
    const storedProfile = readStoredFamilyProfile();
    const storedCompletion = getFamilyProfileCompletion(storedProfile);

    return {
      profile: storedProfile,
      activeScreen: storedCompletion.isComplete ? "main" : "family_profile",
    };
  });
  const [familyProfile, setFamilyProfile] = useState(() => initialFamilyProfileState.profile);
  const [activeScreen, setActiveScreen] = useState(() => initialFamilyProfileState.activeScreen);
  const [activeTab, setActiveTab] = useState("home");
  const [devPreviewFullApp, setDevPreviewFullApp] = useState(() =>
    readDevPreviewFullApp()
  );
  const [familyProfileStep, setFamilyProfileStep] = useState(1);
  const [tripPlanState, setTripPlanState] = useState(() => readStoredTripPlan());
  const [planningPark, setPlanningPark] = useState(() =>
    getPlanningParkFromProfile(initialFamilyProfileState.profile)
  );
  const [manualPlanningParkOverride, setManualPlanningParkOverride] = useState("");
  const lastProfilePlanningParkRef = useRef(planningPark);

  const [currentLand, setCurrentLand] = useState(null);
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [debugSnapshotEnabled, setDebugSnapshotEnabled] = useState(() =>
    readDebugSnapshotEnabled()
  );

  const isRestoringParkState = useRef(false);

  useEffect(() => {
    writeStoredFamilyProfile(familyProfile);
  }, [familyProfile]);

  useEffect(() => {
    writeDevPreviewFullApp(devPreviewFullApp);
  }, [devPreviewFullApp]);

  useEffect(() => {
    writeStoredTripPlan(tripPlanState);
  }, [tripPlanState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugValue = params.get("debug");
    if (debugValue === "1") {
      setDebugSnapshotEnabled(true);
      writeDebugSnapshotEnabled(true);
    }
    if (debugValue === "0") {
      setDebugSnapshotEnabled(false);
      writeDebugSnapshotEnabled(false);
    }
  }, []);

  const familyProfileSummary = useMemo(() => {
    return buildFamilyProfileSummary(familyProfile);
  }, [familyProfile]);

  const profileCompletion = useMemo(() => {
    return getFamilyProfileCompletion(familyProfileSummary);
  }, [familyProfileSummary]);

  const isProfileIncomplete = !profileCompletion.isComplete;
  const homeGreeting = getTimeOfDayGreeting(familyProfileSummary?.preferredName);

  const timeContext = useMemo(() => {
    return getCurrentTimeContext({
      activePark,
      familyProfile: familyProfileSummary,
    });
  }, [activePark, familyProfileSummary]);

  const profilePlanningParkDecision = useMemo(() => {
    return getPlanningParkDecisionFromProfile(
      familyProfileSummary,
      timeContext?.orlandoDate
    );
  }, [familyProfileSummary, timeContext?.orlandoDate]);

  const scheduledParkForToday = profilePlanningParkDecision.scheduledParkForToday;
  const planningParkSource = manualPlanningParkOverride
    ? "manual_override"
    : profilePlanningParkDecision.source;
  const scheduledSecondaryParkId = scheduledParkForToday?.secondaryParkId || "";
  const scheduledSecondaryParkLabel = scheduledSecondaryParkId
    ? getParkNameById(scheduledSecondaryParkId)
    : "";
  const todayPlannedParkLabel = getScheduledParkPlanLabel(
    scheduledParkForToday,
    planningPark
  );
  const parkDayScheduleStatus = useMemo(() => {
    return buildParkDayScheduleStatus({
      familyProfile: familyProfileSummary,
      todayDateString: timeContext?.orlandoDate,
      scheduledParkForToday,
      fallbackParkId: profilePlanningParkDecision.fallbackPark || planningPark,
    });
  }, [familyProfileSummary, timeContext?.orlandoDate, scheduledParkForToday, profilePlanningParkDecision.fallbackPark, planningPark]);
  const planningParkLabel = getParkNameById(planningPark);

  useEffect(() => {
    const nextPlanningPark = getSafePlanningParkId(
      manualPlanningParkOverride || profilePlanningParkDecision.parkId,
      profilePlanningParkDecision.fallbackPark || "magic_kingdom"
    );

    if (lastProfilePlanningParkRef.current !== nextPlanningPark) {
      lastProfilePlanningParkRef.current = nextPlanningPark;
      setPlanningPark(nextPlanningPark);
    }
  }, [manualPlanningParkOverride, profilePlanningParkDecision]);

  const planningTimeContext = useMemo(() => {
    return getCurrentTimeContext({
      activePark: planningPark,
      familyProfile: familyProfileSummary,
    });
  }, [planningPark, familyProfileSummary]);

  const planTabState = useMemo(() => {
    return buildPlanTabState({
      activePark: planningPark,
      timeContext: planningTimeContext,
    });
  }, [planningPark, planningTimeContext]);

  const parkHopperContext = useMemo(() => {
    return buildParkHopperContext({
      scheduledParkForToday,
      timeContext: planningTimeContext,
      planTabState,
      tripPlan: tripPlanState,
    });
  }, [scheduledParkForToday, planningTimeContext, planTabState, tripPlanState]);

  const liveParkContext = useMemo(() => {
    return buildLiveParkContext({
      activePark,
      planningPark,
      scheduledParkForToday,
      todayPlannedParkLabel,
      parkHopperContext,
    });
  }, [activePark, planningPark, scheduledParkForToday, todayPlannedParkLabel, parkHopperContext]);

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
          fetchWeather({ parkId: activePark, force }),
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
      tripPlan: tripPlanState,
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
    tripPlanState,
  ]);

  const weatherMode = useMemo(() => {
    return getWeatherMode(weather);
  }, [weather]);

  const planningParkLiveRides = activePark === planningPark ? parkData?.rides || [] : [];
  const planningRecommendations = activePark === planningPark ? recommendations : {};

  const packingChecklist = useMemo(() => {
    return generatePackingChecklist({
      familyProfile: familyProfileSummary,
      weather,
      weatherMode,
      activePark: planningPark,
      timeContext: planningTimeContext,
      tripPlan: tripPlanState,
    });
  }, [
    familyProfileSummary,
    weather,
    weatherMode,
    planningPark,
    planningTimeContext,
    tripPlanState,
  ]);

  const dayGamePlan = useMemo(() => {
    return generateDayGamePlan({
      familyProfile: familyProfileSummary,
      tripPlan: tripPlanState,
      activePark: planningPark,
      weather,
      weatherMode,
      timeContext: planningTimeContext,
      packingChecklist,
    });
  }, [
    familyProfileSummary,
    tripPlanState,
    planningPark,
    weather,
    weatherMode,
    planningTimeContext,
    packingChecklist,
  ]);

  const tripPlanFreshnessContext = useMemo(() => {
    return createTripPlanFreshnessContext({
      activePark: planningPark,
      timeContext: planningTimeContext,
      weatherMode,
      familyProfile: familyProfileSummary,
      tripPlan: tripPlanState,
    });
  }, [planningPark, planningTimeContext, weatherMode, familyProfileSummary, tripPlanState]);

  const tripPlanFreshness = useMemo(() => {
    return getTripPlanFreshnessStatus({
      tripPlan: tripPlanState,
      currentContext: tripPlanFreshnessContext,
    });
  }, [tripPlanState, tripPlanFreshnessContext]);

  const planNudges = useMemo(() => {
    return generatePlanNudges({
      familyProfile: familyProfileSummary,
      tripPlan: tripPlanState,
      activePark: planningPark,
      planningPark,
      weather,
      weatherMode,
      timeContext: planningTimeContext,
      planTabState,
      tripPlanFreshness,
      recommendations: planningRecommendations,
    });
  }, [
    familyProfileSummary,
    tripPlanState,
    planningPark,
    weather,
    weatherMode,
    planningTimeContext,
    planTabState,
    tripPlanFreshness,
    planningRecommendations,
  ]);

  const mustDoExperienceOptions = useMemo(() => {
    return buildMustDoExperienceOptions({
      activePark: planningPark,
      rides: planningParkLiveRides,
    });
  }, [planningPark, planningParkLiveRides]);

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
    setFamilyProfile((prev) =>
      normalizeFamilyProfile({
        ...prev,
        ...patch,
        tripContext: {
          ...(prev.tripContext || {}),
          ...(patch.tripContext || {}),
        },
        planningPreferences: {
          ...(prev.planningPreferences || {}),
          ...(patch.planningPreferences || {}),
        },
        resortContext: {
          ...(prev.resortContext || {}),
          ...(patch.resortContext || {}),
        },
        mobilityAccessibility: {
          ...(prev.mobilityAccessibility || {}),
          ...(patch.mobilityAccessibility || {}),
        },
      })
    );
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

  function handleRefreshTripPlanContext() {
    setTripPlanState((current) =>
      updateTripPlanFreshnessContext(current, tripPlanFreshnessContext)
    );

    trackAppEvent("trip_plan_refreshed", {
      source: "plan_check",
      metadata: {
        activePark,
        planningPark,
        dayPhase: tripPlanFreshnessContext?.dayPhase,
        planningMode: tripPlanFreshnessContext?.planningMode,
        weatherMode: tripPlanFreshnessContext?.weatherMode,
      },
    });
  }

  function handleTripPreferenceChange(preferencePatch) {
    setTripPlanState((prev) => updateTripPlanPreferences(prev, preferencePatch));

    trackAppEvent("trip_plan_preferences_updated", {
      source: "plan_tune",
      metadata: {
        fields: Object.keys(preferencePatch),
      },
    });
  }

  function handleTripMustDoToggle(experience) {
    setTripPlanState((prev) => toggleTripPlanMustDoExperience(prev, experience));

    trackAppEvent("trip_plan_must_do_toggled", {
      source: "must_do_moments",
      metadata: {
        experienceId: experience?.id,
        experienceName: experience?.name,
        parkId: experience?.parkId,
        type: experience?.type,
      },
    });
  }

  function handlePlanningParkChange(nextParkId) {
    const safeNextPark = getSafePlanningParkId(nextParkId, planningPark);
    const nextManualOverride =
      safeNextPark === profilePlanningParkDecision.parkId ? "" : safeNextPark;

    setManualPlanningParkOverride(nextManualOverride);
    lastProfilePlanningParkRef.current = safeNextPark;
    setPlanningPark(safeNextPark);

    trackAppEvent("planning_park_selected", {
      source: "plan_tab",
      metadata: {
        previousPlanningPark: planningPark,
        nextPlanningPark: safeNextPark,
        liveActivePark: activePark,
        firstParkFromProfile: getPlanningParkFromProfile(familyProfileSummary),
        scheduledParkForToday: scheduledParkForToday?.parkId || "",
        scheduledParkDate: scheduledParkForToday?.date || "",
        scheduledParkDayNumber: scheduledParkForToday?.dayNumber || "",
        planningParkSource: nextManualOverride ? "manual_override" : profilePlanningParkDecision.source,
        manualOverride: Boolean(nextManualOverride),
      },
    });
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

    const freshTimeContext = getCurrentTimeContext({
      activePark,
      familyProfile: familyProfileSummary,
    });

    const freshPlanningTimeContext = getCurrentTimeContext({
      activePark: planningPark,
      familyProfile: familyProfileSummary,
    });

    const freshCurrentActivityContext = buildCurrentActivityContext(currentActivity);

    const dataFreshness = {
      computedAt: freshTimeContext?.nowIso || new Date().toISOString(),
      waits: {
        source: parkData?.source || "",
        ageMs: parkData?.ageMs ?? null,
        fetchedAt: parkData?.fetchedAt || "",
        clientLastUpdatedAt: lastAutoUpdateAt || "",
        hasData: Array.isArray(parkData?.rides) && parkData.rides.length > 0,
      },
      weather: {
        source: weather?.source || "",
        ageMs: weather?.ageMs ?? null,
        fetchedAt: weather?.fetchedAt || "",
        clientLastUpdatedAt: lastAutoUpdateAt || "",
        hasData: Boolean(weather),
      },
      tripPlan: {
        status: tripPlanFreshness?.status || "",
        isStale: Boolean(tripPlanFreshness?.isStale),
        severity: tripPlanFreshness?.severity || "",
        ageMinutes: tripPlanFreshness?.ageMinutes ?? null,
        reasons: Array.isArray(tripPlanFreshness?.reasons)
          ? tripPlanFreshness.reasons.slice(0, 5)
          : [],
      },
    };

    if (shouldAskFrontendLiveStateQuestion(trimmed, chat)) {
      const clarifyingQuestion = getLiveStateClarifyingQuestionForContext({
        familyProfile: familyProfileSummary,
        timeContext: freshTimeContext,
      });

      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: clarifyingQuestion,
          isLiveStateQuestion: true,
        },
      ]);

      trackAppEvent("tohi_live_state_question_asked", {
        source: "tohi_chat",
        metadata: {
          reason: "open_ended_next_move",
          interceptedBeforeAi: true,
          dayPhase: freshTimeContext?.dayPhase,
          planningMode: freshTimeContext?.planningMode,
        },
      });

      return;
    }

    setChatLoading(true);

    try {
      const res = await sendChatMessage(trimmed, {
        activePark,
        activeParkLabel: getParkNameById(activePark),
        activeLandLabel:
          locationContextForDecisions?.landLabel ||
          (currentLand ? formatLandLabel(activePark, currentLand) : ""),
        latestFamilyState: inferLatestLiveFamilyState(trimmed, chat),
        chatResponseMode: isLiveModeQuestion(trimmed) ? "live" : "planning",
        chatFieldTestIntent: isPlanningModeQuestion(trimmed) ? "planning_detail" : "live_next_move",
        planningPark,
        planningParkLabel,
        planningParkSource,
        planningParkManualOverride: Boolean(manualPlanningParkOverride),
        scheduledParkForToday,
        scheduledParkPlanLabel: todayPlannedParkLabel,
        todayPlannedParkLabel,
        scheduledSecondaryParkForToday: scheduledParkForToday?.secondaryParkId || "",
        scheduledSecondaryParkLabel,
        parkDayScheduleStatus,
        parkHopperContext,
        liveParkContext,
        planTabState,
        planningTimeContext: freshPlanningTimeContext,
        tripPlan: tripPlanState,
        mustDoExperiences: tripPlanState?.mustDoExperiences || [],
        dayGamePlan,
        weather,
        weatherMode,
        recommendations,
        conversationHistory: nextChat.slice(-6),
        liveStateClarificationPending: isAwaitingLiveStateAnswer(chat),
        completedRideIds,
        skippedRideIds,
        reportedRideIssueIds,
        currentLand,
        familyProfile: {
          ...familyProfileSummary,
          isSetupComplete: profileCompletion.isComplete,
        },
        timeContext: freshTimeContext,
        dataFreshness,
        locationContext: locationContextForDecisions,
        currentActivity: freshCurrentActivityContext,
        currentActivityContext: freshCurrentActivityContext,
      });

      setChat([...nextChat, { role: "assistant", content: cleanAssistantReply(res.reply, trimmed) }]);
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: cleanAssistantReply(
            buildLocalChatFallback({
              activePark,
              weatherMode,
              currentActivityContext: freshCurrentActivityContext,
              familyProfile: familyProfileSummary,
              recommendations,
            }),
            trimmed
          ),
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

  const primarySlot =
    recommendations.bestMove ? "bestMove" :
    recommendations.backup ? "backup" :
    recommendations.worthTheWalk ? "worthTheWalk" :
    null;

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

  function hideDebugSnapshot() {
    setDebugSnapshotEnabled(false);
    writeDebugSnapshotEnabled(false);
  }

  function renderDebugSnapshot() {
    const dbSectionStyle = {
      marginBottom: 8,
      padding: "8px 10px",
      borderRadius: 10,
      border: `1px solid ${colors.cardBorder}`,
      background: "rgba(255,255,255,0.88)",
    };
    const dbSummaryStyle = {
      cursor: "pointer",
      fontWeight: 700,
      color: colors.text,
      fontSize: 12,
      userSelect: "none",
    };
    const dbRowsStyle = { display: "grid", gap: 3, paddingTop: 6 };
    const dbLabelStyle = { color: colors.muted, fontSize: 11, minWidth: 140, flexShrink: 0 };
    const dbValStyle = { fontFamily: "monospace", fontSize: 11, color: colors.text, wordBreak: "break-all" };

    function dbRow(label, value) {
      return (
        <div style={{ display: "flex", gap: 8, lineHeight: 1.5 }}>
          <span style={dbLabelStyle}>{label}</span>
          <span style={dbValStyle}>{dbFmt(value)}</span>
        </div>
      );
    }

    function renderSlot(slotLabel, ride) {
      if (!ride) {
        return (
          <div key={slotLabel} style={{ color: colors.muted, fontSize: 11, paddingLeft: 4, marginBottom: 4 }}>
            {slotLabel}: —
          </div>
        );
      }
      return (
        <details key={slotLabel} style={{ marginBottom: 6 }}>
          <summary style={{ fontSize: 11, cursor: "pointer", fontWeight: 700, color: colors.text }}>
            {slotLabel}: {ride.name || "unnamed"} {ride.waitTime != null ? `(${ride.waitTime}m)` : "(wait n/a)"}
          </summary>
          <div style={{ ...dbRowsStyle, paddingLeft: 8, marginTop: 2 }}>
            {dbRow("id", ride.id)}
            {dbRow("isOpen", ride.isOpen)}
            {dbRow("land", ride.land)}
            {ride.score != null && dbRow("score", ride.score)}
            {dbRow("waitTime", ride.waitTime ?? "unavailable")}
            {ride.reason && dbRow("reason", ride.reason)}
            {ride.planAheadReason && dbRow("planAheadReason", ride.planAheadReason)}
            {ride.waitOnThisReason && dbRow("waitOnThisReason", ride.waitOnThisReason)}
            {ride.mustDoPriority && dbRow("mustDoPriority", ride.mustDoPriority)}
            {ride.mustDoModifier != null && dbRow("mustDoModifier", ride.mustDoModifier)}
            {ride.mustDoReason && dbRow("mustDoReason", ride.mustDoReason)}
            {ride.shouldProtectLater != null && dbRow("shouldProtectLater", ride.shouldProtectLater)}
            {ride.proximityModifier != null && dbRow("proximityModifier", ride.proximityModifier)}
            {ride.waitValueModifier != null && dbRow("waitValueModifier", ride.waitValueModifier)}
            {ride.familyProfileModifier != null && dbRow("familyProfileModifier", ride.familyProfileModifier)}
            {ride.trendModifier != null && dbRow("trendModifier", ride.trendModifier)}
            {ride.contextModifier != null && dbRow("contextModifier", ride.contextModifier)}
            {ride.lowWaitBonus != null && dbRow("lowWaitBonus", ride.lowWaitBonus)}
            {ride.nearbyHeadlinerOpportunityModifier != null && dbRow("nearbyHeadlinerMod", ride.nearbyHeadlinerOpportunityModifier)}
            {ride.crossParkSumCapAdjustment != null && dbRow("crossParkSumCap", ride.crossParkSumCapAdjustment)}
            {ride.heightWarning && dbRow("heightWarning", ride.heightWarning.message)}
            {ride.planningProfile?.category && dbRow("planningCategory", ride.planningProfile.category)}
          </div>
        </details>
      );
    }

    const locationSource = locationAutoEnabled ? "GPS" : currentLand ? "manual" : "unknown";

    const parkDaySchedule = Array.isArray(familyProfileSummary?.tripContext?.parkDaySchedule)
      ? familyProfileSummary.tripContext.parkDaySchedule
      : [];

    const parkDayScheduleRows = parkDaySchedule.map((day, index) => {
      const dayNumber = day?.dayNumber ?? index + 1;
      const primaryParkLabel = day?.primaryParkId
        ? getParkLabel(day.primaryParkId) || day.primaryParkId
        : "No park selected";
      const secondaryParkLabel = day?.secondaryParkId
        ? getParkLabel(day.secondaryParkId) || day.secondaryParkId
        : "";

      return {
        label: `parkDaySchedule.day${dayNumber}`,
        value: `${day?.date || "No date"} · ${primaryParkLabel}${
          secondaryParkLabel ? ` + ${secondaryParkLabel}` : ""
        }`,
      };
    });

    return (
      <section
        style={{
          margin: "20px 0 0",
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(124, 58, 237, 0.22)",
          background: "rgba(245,243,255,0.94)",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <strong style={{ fontSize: 13, color: colors.text }}>Debug Snapshot</strong>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
              Field-test view — hidden unless debug mode is enabled.
            </div>
          </div>
          <button
            type="button"
            onClick={hideDebugSnapshot}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${colors.cardBorder}`,
              background: "white",
              color: colors.muted,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Hide debug
          </button>
        </div>

        <details open style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>App State</summary>
          <div style={dbRowsStyle}>
            {dbRow("activeScreen", activeScreen)}
            {dbRow("activeTab", activeTab)}
            {dbRow("activePark", activePark)}
            {dbRow("planningPark", planningPark)}
            {dbRow("planningParkSource", planningParkSource)}
            {dbRow("planningParkManualOverride", Boolean(manualPlanningParkOverride))}
            {manualPlanningParkOverride
              ? dbRow("manualPlanningParkOverride", manualPlanningParkOverride)
              : null}
            {dbRow("scheduledParkForToday", scheduledParkForToday?.parkId)}
            {dbRow("scheduledSecondaryParkForToday", scheduledParkForToday?.secondaryParkId)}
            {dbRow("scheduledParkPlanLabel", todayPlannedParkLabel)}
            {dbRow("parkDayScheduleStatus.status", parkDayScheduleStatus?.status)}
            {dbRow("parkDayScheduleStatus.label", parkDayScheduleStatus?.label)}
            {dbRow("parkDayScheduleStatus.guidance", parkDayScheduleStatus?.guidance)}
            {dbRow("parkDayScheduleStatus.firstScheduleDate", parkDayScheduleStatus?.firstScheduleDate)}
            {dbRow("parkDayScheduleStatus.lastScheduleDate", parkDayScheduleStatus?.lastScheduleDate)}
            {dbRow("parkDayScheduleStatus.fallbackPark", parkDayScheduleStatus?.fallbackParkId)}
            {dbRow("hopperContext.status", parkHopperContext?.status)}
            {dbRow("hopperContext.label", parkHopperContext?.label)}
            {dbRow("hopperContext.shouldConsiderSecondPark", parkHopperContext?.shouldConsiderSecondPark)}
            {dbRow("hopperContext.secondParkMustDos.count", parkHopperContext?.secondParkMustDos?.count)}
            {dbRow("hopperContext.secondParkMustDos.label", parkHopperContext?.secondParkMustDos?.label)}
            {dbRow("hopperContext.secondParkPriority", parkHopperContext?.secondParkPriority)}
            {dbRow("liveParkContext.status", liveParkContext?.status)}
            {dbRow("liveParkContext.label", liveParkContext?.label)}
            {dbRow("liveParkContext.isLiveParkMismatch", liveParkContext?.isLiveParkMismatch)}
            {dbRow("liveParkContext.guidance", liveParkContext?.guidance)}
            {dbRow("scheduledParkDay", scheduledParkForToday?.dayNumber)}
            {dbRow("scheduledParkDate", scheduledParkForToday?.date)}
            {dbRow("currentLand", currentLand)}
            {dbRow("locationSource", locationSource)}
            {dbRow("locationAutoEnabled", locationAutoEnabled)}
            {dbRow("confidence", detectedLocationContext?.confidence)}
            {dbRow("nearestAnchor", detectedLocationContext?.nearestAnchorName)}
            {dbRow("distanceMeters", detectedLocationContext?.distanceMeters)}
            {dbRow("lastLocationUpdateAt", lastLocationUpdateAt)}
            {dbRow("lastAutoUpdateAt", lastAutoUpdateAt)}
            {locationMessage ? dbRow("locationMessage", locationMessage) : null}
            {locationError ? dbRow("locationError", locationError) : null}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Time / Park State</summary>
          <div style={dbRowsStyle}>
            {dbRow("orlandoDate", timeContext?.orlandoDate)}
            {dbRow("orlandoTime", timeContext?.orlandoTimeLabel)}
            {dbRow("dayPhase", timeContext?.dayPhase)}
            {dbRow("dayPhaseLabel", timeContext?.dayPhaseLabel)}
            {dbRow("planningMode", timeContext?.planningMode)}
            {dbRow("tripStatus.status", timeContext?.tripStatus?.status)}
            {dbRow("tripStatus.message", timeContext?.tripStatus?.message)}
            {dbRow("planning.dayPhase", planningTimeContext?.dayPhase)}
            {dbRow("planning.planningMode", planningTimeContext?.planningMode)}
            {dbRow("planTabState.mode", planTabState?.mode)}
            {dbRow("planTabState.label", planTabState?.label)}
            {dbRow("parkOpen", planTabState?.parkOpenLabel)}
            {dbRow("parkClose", planTabState?.parkCloseLabel)}
            {dbRow("isBeforeParkOpen", planTabState?.isBeforeParkOpen)}
            {dbRow("isAfterParkClose", planTabState?.isAfterParkClose)}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Weather / Freshness</summary>
          <div style={dbRowsStyle}>
            {dbRow("weatherMode.mode", weatherMode?.mode)}
            {dbRow("weatherMode.label", weatherMode?.label)}
            {dbRow("tempF", weather?.tempF)}
            {dbRow("feelsLikeF", weather?.feelsLikeF)}
            {dbRow("heatIndexF", weather?.heatIndexF)}
            {dbRow("humidity", weather?.humidity)}
            {dbRow("summary", weather?.summary)}
            {dbRow("rainRisk", weather?.rainRisk)}
            {dbRow("stormMode", weather?.stormMode)}
            {dbRow("freshness.status", tripPlanFreshness?.status)}
            {dbRow("freshness.isStale", tripPlanFreshness?.isStale)}
            {dbRow("freshness.severity", tripPlanFreshness?.severity)}
            {dbRow("freshness.ageMinutes", tripPlanFreshness?.ageMinutes)}
            {Array.isArray(tripPlanFreshness?.reasons) && tripPlanFreshness.reasons.length > 0 && (
              <div>
                <span style={dbLabelStyle}>freshness.reasons</span>
                {tripPlanFreshness.reasons.map((r, i) => (
                  <div key={i} style={{ ...dbValStyle, paddingLeft: 8 }}>· {r}</div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Current Activity</summary>
          <div style={dbRowsStyle}>
            {dbRow("type", currentActivity?.type)}
            {dbRow("rideName", currentActivity?.rideName)}
            {dbRow("rideId", currentActivity?.rideId)}
            {dbRow("postedWait", currentActivity?.postedWaitAtStart)}
            {dbRow("startedAt", currentActivity?.startedAt)}
            {dbRow("elapsedMinutes", currentActivityContext?.elapsedMinutesInLine)}
            {dbRow("completedRides", completedRideIds.length)}
            {completedRideIds.length > 0 && (
              <div style={{ paddingLeft: 8 }}>
                {completedRideIds.map((id, i) => (
                  <div key={i} style={dbValStyle}>· {id}</div>
                ))}
              </div>
            )}
            {dbRow("skippedRides", skippedRideIds.length)}
            {skippedRideIds.length > 0 && (
              <div style={{ paddingLeft: 8 }}>
                {skippedRideIds.map((id, i) => (
                  <div key={i} style={dbValStyle}>· {id}</div>
                ))}
              </div>
            )}
            {dbRow("reportedRides", reportedRideIssueIds.length)}
            {reportedRideIssueIds.length > 0 && (
              <div style={{ paddingLeft: 8 }}>
                {reportedRideIssueIds.map((id, i) => (
                  <div key={i} style={dbValStyle}>· {id}</div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Trip Plan / Must-Dos</summary>
          <div style={dbRowsStyle}>
            {dbRow("startStrategy", tripPlanState?.preferences?.startStrategy)}
            {dbRow("breakPreference", tripPlanState?.preferences?.breakPreference)}
            {dbRow("nighttimeImportance", tripPlanState?.preferences?.nighttimeImportance)}
            {dbRow("paidQueueStrategy", tripPlanState?.preferences?.paidQueueStrategy)}
            {dbRow("mustDos.count", tripPlanState?.mustDoExperiences?.length ?? 0)}
            {Array.isArray(tripPlanState?.mustDoExperiences) && tripPlanState.mustDoExperiences.length > 0 && (
              <div style={{ paddingLeft: 8 }}>
                {tripPlanState.mustDoExperiences.map((md, i) => (
                  <div key={i} style={dbValStyle}>· {md.name} ({md.parkId}, {md.priority})</div>
                ))}
              </div>
            )}
            {dbRow("parkDaySchedule.count", parkDaySchedule.length)}
            {parkDayScheduleRows.map((row) => (
              <React.Fragment key={row.label}>{dbRow(row.label, row.value)}</React.Fragment>
            ))}
            {dbRow("generatedPlan.parkDays.count", tripPlanState?.parkDays?.length ?? 0)}
            {dbRow("lastGeneratedAt", tripPlanState?.lastGeneratedAt)}
            {dbRow("updatedAt", tripPlanState?.updatedAt)}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Recommendation Envelope</summary>
          <div style={dbRowsStyle}>
            {dbRow("needsLocation", recommendations?.needsLocation)}
          </div>
        </details>

        <details style={dbSectionStyle}>
          <summary style={dbSummaryStyle}>Recommendation Slots</summary>
          <div style={{ paddingTop: 6 }}>
            {renderSlot("bestMove", recommendations?.bestMove)}
            {renderSlot("backup", recommendations?.backup)}
            {renderSlot("worthTheWalk", recommendations?.worthTheWalk)}
            {renderSlot("planAhead", recommendations?.planAhead)}
            {renderSlot("waitOnThis", recommendations?.waitOnThis)}
          </div>
        </details>
      </section>
    );
  }

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
              {homeGreeting}
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
              Here&apos;s what matters right now. TOHI is watching the heat, waits,
              and walking so your family can keep the day feeling good.
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

        {liveParkContext?.showNotice && (
          <section
            style={{
              ...card,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, #FFF7ED 52%, #F5F3FF 100%)",
              border: "1px solid rgba(245, 158, 11, 0.24)",
              boxShadow: "0 12px 28px rgba(245, 158, 11, 0.08)",
            }}
          >
            <div style={{ minWidth: 220, flex: "1 1 340px" }}>
              <div
                style={{
                  color: "#92400E",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.65,
                  marginBottom: 5,
                }}
              >
                RIGHT NOW VIEW
              </div>

              <strong
                style={{
                  display: "block",
                  color: colors.text,
                  fontSize: 15,
                  lineHeight: 1.35,
                }}
              >
                {liveParkContext.label || `Viewing ${getParkNameById(activePark)} live waits`}
              </strong>

              <p
                style={{
                  margin: "5px 0 0",
                  color: colors.text,
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                {liveParkContext.guidance ||
                  `You’re viewing ${getParkNameById(activePark)} live waits right now. Right Now moves are using ${getParkNameById(activePark)}.`}
              </p>

              {liveParkContext?.status === "viewing_second_park" &&
                Number(parkHopperContext?.secondParkMustDos?.count || 0) > 0 && (
                  <div
                    style={{
                      marginTop: 9,
                      padding: 10,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.72)",
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: colors.text,
                        fontSize: 12.5,
                        lineHeight: 1.3,
                      }}
                    >
                      Second-park priorities are loaded.
                    </strong>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 1.35,
                      }}
                    >
                      Saved must-dos: {parkHopperContext.secondParkMustDos.label}. TOHI should use this as
                      context, not pressure to rush.
                    </p>
                  </div>
                )}

              {liveParkContext?.status === "viewing_different_park" && (
                <p
                  style={{
                    margin: "7px 0 0",
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  The Plan tab is still anchored to {todayPlannedParkLabel || planningParkLabel}.
                </p>
              )}
            </div>

            {planningPark && activePark !== planningPark && (
              <button
                type="button"
                onClick={() => {
                  trackAppEvent("live_park_switched_from_planned_park_notice", {
                    source: "right_now_live_park_context_notice",
                    activePark: planningPark,
                    metadata: {
                      previousActivePark: activePark,
                      nextActivePark: planningPark,
                      planningPark,
                      planningParkSource,
                      scheduledParkForToday: scheduledParkForToday?.parkId || "",
                      scheduledSecondaryParkForToday: scheduledParkForToday?.secondaryParkId || "",
                      scheduledParkPlanLabel: todayPlannedParkLabel,
                      hopperContextStatus: parkHopperContext?.status || "",
                      shouldConsiderSecondPark: Boolean(parkHopperContext?.shouldConsiderSecondPark),
                      liveParkContextStatus: liveParkContext?.status || "",
                      isLiveParkMismatch: Boolean(liveParkContext?.isLiveParkMismatch),
                      scheduledParkDayNumber: scheduledParkForToday?.dayNumber || "",
                    },
                  });

                  setActivePark(planningPark);
                }}
                style={{
                  ...button,
                  background: colors.purpleDeep,
                  borderColor: colors.purpleDeep,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                Use {planningParkLabel} waits
              </button>
            )}
          </section>
        )}

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
                    title={
                      primarySlot === "backup" ? "SMART BACKUP" :
                      primarySlot === "worthTheWalk" ? "WORTH THE WALK" :
                      "BEST MOVE"
                    }
                    ride={primaryRecommendation}
                    reason={
                      primaryRecommendation.reason ||
                      "This is the clearest move right now — the wait, effort, and family fit look reasonable."
                    }
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
                      reason={recommendations.backup.reason || "A solid nearby option if the primary move doesn't work out."}
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
                      reason={recommendations.worthTheWalk.reason || "The wait looks reasonable enough to consider the extra walk."}
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
                      reason={recommendations.waitOnThis.waitOnThisReason || recommendations.waitOnThis.reason || "This may fit better later when the wait or effort drops."}
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
              "Without your family profile, TOHI cannot safely know height limits, thrill comfort, heat sensitivity, resort-break realism, or what kind of day you want.",
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
            <PlanTab
              card={card}
              button={button}
              hasPersonalizedAccess={hasPersonalizedAccess}
              profileCompletion={profileCompletion}
              timeContext={planningTimeContext}
              planTabState={planTabState}
              preferredName={familyProfileSummary?.preferredName}
              familyProfile={familyProfileSummary}
              weatherMode={weatherMode}
              packingChecklist={packingChecklist}
              dayGamePlan={dayGamePlan}
              planNudges={planNudges}
              tripPlanFreshness={tripPlanFreshness}
              onRefreshTripPlanContext={handleRefreshTripPlanContext}
              tripPlan={tripPlanState}
              activePark={activePark}
              planningPark={planningPark}
              planningParkLabel={planningParkLabel}
              todayPlannedParkLabel={todayPlannedParkLabel}
              scheduledParkForToday={scheduledParkForToday}
              scheduledSecondaryParkLabel={scheduledSecondaryParkLabel}
              parkDayScheduleStatus={parkDayScheduleStatus}
              parkHopperContext={parkHopperContext}
              liveParkContext={liveParkContext}
              parkOptions={PARKS.filter((park) => park.selectable !== false)}
              onPlanningParkChange={handlePlanningParkChange}
              mustDoExperienceOptions={mustDoExperienceOptions}
              onUpdateTripPreferences={handleTripPreferenceChange}
              onToggleMustDoExperience={handleTripMustDoToggle}
              setActiveScreen={setActiveScreen}
            />
          )}

          {activeTab === "tohi" &&
            (hasPersonalizedAccess ? (
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
                    TOHI uses your family profile to make room for height limits, thrill
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

          {debugSnapshotEnabled && renderDebugSnapshot()}

      </div>
      </main>

      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default App;
