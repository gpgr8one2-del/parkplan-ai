import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin } from "lucide-react";
import {
  fetchParkData,
  fetchWeather,
  sendChatMessage,
  sendTohiPickReview,
  trackEvent,
  transcribeVoiceRecording,
} from "./api";
import {
  MAX_RECORDING_MS,
  VOICE_COPY,
  VOICE_ERRORS,
  isVoiceInputSupported,
  resolveRecorderMimeType,
  resolveUploadContentType,
  selectRecordingMimeType,
  stopMediaStream,
  validateRecordingBlob,
  validateTranscript,
} from "./utils/voiceRecording";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides, getRecommendationWeatherState } from "./rideRecommendations";
import {
  applyRainConfirmationToWeather,
  buildRainConfirmationRecord,
  canAskRainConfirmation,
  clearStoredRainConfirmation,
  getActiveRainConfirmation,
  getRainConfirmationEpisode,
  isRainConfirmationObsolete,
  readStoredRainConfirmation,
  shouldAskRainConfirmation,
  writeStoredRainConfirmation,
  RAIN_CONFIRMATION_RESPONSES,
} from "./utils/rainConfirmation";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { generatePackingChecklist } from "./utils/packingChecklist";
import { generateDayGamePlan } from "./utils/dayGamePlan";
import {
  buildTohiPickCandidates,
  evaluateTohiPickEligibility,
  evaluateTohiPickFinalDecision,
} from "./utils/tohiPick";
import {
  buildTohiPickReviewSignature,
  resolveTohiPickAgreementDecision,
  sanitizeTohiPickReviewRequest,
  selectTohiPickReviewForSignature,
  shouldRequestTohiPickReview,
  storeTohiPickReviewResult,
  validateTohiPickReviewResponse,
} from "./utils/tohiPickAgreement";
import {
  clearDetectedParkDismissal,
  confirmActivePark,
  deriveBrowsedPark,
  dismissParkPresencePrompt,
  isBrowsingAnotherPark,
  registerDetectedPark,
  restoreParkPresence,
  selectBrowsedPark,
} from "./utils/parkPresence";
import {
  acknowledgeParkArrivalDeparture,
  createParkArrivalTracker,
  hasStableParkArrivalEvidence,
  suppressParkArrivalPrompt,
  updateParkArrivalTracker,
} from "./utils/parkArrivalDetection";
import {
  TOHI_PICK_CLARIFICATION_STATUSES,
  evaluateTohiPickClarification,
  resolveTohiPickClarificationAnswer,
  selectTohiPickClarificationForSignature,
  storeTohiPickClarificationResult,
} from "./utils/tohiPickClarification";
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
import { shouldApplyBrowsedResponse } from "./utils/waitsViewState";
import { getResortOptions } from "./resortProfiles";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";
import {
  createLocationStabilityState,
  reduceLocationReading,
  resolveLocationTrust,
  resolveRestoredLocationState,
  shouldClearExpiredGpsLocation,
} from "./utils/locationStability";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { PlanRecommendations } from "./components/PlanRecommendations";
import { WaitsTab } from "./components/WaitsTab";
import { TohiTab } from "./components/TohiTab";
import { WhileYouWaitCard } from "./components/WhileYouWaitCard";
import { HomeTab } from "./components/HomeTab";
import { PlanTab, PlanToolsView, PlanCheckCompactRow } from "./components/PlanTab";
import BottomTabs from "./components/BottomTabs";
import { colors, getTohiAppShellTheme, TOHI_THEME_MODES } from "./theme";
import { useMiniGames } from "./hooks/useMiniGames";

const STORAGE_KEY = "parkplan.state";
const AUTO_REFRESH_MS = 3 * 60 * 1000;
const IN_LINE_TIMER_TICK_MS = 30 * 1000;
const LOCATION_WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

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


// 62A: this module-level style is the day/onboarding page. It is resolved with
// forced day mode so that merely importing App at night can never restyle
// onboarding or an unconverted tab. Night is applied per-render, and only for
// converted tabs, via shellNight below.
const appShellTheme = getTohiAppShellTheme({ forceMode: TOHI_THEME_MODES.DAY });

const page = {
  minHeight: "100vh",
  background: appShellTheme.appBackgroundGradient || colors.background,
  backgroundColor: appShellTheme.appBackground || colors.background,
  position: "relative",
  overflowX: "hidden",
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

/* -------------------------------------------------------------------------- */
/* Profile display labels — presentation only                                 */
/* -------------------------------------------------------------------------- */

// Stored profile values are internal ids. Profile previously rendered several of
// them raw, so a guest could read "skyliner" or "water_taxi" as product copy.
// These maps are display-only: no stored value, default, or normalization rule
// changes, and an unrecognised value falls through to the "Not set" treatment
// rather than being guessed at.
const PROFILE_WALKING_LABELS = {
  leisurely: "Keep choices nearby",
  balanced: "A balanced amount of walking",
  energetic: "Comfortable covering more ground",
};

const PROFILE_THRILL_LABELS = {
  low: "Mostly gentle rides",
  mixed: "A mix of gentle and exciting",
  high: "Big thrills are a priority",
};

const PROFILE_HEAT_LABELS = {
  high: "Breaks before things fall apart",
  medium: "Watch it and suggest breaks",
  low: "We handle heat pretty well",
};

const PROFILE_WATER_LABELS = {
  avoid: "Avoid getting wet",
  okay_with_warning: "Okay with a heads-up first",
  love: "We love water rides",
  // Legacy alias. normalizeFamilyProfile still accepts a stored "yes", and the
  // engine still honours it, so a profile saved before "love" became canonical
  // must read as the answer it is rather than falling through to "Not set".
  yes: "We love water rides",
  depends: "Depends on the day",
};

// The water-ride answer now drives three genuinely different behaviours, so the
// explanation is written per value instead of describing all of them at once.
// Each string states only what that value actually does.
function getProfileWaterRideHint(value) {
  const key = typeof value === "string" ? value.trim() : "";

  if (key === "avoid") {
    return "TOHI pushes rides that soak you down your list.";
  }

  if (key === "love" || key === "yes") {
    return "TOHI gives rides that soak you a nudge up your list.";
  }

  if (key === "okay_with_warning") {
    return "TOHI adds a heads-up on the card before a ride that can soak you.";
  }

  if (key === "depends") {
    return "TOHI treats rides that soak you like any other option.";
  }

  return null;
}

const PROFILE_STORM_LABELS = {
  indoor_only: "Indoor when storms are near",
  brief_outdoor_ok: "Brief outdoor walks are okay",
  we_handle_it: "We handle weather pretty well",
};

const PROFILE_TRANSPORT_LABELS = {
  bus: "Bus",
  monorail: "Monorail",
  skyliner: "Skyliner",
  boat: "Boat",
  walking: "Walking",
  car: "Car / rideshare",
  water_taxi: "Water taxi",
  gondola: "Gondola",
};

const PROFILE_HOPPER_LABELS = {
  yes: "Yes — planning to hop",
  no: "No — one park per day",
  unknown: "Not decided yet",
};

// "unknown" is deliberately absent so it resolves to null and renders through the
// same explicit "Not set" treatment as every other unanswered row.
const PROFILE_STAY_LABELS = {
  yes: "On Disney property",
  no: "Off-property",
};

// getParkLabel returns the literal string "Not set" for an unrecognised id. Profile
// needs null there so the unset styling applies instead of it reading as an answer.
function getProfileParkLabel(parkId) {
  if (!parkId) return null;
  const label = getParkLabel(parkId);
  return !label || label === "Not set" ? null : label;
}

// Returns null for anything unset or unrecognised, so every caller renders the
// same explicit "Not set" state instead of an empty gap.
function getProfileDisplayLabel(labelMap, value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) return null;
  return labelMap[key] || null;
}

function formatProfileTripDates(tripContext = {}) {
  const start = tripContext.tripStartDate;
  const end = tripContext.tripEndDate;

  if (!start && !end) return null;

  const format = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const startLabel = format(start);
  const endLabel = format(end);

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  }

  return startLabel || endLabel;
}

/* -------------------------------------------------------------------------- */
/* Profile night palette — presentation only                                   */
/* -------------------------------------------------------------------------- */

// The approved night colour for every Profile surface, written beside the exact
// day value it replaces so this table reads as a mapping rather than a set of
// fresh choices. It is a plain lookup table: it decides nothing about WHEN night
// applies. That decision stays with the single parent-controlled `shellNight`
// flag, which Profile joined alongside Home, Waits, Plan and TOHI.
//
// Same navy/muted-purple language as the shell and the other converted tabs:
// #131C36 primary surfaces, #0F172A/#132139 nested surfaces, #F5F3FF primary
// text, #B6C2E2 secondary text, #C4B5FD purple, #7DD3FC sky, #FCD34D amber,
// #6EE7B7 success. No pure black, and no bright-white card left on the shell.
const PROFILE_NIGHT = {
  // Setup hero. Day carries a white → lavender → cream wash; night carries the
  // same three-stop movement in navy → indigo → plum.
  heroBackground: "linear-gradient(150deg, #131C36 0%, #1B1A45 56%, #251F3F 100%)",
  heroBorder: "1px solid rgba(139, 92, 246, 0.40)", //  <- rgba(124, 58, 237, 0.22)
  heroShadow: "0 16px 38px rgba(2, 6, 23, 0.50)", //    <- rgba(91, 33, 182, 0.10)

  // Status pills. Both keep their semantic hue; only the fill deepens and the
  // text lightens, so "complete" still reads green and "needed" still reads amber.
  statusCompleteBackground: "rgba(6, 78, 59, 0.55)", // <- colors.successSoft #D1FAE5
  statusCompleteColor: "#6EE7B7", //                    <- #046A4E
  statusNeededBackground: "rgba(120, 53, 15, 0.52)", // <- colors.amberSoft   #FEF3C7
  statusNeededColor: "#FCD34D", //                      <- #92400E

  title: "#F5F3FF", //                                  <- colors.text        #241C15
  muted: "#B6C2E2", //                                  <- colors.muted       #7A6F63

  // Primary action. Day is a violet gradient on white text; night lifts the
  // gradient one step so the button still separates from the darker hero.
  ctaBackground: "linear-gradient(145deg, #8B5CF6 0%, #6D28D9 100%)",
  ctaColor: "#F5F3FF", //                               <- white
  ctaBorder: "rgba(139, 92, 246, 0.52)", //             <- rgba(124, 58, 237, 0.28)
  ctaShadow: "0 12px 24px rgba(2, 6, 23, 0.50)", //     <- rgba(124, 58, 237, 0.18)

  // Missing-information alert.
  alertBackground: "linear-gradient(145deg, #131C36 0%, #2C2113 100%)",
  alertBorder: "1px solid rgba(252, 211, 77, 0.34)", // <- rgba(245, 158, 11, 0.32)
  alertShadow: "0 10px 28px rgba(2, 6, 23, 0.45)", //   <- rgba(245, 158, 11, 0.10)
  alertTitle: "#FCD34D", //                             <- #92400E
  alertBody: "#F0DCB4", //                              <- #7A4A10

  // Grouped cards.
  groupSurface: "#131C36", //                           <- #FFFFFF
  groupShadow: "0 10px 28px rgba(2, 6, 23, 0.45)", //   <- rgba(28, 25, 23, 0.06)

  // Section eyebrow chips. Each accent keeps its identity; the chip becomes a
  // deep tint of its own hue rather than a pale wash.
  tonePurpleText: "#C4B5FD", //                         <- colors.purpleDeep  #5B21B6
  tonePurpleChip: "rgba(76, 29, 149, 0.48)", //         <- rgba(124, 58, 237, 0.10)
  tonePurpleBorder: "rgba(139, 92, 246, 0.38)", //      <- rgba(124, 58, 237, 0.20)
  toneSkyText: "#7DD3FC", //                            <- #0369A1
  toneSkyChip: "rgba(12, 74, 110, 0.55)", //            <- rgba(56, 189, 248, 0.14)
  toneSkyBorder: "rgba(56, 189, 248, 0.34)", //         <- rgba(56, 189, 248, 0.26)
  toneAmberText: "#FCD34D", //                          <- #92400E
  toneAmberChip: "rgba(120, 53, 15, 0.52)", //          <- colors.amberSoft
  toneAmberBorder: "rgba(252, 211, 77, 0.32)", //       <- rgba(245, 158, 11, 0.28)
  toneFallbackBorder: "rgba(99, 102, 241, 0.30)", //    <- colors.cardBorder  #EADCC8

  // Child rows: a deeper nested surface so they still recess inside the card.
  childSurface: "#0F172A", //                           <- colors.backgroundSoft #FFF9F1
  childBorder: "rgba(99, 102, 241, 0.28)", //           <- colors.cardBorder  #EADCC8

  // The three height-message states keep coral / amber / green semantics.
  heightLowBackground: "rgba(76, 5, 25, 0.58)", //      <- colors.errorSoft   #FEE2E2
  heightLowColor: "#FDA4AF", //                         <- #9F1239
  heightMidBackground: "rgba(120, 53, 15, 0.52)", //    <- colors.amberSoft   #FEF3C7
  heightMidColor: "#FCD34D", //                         <- #92400E
  heightHighBackground: "rgba(6, 78, 59, 0.55)", //     <- colors.successSoft #D1FAE5
  heightHighColor: "#6EE7B7", //                        <- #046A4E

  // Priority chips stay solid violet so they still read as chosen, one step
  // deeper than day so they sit calmly on the navy card.
  priorityBackground: "linear-gradient(145deg, #6D28D9 0%, #4C1D95 100%)",
  priorityColor: "#F5F3FF", //                          <- white
  priorityBorder: "1px solid rgba(139, 92, 246, 0.50)", // <- rgba(91, 33, 182, 0.35)

  // Developer-preview banner and its button.
  devSurface: "#132139", //                             <- #f5f3ff
  devBorder: "1px solid rgba(139, 92, 246, 0.40)", //   <- 1px solid #ddd6fe
  devTitle: "#C4B5FD", //                               <- #6d28d9
  devButtonBackground: "#0F172A", //                    <- colors.card        #FFFFFF
  devButtonBorder: "1px solid rgba(139, 92, 246, 0.38)", // <- colors.cardBorder
  devButtonColor: "#C4B5FD", //                         <- colors.purple      #7C3AED
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

const PARK_PRESENCE_STORAGE_KEY = "parkplan.parkPresence";

function readStoredParkPresence() {
  try {
    const raw = localStorage.getItem(PARK_PRESENCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredParkPresence(presence) {
  try {
    localStorage.setItem(PARK_PRESENCE_STORAGE_KEY, JSON.stringify(presence));
  } catch (err) {
    console.warn("TOHI: could not save park presence", err);
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

function getElapsedMinutesSince(isoString, nowMs = Date.now()) {
  if (!isoString) return null;

  const startedAtMs = new Date(isoString).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return null;
  }

  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
  const elapsedMs = safeNowMs - startedAtMs;

  if (elapsedMs < 0) {
    return 0;
  }

  return Math.max(0, Math.round(elapsedMs / 60000));
}

const formatElapsedInLineContext = (elapsedMinutes) => {
  if (elapsedMinutes == null) {
    return "unknown";
  }

  if (elapsedMinutes <= 0) {
    return "less than 1 minute";
  }

  return `about ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"}`;
};


function buildCurrentActivityContext(currentActivity, nowMs = Date.now()) {
  if (!currentActivity) return null;

  const elapsedMinutes =
    currentActivity.type === "in_line"
      ? getElapsedMinutesSince(currentActivity.startedAt, nowMs)
      : null;

  return {
    ...currentActivity,
    elapsedMinutesInLine: elapsedMinutes,
    summary:
      currentActivity.type === "in_line"
        ? `User is currently in line for ${currentActivity.rideName}. Posted wait when joined: ${
            currentActivity.postedWaitAtStart ?? "unknown"
          } minutes. Elapsed time in line: ${formatElapsedInLineContext(elapsedMinutes)}.`
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
      }${elapsed != null ? `, and ${formatElapsedInLineContext(elapsed)} elapsed` : ""}.`
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
    value.includes("why does") ||
    value.includes("why are") ||
    value.includes("why did") ||
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

// 64B-2B. Approved connection-status copy, verbatim.
const TOHI_CHAT_CONNECTION_FAILURE_COPY =
  "TOHI couldn’t connect right now. Your plan and recommendations haven’t changed. You can try sending your question again.";

// One construction path for BOTH failure kinds — a rejected request and a
// success whose reply is unusable. Having a single builder is what stops the
// copy or the marker drifting apart between the two branches.
//
// isConnectionFailure is explicit metadata, not something the presentation
// infers by matching text. TohiTab reads this flag and nothing else, and
// handleChatSubmit strips these entries out of the conversation history it
// sends, so a failure notice is never replayed to the model as if TOHI had
// said it.
function buildChatConnectionFailureEntry() {
  return {
    role: "assistant",
    content: TOHI_CHAT_CONNECTION_FAILURE_COPY,
    isConnectionFailure: true,
  };
}

// A reply is usable only if it is a real string that still has content after the
// existing cleaning step. Missing, non-string, whitespace-only and cleaned-to-
// empty all fail this and become the connection-status entry, so an empty
// bubble can never render and an object can never be stringified into one.
function resolveAssistantReplyText(res, userMessage) {
  const raw = res && typeof res.reply === "string" ? res.reply : "";
  if (!raw.trim()) return "";
  const cleaned = cleanAssistantReply(raw, userMessage);
  return typeof cleaned === "string" && cleaned.trim() ? cleaned : "";
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
      guidance: `Start by keeping the ${primaryParkLabel} plan steady. Do not let the second park pull the family away before the first park has had a fair chance to deliver. ${secondParkMustDoContext}`,
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






// 64C-1. Boundary-aware term matching for the specificity checks below.
//
// These lists were matched with plain substring containment, so short entries
// counted as specificity from inside completely unrelated words:
//   "eat"  matched weather, heat, great, seat, theater
//   "ac"   matched back, place, space
//   "show" matched shower
//   "rest" matched restaurant, forest
//
// That is why "The rain stopped and the weather cleared—where should we go now?"
// routed as a specific question: "weather" contains "eat". The terms themselves
// are fine and are kept exactly as they are — only the MATCHING is corrected, so
// a term now has to appear as its own word or phrase.
//
// Boundaries are written as explicit character alternatives rather than \b
// because several terms legitimately contain apostrophes ("rock 'n'"), and \b
// does not treat an apostrophe as part of a word. Lookbehind would read more
// neatly but is not available on older iOS Safari, which is exactly the device
// this app is built for.
function escapeRegExpLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SPECIFIC_TERM_PATTERN_CACHE = new Map();

function buildSpecificTermPattern(term) {
  const cached = SPECIFIC_TERM_PATTERN_CACHE.get(term);
  if (cached) return cached;

  // Multiword terms tolerate any run of whitespace between their words.
  const words = String(term).trim().split(/\s+/).map(escapeRegExpLiteral);
  const pattern = new RegExp(
    `(?:^|[^a-z0-9'])${words.join("\\s+")}(?:$|[^a-z0-9'])`,
    "i"
  );

  SPECIFIC_TERM_PATTERN_CACHE.set(term, pattern);
  return pattern;
}

function messageContainsSpecificTerm(text, term) {
  return buildSpecificTermPattern(term).test(text);
}

function hasSpecificRidePlaceOrActionInMessage(message = "") {
  // Curly apostrophes are folded to straight ones so terms like "rock 'n'" match
  // what a phone keyboard actually produces.
  const text = String(message || "")
    .toLowerCase()
    .replace(/[’']/g, "'");

  // "Where should we go to get AC/food/a break?" is not open-ended.
  // It has a clear goal, so send it to AI instead of re-asking the energy question.
  if (/where should we go to\s+(get|find|have|take|grab|cool|rest|eat)/.test(text)) {
    return true;
  }

  // Same goal words, same intent — but matched as whole words, so "the weather
  // cleared—where should we go now?" is no longer read as "where should we go …
  // to eat".
  const goalTerms = [
    "ac",
    "air condition",
    "cool",
    "food",
    "snack",
    "eat",
    "rest",
    "break",
  ];

  if (
    text.includes("where should we go") &&
    goalTerms.some((term) => messageContainsSpecificTerm(text, term))
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

  // The list is unchanged; only the matching is boundary-aware now.
  return specificTerms.some((term) => messageContainsSpecificTerm(text, term));
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

// 64C-1. Explicit ACTIVE weather intent in a user message.
//
// Why this exists: a question naming a real weather condition is already
// specific. Before this, "What should we do if storms arrive later?" matched the
// vague phrase "what should" and was intercepted by the energy QUICK CHECK, so
// the question never reached the AI at all. The user had to say "you didn't
// answer my question" to get an answer.
//
// The vocabulary mirrors utils/weatherAdvice.js, which already recognises these
// conditions in forecast summaries. This predicate is the same vocabulary applied
// to what the family typed. It decides ROUTING ONLY — it never asserts that
// weather is actually coming, and no advice is generated here. The AI answers
// from the real forecast, which handleChatSubmit already sends.
//
// Word-boundary matching is mandatory, not stylistic. Unbounded substrings would
// misread ride names: "Barnstormer" contains "storm" and "rainforest" contains
// "rain". Bare "thunder" is deliberately NOT a condition, because "Big Thunder"
// is a ride; the ride/place check also runs before this one.
const WEATHER_CONDITION_PATTERNS = [
  /\b(?:thunderstorms?|storms?)\b/g,
  /\blightning\b/g,
  /\b(?:heavy\s+rain|rain|raining|rains|rainy)\b/g,
  /\bweather\b/g,
  // Heat is phrase-scoped on purpose: a bare "hot" would read "hot dog" as a
  // heat question. "heat" alone is safe because it is not a food or ride word.
  /\b(?:heat\s+index|heat)\b/g,
  /\b(?:extremely|really|too|so|very)\s+hot\b/g,
  /\bhot\s+(?:outside|out|later|today|tomorrow|this\s+afternoon)\b/g,
  /\bextreme\s+heat\b/g,
];

// Negation must ATTACH to a specific condition. It is not enough for a negative
// word to appear somewhere earlier — "I'm not sure if storms arrive later" is a
// live storm question, and "No rain and extreme heat later" negates only the
// rain.
//
// So the two rules below are ANCHORED to the condition rather than scanning
// around it. WEATHER_NEGATION_BEFORE must match the text ENDING immediately at
// the condition (`$`), and WEATHER_NEGATION_AFTER must match the text STARTING
// immediately at it (`^`). Nothing further away can bind. This is deliberately
// not a character window: adjacency is structural, so it neither widens with
// long sentences nor breaks with short ones.
//
// Anchoring is also what makes uncertainty safe without a separate rule. In
// "not sure if storms", "don't know whether it will rain" and "uncertain whether
// lightning is nearby", the text immediately before the condition ends in "if",
// "will" and "whether" — none of which is a negation form — so the condition
// stays active. Uncertainty about weather is still a weather question.
//
// Anything the rules do not clearly recognise leaves the condition ACTIVE. The
// safe direction is routing to the AI, which holds the real forecast; wrongly
// suppressing a weather question is the defect this phase exists to fix.
const WEATHER_NEGATION_BEFORE = /\b(?:no|without)\s+(?:chance\s+of\s+|risk\s+of\s+)?$/;
const WEATHER_NEGATION_AFTER =
  /^\s*(?:(?:is|are|was|were|will\s+be)\s+not\s+(?:expected|in\s+the\s+forecast|likely)|(?:is|are|was|were)n't\s+(?:expected|in\s+the\s+forecast|likely)|(?:is|are|was|were)\s+over\b|(?:has|have|had)\s+(?:cleared|passed|ended|stopped)|cleared|clearing|stopped|passed|ended|moved\s+out|held\s+off)\b/;

function hasExplicitWeatherIntentInMessage(message = "") {
  const text = String(message || "")
    .toLowerCase()
    .replace(/[’']/g, "'");

  if (!text) return false;

  for (const pattern of WEATHER_CONDITION_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);

    while (match) {
      const before = text.slice(0, match.index);
      const after = text.slice(match.index + match[0].length);
      const negated =
        WEATHER_NEGATION_BEFORE.test(before) || WEATHER_NEGATION_AFTER.test(after);

      // One live condition anywhere in the message is enough. Only a message
      // whose every condition is individually negated falls through to the
      // existing classification.
      if (!negated) return true;

      match = pattern.exec(text);
    }
  }

  return false;
}

// 64C-1. The family already told us what the energy QUICK CHECK would ask.
//
// Asking "How's everyone's energy right now?" straight after the user said
// "Everyone is fading" is the same defect wearing different clothes: the question
// was specific and TOHI asked for information it had just been given.
//
// Bounded phrases, not bare words. "tired" alone would catch "tired of waiting",
// which is impatience with a line rather than a report on the family's state, so
// a following "of" disqualifies the match.
const FAMILY_STATE_PATTERNS = [
  /\b(?:everyone|everybody|we|they|the\s+kids|the\s+little\s+ones|kids)\s+(?:is|are|'re)?\s*fading\b/,
  /\bstarting\s+to\s+fade\b/,
  /\b(?:everyone|everybody|we|they|the\s+kids|the\s+little\s+ones|kids|i)\s*(?:is|are|'re|'m|am)\s+(?:really\s+|so\s+|pretty\s+|very\s+)?tired\b(?!\s+of\b)/,
  /\b(?:exhausted|worn\s+out|wiped\s+out|running\s+on\s+fumes)\b/,
  /\bstill\s+going\s+strong\b/,
  /\b(?:plenty\s+of|lots\s+of|tons\s+of)\s+energy\b/,
  /\bneed\s+(?:a\s+)?break\b/,
  /\b(?:everyone|everybody|we|they|kids)\s+(?:is|are|'re)?\s*(?:cranky|melting\s+down|done)\b/,
];

function hasExplicitFamilyStateInMessage(message = "") {
  const text = String(message || "")
    .toLowerCase()
    .replace(/[’']/g, "'");

  if (!text) return false;

  return FAMILY_STATE_PATTERNS.some((pattern) => pattern.test(text));
}

function isOpenEndedLiveStrategyQuestion(message = "") {
  const text = String(message || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[?.!]+$/g, "")
    .trim();

  if (!text) return false;
  // 64C-1 precedence. Each escape means "this is already specific enough to
  // answer, so do not ask a clarifying question first". The ride/place check
  // stays AHEAD of weather so "Big Thunder" is settled as a ride before any
  // weather vocabulary is consulted.
  if (isPlanningDepthQuestion(text)) return false;
  if (hasSpecificRidePlaceOrActionInMessage(text)) return false;
  if (hasExplicitWeatherIntentInMessage(text)) return false;
  if (hasExplicitFamilyStateInMessage(text)) return false;

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
    // 64C-1: a deliberate correction. Production sent this straight to the AI
    // only because it matched no vague phrase — an accident, not a decision. It
    // is exactly as open-ended as "what should we do next", so it belongs here.
    "what would you recommend",
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


function normalizeTripParkId(parkId) {
  if (parkId === "hollywood_studios" || parkId === "disney_hollywood_studios") {
    return "hollywood";
  }

  return parkId;
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
  // 64B-2B duplicate-submission guard. chatLoading is React state, so two submit
  // events dispatched in the same tick both read the old value and both proceed.
  // A ref is written synchronously, so the second event sees the latch already
  // held and returns before any message, tracking event or request happens.
  const chatInFlightRef = useRef(false);
  // 64B-2C. Whether the TOHI composer's software keyboard is currently open.
  // TohiTab is the only thing that sets it, and it only ever reports true when
  // that composer has focus AND the visual viewport has shrunk by a
  // keyboard-sized amount. Nothing else observes the viewport, and no other tab
  // reads this value.
  const [tohiComposerKeyboardOpen, setTohiComposerKeyboardOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationAutoEnabled, setLocationAutoEnabled] = useState(false);
  const [lastAutoUpdateAt, setLastAutoUpdateAt] = useState("");
  const [lastLocationUpdateAt, setLastLocationUpdateAt] = useState("");
  const [detectedLocationContext, setDetectedLocationContext] = useState(null);

  // Memory of the last GPS reading TOHI actually trusted. Held in a ref rather
  // than state: it is plumbing for the next reading's decision, and it must not
  // trigger a render of its own. Both the manual "Use My Location" path and the
  // continuous watch feed the same reducer, so one noisy sample cannot move the
  // guest no matter which path delivered it.
  const locationStabilityRef = useRef(createLocationStabilityState());

  // A coarse clock, purely so an accepted fix can EXPIRE without waiting for
  // some unrelated state change to re-run the decision memo. Expiry is the half
  // of the lifecycle that no incoming reading can trigger — when the app is
  // backgrounded the watch stops delivering entirely, so nothing else would
  // notice the fix ageing out.
  //
  // Ticks every 30 s against a 3-minute lifetime, and immediately on becoming
  // visible again, which is precisely the "walked away with the app in my
  // pocket" case from the field report.
  const [locationFreshnessNow, setLocationFreshnessNow] = useState(() => Date.now());

  useEffect(() => {
    const markNow = () => setLocationFreshnessNow(Date.now());

    const intervalId = setInterval(markNow, 30 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") markNow();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
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

  /* ---------------------------------------------------------------------- */
  /* 64C-A2: TOHI Voice push-to-talk input                                   */
  /*                                                                         */
  /* Voice is an INPUT LAYER and nothing more. It produces a string and hands */
  /* it to handleChatSubmit. It never calls /api/ai-chat, never builds a      */
  /* session payload, never inserts a chat entry, and adds no spoken reply.   */
  /*                                                                         */
  /* This lives in App rather than TohiTab for two reasons: TohiTab is        */
  /* presentation-only by contract, and App does NOT unmount when the guest   */
  /* leaves the TOHI tab — so the microphone teardown has to be owned by      */
  /* something that outlives the tab, or the iPhone recording indicator would */
  /* stay lit after navigating away.                                         */
  /*                                                                         */
  /* RUN ISOLATION. Everything belonging to one recording lives on a single   */
  /* run object held in voiceRunRef. Callbacks close over THEIR run and act   */
  /* only while `voiceRunRef.current === run`. That identity check is what    */
  /* makes a queued callback from an abandoned recorder inert: it cannot      */
  /* append chunks to a newer recording, stop a newer stream, clear newer     */
  /* refs, upload, or submit. Chunks, stream, recorder and timer are all      */
  /* run-local, so even a missed check could not reach another run's state.   */
  /* ---------------------------------------------------------------------- */

  // "idle" | "requesting" | "listening" | "transcribing"
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceNotice, setVoiceNotice] = useState("");

  // The synchronous authority. React state is batched, so two taps in one tick
  // would both read "idle" and both start a recorder. This ref is written
  // immediately, so the second tap sees the real state and is ignored.
  const voiceStateRef = useRef("idle");

  // The one live recording, or null. Identity is the generation check.
  const voiceRunRef = useRef(null);

  // Monotonic id, for readable diagnostics and test assertions. Correctness
  // rests on the object identity above, not on this number.
  const voiceRunSeqRef = useRef(0);

  // The CURRENT render's chat authority.
  //
  // This ref exists because of a real defect: handleVoiceRecordingFinished is
  // memoized, and handleChatSubmit is recreated every render over fresh chat,
  // park, family, weather, location, recommendation and freshness values. A
  // memoized callback that closed over handleChatSubmit directly would keep the
  // FIRST render's handler forever — a later spoken turn would overwrite the
  // conversation with a stale `chat` array and send stale park-day context.
  //
  // Writing the ref during render (the same pattern TohiTab already uses for
  // its keyboard callback) keeps it pointing at the latest handler without
  // duplicating the handler, the payload, the user insertion or the AI request.
  const handleChatSubmitRef = useRef(null);
  handleChatSubmitRef.current = handleChatSubmit;

  const setVoiceStateBoth = useCallback((next) => {
    voiceStateRef.current = next;
    setVoiceState(next);
  }, []);

  // Feature detection is resolved once. A browser with no MediaRecorder, no
  // getUserMedia, or no format we are willing to record gets no microphone at
  // all, and typed chat renders exactly as it always has.
  const voiceSupported = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    return isVoiceInputSupported({
      mediaDevices: navigator.mediaDevices,
      MediaRecorderCtor: window.MediaRecorder,
    });
  }, []);

  /** Releases one run's resources. Safe to call twice, and never touches another run. */
  const disposeRun = useCallback((run) => {
    if (!run) return;

    if (run.timerId) {
      clearTimeout(run.timerId);
      run.timerId = null;
    }

    const recorder = run.recorder;
    run.recorder = null;

    if (recorder) {
      // Drop the handlers first: a recorder stopped during teardown must not
      // run the upload path on its way out.
      try {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
      } catch {
        // A recorder that refuses property writes still gets stopped below.
      }

      try {
        if (recorder.state && recorder.state !== "inactive") recorder.stop();
      } catch {
        // Already stopped, or stopped by the browser. Nothing to recover.
      }
    }

    // The line the iPhone microphone indicator actually depends on.
    stopMediaStream(run.stream);
    run.stream = null;
    run.chunks = [];
  }, []);

  /**
   * The single teardown path. Every exit route calls this: normal stop, the
   * 30-second auto-stop, permission failure, recorder error, upload failure,
   * leaving TOHI, unmount, pagehide and document-hidden.
   *
   * Clearing voiceRunRef is what invalidates every callback still holding the
   * old run.
   */
  const teardownVoice = useCallback(() => {
    const run = voiceRunRef.current;
    voiceRunRef.current = null;
    disposeRun(run);
  }, [disposeRun]);

  /**
   * Maps a bounded failure category to calm copy. No provider, model, status
   * code or upstream text is ever shown.
   */
  const noticeForVoiceError = useCallback((category) => {
    if (category === VOICE_ERRORS.PERMISSION_DENIED) return VOICE_COPY.denied;
    if (category === "blank") return VOICE_COPY.blank;

    return VOICE_COPY.failed;
  }, []);

  const finishVoice = useCallback(
    (notice) => {
      teardownVoice();
      setVoiceStateBoth("idle");
      setVoiceNotice(notice || "");
    },
    [setVoiceStateBoth, teardownVoice]
  );

  /**
   * Runs after the recorder has stopped and produced its chunks.
   *
   * The FIRST thing this does is confirm its run is still the live one. Nothing
   * shared is read, cleared or stopped before that check — an abandoned run
   * must be able to return without having touched anything.
   */
  const handleVoiceRecordingFinished = useCallback(
    async (run) => {
      // Generation check BEFORE any state is read or mutated.
      if (voiceRunRef.current !== run) return;
      if (run.finished) return;
      run.finished = true;

      const chunks = run.chunks;
      run.chunks = [];

      // Read the recorder's OWN reported type before the recorder reference is
      // dropped. What it reports decides: an unsupported report yields null
      // rather than falling back to what we asked for, because uploading bytes
      // under a content type that does not describe them is worse than not
      // uploading at all.
      const recordedMimeType = resolveRecorderMimeType(run.recorder, run.requestedMimeType);

      if (run.timerId) {
        clearTimeout(run.timerId);
        run.timerId = null;
      }

      // Tracks are released the moment recording ends — before the upload, and
      // before any bail-out below — so the microphone indicator clears whether
      // this recording is uploaded or refused.
      stopMediaStream(run.stream);
      run.stream = null;
      run.recorder = null;

      if (!recordedMimeType) {
        // The browser produced something we cannot honestly label. The guest
        // gets the same calm copy every other bounded failure uses, and nothing
        // is uploaded or submitted.
        finishVoice(VOICE_COPY.failed);
        return;
      }

      let blob = null;
      try {
        blob = new Blob(chunks, { type: recordedMimeType });
      } catch {
        finishVoice(VOICE_COPY.failed);
        return;
      }

      const contentType = resolveUploadContentType(blob.type, recordedMimeType);
      const check = validateRecordingBlob(blob, contentType);

      if (!check.ok) {
        // Zero-byte and oversized recordings are refused here, before any
        // request is made.
        finishVoice(
          check.reason === VOICE_ERRORS.EMPTY_AUDIO ? VOICE_COPY.blank : VOICE_COPY.failed
        );
        return;
      }

      setVoiceStateBoth("transcribing");
      setVoiceNotice("");

      let result;
      try {
        result = await transcribeVoiceRecording(blob, check.contentType);
      } catch (err) {
        if (voiceRunRef.current !== run) return;
        finishVoice(noticeForVoiceError(err?.category));
        return;
      }

      // The guest may have left TOHI, hidden the page or started again while
      // the request was in flight. A late transcript must not move the UI or
      // submit a question.
      if (voiceRunRef.current !== run) return;

      const validated = validateTranscript(result?.transcript);

      if (!validated.ok) {
        // Silence. A blank transcript is a real answer, not a failure, and must
        // never become a chat turn.
        finishVoice(noticeForVoiceError(validated.reason));
        return;
      }

      // Back to idle BEFORE submitting, so the composer is usable again and the
      // chat's own latch — not the voice state — governs the turn.
      teardownVoice();
      setVoiceStateBoth("idle");
      setVoiceNotice("");

      // The one and only handoff, through the CURRENT render's handler so the
      // turn carries live chat, park, family and freshness context. Same
      // function, same latch, same insertion site, same session payload as a
      // typed question.
      handleChatSubmitRef.current?.(undefined, validated.transcript);
    },
    [finishVoice, noticeForVoiceError, setVoiceStateBoth, teardownVoice]
  );

  /**
   * Ends the live recording.
   *
   * The voice authority is moved OUT of the tappable "listening" state
   * synchronously, before stop() is called. Without that, a second fast Stop
   * tap would still read "listening" — because onstop has not fired yet — and
   * would cancel the recording that is already on its way to being uploaded.
   * The `stopping` latch is belt and braces for the same race.
   */
  const stopVoiceRecording = useCallback(() => {
    const run = voiceRunRef.current;
    if (!run || run.stopping) return;

    run.stopping = true;

    if (run.timerId) {
      clearTimeout(run.timerId);
      run.timerId = null;
    }

    // Non-tappable from this instant on.
    setVoiceStateBoth("transcribing");

    try {
      if (run.recorder && run.recorder.state === "recording") {
        // Exactly one onstop path builds and uploads the Blob.
        run.recorder.stop();
        return;
      }
    } catch {
      // fall through to a clean reset
    }

    finishVoice("");
  }, [finishVoice, setVoiceStateBoth]);

  const startVoiceRecording = useCallback(async () => {
    // Any previous run is abandoned first, which invalidates its callbacks.
    teardownVoice();

    voiceRunSeqRef.current += 1;

    const run = {
      id: voiceRunSeqRef.current,
      chunks: [],
      stream: null,
      recorder: null,
      timerId: null,
      requestedMimeType: null,
      stopping: false,
      finished: false,
    };

    voiceRunRef.current = run;

    setVoiceStateBoth("requesting");
    setVoiceNotice("");

    const mimeType = selectRecordingMimeType(window.MediaRecorder?.isTypeSupported);

    if (!mimeType) {
      if (voiceRunRef.current === run) finishVoice(VOICE_COPY.failed);
      return;
    }

    run.requestedMimeType = mimeType;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // A rejection that arrives AFTER the guest left TOHI, hid the page or
      // started again must say nothing and change nothing — showing a stale
      // permission notice over a newer run would be wrong on both counts.
      if (voiceRunRef.current !== run) return;

      // NotAllowedError / SecurityError are a denied permission; anything else
      // is a device problem. Both leave typed chat completely untouched.
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      finishVoice(noticeForVoiceError(denied ? VOICE_ERRORS.PERMISSION_DENIED : null));
      return;
    }

    // The guest may have left, hidden the page or tapped again while the
    // permission prompt was open. That stream must not be kept.
    if (voiceRunRef.current !== run) {
      stopMediaStream(stream);
      return;
    }

    let recorder;
    try {
      recorder = new window.MediaRecorder(stream, { mimeType });
    } catch {
      stopMediaStream(stream);
      if (voiceRunRef.current === run) finishVoice(VOICE_COPY.failed);
      return;
    }

    run.stream = stream;
    run.recorder = recorder;

    recorder.ondataavailable = (event) => {
      // An event queued before this run was abandoned must not append into the
      // recording that replaced it.
      if (voiceRunRef.current !== run) return;

      // Chunks are held in memory only, on this run. Nothing is written to
      // storage, and the audio never reaches logging or analytics.
      if (event?.data && event.data.size > 0) run.chunks.push(event.data);
    };

    recorder.onstop = () => {
      // A stop from an abandoned recorder must not clear chunks, stop tracks,
      // clear refs, upload or submit.
      if (voiceRunRef.current !== run) return;
      handleVoiceRecordingFinished(run);
    };

    recorder.onerror = () => {
      // An error from an abandoned recorder must not tear down a newer one.
      if (voiceRunRef.current !== run) return;
      finishVoice(VOICE_COPY.failed);
    };

    try {
      recorder.start();
    } catch {
      if (voiceRunRef.current === run) finishVoice(VOICE_COPY.failed);
      else stopMediaStream(stream);
      return;
    }

    if (voiceRunRef.current !== run) {
      // Abandoned while starting.
      disposeRun(run);
      return;
    }

    setVoiceStateBoth("listening");

    // Hard 30-second ceiling. It goes through the same stop path a deliberate
    // tap uses, so it inherits the same non-tappable transition and the same
    // single upload route.
    run.timerId = setTimeout(() => {
      run.timerId = null;
      if (voiceRunRef.current !== run) return;
      stopVoiceRecording();
    }, MAX_RECORDING_MS);
  }, [
    disposeRun,
    finishVoice,
    handleVoiceRecordingFinished,
    noticeForVoiceError,
    setVoiceStateBoth,
    stopVoiceRecording,
    teardownVoice,
  ]);

  /**
   * The only microphone entry point the UI has.
   *
   * Reads the synchronous ref, never the batched state, so rapid tapping can
   * never produce two recorders, two uploads or two chat turns. Taps arriving
   * while a permission prompt is open or a transcript is being fetched — which
   * now includes the instant after Stop — are ignored outright.
   */
  const handleVoiceButtonPress = useCallback(() => {
    if (!voiceSupported) return;

    const current = voiceStateRef.current;

    if (current === "idle") {
      // Never compete with a chat turn that is already running.
      if (chatInFlightRef.current) return;
      startVoiceRecording();
      return;
    }

    if (current === "listening") {
      stopVoiceRecording();
    }

    // "requesting" and "transcribing" deliberately ignore the tap.
  }, [startVoiceRecording, stopVoiceRecording, voiceSupported]);

  // Leaving TOHI, hiding the page, or unmounting must release the microphone.
  // App does not unmount on tab change, so activeTab is watched explicitly.
  useEffect(() => {
    if (activeTab !== "tohi" && voiceStateRef.current !== "idle") {
      teardownVoice();
      setVoiceStateBoth("idle");
      setVoiceNotice("");
    }
  }, [activeTab, setVoiceStateBoth, teardownVoice]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const releaseMicrophone = () => {
      if (voiceStateRef.current === "idle" && !voiceRunRef.current) return;
      teardownVoice();
      setVoiceStateBoth("idle");
      setVoiceNotice("");
    };

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        releaseMicrophone();
      }
    };

    window.addEventListener("pagehide", releaseMicrophone);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", releaseMicrophone);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Unmount: abandon the run and release every track.
      teardownVoice();
    };
  }, [setVoiceStateBoth, teardownVoice]);

  const voiceBusy = voiceState !== "idle";

  const voiceStatusMessage = useMemo(() => {
    if (voiceState === "requesting") return VOICE_COPY.requesting;
    if (voiceState === "listening") return VOICE_COPY.listening;
    if (voiceState === "transcribing") return VOICE_COPY.transcribing;

    return voiceNotice || "";
  }, [voiceNotice, voiceState]);
  // 61D: Plan Tools is a sub-view of the Plan tab, not a router destination.
  // The global router (activeScreen) and the tab bar (activeTab) are untouched,
  // so the bottom nav keeps showing Plan as active while Plan Tools is open.
  const [planToolsOpen, setPlanToolsOpen] = useState(false);
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

  const [currentLand, setCurrentLandState] = useState(null);

  // Who put this land here. currentLand is written both by GPS and by the
  // guest's own picker, and once a GPS fix expires the two must not be
  // confusable: an expired GPS land presenting itself as a manual selection
  // would hide the fact that TOHI no longer knows where the family is.
  const [currentLandSource, setCurrentLandSource] = useState(null);

  // The setter handed to the manual area picker. Same signature the picker
  // already calls, so no component changes: choosing an area records it as a
  // deliberate choice and clears the GPS stabilization history, because the
  // guest has just overruled it.
  const setCurrentLand = useCallback((nextLand) => {
    setCurrentLandState(nextLand);
    setCurrentLandSource(nextLand ? "manual" : null);
    locationStabilityRef.current = createLocationStabilityState();
  }, []);
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activityTimerNow, setActivityTimerNow] = useState(() => Date.now());
  const [activityLog, setActivityLog] = useState([]);
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

        ingestParkArrivalSample(position);

        const detectedZone = detectNearestLocationZone({
          parkId: activePark,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });

        if (!detectedZone) {
          if (!silent) {
            setLocationError(
              "I could not match your location to this park yet. Pick the closest area manually for now."
            );
          }
          return null;
        }

        // Same gate as the watch. A tap on "Use My Location" is an explicit
        // request, but it still cannot make a poor fix trustworthy — the reading
        // is only as good as its accuracy radius and its age.
        const stability = reduceLocationReading(
          locationStabilityRef.current,
          {
            landKey: detectedZone.landKey,
            // The detector's own verdict. A precise fix that the anchor
            // geometry cannot back up must not become stored context.
            confidence: detectedZone.confidence,
            accuracyMeters: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          Date.now()
        );

        locationStabilityRef.current = stability.state;

        if (stability.decision.action !== "accept") {
          // Keep whatever was already trusted rather than replacing it with a
          // reading TOHI cannot stand behind. Manual area selection stays
          // available, which is the honest fallback when GPS is weak.
          if (!silent) {
            setLocationError(
              "Your location signal is not steady enough to place you right now. Pick the closest area manually for now."
            );
          }

          // The watch still starts. The guest asked to be located and this one
          // fix was not good enough — later readings may well be, and the watch
          // is how they arrive. Without this, one weak fix at the moment of
          // tapping would leave location switched off for the rest of the day.
          setLocationAutoEnabled(true);
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
          // When the FIX was taken. Kept separate from updatedAt, which is only
          // when this handler stored it — a context built from a cached sample
          // is already partly spent on arrival, and freshness must be measured
          // against the fix.
          fixedAtMs: position.timestamp,
          updatedAt: new Date().toISOString(),
        };

        setDetectedLocationContext(structuredLocation);

        // Do not let low-confidence GPS yank families into the wrong land.
        if (detectedZone.confidence !== "low") {
          setCurrentLandState(getSafeLandForPark(activePark, detectedZone.landKey));
          setCurrentLandSource("gps");
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
    if (!locationAutoEnabled) {
      // GPS is off, so its accumulated history is meaningless. Clearing it also
      // means that if the guest turns location back on, the next good fix
      // establishes promptly rather than being weighed against a land that was
      // last seen who knows when.
      locationStabilityRef.current = createLocationStabilityState();
      return undefined;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      !navigator.geolocation.watchPosition
    ) {
      return undefined;
    }

    let isActive = true;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isActive) return;
        if (document.visibilityState !== "visible") return;

        // Park-level arrival evidence rides along with the existing watch;
        // it must run even when no in-park land zone matches this sample.
        ingestParkArrivalSample(position);

        const detectedZone = detectNearestLocationZone({
          parkId: activePark,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });

        if (!detectedZone) return;

        // The stability gate. Readings that are too imprecise to tell
        // neighbouring lands apart, older than the fix already accepted, or
        // proposing a land change on a single sample do not reach state at all —
        // so the previously trusted location survives instead of being replaced.
        // This is what stops one border sample near Galaxy's Edge from moving
        // the guest to Toy Story Land and reshaping recommendation proximity.
        const stability = reduceLocationReading(
          locationStabilityRef.current,
          {
            landKey: detectedZone.landKey,
            // Rejected here rather than merely distrusted downstream, so a weak
            // reading never overwrites the stored context or renews its
            // lifetime. The previously trusted fix keeps ageing on its own
            // original timestamp.
            confidence: detectedZone.confidence,
            accuracyMeters: position.coords.accuracy,
            // position.timestamp is when the FIX was taken. Using it, rather
            // than the moment this handler ran, is what lets a cached fix
            // delivered after the app returns from the background be recognised
            // as old news.
            timestamp: position.timestamp,
          },
          Date.now()
        );

        locationStabilityRef.current = stability.state;

        if (stability.decision.action !== "accept") return;

        const structuredLocation = {
          source: "gps_watch",
          parkId: activePark,
          landKey: detectedZone.landKey,
          landLabel: detectedZone.landLabel,
          nearestAnchorName: detectedZone.anchorName,
          nearestAnchorId: detectedZone.anchorId,
          nearestAnchorType: detectedZone.anchorType,
          distanceMeters: detectedZone.distanceMeters,
          confidence: detectedZone.confidence,
          fixedAtMs: position.timestamp,
          updatedAt: new Date().toISOString(),
        };

        setDetectedLocationContext(structuredLocation);
        setLastLocationUpdateAt(structuredLocation.updatedAt);
        setLocationError("");

        if (detectedZone.confidence !== "low") {
          setCurrentLandState(getSafeLandForPark(activePark, detectedZone.landKey));
          setCurrentLandSource("gps");
          setLocationMessage(
            `${detectedZone.message} Not right? Pick another area manually.`
          );
        }
      },
      (err) => {
        const denied =
          err?.code === 1 ||
          String(err?.message || "").toLowerCase().includes("denied");

        if (denied) {
          setLocationAutoEnabled(false);
          setDetectedLocationContext(null);
        }
      },
      LOCATION_WATCH_OPTIONS
    );

    return () => {
      isActive = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activePark, locationAutoEnabled]);

  useEffect(() => {
    isRestoringParkState.current = true;

    const saved = readStoredParkState(activePark);

    // Only an explicitly recorded manual choice comes back. GPS-owned and
    // source-less legacy state is dropped rather than guessed at — see
    // resolveRestoredLocationState. This also keeps the area picker empty
    // instead of leaving a land selected that nothing stands behind.
    const restored = resolveRestoredLocationState(saved);
    const restoredLand = restored.currentLand
      ? getSafeLandForPark(activePark, restored.currentLand)
      : null;

    setCurrentLandState(restoredLand);
    setCurrentLandSource(restoredLand ? restored.currentLandSource : null);

    // The previous park's stabilization history says nothing about this one.
    // Clearing it is also what lets the first good reading in the new park
    // establish promptly instead of looking like a change of land.
    locationStabilityRef.current = createLocationStabilityState();
    setCompletedRideIds(saved.completedRideIds || []);
    setSkippedRideIds(saved.skippedRideIds || []);
    setReportedRideIssueIds(saved.reportedRideIssueIds || []);
    setCurrentActivity(saved.currentActivity || null);
    setActivityLog(saved.activityLog || []);
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
      currentLandSource,
      completedRideIds,
      skippedRideIds,
      reportedRideIssueIds,
      currentActivity,
      activityLog,
    });
  }, [
    activePark,
    currentLand,
    currentLandSource,
    completedRideIds,
    skippedRideIds,
    reportedRideIssueIds,
    currentActivity,
    activityLog,
  ]);

  const [parkPresence, setParkPresence] = useState(null);
  // 63B-3: the browsed park owns its own request state. Previously every
  // failure collapsed to null, which is indistinguishable from "not requested
  // yet" — so a failed browse looked like an empty park. parkId tags the state
  // so a late response can never land under a different park's heading, and so
  // the active park's error is never reused as the browsed park's error.
  const [browsedParkRequest, setBrowsedParkRequest] = useState({
    parkId: null,
    data: null,
    loading: false,
    error: "",
  });
  const browsedParkData = browsedParkRequest.data;
  // Monotonic request generation. Park identity alone cannot separate two
  // in-flight requests for the SAME park — leave EPCOT, come back, refresh, and
  // the older response would still match on parkId. Only the newest request may
  // write, so a stale response is dropped rather than overwriting fresh data.
  const browsedRequestIdRef = useRef(0);

  useEffect(() => {
    if (!timeContext?.orlandoDate) return;

    setParkPresence((current) => {
      const presenceContext = {
        scheduledParkForToday,
        planningPark,
        dateString: timeContext.orlandoDate,
      };

      // In-session presence that is still valid for today's plan keeps its
      // live browsing/prompt state; only invalid presence is rebuilt.
      if (current) {
        const revalidated = restoreParkPresence(current, presenceContext);
        const stillValid =
          revalidated.dateString === current.dateString &&
          revalidated.confirmedActivePark === current.confirmedActivePark &&
          revalidated.plannedParkIds.join("|") ===
            (current.plannedParkIds || []).join("|");

        return stillValid ? current : revalidated;
      }

      return restoreParkPresence(readStoredParkPresence(), presenceContext);
    });
  }, [timeContext?.orlandoDate, scheduledParkForToday, planningPark]);

  // The confirmed active park is the only thing allowed to move activePark,
  // which keeps every personalized subsystem (waits data for recommendations,
  // weather, time context, land detection, chat context) anchored to it.
  useEffect(() => {
    const confirmedPark = parkPresence?.confirmedActivePark;

    if (confirmedPark && activePark !== confirmedPark) {
      setActivePark(confirmedPark);
    }
  }, [parkPresence?.confirmedActivePark, activePark]);

  useEffect(() => {
    if (parkPresence) writeStoredParkPresence(parkPresence);
  }, [parkPresence]);

  const [parkArrivalTracker, setParkArrivalTracker] = useState(() =>
    createParkArrivalTracker()
  );
  const parkArrivalContextRef = useRef(null);

  parkArrivalContextRef.current = {
    confirmedActivePark: parkPresence?.confirmedActivePark || "",
    plannedParkIds: parkPresence?.plannedParkIds || [],
  };

  const ingestParkArrivalSample = useCallback((position) => {
    const arrivalContext = parkArrivalContextRef.current;

    if (!arrivalContext?.confirmedActivePark || !position?.coords) return;

    setParkArrivalTracker((current) =>
      updateParkArrivalTracker(current, {
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          timestamp: position.timestamp,
        },
        confirmedActivePark: arrivalContext.confirmedActivePark,
        plannedParkIds: arrivalContext.plannedParkIds,
      })
    );
  }, []);

  // GPS is evidence only: stable arrival evidence registers the existing
  // detected_arrival prompt through 60C. Nothing here calls setActivePark or
  // confirmActivePark — only the guest's confirmation moves the park.
  useEffect(() => {
    if (hasStableParkArrivalEvidence(parkArrivalTracker)) {
      const detectedParkId = parkArrivalTracker.candidateParkId;

      setParkPresence((current) =>
        current
          ? registerDetectedPark(current, { parkId: detectedParkId, confidence: "high" })
          : current
      );
      setParkArrivalTracker((current) => suppressParkArrivalPrompt(current, detectedParkId));
      return;
    }

    if (parkArrivalTracker?.departedParkId) {
      const departedParkId = parkArrivalTracker.departedParkId;

      setParkPresence((current) =>
        current ? clearDetectedParkDismissal(current, departedParkId) : current
      );
      setParkArrivalTracker((current) => acknowledgeParkArrivalDeparture(current));
    }
  }, [parkArrivalTracker]);

  const parkArrivalPlanKey = `${parkPresence?.dateString || ""}|${(
    parkPresence?.plannedParkIds || []
  ).join(",")}`;

  useEffect(() => {
    setParkArrivalTracker(createParkArrivalTracker());
  }, [parkArrivalPlanKey]);

  const parkPresenceTheme = getTohiAppShellTheme();

  // 61A Plan visual tokens — presentation only. Day: warm cream/white with
  // restrained lavender. Night: deep navy with muted purple borders.
  const planNight = parkPresenceTheme.isNight;

  // 62A/62B-2F-2/63C-2/64B-2E-2/Profile night: the one explicit,
  // parent-controlled shell decision. The dark shell and dark navigation apply
  // while ANY converted tab is active. Home joined Plan in 62B-2F-2, Waits in
  // 63C-2, TOHI in 64B-2E-2 and Profile in this phase — each only once every
  // surface on that tab had a night presentation, because a dark shell behind
  // day surfaces would read as a bug. Plan Tools inherits true because it is a
  // sub-view of Plan: activeTab stays "plan" while it is open.
  //
  // Onboarding is deliberately NOT part of this. It is not an activeTab branch;
  // it renders through activeScreen and keeps the module-level day `page`, so
  // opening "Review setup" from a night Profile returns to the unchanged day
  // onboarding rather than inheriting Profile's night styling.
  //
  // Because the page background, BottomTabs and each converted tab's content all
  // read this single value in the same render, a tab switch can never leave dark
  // cards on a day page or day cards on a dark page.
  //
  // Renamed from planShellNight, which stopped being accurate the moment Home
  // joined. Derived from existing state only: no stored state, effects, timers,
  // storage, or media-query listeners, and planNight itself is untouched.
  const shellNight =
    (activeTab === "plan" ||
      activeTab === "home" ||
      activeTab === "waits" ||
      activeTab === "tohi" ||
      activeTab === "profile") &&
    planNight;
  const shellTokens = getTohiAppShellTheme({
    forceMode: shellNight ? TOHI_THEME_MODES.NIGHT : TOHI_THEME_MODES.DAY,
  }).shellTokens;

  // The page background, BottomTabs and HomeTab all read shellNight in the same
  // render, so a tab switch flips them together in one commit. Day resolves to
  // the untouched module-level page object by identity.
  const pageStyle = shellNight
    ? {
        ...page,
        background: shellTokens.pageBackground,
        backgroundColor: shellTokens.pageBackgroundColor,
        color: shellTokens.text,
      }
    : page;
  const planTokens = {
    surface: planNight ? "#131C36" : "#FFFFFF",
    surfaceSoft: planNight ? "#0F172A" : "#FFF9F1",
    border: planNight ? "rgba(139, 92, 246, 0.34)" : "rgba(124, 58, 237, 0.16)",
    borderQuiet: planNight ? "rgba(99, 102, 241, 0.26)" : colors.cardBorder,
    title: planNight ? "#F5F3FF" : colors.text,
    muted: planNight ? "#B6C2E2" : colors.muted,
    eyebrow: planNight ? "#C4B5FD" : colors.purpleDeep,
    eyebrowPill: planNight ? "rgba(76, 29, 149, 0.45)" : "rgba(124, 58, 237, 0.10)",
    shadow: planNight
      ? "0 12px 30px rgba(2, 6, 23, 0.45)"
      : "0 10px 24px rgba(28, 25, 23, 0.06)",
  };

  const browsedParkId = deriveBrowsedPark(parkPresence, activePark);
  const browsingAnotherPark = isBrowsingAnotherPark(parkPresence, browsedParkId);
  const confirmedActiveParkId = parkPresence?.confirmedActivePark || activePark;
  const confirmedActiveParkLabel = getParkNameById(confirmedActiveParkId);
  const browsedParkLabel = getParkNameById(browsedParkId);
  const parkPresencePrompt = parkPresence?.prompt?.parkId ? parkPresence.prompt : null;

  // Browsed-park waits are informational only. They are fetched separately so
  // the confirmed park's data (recommendations, weather, TOHI Pick) is never
  // replaced by a park the family is merely looking at. Refetches ride along
  // with the confirmed park's own refresh cycle via the parkData dependency.
  // Two layers of late-response protection: the cancelled flag for this effect
  // run, and a parkId identity check inside every setter. A response that
  // arrives after the family has moved to another park is dropped rather than
  // written under the new park's heading.
  const loadBrowsedParkData = useCallback((parkId, options = {}) => {
    if (!parkId) return undefined;

    const { force = false } = options;
    const requestId = browsedRequestIdRef.current + 1;
    browsedRequestIdRef.current = requestId;
    let cancelled = false;

    // Same park: keep usable data on screen while the request runs.
    // Different park: start clean, so the previous park's rides can never sit
    // under the new park's heading.
    setBrowsedParkRequest((current) =>
      current.parkId === parkId
        ? { ...current, loading: true, error: "" }
        : { parkId, data: null, loading: true, error: "" }
    );

    fetchParkData(parkId, { force })
      .then((data) => {
        if (cancelled) return;
        setBrowsedParkRequest((current) =>
          shouldApplyBrowsedResponse({
            requestId,
            currentRequestId: browsedRequestIdRef.current,
            parkId,
            currentParkId: current.parkId,
          })
            ? { parkId, data, loading: false, error: "" }
            : current
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setBrowsedParkRequest((current) =>
          shouldApplyBrowsedResponse({
            requestId,
            currentRequestId: browsedRequestIdRef.current,
            parkId,
            currentParkId: current.parkId,
          })
            ? {
                ...current,
                loading: false,
                error: err?.message || "Could not load browsed park wait times.",
              }
            : current
        );
      });

    // Retained as an additional guard for the effect's own lifecycle.
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!browsingAnotherPark || !browsedParkId) {
      // Leaving browse mode invalidates every outstanding browsed request and
      // clears browsed-only state entirely.
      browsedRequestIdRef.current += 1;
      setBrowsedParkRequest({ parkId: null, data: null, loading: false, error: "" });
      return undefined;
    }

    return loadBrowsedParkData(browsedParkId);
  }, [browsingAnotherPark, browsedParkId, parkData, loadBrowsedParkData]);

  // The Waits Refresh button refreshes the park Waits is actually showing.
  // Browsing another park must never force a refresh of the confirmed park.
  function handleWaitsRefresh() {
    if (browsingAnotherPark && browsedParkId) {
      loadBrowsedParkData(browsedParkId, { force: true });
      return;
    }

    loadData(true);
  }

  const waitListParkId = browsingAnotherPark ? browsedParkId : activePark;
  const waitListParkData = browsingAnotherPark ? browsedParkData : parkData;
  // The displayed park's own request state. An active-park error is never read
  // while browsing, and vice versa.
  const waitsLoading = browsingAnotherPark ? browsedParkRequest.loading : loading;
  const waitsError = browsingAnotherPark ? browsedParkRequest.error : error;

  function handleSelectPark(parkId) {
    trackAppEvent("park_selected", {
      source: "park_tabs",
      activePark: parkId,
      metadata: {
        previousPark: browsedParkId,
        nextPark: parkId,
        confirmedActivePark: parkPresence?.confirmedActivePark || "",
      },
    });

    // Park presence, when it exists, owns this decision: selecting a card
    // BROWSES that park and leaves the confirmed active park alone. Without
    // presence there is nothing to browse against, so the existing active-park
    // behaviour stands. Neither branch changes here.
    if (!parkPresence) {
      setActivePark(parkId);
    } else {
      setParkPresence((current) => (current ? selectBrowsedPark(current, parkId) : current));
    }

    // The park cards answer "show me this park", and the answer lives on Waits.
    // waitListParkId already resolves to the browsed park while browsing and to
    // the active park otherwise, so both branches above land on the park the
    // guest just tapped — including when they tap the one already selected.
    setActiveTab("waits");
  }

  function handleConfirmParkPresence(parkId) {
    trackAppEvent("park_presence_confirmed", {
      source: "park_presence_prompt",
      activePark: parkId,
      metadata: {
        previousConfirmedPark: parkPresence?.confirmedActivePark || "",
        promptType: parkPresence?.prompt?.type || "",
      },
    });

    setParkPresence((current) => confirmActivePark(current, parkId));
    setParkArrivalTracker(createParkArrivalTracker());
  }

  function handleDismissParkPresencePrompt() {
    trackAppEvent("park_presence_prompt_dismissed", {
      source: "park_presence_prompt",
      activePark,
      metadata: {
        promptType: parkPresence?.prompt?.type || "",
        promptParkId: parkPresence?.prompt?.parkId || "",
      },
    });

    setParkPresence((current) => dismissParkPresencePrompt(current));
  }

  const sortedRides = useMemo(() => {
    return [...(waitListParkData?.rides || [])]
      .filter((ride) => shouldShowRideInWaitList(waitListParkId, ride))
      .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0));
  }, [waitListParkData, waitListParkId]);

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

  // Tear down GPS-owned location state once its fix has expired, so what the
  // guest sees matches what the recommendation engine reasons over. Without
  // this, resolveLocationTrust below stops trusting the old fix while the area
  // picker still shows the old land and the card still reads "Near <old
  // attraction>" — the engine and the interface disagreeing about where the
  // family is.
  //
  // Automatic GPS is deliberately left enabled: the fix expired, the permission
  // did not, and the next good reading should establish normally.
  useEffect(() => {
    if (
      !shouldClearExpiredGpsLocation({
        gpsContext: detectedLocationContext,
        currentLand,
        currentLandSource,
        activeParkId: activePark,
        now: locationFreshnessNow,
      })
    ) {
      return;
    }

    setCurrentLandState(null);
    setCurrentLandSource(null);
    setDetectedLocationContext(null);
    setLocationMessage("");
    setLastLocationUpdateAt("");
    locationStabilityRef.current = createLocationStabilityState();
  }, [
    activePark,
    currentLand,
    currentLandSource,
    detectedLocationContext,
    locationFreshnessNow,
  ]);

  const locationContextForDecisions = useMemo(() => {
    // An accepted fix does not stay true forever. Gating incoming readings
    // stops bad data arriving; this stops good data from outliving its own
    // accuracy after the watch goes quiet — which is what happens the moment the
    // app is backgrounded. Resolution is a pure helper so the whole lifecycle is
    // testable without rendering the app.
    //
    // A GPS-written currentLand is deliberately NOT offered as the manual
    // fallback: the guest never chose it, and once its fix expires the honest
    // answer is that TOHI does not know where they are.
    const trust = resolveLocationTrust({
      gpsContext: detectedLocationContext,
      activeParkId: activePark,
      manualLandKey: currentLandSource === "manual" ? currentLand : null,
      now: locationFreshnessNow,
    });

    if (trust.source === "none") {
      return null;
    }

    const safeDetectedLocation = trust.gpsContext;
    const resolvedLand = trust.landKey;

    return {
      type: safeDetectedLocation ? "gps" : "manual_land",
      land: resolvedLand,
      landKey: resolvedLand,
      landLabel:
        safeDetectedLocation?.landLabel ||
        LAND_OPTIONS[activePark]?.find((option) => option.value === resolvedLand)?.label ||
        formatLandLabel(activePark, resolvedLand),
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
  }, [
    activePark,
    currentLand,
    currentLandSource,
    detectedLocationContext,
    locationFreshnessNow,
    locationMessage,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Rain confirmation                                                        */
  /* ------------------------------------------------------------------------ */

  // The structured weather determination the engine already uses. Derived once
  // here so the prompt and the recommendations read the same interpretation.
  const recommendationWeatherState = useMemo(() => {
    return getRecommendationWeatherState(weather);
  }, [weather]);

  const [rainConfirmationRecord, setRainConfirmationRecord] = useState(() =>
    readStoredRainConfirmation()
  );

  // Null unless the weather is a forecast-only Rain Watch or Storm Watch, so
  // clear skies and already-active precipitation can never produce a prompt.
  const rainConfirmationEpisode = useMemo(() => {
    return getRainConfirmationEpisode({
      weatherState: recommendationWeatherState,
      weather,
      parkId: activePark,
      tripDate: timeContext?.orlandoDate,
    });
  }, [recommendationWeatherState, weather, activePark, timeContext?.orlandoDate]);

  // Forget an answer once it expires, once the park or trip date moves on, or
  // once the provider reports precipitation itself. Reuses the existing
  // 30-second freshness tick rather than adding a timer.
  useEffect(() => {
    if (!rainConfirmationRecord) return;

    if (
      isRainConfirmationObsolete({
        record: rainConfirmationRecord,
        episode: rainConfirmationEpisode,
        weatherState: recommendationWeatherState,
        now: locationFreshnessNow,
      })
    ) {
      clearStoredRainConfirmation();
      setRainConfirmationRecord(null);
    }
  }, [
    rainConfirmationRecord,
    rainConfirmationEpisode,
    recommendationWeatherState,
    locationFreshnessNow,
  ]);

  const activeRainConfirmation = useMemo(() => {
    return getActiveRainConfirmation({
      episode: rainConfirmationEpisode,
      record: rainConfirmationRecord,
      now: locationFreshnessNow,
    });
  }, [rainConfirmationEpisode, rainConfirmationRecord, locationFreshnessNow]);

  // What the engine reasons about. Identical to `weather` unless the family has
  // confirmed rain, and even then the forecast fields are carried through
  // untouched — `weather` itself is never edited and stays the display source.
  const weatherForDecisions = useMemo(() => {
    return applyRainConfirmationToWeather(weather, activeRainConfirmation);
  }, [weather, activeRainConfirmation]);

  // Never during onboarding, without a real park, without a finished profile,
  // or before a plan has actually been generated.
  const rainCheckAllowed = canAskRainConfirmation({
    activeScreen,
    isProfileIncomplete,
    activePark,
    weather,
    tripPlan: tripPlanState,
  });

  const showRainCheckPrompt = useMemo(() => {
    return shouldAskRainConfirmation({
      episode: rainConfirmationEpisode,
      record: rainConfirmationRecord,
      now: locationFreshnessNow,
      canAsk: rainCheckAllowed,
    });
  }, [
    rainConfirmationEpisode,
    rainConfirmationRecord,
    locationFreshnessNow,
    rainCheckAllowed,
  ]);

  const respondToRainCheck = useCallback(
    (response) => {
      const record = buildRainConfirmationRecord({
        episode: rainConfirmationEpisode,
        response,
        now: Date.now(),
      });

      if (!record) return;

      writeStoredRainConfirmation(record);
      setRainConfirmationRecord(record);
    },
    [rainConfirmationEpisode]
  );

  const handleConfirmRainCheck = useCallback(() => {
    respondToRainCheck(RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
  }, [respondToRainCheck]);

  const handleRainCheckNotYet = useCallback(() => {
    respondToRainCheck(RAIN_CONFIRMATION_RESPONSES.NOT_YET);
  }, [respondToRainCheck]);

  const handleDismissRainCheck = useCallback(() => {
    respondToRainCheck(RAIN_CONFIRMATION_RESPONSES.DISMISSED);
  }, [respondToRainCheck]);

  const recommendations = useMemo(() => {
    return getNextBestRides({
      parkId: activePark,
      rides: parkData?.rides || [],
      weather: weatherForDecisions,
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
    weatherForDecisions,
    locationContextForDecisions,
    completedRideIds,
    recommendationAvoidedRideIds,
    familyProfileSummary,
    timeContext,
    tripPlanState,
  ]);

  // The blueprint's two Plan states share one existing condition: setup renders
  // while personalized moves still need the family's location; the
  // recommendation experience renders once that context exists. Declared after
  // the recommendations memo it reads from.
  const planShowsSetupState = recommendations.needsLocation || !currentLand;

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
      completedRideIds,
      activityLog,
    });
  }, [
    familyProfileSummary,
    tripPlanState,
    planningPark,
    weather,
    weatherMode,
    planningTimeContext,
    packingChecklist,
    completedRideIds,
    activityLog,
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
    const tripContext = familyProfile?.tripContext || {};
    const selectedParkIds = Array.isArray(tripContext.parkSelectionIds)
      ? tripContext.parkSelectionIds
      : Array.isArray(tripContext.selectedParks)
      ? tripContext.selectedParks
      : [];

    const validParkIds = new Set(PARKS.map((park) => park.id));
    const tripParkIds = selectedParkIds
      .map((parkId) => normalizeTripParkId(parkId))
      .filter(
        (parkId, index, list) =>
          typeof parkId === "string" &&
          parkId.trim() &&
          validParkIds.has(parkId) &&
          list.indexOf(parkId) === index
      );

    const fallbackParkId =
      normalizeTripParkId(planningPark) ||
      normalizeTripParkId(tripContext.firstParkId) ||
      normalizeTripParkId(tripContext.firstPark) ||
      "magic_kingdom";

    const optionParkIds = tripParkIds.length > 0 ? tripParkIds : [fallbackParkId].filter((parkId) => validParkIds.has(parkId));

    return optionParkIds.flatMap((parkId) => {
      const parkLabel = getParkLabel(parkId);

      return getParkRides(parkId)
        .map(([id, meta]) => ({
          id,
          name: meta?.displayName || meta?.name || id,
          displayName: meta?.displayName || meta?.name || id,
          parkId,
          parkLabel,
          type: meta?.type || meta?.category || "experience",
        }))
        .filter((experience) => shouldShowRideInWaitList(parkId, experience));
    });
  }, [familyProfile?.tripContext, planningPark]);

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
    return buildCurrentActivityContext(currentActivity, activityTimerNow);
  }, [currentActivity, activityTimerNow]);

  useEffect(() => {
    if (currentActivity?.type !== "in_line") return undefined;

    setActivityTimerNow(Date.now());

    const intervalId = setInterval(() => {
      setActivityTimerNow(Date.now());
    }, IN_LINE_TIMER_TICK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentActivity?.type, currentActivity?.startedAt]);

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

  // 61D: leaving the Plan tab closes its sub-view, so the bottom nav never
  // lands the family inside Plan Tools instead of Plan. This only resets the
  // new local flag — activeTab and activeScreen are not touched.
  useEffect(() => {
    if (activeTab !== "plan") {
      setPlanToolsOpen(false);
    }
  }, [activeTab]);

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

    // "In Line Now" is the disabled state of this same button, so this is
    // normally unreachable for the ride already in progress. Guarding here as
    // well means a re-entry can never restart an activity, reset its start
    // time, or bounce the guest to Home for something they are already doing.
    if (activeRideId === id) return;
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

    // Home is where the queue lives — elapsed time, While You Wait, and the
    // queue mini-games. Joining a line from Plan or Waits left the guest on the
    // screen they started from, with the thing they just started one tab away.
    // Only reached for a newly created activity, so nothing here can disturb an
    // activity already running.
    setActiveTab("home");
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

    const completedAt = new Date().toISOString();
    const fromActivity =
      currentActivity?.rideId != null &&
      String(currentActivity.rideId) === id;

    setActivityLog((prev) => [
      ...prev,
      {
        rideId: id,
        rideName: fromActivity
          ? currentActivity.rideName
          : recommendation?.name || null,
        land: fromActivity ? currentActivity.land || "" : "",
        startedAt: fromActivity ? currentActivity.startedAt || null : null,
        postedWaitAtStart: fromActivity
          ? currentActivity.postedWaitAtStart ?? null
          : null,
        type: "completed_ride",
        completedAt,
      },
    ]);

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


  /* ---------------------------------------------------------------------- */
  /* Profile presentation helpers                                           */
  /* ---------------------------------------------------------------------- */

  // One grouped Profile card. The eyebrow is a real heading so the screen can be
  // navigated by heading, which the previous flat run of <div> labels could not.
  //
  // Night reads the shared parent-controlled `shellNight` decision — the same
  // value the page background and BottomTabs read in this render — so a card can
  // never be dark on a day page or pale on the night shell. Every conditional
  // below resolves to the exact day value it had before when the flag is false,
  // which is what the day-parity guard pins.
  function renderProfileGroup({ accent, title, caption, children }) {
    const tone = {
      purple: shellNight
        ? {
            text: PROFILE_NIGHT.tonePurpleText,
            chip: PROFILE_NIGHT.tonePurpleChip,
            border: PROFILE_NIGHT.tonePurpleBorder,
          }
        : { text: colors.purpleDeep, chip: "rgba(124, 58, 237, 0.10)", border: "rgba(124, 58, 237, 0.20)" },
      sky: shellNight
        ? {
            text: PROFILE_NIGHT.toneSkyText,
            chip: PROFILE_NIGHT.toneSkyChip,
            border: PROFILE_NIGHT.toneSkyBorder,
          }
        : { text: "#0369A1", chip: "rgba(56, 189, 248, 0.14)", border: "rgba(56, 189, 248, 0.26)" },
      amber: shellNight
        ? {
            text: PROFILE_NIGHT.toneAmberText,
            chip: PROFILE_NIGHT.toneAmberChip,
            border: PROFILE_NIGHT.toneAmberBorder,
          }
        : { text: "#92400E", chip: colors.amberSoft, border: "rgba(245, 158, 11, 0.28)" },
    }[accent] || {
      text: shellNight ? PROFILE_NIGHT.tonePurpleText : colors.purpleDeep,
      chip: shellNight ? PROFILE_NIGHT.tonePurpleChip : "rgba(124, 58, 237, 0.10)",
      border: shellNight ? PROFILE_NIGHT.toneFallbackBorder : colors.cardBorder,
    };

    return (
      <section
        style={{
          ...card,
          background: shellNight ? PROFILE_NIGHT.groupSurface : "#FFFFFF",
          border: `1px solid ${tone.border}`,
          borderRadius: 24,
          padding: 18,
          boxShadow: shellNight
            ? PROFILE_NIGHT.groupShadow
            : "0 10px 28px rgba(28, 25, 23, 0.06)",
        }}
      >
        <h3
          style={{
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 10px",
            borderRadius: 999,
            background: tone.chip,
            color: tone.text,
            fontSize: 11.5,
            fontWeight: 900,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h3>

        {caption && (
          <p
            style={{
              margin: "10px 0 0",
              color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {caption}
          </p>
        )}

        <div style={{ marginTop: 14 }}>{children}</div>
      </section>
    );
  }

  // Label/value rows as a real definition list, so each value is programmatically
  // tied to its label instead of being two unrelated runs of text. `hint` carries
  // the plain-language note about how that answer helps TOHI; it is only attached
  // to answers that genuinely drive a decision.
  function renderProfileRows(rows) {
    return (
      <dl style={{ margin: 0, display: "grid", gap: 12 }}>
        {rows.filter(Boolean).map(({ label, value, hint }) => {
          const isSet = value != null && value !== "";

          return (
            <div key={label} style={{ display: "grid", gap: 3 }}>
              <dt
                style={{
                  color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                  fontSize: 11.5,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  // Unset uses the muted token rather than a lighter grey: a
                  // lighter tone measured 3.92:1 on white, below AA. Italic plus
                  // the lighter weight carries the unset distinction instead.
                  // Night follows the same rule with the night muted token,
                  // which measures well above AA on the #131C36 card.
                  color: shellNight
                    ? isSet
                      ? PROFILE_NIGHT.title
                      : PROFILE_NIGHT.muted
                    : isSet
                    ? colors.text
                    : colors.muted,
                  fontSize: 15.5,
                  fontWeight: isSet ? 850 : 700,
                  fontStyle: isSet ? "normal" : "italic",
                  lineHeight: 1.35,
                  overflowWrap: "anywhere",
                }}
              >
                {isSet ? value : "Not set"}
              </dd>
              {hint && (
                <p
                  style={{
                    margin: "1px 0 0",
                    color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                    fontSize: 12.5,
                    lineHeight: 1.4,
                  }}
                >
                  {hint}
                </p>
              )}
            </div>
          );
        })}
      </dl>
    );
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

  // 64B-2B added an opt-in `variant`. It is OPT-IN on purpose: every NON-TOHI
  // caller omits it and keeps byte-identical default rendering, so the Plan
  // locked card is untouched. Only the TOHI tab opts into variant: "tohi",
  // which restyles this card to the approved locked blueprint.
  // lockedCardStyle itself is not modified, so nothing global changes.
  //
  // The actions stay here in App either way. setActiveScreen and
  // setDevPreviewFullApp are never handed to a presentation component, so the
  // Dev Preview gate keeps its single home.
  function renderLockedFeatureCard({
    title,
    body,
    actionLabel = "Finish trip setup",
    night = false,
    variant = "default",
  }) {
    const tohi = variant === "tohi";

    return (
      <section
        style={{
          ...lockedCardStyle,
          ...(tohi
            ? {
                background: "#FFFFFF",
                border: "1px solid rgba(234, 220, 200, 0.55)",
                borderRadius: 24,
                padding: 18,
                boxShadow: "0 10px 30px rgba(28, 25, 23, 0.055)",
                marginBottom: 0,
              }
            : {}),
          ...(night
            ? {
                background: "#131C36",
                border: "1px solid rgba(139, 92, 246, 0.34)",
                boxShadow: "0 12px 30px rgba(2, 6, 23, 0.45)",
              }
            : {}),
        }}
      >
        <div
          style={{
            fontSize: tohi ? 11 : 12,
            fontWeight: tohi ? 800 : 900,
            letterSpacing: tohi ? 1.1 : undefined,
            color: night ? "#C4B5FD" : tohi ? colors.purpleDeep : colors.purple,
          }}
        >
          PERSONALIZED FEATURE
        </div>
        <h3
          style={{
            margin: tohi ? "8px 0 6px" : "6px 0 6px",
            color: night ? "#F5F3FF" : tohi ? colors.text : undefined,
            fontSize: tohi ? 17 : undefined,
            lineHeight: tohi ? 1.25 : undefined,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            color: night ? "#B6C2E2" : colors.muted,
            fontSize: tohi ? 13.5 : 14,
            lineHeight: tohi ? 1.5 : 1.45,
          }}
        >
          {body}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: tohi ? 14 : 12 }}>
          <button
            type="button"
            onClick={() => setActiveScreen("family_profile")}
            style={{
              ...button,
              background: colors.purpleDeep,
              color: "white",
              ...(tohi
                ? {
                    minHeight: 48,
                    borderRadius: 16,
                    padding: "0 18px",
                    fontSize: 14,
                    borderColor: "rgba(124, 58, 237, 0.20)",
                  }
                : {}),
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
                ...(tohi
                  ? { minHeight: 48, borderRadius: 16, padding: "0 18px", fontSize: 14 }
                  : {}),
              }}
            >
              Dev Preview
            </button>
          )}
        </div>
      </section>
    );
  }

  function renderRideActions(ride, options = {}) {
    if (!ride?.id) return null;

    const isActiveRide = activeRideId === String(ride.id);
    // Night styling is opt-in per surface (Plan passes it); Waits and other
    // day-styled surfaces keep the existing look and identical handlers.
    const night = options.night === true;
    // Compact styling is opt-in for Plan recommendation cards (61C-1). Callers
    // that do not pass it keep the existing padding, type, wrap, and labels.
    const compact = options.compact === true;
    // 63B-2: the approved Waits layout is a 2x2 grid with 48px actions and the
    // full "Report Issue" label. Opt-in per surface, exactly like compact — the
    // default presentation and Plan's compact presentation are untouched.
    const waits = options.variant === "waits";
    const themedActionButton = night
      ? {
          ...actionButton,
          background: "rgba(15, 23, 42, 0.72)",
          border: "1px solid rgba(99, 102, 241, 0.30)",
          color: "#E2E8F0",
        }
      : actionButton;
    const sizedActionButton = compact
      ? {
          ...themedActionButton,
          padding: "6px 9px",
          fontSize: 11,
          whiteSpace: "nowrap",
          minWidth: 0,
          minHeight: 36,
        }
      : waits
      ? {
          ...themedActionButton,
          minHeight: 48,
          borderRadius: 16,
          padding: "0 12px",
          fontSize: 14,
          fontWeight: 850,
          whiteSpace: "nowrap",
          minWidth: 0,
          // 63C-1: the approved Waits night action sits on the blueprint's
          // raised navy, a step lighter than the #131C36 card beneath it so the
          // 2x2 grid still reads as four controls in the dark. Scoped to the
          // Waits variant, so the default and Plan-compact night surfaces above
          // are untouched.
          ...(night
            ? {
                background: "#1A2444",
                border: "1px solid rgba(129, 140, 248, 0.28)",
              }
            : null),
        }
      : themedActionButton;

    return (
      <div
        style={
          waits
            ? {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
                marginTop: 16,
              }
            : {
                display: "flex",
                gap: compact ? 6 : 8,
                justifyContent: "flex-end",
                marginTop: compact ? 8 : 10,
                flexWrap: compact ? "nowrap" : "wrap",
              }
        }
      >
        <button
          onClick={() => handleInLine(ride)}
          disabled={isActiveRide}
          style={{
            ...sizedActionButton,
            // In Line Now is the disabled state of this same action. Night
            // lifts the slate so "disabled" still reads as deliberate rather
            // than as unreadable text on the raised navy.
            color: isActiveRide
              ? night
                ? "#A8B4CC"
                : "#94a3b8"
              : night
              ? "#C4B5FD"
              : "#6d28d9",
            borderColor: isActiveRide
              ? night
                ? "rgba(148, 163, 184, 0.30)"
                : "#e2e8f0"
              : night
              ? "rgba(196, 181, 253, 0.36)"
              : "#ddd6fe",
            cursor: isActiveRide ? "not-allowed" : "pointer",
          }}
        >
          {isActiveRide ? "In Line Now" : "In Line"}
        </button>

        <button
          onClick={() => handleDone(ride.id)}
          style={{ ...sizedActionButton, color: night ? "#6EE7B7" : colors.success }}
        >
          ✓ Done
        </button>

        <button
          onClick={() => handleSkip(ride.id)}
          style={{ ...sizedActionButton, color: night ? "#B6C2E2" : colors.muted }}
        >
          Skip
        </button>

        <button
          onClick={() => handleReportRideIssue(ride)}
          style={{
            ...sizedActionButton,
            color: night ? "#FCD34D" : "#92400E",
            borderColor: night ? "rgba(252, 211, 77, 0.30)" : colors.amberSoft,
          }}
        >
          {compact ? "Report" : "Report Issue"}
        </button>
      </div>
    );
  }

  // 63B-2: does this attraction have a real published schedule? Resolved the
  // same way renderShowtimeInfo resolves it, so a card can never show the
  // Showtimes treatment for an attraction that renders no showtimes.
  function hasShowtimeSchedule(ride) {
    const meta = getRideMetaForDisplay(activePark, ride);
    const showProfile = ride?.showProfile || meta?.showProfile;
    return Boolean(showProfile?.showtimes?.length);
  }

  function renderShowtimeInfo(ride, options = {}) {
    const meta = getRideMetaForDisplay(activePark, ride);
    const showProfile = ride?.showProfile || meta?.showProfile;

    if (!showProfile?.showtimes?.length) return null;

    const night = options.night === true;
    // 63B-2: the approved Waits showtime panel. Same real showProfile data and
    // the same verifyDailySchedule caution — only the presentation differs.
    // Every other caller keeps the existing panel below.
    const waits = options.variant === "waits";

    if (waits) {
      // 63C-1 night tokens, measured off the approved blueprints: the sky panel
      // becomes a deep sky-navy, the pills a recessed navy, and the sky accent
      // moves onto the text. Still recognisably the "scheduled show" surface,
      // and still without Best target or Arrival buffer — those stay on the
      // default renderer Plan uses.
      return (
        <div
          style={{
            marginTop: 14,
            padding: "15px 16px",
            borderRadius: 20,
            border: night
              ? "1px solid rgba(56, 189, 248, 0.30)"
              : "1px solid rgba(56, 189, 248, 0.28)",
            background: night ? "#192D4B" : "#E0F2FE",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: night ? "#7DD3FC" : "#0369A1",
            }}
          >
            Typical showtimes
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              marginTop: 11,
            }}
          >
            {showProfile.showtimes.map((time) => (
              <span
                key={time}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: night ? "#132139" : "rgba(255, 255, 255, 0.85)",
                  border: night
                    ? "1px solid rgba(56, 189, 248, 0.26)"
                    : "1px solid rgba(56, 189, 248, 0.24)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: night ? "#CBD5F0" : colors.muted,
                }}
              >
                {time}
              </span>
            ))}
          </div>

          {/* The approved Waits panel carries the times pills and the
              verification warning only. The two extra guidance lines are not in
              the blueprint; they remain on the default renderer Plan uses. */}
          {showProfile.verifyDailySchedule && (
            <p
              style={{
                margin: "10px 0 0",
                color: night ? "#CBD5F0" : colors.muted,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Verify in My Disney Experience. Showtimes can change by day.
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 14,
          border: night ? "1px solid rgba(139, 92, 246, 0.30)" : "1px solid #e9d5ff",
          background: night ? "rgba(15, 23, 42, 0.72)" : "rgba(250,245,255,.75)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: night ? "#C4B5FD" : colors.purple,
            fontWeight: 900,
          }}
        >
          SHOWTIMES
        </div>

        <p
          style={{
            margin: "5px 0 0",
            color: night ? "#F5F3FF" : colors.text,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {showProfile.showtimes.join(" · ")}
        </p>

        {showProfile.recommendedShowtimes?.length > 0 && (
          <p style={{ margin: "6px 0 0", color: night ? "#B6C2E2" : colors.muted, fontSize: 12 }}>
            Best target: {showProfile.recommendedShowtimes.join(" or ")}
          </p>
        )}

        {(showProfile.arrivalBufferMinutes || showProfile.middayArrivalBufferMinutes) && (
          <p style={{ margin: "6px 0 0", color: night ? "#B6C2E2" : colors.muted, fontSize: 12 }}>
            Arrival buffer:{" "}
            {showProfile.middayArrivalBufferMinutes
              ? `${showProfile.arrivalBufferMinutes || 15}–${showProfile.middayArrivalBufferMinutes} min depending on heat/crowds`
              : `${showProfile.arrivalBufferMinutes} min`}
          </p>
        )}

        {showProfile.verifyDailySchedule && (
          <p style={{ margin: "6px 0 0", color: night ? "#FCD34D" : "#92400E", fontSize: 12 }}>
            Verify in My Disney Experience. Showtimes can change by day.
          </p>
        )}
      </div>
    );
  }


  // 64C-A2: the ONE adjustment voice input needs from the chat authority.
  //
  // `explicitText` lets a caller that already holds the question — today only
  // the voice transcript — submit it directly. The form path is unchanged: it
  // passes no second argument, so `message` is still the source, still trimmed
  // the same way, still discarded when blank.
  //
  // This is why voice does NOT do setMessage(transcript) then dispatch a
  // synthetic submit: React would batch the state write, and the submit could
  // read the previous value or an empty one. Passing the string removes the
  // timing question entirely.
  //
  // Everything below this point is untouched, so a spoken question and a typed
  // question share one latch, one analytics call, one user-message insertion,
  // one QUICK CHECK interception, one session payload, one history filter, one
  // reply validation and one failure path. There is no second role:"user"
  // insertion site anywhere in the app.
  async function handleChatSubmit(e, explicitText) {
    e?.preventDefault?.();

    const source = typeof explicitText === "string" ? explicitText : message;
    const trimmed = source.trim();
    if (!trimmed) return;

    // Latch acquired BEFORE the user message, the tracking event and the
    // request, so a rapid second submit produces none of them. Everything after
    // this point runs inside a try/finally that always releases, including the
    // clarification early-return and any throw while preparing context — the
    // composer can never be left permanently locked.
    if (chatInFlightRef.current) return;
    chatInFlightRef.current = true;

    try {
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

      // One finalization path for BOTH failure kinds — a rejected request and a
      // resolved one whose reply is unusable. Keeping the two actions together
      // here is what stops the marked entry and the restored question drifting
      // apart between branches.
      //
      // The restore is a FUNCTIONAL update on purpose. The composer stays usable
      // while the request runs, so by the time this fires the user may already
      // be typing something new. A plain setMessage(trimmed) would evaluate the
      // value captured at submission and clobber that newer draft; the updater
      // reads the latest value and only fills the field when it is still blank
      // or whitespace.
      const finalizeChatFailure = () => {
        setChat([...nextChat, buildChatConnectionFailureEntry()]);
        setMessage((current) =>
          typeof current === "string" && current.trim() ? current : trimmed
        );
      };

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
          // Connection-status entries are app notices, not things TOHI said, so
          // they are filtered out before the history is sent. Replaying one would
          // teach the model it had answered when it had not.
          conversationHistory: nextChat
            .filter((msg) => msg.isConnectionFailure !== true)
            .slice(-6),
          liveStateClarificationPending: isAwaitingLiveStateAnswer(chat),
          completedRideIds,
          activityLog,
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

        // A resolved request is not automatically a usable answer. A missing,
        // non-string, whitespace-only or cleaned-to-empty reply converges on the
        // same marked entry the rejection path uses.
        const replyText = resolveAssistantReplyText(res, trimmed);

        if (replyText) {
          setChat([...nextChat, { role: "assistant", content: replyText }]);
        } else {
          finalizeChatFailure();
        }
      } catch {
        finalizeChatFailure();
      } finally {
        setChatLoading(false);
      }
    } finally {
      chatInFlightRef.current = false;
    }
  }

  const landOptions = LAND_OPTIONS[activePark] || [];
  const hiddenRideCount =
    completedRideIds.length +
    skippedRideIds.length +
    reportedRideIssueIds.length +
    (currentActivity ? 1 : 0);

  const tohiPickDebugPreview = useMemo(() => {
    const input = {
      recommendations,
      familyProfile,
      profile: familyProfile,
      activePark,
      currentArea: currentLand,
      locationRequired: Boolean(activePark),
      locationConfidence: detectedLocationContext?.confidence || null,
      location: detectedLocationContext || null,
      waits: parkData?.rides || [],
      waitDataFresh:
        tripPlanFreshness?.isFresh !== false &&
        tripPlanFreshness?.status !== "stale",
      weather,
      weatherState: weather,
      weatherContext: weather,
      weatherUsable: Boolean(weather),
      activityLog,
      completedRideIds,
      mustDos: tripPlanState?.mustDoExperiences || [],
      // Browsing a park without confirming presence there is a live-context
      // ambiguity: TOHI Pick must stay anchored to the confirmed active park.
      blockingAmbiguity: browsingAnotherPark,
    };

    const eligibility = evaluateTohiPickEligibility(input);
    const candidateResult = buildTohiPickCandidates(input);
    const decision = evaluateTohiPickFinalDecision({
      eligibility,
      candidates: candidateResult.candidates,
      weatherMode,
    });

    const reasonNoPick = decision.showPick
      ? null
      : decision.reasonCodes.join(", ") || "no pick";

    return {
      eligibility,
      candidates: candidateResult.candidates,
      excludedCandidates: candidateResult.excludedCandidates,
      topCandidate: candidateResult.topCandidate,
      sourceCount: candidateResult.sourceCount,
      usableCount: candidateResult.usableCount,
      finalDecision: decision.status,
      decision,
      reasonNoPick,
    };
  }, [
    recommendations,
    familyProfile,
    activePark,
    currentLand,
    detectedLocationContext,
    parkData?.rides,
    tripPlanFreshness,
    weather,
    weatherMode,
    activityLog,
    completedRideIds,
    tripPlanState,
    browsingAnotherPark,
  ]);

  const tohiPickReviewSignature = useMemo(() => {
    if (activeTab !== "plan") return null;
    if (!tohiPickDebugPreview.decision.showPick || !tohiPickDebugPreview.decision.candidate) {
      return null;
    }

    return buildTohiPickReviewSignature({
      candidate: tohiPickDebugPreview.decision.candidate,
      candidates: tohiPickDebugPreview.candidates,
      activePark,
      currentLand,
      weatherMode,
      dayPhase: timeContext?.dayPhase || null,
      waitAgeMinutes: Number.isFinite(Number(parkData?.ageMs))
        ? Number(parkData.ageMs) / 60000
        : null,
      currentActivity,
      familyContext: familyProfileSummary,
    });
  }, [
    activeTab,
    tohiPickDebugPreview,
    activePark,
    currentLand,
    weatherMode,
    timeContext,
    parkData,
    currentActivity,
    familyProfileSummary,
  ]);

  const [tohiPickAiReview, setTohiPickAiReview] = useState({
    status: "idle",
    signature: null,
    validation: null,
    unavailableReason: null,
  });
  const tohiPickReviewInFlightRef = useRef(new Set());
  const tohiPickReviewCacheRef = useRef(new Map());
  const tohiPickReviewContextRef = useRef(null);

  tohiPickReviewContextRef.current = {
    decision: tohiPickDebugPreview.decision,
    candidates: tohiPickDebugPreview.candidates,
    activePark,
    currentLand,
    weatherMode,
    dayPhase: timeContext?.dayPhase || null,
    waitAgeMinutes: Number.isFinite(Number(parkData?.ageMs))
      ? Number(parkData.ageMs) / 60000
      : null,
    currentActivity,
    familyContext: familyProfileSummary,
  };

  useEffect(() => {
    const signature = tohiPickReviewSignature;
    const context = tohiPickReviewContextRef.current;

    const wantsReview = shouldRequestTohiPickReview({
      isPlanTabActive: activeTab === "plan",
      decision: context?.decision,
      signature,
      requestedSignatures: tohiPickReviewInFlightRef.current,
      cache: tohiPickReviewCacheRef.current,
    });

    if (!wantsReview) return undefined;

    // Debounce so rapid wait/location churn settles before the AI is asked.
    // Clearing the timer also abandons a request whose signature became
    // obsolete before it ever fired.
    const timer = setTimeout(() => {
      const fireContext = tohiPickReviewContextRef.current;
      const candidate = fireContext?.decision?.candidate;

      if (!candidate) return;
      if (tohiPickReviewInFlightRef.current.has(signature)) return;
      if (tohiPickReviewCacheRef.current.has(signature)) return;

      tohiPickReviewInFlightRef.current.add(signature);
      setTohiPickAiReview({
        status: "pending",
        signature,
        validation: null,
        unavailableReason: null,
      });

      const reviewRequest = sanitizeTohiPickReviewRequest({
        candidate,
        candidates: fireContext.candidates,
        activePark: fireContext.activePark,
        currentLand: fireContext.currentLand,
        weatherMode: fireContext.weatherMode,
        dayPhase: fireContext.dayPhase,
        waitAgeMinutes: fireContext.waitAgeMinutes,
        currentActivity: fireContext.currentActivity,
        familyContext: fireContext.familyContext,
      });

      // Every terminal outcome is cached under the signature it was requested
      // for, so returning to that exact situation reuses the verdict instead
      // of asking again. The setState guard keeps a response for a superseded
      // signature from overwriting the visible state of the current one.
      const settleReview = (terminalResult) => {
        storeTohiPickReviewResult(tohiPickReviewCacheRef.current, signature, terminalResult);
        tohiPickReviewInFlightRef.current.delete(signature);
        setTohiPickAiReview((current) =>
          current.signature !== signature ? current : terminalResult
        );
      };

      sendTohiPickReview(reviewRequest)
        .then((result) => {
          if (!result || result.unavailable || !result.reviewText) {
            settleReview({
              status: "unavailable",
              signature,
              validation: null,
              unavailableReason: result?.reason || "unavailable",
            });
            return;
          }

          settleReview({
            status: "complete",
            signature,
            validation: validateTohiPickReviewResponse(result.reviewText, candidate.rideId),
            unavailableReason: null,
          });
        })
        .catch(() => {
          settleReview({
            status: "unavailable",
            signature,
            validation: null,
            unavailableReason: "request_failed",
          });
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [tohiPickReviewSignature, activeTab]);

  const tohiPickSelectedReview = useMemo(() => {
    return selectTohiPickReviewForSignature({
      signature: tohiPickReviewSignature,
      cache: tohiPickReviewCacheRef.current,
      liveReview: tohiPickAiReview,
    });
  }, [tohiPickReviewSignature, tohiPickAiReview]);

  const tohiPickAgreement = useMemo(() => {
    return resolveTohiPickAgreementDecision({
      decision: tohiPickDebugPreview.decision,
      review: tohiPickSelectedReview,
    });
  }, [tohiPickDebugPreview.decision, tohiPickSelectedReview]);

  const tohiPickMvpCandidate = tohiPickAgreement.showPick ? tohiPickAgreement.candidate : null;

  // 60E — bounded clarification. Session-only cache, no timers, no network.
  const tohiPickClarificationCacheRef = useRef(new Map());
  const [tohiPickClarificationVersion, setTohiPickClarificationVersion] = useState(0);

  const tohiPickClarificationEvaluation = useMemo(() => {
    return evaluateTohiPickClarification({
      decision: tohiPickDebugPreview.decision,
      candidates: tohiPickDebugPreview.candidates,
      isPlanTabActive: activeTab === "plan",
      browsingAnotherPark,
      presencePromptActive: Boolean(parkPresencePrompt),
      confirmedActivePark: parkPresence?.confirmedActivePark || activePark,
      currentLand,
      currentActivity,
      dateString: parkPresence?.dateString || "",
    });
  }, [
    tohiPickDebugPreview,
    activeTab,
    browsingAnotherPark,
    parkPresencePrompt,
    parkPresence,
    activePark,
    currentLand,
    currentActivity,
  ]);

  const tohiPickClarification = useMemo(() => {
    return selectTohiPickClarificationForSignature({
      evaluation: tohiPickClarificationEvaluation,
      cache: tohiPickClarificationCacheRef.current,
    });
    // tohiPickClarificationVersion re-selects after an answer/dismissal write.
  }, [tohiPickClarificationEvaluation, tohiPickClarificationVersion]);

  const clarifiedTohiPickCandidate =
    !tohiPickMvpCandidate &&
    (tohiPickClarification.status === TOHI_PICK_CLARIFICATION_STATUSES.NEARBY_CONFIRMED ||
      tohiPickClarification.status === TOHI_PICK_CLARIFICATION_STATUSES.MUST_DO_CONFIRMED)
      ? tohiPickClarification.candidate
      : null;

  const tohiPickDisplayCandidate = tohiPickMvpCandidate || clarifiedTohiPickCandidate;
  const tohiPickDisplaySource = tohiPickMvpCandidate
    ? "deterministic"
    : clarifiedTohiPickCandidate
    ? "clarification"
    : "none";
  const showTohiPickClarificationQuestion =
    !tohiPickMvpCandidate &&
    tohiPickClarification.status === TOHI_PICK_CLARIFICATION_STATUSES.AVAILABLE;

  function handleAnswerTohiPickClarification(answer) {
    const evaluation = tohiPickClarificationEvaluation;
    const resolved = resolveTohiPickClarificationAnswer(evaluation, answer);

    if (!resolved || !evaluation.signature) return;

    trackAppEvent("tohi_pick_clarification_answered", {
      source: "plan_clarification_card",
      activePark,
      metadata: {
        answer,
        status: resolved.status,
        candidateId: resolved.candidate?.rideId || "",
      },
    });

    storeTohiPickClarificationResult(
      tohiPickClarificationCacheRef.current,
      evaluation.signature,
      resolved
    );
    setTohiPickClarificationVersion((current) => current + 1);
  }

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
  const parkOpenStatus = recommendations.parkOpenStatus || {};
  const isPreOpenRecommendationPause = Boolean(parkOpenStatus.shouldBlockGoNow);
  const preOpenTimeLabel =
    parkOpenStatus.openTime instanceof Date && Number.isFinite(parkOpenStatus.openTime.getTime())
      ? parkOpenStatus.openTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

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

    const dbSectionTitleStyle = {
      marginTop: 12,
      marginBottom: 8,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      color: colors.purpleDeep,
    };

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
            {dbRow("weather.provider", weather?.provider)}
            {dbRow("weather.providerLabel", weather?.providerLabel)}
            {dbRow("weather.source", weather?.source)}
            {dbRow("weather.ageMs", weather?.ageMs)}
            {dbRow("weather.fetchedAt", weather?.fetchedAt)}
            {dbRow("weather.forecastSource", weather?.forecastSource)}
            {dbRow("weather.forecastHoursChecked", weather?.forecastHoursChecked)}
            {dbRow("weather.upcomingPrecipitation", weather?.upcomingPrecipitation)}
            {dbRow("weather.nextPrecipitationWindow.time", weather?.nextPrecipitationWindow?.time)}
            {dbRow("weather.nextPrecipitationWindow.summary", weather?.nextPrecipitationWindow?.summary)}
            {dbRow("weather.nextPrecipitationWindow.rainRisk", weather?.nextPrecipitationWindow?.rainRisk)}
            {dbRow(
              "weather.nextPrecipitationWindow.precipitationProbability",
              weather?.nextPrecipitationWindow?.precipitationProbability
            )}
            {dbRow(
              "weather.nextPrecipitationWindow.precipitationIntensityInPerHr",
              weather?.nextPrecipitationWindow?.precipitationIntensityInPerHr
            )}
            {dbRow("weather.precipitationProbability", weather?.precipitationProbability)}
            {dbRow("weather.precipitationIntensityInPerHr", weather?.precipitationIntensityInPerHr)}
            {dbRow("weather.weatherCode", weather?.weatherCode)}
            {dbRow("weather.weatherTarget.parkId", weather?.weatherTarget?.parkId)}
            {dbRow("weather.weatherTarget.label", weather?.weatherTarget?.label)}
            {dbRow("weather.weatherTarget.lat", weather?.weatherTarget?.lat)}
            {dbRow("weather.weatherTarget.lon", weather?.weatherTarget?.lon)}
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
            {dbRow("activityLog", activityLog.length)}
            {activityLog.length > 0 && (
              <div style={{ paddingLeft: 8 }}>
                {activityLog.map((entry, i) => (
                  <div key={i} style={dbValStyle}>· {entry.rideName || entry.rideId}</div>
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
            <div style={{ marginTop: 12 }}>
              <div style={dbSectionTitleStyle}>TOHI Pick debug preview</div>
              {dbRow("eligible", tohiPickDebugPreview.eligibility.eligible ? "yes" : "no")}
              {dbRow("mode", tohiPickDebugPreview.eligibility.mode)}
              {dbRow(
                "reasons",
                tohiPickDebugPreview.eligibility.reasons.length
                  ? tohiPickDebugPreview.eligibility.reasons.join(", ")
                  : "none"
              )}
              {dbRow(
                "missing",
                tohiPickDebugPreview.eligibility.missing.length
                  ? tohiPickDebugPreview.eligibility.missing.join(", ")
                  : "none"
              )}
              {dbRow(
                "warnings",
                tohiPickDebugPreview.eligibility.warnings.length
                  ? tohiPickDebugPreview.eligibility.warnings.join(", ")
                  : "none"
              )}
              {dbRow("finalDecision", tohiPickDebugPreview.finalDecision)}
              {dbRow(
                "supportingSignals",
                tohiPickDebugPreview.decision.supportingSignals.length
                  ? tohiPickDebugPreview.decision.supportingSignals.join(", ")
                  : "none"
              )}
              {dbRow(
                "blockingSignals",
                tohiPickDebugPreview.decision.blockingSignals.length
                  ? tohiPickDebugPreview.decision.blockingSignals.join(", ")
                  : "none"
              )}
              {tohiPickDebugPreview.reasonNoPick &&
                dbRow("reasonNoPick", tohiPickDebugPreview.reasonNoPick)}
              {dbRow("aiReviewStatus", tohiPickAgreement.status)}
              {dbRow("aiReviewVerdict", tohiPickAgreement.verdict || "none")}
              {dbRow("aiReviewReasonCode", tohiPickAgreement.reasonCode || "none")}
              {dbRow("aiReviewReason", tohiPickAgreement.reason || "none")}
              {dbRow(
                "aiReviewInvalidReason",
                tohiPickAgreement.invalidReason ||
                  tohiPickSelectedReview.unavailableReason ||
                  "none"
              )}
              {dbRow(
                "aiReviewSignature",
                tohiPickReviewSignature
                  ? `${tohiPickReviewSignature.slice(0, 140)}${
                      tohiPickReviewSignature.length > 140 ? "…" : ""
                    }`
                  : "none"
              )}
              {dbRow(
                "aiDeterministicFallback",
                tohiPickAgreement.usedDeterministicFallback ? "yes" : "no"
              )}
              {dbRow("presenceConfirmedPark", parkPresence?.confirmedActivePark || "unset")}
              {dbRow("presenceBrowsedPark", browsedParkId)}
              {dbRow(
                "presencePlannedParks",
                (parkPresence?.plannedParkIds || []).join(", ") || "none"
              )}
              {dbRow("presenceBrowsingOtherPark", browsingAnotherPark ? "yes" : "no")}
              {dbRow(
                "presencePrompt",
                parkPresencePrompt
                  ? `${parkPresencePrompt.type}:${parkPresencePrompt.parkId}`
                  : "none"
              )}
              {dbRow(
                "presenceDismissed",
                (parkPresence?.dismissedPrompts || []).join(", ") || "none"
              )}
              {dbRow(
                "arrivalGpsAccuracy",
                parkArrivalTracker.lastSample?.accuracyMeters != null
                  ? `${parkArrivalTracker.lastSample.accuracyMeters} m`
                  : "none"
              )}
              {dbRow(
                "arrivalClassification",
                parkArrivalTracker.lastSample
                  ? parkArrivalTracker.lastSample.parkId || "no_park"
                  : "none"
              )}
              {dbRow(
                "arrivalCandidatePark",
                parkArrivalTracker.candidateParkId || "none"
              )}
              {dbRow("arrivalQualifyingCount", parkArrivalTracker.qualifyingCount)}
              {dbRow(
                "arrivalStable",
                hasStableParkArrivalEvidence(parkArrivalTracker) ? "yes" : "no"
              )}
              {dbRow(
                "arrivalSuppressedPark",
                parkArrivalTracker.suppressedParkId || "none"
              )}
              {dbRow(
                "arrivalLastRejection",
                parkArrivalTracker.lastSample?.rejectionReason || "none"
              )}
              {dbRow("clarificationStatus", tohiPickClarification.status)}
              {dbRow(
                "clarificationReason",
                tohiPickClarificationEvaluation.reasonUnavailable || "none"
              )}
              {dbRow(
                "clarificationNearby",
                tohiPickClarificationEvaluation.nearbyCandidate?.name || "none"
              )}
              {dbRow(
                "clarificationMustDo",
                tohiPickClarificationEvaluation.mustDoCandidate?.name || "none"
              )}
              {dbRow("tohiPickDisplaySource", tohiPickDisplaySource)}
              {dbRow(
                "clarificationSignature",
                tohiPickClarificationEvaluation.signature
                  ? `${tohiPickClarificationEvaluation.signature.slice(0, 120)}…`
                  : "none"
              )}
              {dbRow("sourceCount", tohiPickDebugPreview.sourceCount)}
              {dbRow("usableCount", tohiPickDebugPreview.usableCount)}
              {tohiPickDebugPreview.topCandidate &&
                dbRow(
                  "topCandidate",
                  `${tohiPickDebugPreview.topCandidate.name} (${tohiPickDebugPreview.topCandidate.sourceLabel})`
                )}
              <div style={{ marginTop: 8 }}>
                <span style={dbLabelStyle}>candidates</span>
                {tohiPickDebugPreview.candidates.length ? (
                  tohiPickDebugPreview.candidates.map((candidate, index) => (
                    <div key={`${candidate.rideId || candidate.name}-${candidate.sourceSlot}-${index}`} style={dbValStyle}>
                      · {candidate.sourceLabel}: {candidate.name}
                      {candidate.wait != null ? ` (${candidate.wait}m)` : " (wait n/a)"}
                      {candidate.area ? ` · ${candidate.area}` : ""}
                      {candidate.tags?.length ? ` · ${candidate.tags.join(", ")}` : ""}
                    </div>
                  ))
                ) : (
                  <div style={dbValStyle}>none</div>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={dbLabelStyle}>excluded</span>
                {tohiPickDebugPreview.excludedCandidates.length ? (
                  tohiPickDebugPreview.excludedCandidates.map((candidate, index) => (
                    <div key={`excluded-${candidate.rideId || candidate.name}-${candidate.sourceSlot}-${index}`} style={dbValStyle}>
                      · {candidate.sourceLabel}: {candidate.name}
                      {candidate.exclusionReasons?.length
                        ? ` — ${candidate.exclusionReasons.join(", ")}`
                        : ""}
                    </div>
                  ))
                ) : (
                  <div style={dbValStyle}>none</div>
                )}
              </div>
            </div>

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
        night={planNight}
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
        tripPlan={tripPlanState}
        mustDoExperienceOptions={mustDoExperienceOptions}
        onUpdateTripPreferences={handleTripPreferenceChange}
        onToggleMustDoExperience={handleTripMustDoToggle}
      />
    );
  }

  return (
    <>
      <main style={pageStyle}>
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
            <HomeTab
              activePark={activePark}
              browsedParkId={browsedParkId}
              closeTimeLabel={closeTimeLabel}
              currentActivity={currentActivity}
              currentActivityContext={currentActivityContext}
              error={error}
              homeGreeting={homeGreeting}
              liveParkContext={liveParkContext}
              loading={loading}
              parkData={parkData}
              parkHopperContext={parkHopperContext}
              parkPresence={parkPresence}
              parkPresencePrompt={parkPresencePrompt}
              showRainCheckPrompt={showRainCheckPrompt}
              rainCheckWatchKind={rainConfirmationEpisode?.watchKind || "rain"}
              guestConfirmedRain={Boolean(activeRainConfirmation)}
              handleConfirmRainCheck={handleConfirmRainCheck}
              handleRainCheckNotYet={handleRainCheckNotYet}
              handleDismissRainCheck={handleDismissRainCheck}
              // 62B-2F-2 activation. The same flag the page background and
              // BottomTabs read, so Home and its shell switch in one render.
              night={shellNight}
              planningPark={planningPark}
              planningParkLabel={planningParkLabel}
              planningParkSource={planningParkSource}
              scheduledParkForToday={scheduledParkForToday}
              todayPlannedParkLabel={todayPlannedParkLabel}
              weather={weather}
              weatherMode={weatherMode}
              whileYouWaitContent={whileYouWaitContent}
              activeMiniGame={activeMiniGame}
              activeMiniGameType={activeMiniGameType}
              lookAroundFound={lookAroundFound}
              revealedTriviaAnswer={revealedTriviaAnswer}
              selectedFamilyVoteOption={selectedFamilyVoteOption}
              selectedTriviaChoice={selectedTriviaChoice}
              getParkNameById={getParkNameById}
              handleCancelCurrentActivity={handleCancelCurrentActivity}
              handleConfirmParkPresence={handleConfirmParkPresence}
              handleDismissParkPresencePrompt={handleDismissParkPresencePrompt}
              handleDone={handleDone}
              handleSelectPark={handleSelectPark}
              loadData={loadData}
              setActivePark={setActivePark}
              setParkPresence={setParkPresence}
              trackAppEvent={trackAppEvent}
              handleFamilyVote={handleFamilyVote}
              handleLookAroundFound={handleLookAroundFound}
              handleMiniGameTypeChange={handleMiniGameTypeChange}
              handleNextMiniGame={handleNextMiniGame}
              handleTriviaChoice={handleTriviaChoice}
              showTriviaAnswer={showTriviaAnswer}
              actionButton={actionButton}
              button={button}
              card={card}
            />
          )}

          {activeTab === "waits" && (
            <WaitsTab
              activeRideId={activeRideId}
              browsedParkLabel={browsedParkLabel}
              browsingAnotherPark={browsingAnotherPark}
              confirmedActiveParkLabel={confirmedActiveParkLabel}
              loading={waitsLoading}
              waitsError={waitsError}
              sortedRides={sortedRides}
              waitListParkId={waitListParkId}
              parkPresencePrompt={parkPresencePrompt}
              handleConfirmParkPresence={handleConfirmParkPresence}
              handleDismissParkPresencePrompt={handleDismissParkPresencePrompt}
              loadData={handleWaitsRefresh}
              formatLandLabel={formatLandLabel}
              getParkNameById={getParkNameById}
              hasShowtimeSchedule={hasShowtimeSchedule}
              waitListParkData={waitListParkData}
              // 63C-2 activation: Waits now reads the same shell decision as
              // Home, Plan, the page background and BottomTabs, so all four flip
              // together in one render. 63C-1's temporary literal false is gone.
              // No new night mechanism was added — this is the existing flag.
              night={shellNight}
              // WaitsTab owns the night value for this whole surface and passes
              // it back in, so the header and the cards can never disagree.
              renderRideActions={(ride, options) =>
                renderRideActions(ride, { ...options, variant: "waits" })
              }
              renderShowtimeInfo={(ride, options) =>
                renderShowtimeInfo(ride, { ...options, variant: "waits" })
              }
              button={button}
            />
          )}

          {activeTab === "plan" && (
            <>

            {/* 61D Plan Tools — a secondary view subordinate to the Plan tab.
                It is not a router destination and not a sixth bottom-nav tab:
                activeTab stays "plan" the whole time. The main Plan feed below
                stays mounted and is only display-toggled, so nothing held in
                component state (card expansions, collapse states) is lost
                entering or leaving Plan Tools. */}
            <div style={{ display: planToolsOpen ? "contents" : "none" }}>
              <PlanToolsView
                night={planNight}
                card={card}
                button={button}
                onBack={() => setPlanToolsOpen(false)}
                timeContext={planningTimeContext}
                planTabState={planTabState}
                hasPersonalizedAccess={hasPersonalizedAccess}
                profileCompletion={profileCompletion}
                packingChecklist={packingChecklist}
                tripPlanFreshness={tripPlanFreshness}
                onRefreshTripPlanContext={handleRefreshTripPlanContext}
                planningParkLabel={planningParkLabel}
                scheduledParkForToday={scheduledParkForToday}
                todayPlannedParkLabel={todayPlannedParkLabel}
                scheduledSecondaryParkLabel={scheduledSecondaryParkLabel}
                parkDayScheduleStatus={parkDayScheduleStatus}
                parkHopperContext={parkHopperContext}
                liveParkContext={liveParkContext}
                setActiveScreen={setActiveScreen}
              >
        <section
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            background: planNight ? "#111A33" : "#FFFDF8",
            border: planNight
              ? "1px solid rgba(99, 102, 241, 0.26)"
              : "1px solid rgba(245, 158, 11, 0.20)",
            borderRadius: 20,
            boxShadow: planNight
              ? "0 10px 24px rgba(2, 6, 23, 0.40)"
              : "0 8px 20px rgba(28, 25, 23, 0.05)",
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
                background: planNight ? "rgba(15, 23, 42, 0.72)" : colors.amberSoft,
                border: planNight ? "1px solid rgba(252, 211, 77, 0.26)" : "none",
                color: planNight ? "#FCD34D" : "#92400E",
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
                color: planTokens.title,
                fontSize: 21,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              Day mode
            </h3>

            <p
              style={{
                margin: "9px 0 0",
                color: planTokens.title,
                fontSize: 14,
                fontWeight: 800,
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
                  background: planNight ? "rgba(15, 23, 42, 0.72)" : colors.purpleSoft,
                  border: planNight ? "1px solid rgba(139, 92, 246, 0.30)" : "none",
                  color: planNight ? "#C4B5FD" : colors.purpleDeep,
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
                  background: planNight
                    ? "rgba(15, 23, 42, 0.72)"
                    : hasPersonalizedAccess
                    ? colors.successSoft
                    : colors.coralSoft,
                  border: planNight ? "1px solid rgba(99, 102, 241, 0.30)" : "none",
                  color: planNight
                    ? hasPersonalizedAccess
                      ? "#6EE7B7"
                      : "#FDA4AF"
                    : hasPersonalizedAccess
                    ? colors.success
                    : "#E11D48",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Personalization: {hasPersonalizedAccess ? "active" : "setup needed"}
              </span>
            </div>
          </div>
        </section>
              </PlanToolsView>
            </div>

            <div style={{ display: planToolsOpen ? "none" : "contents" }}>

        <section
          style={{
            ...card,
            background: planNight ? "#131C36" : "#FFF9F1",
            border: `1px solid ${planTokens.border}`,
            borderRadius: 20,
            boxShadow: planTokens.shadow,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 180, flex: "1 1 240px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: planTokens.eyebrowPill,
                  color: planTokens.eyebrow,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.7,
                  marginBottom: 8,
                }}
              >
                PLAN
              </div>

              <strong
                style={{
                  display: "block",
                  color: planTokens.title,
                  fontSize: 17,
                  lineHeight: 1.25,
                }}
              >
                Your day, and what to do next
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setPlanToolsOpen(true)}
              aria-expanded={planToolsOpen}
              style={{
                ...button,
                background: planNight ? "rgba(15, 23, 42, 0.72)" : "#FFF9F1",
                color: planTokens.title,
                borderColor: planTokens.borderQuiet,
                flexShrink: 0,
              }}
            >
              Plan Tools
            </button>
          </div>

          <PlanCheckCompactRow
            night={planNight}
            planFreshness={tripPlanFreshness}
            onOpenPlanTools={() => setPlanToolsOpen(true)}
          />
        </section>

        {hasPersonalizedAccess ? (
          <PlanRecommendations
            planNight={planNight}
            planTokens={planTokens}
            parkPresenceTheme={parkPresenceTheme}
            card={card}
            button={button}
            actionButton={actionButton}
            planShowsSetupState={planShowsSetupState}
            activePark={activePark}
            currentLand={currentLand}
            landOptions={landOptions}
            detectedLocationContext={detectedLocationContext}
            locationAutoEnabled={locationAutoEnabled}
            locationLoading={locationLoading}
            locationError={locationError}
            locationMessage={locationMessage}
            lastAutoUpdateAt={lastAutoUpdateAt}
            lastLocationUpdateAt={lastLocationUpdateAt}
            setCurrentLand={setCurrentLand}
            setDetectedLocationContext={setDetectedLocationContext}
            setLocationAutoEnabled={setLocationAutoEnabled}
            setLocationMessage={setLocationMessage}
            handleUseMyLocation={handleUseMyLocation}
            formatAutoUpdateTime={formatAutoUpdateTime}
            weather={weather}
            weatherMode={weatherMode}
            familyProfileSummary={familyProfileSummary}
            setActiveScreen={setActiveScreen}
            browsingAnotherPark={browsingAnotherPark}
            browsedParkLabel={browsedParkLabel}
            confirmedActiveParkLabel={confirmedActiveParkLabel}
            recommendations={recommendations}
            primaryRecommendation={primaryRecommendation}
            primarySlot={primarySlot}
            hasAnyRecommendation={hasAnyRecommendation}
            isPreOpenRecommendationPause={isPreOpenRecommendationPause}
            preOpenTimeLabel={preOpenTimeLabel}
            hiddenRideCount={hiddenRideCount}
            reportedRideIssueIds={reportedRideIssueIds}
            handleResetRecs={handleResetRecs}
            tohiPickDisplayCandidate={tohiPickDisplayCandidate}
            tohiPickDisplaySource={tohiPickDisplaySource}
            tohiPickClarification={tohiPickClarification}
            showTohiPickClarificationQuestion={showTohiPickClarificationQuestion}
            handleAnswerTohiPickClarification={
              handleAnswerTohiPickClarification
            }
            renderRideActions={renderRideActions}
            renderShowtimeInfo={renderShowtimeInfo}
            trackAppEvent={trackAppEvent}
          />

        ) : (
          renderLockedFeatureCard({
            title: "Personalized Best Move is locked until setup is finished",
            body:
              "Without your family profile, TOHI cannot safely know height limits, thrill comfort, heat sensitivity, resort-break realism, or what kind of day you want.",
            night: planNight,
          })
        )}

        {weatherMode.mode !== "normal" && (
          <section
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              background: planNight ? "#111A33" : "#FFFDF8",
              border: planNight
                ? "1px solid rgba(99, 102, 241, 0.26)"
                : "1px solid rgba(245, 158, 11, 0.24)",
              borderRadius: 20,
              boxShadow: planNight
                ? "0 10px 24px rgba(2, 6, 23, 0.40)"
                : "0 8px 20px rgba(28, 25, 23, 0.05)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 9px",
                borderRadius: 999,
                background: planNight ? "rgba(15, 23, 42, 0.72)" : colors.amberSoft,
                border: planNight ? "1px solid rgba(252, 211, 77, 0.26)" : "none",
                color: planNight ? "#FCD34D" : "#92400E",
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
                color: planTokens.title,
                fontSize: 20,
                letterSpacing: -0.3,
              }}
            >
              {weatherMode.label}
            </h3>

            <p
              style={{
                color: planTokens.muted,
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
                      border: `1px solid ${planTokens.borderQuiet}`,
                      background: planNight ? "rgba(15, 23, 42, 0.72)" : "rgba(255,255,255,0.78)",
                      boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                    }}
                  >
                    <strong style={{ color: planTokens.title }}>{item.title}</strong>
                    <p style={{ margin: "6px 0 0", color: planTokens.muted }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

            <PlanTab
              night={planNight}
              card={card}
              timeContext={planningTimeContext}
              planTabState={planTabState}
              activityLog={activityLog}
              preferredName={familyProfileSummary?.preferredName}
              familyProfile={familyProfileSummary}
              weatherMode={weatherMode}
              dayGamePlan={dayGamePlan}
              tripPlan={tripPlanState}
              planningPark={planningPark}
              planningParkLabel={planningParkLabel}
            />
            </div>
            </>
          )}

          {activeTab === "tohi" && (
            <TohiTab
              chat={chat}
              message={message}
              chatLoading={chatLoading}
              hasPersonalizedAccess={hasPersonalizedAccess}
              setMessage={setMessage}
              onChatSubmit={handleChatSubmit}
              /* 64C-A2 voice input. Presentation props only: TohiTab renders the
                 microphone and reflects these states, and owns none of the
                 recording, permission, upload or submission logic. When
                 voiceSupported is false it renders no microphone at all and the
                 composer is exactly what it was. */
              voiceSupported={voiceSupported}
              voiceState={voiceState}
              voiceBusy={voiceBusy}
              voiceStatusMessage={voiceStatusMessage}
              onVoicePress={handleVoiceButtonPress}
              renderLockedFeatureCard={renderLockedFeatureCard}
              onComposerKeyboardChange={setTohiComposerKeyboardOpen}
              /* 64B-2E-2: activated. TOHI now reads the same single shell
                 decision Home, Waits and Plan read, so the tab content, the page
                 background and the navigation flip together in one render. */
              night={shellNight}
              card={card}
              button={button}
            />
          )}

          {activeTab === "profile" && (
            <>
              {/* Profile day/night presentation. Presentation only: every value
                  below is the same real familyProfileSummary / profileCompletion
                  data the screen already read, and Profile remains a read-only
                  summary whose single product action is opening the existing
                  setup flow. No storage, onboarding, access-control or
                  recommendation behaviour changes.

                  Night reads the shared `shellNight` decision that the page
                  background and BottomTabs read in the same render, so Profile,
                  the shell and the navigation always flip together. Every
                  conditional resolves to its exact previous day value when the
                  flag is false. Onboarding is untouched and stays day-only. */}
              <section
                style={{
                  ...card,
                  background: shellNight
                    ? PROFILE_NIGHT.heroBackground
                    : "linear-gradient(150deg, #FFFFFF 0%, #F6EFFF 56%, #FFF7ED 100%)",
                  border: shellNight
                    ? PROFILE_NIGHT.heroBorder
                    : "1px solid rgba(124, 58, 237, 0.22)",
                  borderRadius: 28,
                  padding: 20,
                  boxShadow: shellNight
                    ? PROFILE_NIGHT.heroShadow
                    : "0 16px 38px rgba(91, 33, 182, 0.10)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 11px",
                    borderRadius: 999,
                    background: shellNight
                      ? profileCompletion.isComplete
                        ? PROFILE_NIGHT.statusCompleteBackground
                        : PROFILE_NIGHT.statusNeededBackground
                      : profileCompletion.isComplete
                      ? colors.successSoft
                      : colors.amberSoft,
                    color: shellNight
                      ? profileCompletion.isComplete
                        ? PROFILE_NIGHT.statusCompleteColor
                        : PROFILE_NIGHT.statusNeededColor
                      : profileCompletion.isComplete
                      ? "#046A4E"
                      : "#92400E",
                    fontSize: 11.5,
                    fontWeight: 900,
                    letterSpacing: 0.6,
                  }}
                >
                  {profileCompletion.isComplete ? "SETUP COMPLETE" : "SETUP NEEDED"}
                </div>

                <h2
                  style={{
                    margin: "12px 0 0",
                    color: shellNight ? PROFILE_NIGHT.title : colors.text,
                    fontSize: 27,
                    letterSpacing: -0.6,
                    lineHeight: 1.15,
                  }}
                >
                  Your family setup
                </h2>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    maxWidth: 560,
                  }}
                >
                  {profileCompletion.isComplete
                    ? "These answers are live. TOHI is already using them to choose rides, time breaks, and shape your packing list."
                    : "Finish setup and TOHI can start using these answers to choose rides, time breaks, and shape your packing list."}
                </p>

                <button
                  type="button"
                  onClick={() => setActiveScreen("family_profile")}
                  style={{
                    ...button,
                    marginTop: 16,
                    minHeight: 48,
                    padding: "0 20px",
                    borderRadius: 16,
                    fontSize: 15,
                    background: shellNight
                      ? PROFILE_NIGHT.ctaBackground
                      : "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                    color: shellNight ? PROFILE_NIGHT.ctaColor : "white",
                    borderColor: shellNight
                      ? PROFILE_NIGHT.ctaBorder
                      : "rgba(124, 58, 237, 0.28)",
                    boxShadow: shellNight
                      ? PROFILE_NIGHT.ctaShadow
                      : "0 12px 24px rgba(124, 58, 237, 0.18)",
                  }}
                >
                  {profileCompletion.isComplete ? "Review setup" : "Finish setup"}
                </button>
              </section>

              {!profileCompletion.isComplete && (
                <section
                  style={{
                    ...card,
                    background: shellNight
                      ? PROFILE_NIGHT.alertBackground
                      : "linear-gradient(145deg, #FFFFFF 0%, #FEF3C7 100%)",
                    border: shellNight
                      ? PROFILE_NIGHT.alertBorder
                      : "1px solid rgba(245, 158, 11, 0.32)",
                    borderRadius: 24,
                    padding: 18,
                    boxShadow: shellNight
                      ? PROFILE_NIGHT.alertShadow
                      : "0 10px 28px rgba(245, 158, 11, 0.10)",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: shellNight ? PROFILE_NIGHT.alertTitle : "#92400E",
                      fontSize: 15.5,
                      lineHeight: 1.3,
                    }}
                  >
                    Still needed before TOHI can personalize
                  </h3>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: shellNight ? PROFILE_NIGHT.alertBody : "#7A4A10",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {profileCompletion.missing.join(", ")}
                  </p>
                </section>
              )}

              {renderProfileGroup({
                accent: "sky",
                title: "Trip details",
                caption:
                  "Dates and parks tell TOHI whether to plan ahead or guide an active park day.",
                children: renderProfileRows([
                  {
                    label: "Trip dates",
                    value: formatProfileTripDates(familyProfileSummary.tripContext),
                  },
                  {
                    label: "Park days",
                    value: familyProfileSummary.tripContext?.parkDays
                      ? `${familyProfileSummary.tripContext.parkDays} ${
                          Number(familyProfileSummary.tripContext.parkDays) === 1
                            ? "park day"
                            : "park days"
                        }`
                      : null,
                  },
                  {
                    label: "Parks on the list",
                    value: familyProfileSummary.tripContext?.selectedParks?.length
                      ? familyProfileSummary.tripContext.selectedParks
                          .map((park) => getParkLabel(park))
                          .join(" · ")
                      : null,
                  },
                  {
                    label: "First park",
                    value: getProfileParkLabel(familyProfileSummary.tripContext?.firstPark),
                  },
                  {
                    label: "Park that matters most",
                    value: getProfileParkLabel(familyProfileSummary.tripContext?.priorityPark),
                  },
                  {
                    label: "Park Hopper",
                    value: getProfileDisplayLabel(
                      PROFILE_HOPPER_LABELS,
                      familyProfileSummary.tripContext?.parkHopper
                    ),
                  },
                  {
                    label: "Where you're staying",
                    value:
                      familyProfileSummary.resortProfile?.name ||
                      familyProfileSummary.resortContext?.resortName ||
                      familyProfileSummary.resortContext?.offPropertyHotelName ||
                      getProfileDisplayLabel(
                        PROFILE_STAY_LABELS,
                        familyProfileSummary.resortContext?.stayingOnProperty
                      ),
                    hint: familyProfileSummary.resortProfile?.name
                      ? "Shapes how realistic a mid-day resort break is."
                      : null,
                  },
                  {
                    label: "Getting around",
                    value: getProfileDisplayLabel(
                      PROFILE_TRANSPORT_LABELS,
                      familyProfileSummary.resortContext?.transportationMode
                    ),
                  },
                  familyProfileSummary.resortProfile?.transportation?.length
                    ? {
                        label: "Resort transportation",
                        value: familyProfileSummary.resortProfile.transportation
                          .map(
                            (mode) =>
                              getProfileDisplayLabel(PROFILE_TRANSPORT_LABELS, mode) || mode
                          )
                          .join(", "),
                      }
                    : null,
                ]),
              })}

              {renderProfileGroup({
                accent: "purple",
                title: "Who's going",
                caption:
                  "Saved heights help TOHI check posted ride-height requirements. Ages help it judge what may suit the family.",
                children: (
                  <>
                    {renderProfileRows([
                      {
                        label: "Your group",
                        value: `${familyProfileSummary.partySize || 0} guests · ${
                          familyProfileSummary.adultCount || 0
                        } adults · ${familyProfileSummary.childCount || 0} kids`,
                      },
                      {
                        label: "Disney age mix",
                        value: `${familyProfileSummary.ageSummary?.under3Count || 0} under 3 · ${
                          familyProfileSummary.ageSummary?.childCount || 0
                        } Disney child · ${
                          familyProfileSummary.ageSummary?.disneyAdultCount || 0
                        } Disney adult`,
                      },
                      {
                        label: "Shortest rider",
                        value:
                          familyProfileSummary.shortestHeightInches != null
                            ? `${familyProfileSummary.shortestHeightInches}" tall`
                            : familyProfileSummary.childCount > 0
                            ? null
                            : "Adults only",
                        hint:
                          familyProfileSummary.shortestHeightInches != null
                            ? "TOHI checks posted ride-height requirements against this."
                            : null,
                      },
                    ])}

                    {familyProfileSummary.childCount > 0 &&
                      familyProfileSummary.children?.length > 0 && (
                        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                          {familyProfileSummary.children.map((child, index) => {
                            const ageClass = getDisneyAgeClass(child.age);
                            const hasAge = child.age !== "" && child.age != null;
                            const hasHeight =
                              child.heightInches !== "" && child.heightInches != null;

                            return (
                              <div
                                key={child.id || index}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: 16,
                                  background: shellNight
                                    ? PROFILE_NIGHT.childSurface
                                    : colors.backgroundSoft,
                                  border: `1px solid ${
                                    shellNight ? PROFILE_NIGHT.childBorder : colors.cardBorder
                                  }`,
                                }}
                              >
                                <strong
                                  style={{
                                    display: "block",
                                    color: shellNight ? PROFILE_NIGHT.title : colors.text,
                                    fontSize: 14.5,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  Child {index + 1}
                                  {": "}
                                  {hasAge ? `age ${child.age}` : "age not set"}
                                  {" · "}
                                  {hasHeight ? `${child.heightInches}" tall` : "height not set"}
                                </strong>
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: 4,
                                    color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                                    fontSize: 13,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {getDisneyAgeLabel(ageClass)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {familyProfileSummary.shortestHeightInches != null && (
                      <p
                        style={{
                          margin: "14px 0 0",
                          padding: "12px 14px",
                          borderRadius: 16,
                          background: shellNight
                            ? familyProfileSummary.shortestHeightInches < 38
                              ? PROFILE_NIGHT.heightLowBackground
                              : familyProfileSummary.shortestHeightInches < 44
                              ? PROFILE_NIGHT.heightMidBackground
                              : PROFILE_NIGHT.heightHighBackground
                            : familyProfileSummary.shortestHeightInches < 38
                            ? colors.errorSoft
                            : familyProfileSummary.shortestHeightInches < 44
                            ? colors.amberSoft
                            : colors.successSoft,
                          color: shellNight
                            ? familyProfileSummary.shortestHeightInches < 38
                              ? PROFILE_NIGHT.heightLowColor
                              : familyProfileSummary.shortestHeightInches < 44
                              ? PROFILE_NIGHT.heightMidColor
                              : PROFILE_NIGHT.heightHighColor
                            : familyProfileSummary.shortestHeightInches < 38
                            ? "#9F1239"
                            : familyProfileSummary.shortestHeightInches < 44
                            ? "#92400E"
                            : "#046A4E",
                          fontSize: 13.5,
                          fontWeight: 800,
                          lineHeight: 1.45,
                        }}
                      >
                        {familyProfileSummary.shortestHeightInches < 38
                          ? "Many height-gated rides post a requirement above this. TOHI still checks each posted requirement."
                          : familyProfileSummary.shortestHeightInches < 44
                          ? "Some height-gated rides post a requirement above this. TOHI still checks each posted requirement."
                          : "Many height-gated rides may fit this height. TOHI still checks each posted requirement."}
                      </p>
                    )}
                  </>
                ),
              })}

              {renderProfileGroup({
                accent: "purple",
                title: "Comfort & pace",
                caption: "These answers change which rides TOHI puts in front of you.",
                children: renderProfileRows([
                  {
                    label: "How much walking works",
                    value: getProfileDisplayLabel(
                      PROFILE_WALKING_LABELS,
                      familyProfileSummary.pace
                    ),
                    hint: "Decides how strongly TOHI favors nearby choices.",
                  },
                  {
                    label: "Storm comfort",
                    value: getProfileDisplayLabel(
                      PROFILE_STORM_LABELS,
                      familyProfileSummary.stormTolerance
                    ),
                    hint: "When rain or storms show up in the real forecast, TOHI leans toward indoor picks.",
                  },
                  {
                    label: "Heat and fatigue",
                    value: getProfileDisplayLabel(
                      PROFILE_HEAT_LABELS,
                      familyProfileSummary.heatSensitivity
                    ),
                    hint: "Shapes break timing and how much a hot outdoor wait counts against a ride.",
                  },
                  {
                    label: "Ride comfort",
                    value: getProfileDisplayLabel(
                      PROFILE_THRILL_LABELS,
                      familyProfileSummary.thrillTolerance
                    ),
                    hint: "Nudges bigger thrills up or down your list. It does not rule rides out.",
                  },
                  {
                    label: "Water rides",
                    value: getProfileDisplayLabel(
                      PROFILE_WATER_LABELS,
                      familyProfileSummary.waterRidePreference
                    ),
                    hint: getProfileWaterRideHint(familyProfileSummary.waterRidePreference),
                  },
                ]),
              })}

              {renderProfileGroup({
                accent: "amber",
                title: "What matters most",
                caption:
                  "TOHI keeps these in view while still adapting to weather, waits, and family energy.",
                children: familyProfileSummary.priorities?.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {familyProfileSummary.priorities.map((priority) => {
                      const label =
                        FAMILY_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ||
                        priority;

                      return (
                        <span
                          key={priority}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: 38,
                            padding: "8px 14px",
                            borderRadius: 999,
                            background: shellNight
                              ? PROFILE_NIGHT.priorityBackground
                              : "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                            color: shellNight ? PROFILE_NIGHT.priorityColor : "white",
                            border: shellNight
                              ? PROFILE_NIGHT.priorityBorder
                              : "1px solid rgba(91, 33, 182, 0.35)",
                            fontSize: 13.5,
                            fontWeight: 850,
                            lineHeight: 1.2,
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
                      color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    Nothing chosen yet. Adding at least one keeps TOHI from feeling generic.
                  </p>
                ),
              })}

              {renderProfileGroup({
                accent: "sky",
                title: "Packing & day comfort",
                caption:
                  "These shape your packing list and day-comfort suggestions. They do not change ride eligibility, and TOHI never decides accessibility or ADA questions for you.",
                children: renderProfileRows([
                  {
                    label: "Stroller",
                    value: familyProfileSummary.mobilityAccessibility?.usesStroller
                      ? "Yes, we'll use one"
                      : "Not using one",
                  },
                  {
                    label: "Wheelchair, ECV or similar support",
                    value: familyProfileSummary.mobilityAccessibility?.usesWheelchair
                      ? "Yes, someone will"
                      : "Not using one",
                    hint: "Confirm attraction access and transfer details in the official Disney app or with a Cast Member.",
                  },
                ]),
              })}


              {isProfileIncomplete && access.isDevPreviewing && DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && (
                <section
                  style={{
                    ...card,
                    border: shellNight ? PROFILE_NIGHT.devBorder : "1px solid #ddd6fe",
                    background: shellNight ? PROFILE_NIGHT.devSurface : "#f5f3ff",
                  }}
                >
                  <strong style={{ color: shellNight ? PROFILE_NIGHT.devTitle : "#6d28d9" }}>
                    Developer Preview Active
                  </strong>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: shellNight ? PROFILE_NIGHT.muted : colors.muted,
                      fontSize: 13,
                    }}
                  >
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
                    style={{
                      ...button,
                      marginTop: 10,
                      // The base button style carries a white fill and a warm
                      // cream border, both of which would read as a stray day
                      // control on the navy card, so night replaces all three.
                      ...(shellNight
                        ? {
                            background: PROFILE_NIGHT.devButtonBackground,
                            border: PROFILE_NIGHT.devButtonBorder,
                          }
                        : {}),
                      color: shellNight ? PROFILE_NIGHT.devButtonColor : colors.purple,
                    }}
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

      {/* 64B-2C: the navigation is suppressed ONLY while the TOHI composer's
          software keyboard is open, so it cannot cover the field being typed
          into. Both halves of the condition matter — the activeTab check keeps
          this scoped to TOHI, and the flag is only ever true for that composer.
          Every other tab, and locked TOHI (which has no composer), keeps the
          navigation exactly as before. BottomTabs itself is unchanged: when the
          keyboard closes it remounts with its existing portal, positioning and
          appearance. */}
      {!(activeTab === "tohi" && tohiComposerKeyboardOpen) && (
        <BottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          night={shellNight}
        />
      )}
    </>
  );
}

export default App;
