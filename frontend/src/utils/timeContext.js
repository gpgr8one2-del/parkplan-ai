/**
 * ParkPlan AI — Time Context Utilities
 *
 * Centralizes current date/time logic so recommendations, AI chat,
 * day-before planning, rope-drop guidance, show timing, and future access rules
 * all use the same source of truth.
 */

export const ORLANDO_TIME_ZONE = "America/New_York";

function getZonedDateParts(date = new Date(), timeZone = ORLANDO_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const weekday = get("weekday");

  let hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

  // Intl can occasionally return 24 for midnight in some environments.
  if (hour === 24) hour = 0;

  const dateString = `${year}-${month}-${day}`;
  const totalMinutes = hour * 60 + minute;

  return {
    weekday,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    dateString,
    hour,
    minute,
    second,
    totalMinutes,
    timeLabel: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
    dateLabel: new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
  };
}

function addDaysToDateString(dateString, daysToAdd) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return "";

  date.setDate(date.getDate() + daysToAdd);

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getDaysBetweenDateStrings(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }

  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function getTripDateStatus(tripContext = {}, todayDateString) {
  const start = tripContext.tripStartDate || "";
  const end = tripContext.tripEndDate || "";

  if (!start || !end) {
    return {
      hasDates: false,
      status: "dates_missing",
      isBeforeTrip: false,
      isDayBeforeTrip: false,
      isDuringTrip: false,
      isAfterTrip: false,
      daysUntilTrip: null,
      dayNumber: null,
      message: "Trip dates are not set yet.",
    };
  }

  const daysUntilTrip = getDaysBetweenDateStrings(todayDateString, start);
  const dayBeforeTrip = addDaysToDateString(start, -1);

  if (todayDateString === dayBeforeTrip) {
    return {
      hasDates: true,
      status: "day_before_trip",
      isBeforeTrip: true,
      isDayBeforeTrip: true,
      isDuringTrip: false,
      isAfterTrip: false,
      daysUntilTrip: 1,
      dayNumber: null,
      message: "Trip starts tomorrow.",
    };
  }

  if (todayDateString < start) {
    return {
      hasDates: true,
      status: "before_trip",
      isBeforeTrip: true,
      isDayBeforeTrip: false,
      isDuringTrip: false,
      isAfterTrip: false,
      daysUntilTrip,
      dayNumber: null,
      message:
        daysUntilTrip != null
          ? `Trip starts in ${daysUntilTrip} day${daysUntilTrip === 1 ? "" : "s"}.`
          : "Trip is upcoming.",
    };
  }

  if (todayDateString > end) {
    return {
      hasDates: true,
      status: "after_trip",
      isBeforeTrip: false,
      isDayBeforeTrip: false,
      isDuringTrip: false,
      isAfterTrip: true,
      daysUntilTrip: null,
      dayNumber: null,
      message: "Trip dates have passed.",
    };
  }

  const dayOffset = getDaysBetweenDateStrings(start, todayDateString);
  const dayNumber = dayOffset == null ? null : dayOffset + 1;

  return {
    hasDates: true,
    status: "during_trip",
    isBeforeTrip: false,
    isDayBeforeTrip: false,
    isDuringTrip: true,
    isAfterTrip: false,
    daysUntilTrip: 0,
    dayNumber,
    message: dayNumber ? `Trip day ${dayNumber}.` : "Trip is active today.",
  };
}

function getDayPhase(totalMinutes) {
  if (totalMinutes < 6 * 60) return "overnight";
  if (totalMinutes < 8 * 60) return "early_morning";
  if (totalMinutes < 10 * 60) return "rope_drop_window";
  if (totalMinutes < 12 * 60) return "morning";
  if (totalMinutes < 15 * 60) return "midday_heat_window";
  if (totalMinutes < 17 * 60) return "afternoon_crash_window";
  if (totalMinutes < 20 * 60) return "evening";
  return "late_evening";
}

function getDayPhaseLabel(dayPhase) {
  const labels = {
    overnight: "Overnight",
    early_morning: "Early morning",
    rope_drop_window: "Rope drop window",
    morning: "Morning",
    midday_heat_window: "Midday heat window",
    afternoon_crash_window: "Afternoon crash window",
    evening: "Evening",
    late_evening: "Late evening",
  };

  return labels[dayPhase] || "Unknown";
}

function getPlanningModeForNow({ tripStatus, dayPhase, planningPreferences = {} }) {
  if (tripStatus.status === "day_before_trip") return "day_before";
  if (tripStatus.isBeforeTrip) return "pre_trip";
  if (tripStatus.isAfterTrip) return "post_trip";

  if (tripStatus.isDuringTrip) {
    if (dayPhase === "early_morning" || dayPhase === "rope_drop_window") {
      return "day_of_rope_drop";
    }

    if (dayPhase === "midday_heat_window" || dayPhase === "afternoon_crash_window") {
      return "day_of_energy_management";
    }

    if (dayPhase === "evening" || dayPhase === "late_evening") {
      return "day_of_evening_strategy";
    }

    return "day_of_active";
  }

  return planningPreferences.dayBeforeHelp === "yes" ? "pre_trip" : "general";
}

function getAiAccessContext({ tripStatus, planningPreferences = {} }) {
  // This is intentionally not a hard paywall yet. It gives us clean logic
  // for future free vs paid access without breaking the current app.
  const dayBeforePreference = planningPreferences.dayBeforeHelp;
  const dayOfPreference = planningPreferences.dayOfHelp;

  const dayBeforeAllowed =
    dayBeforePreference !== "no" && dayBeforePreference !== false;

  const dayOfAllowed =
    dayOfPreference !== "no" && dayOfPreference !== false;

  if (tripStatus.status === "day_before_trip") {
    return {
      phase: "day_before",
      shouldAllowAi: dayBeforeAllowed,
      reason: dayBeforeAllowed
        ? "Day-before help is available."
        : "Day-before help is disabled by preference.",
    };
  }

  if (tripStatus.isDuringTrip) {
    return {
      phase: "day_of",
      shouldAllowAi: dayOfAllowed,
      reason: dayOfAllowed
        ? "Day-of help is available."
        : "Day-of help is disabled by preference.",
    };
  }

  if (tripStatus.isBeforeTrip) {
    return {
      phase: "pre_trip",
      shouldAllowAi: true,
      reason: "Pre-trip planning is allowed.",
    };
  }

  if (tripStatus.isAfterTrip) {
    return {
      phase: "post_trip",
      shouldAllowAi: false,
      reason: "Trip dates have passed.",
    };
  }

  return {
    phase: "unknown",
    shouldAllowAi: true,
    reason: "Trip dates are missing, so AI remains available for setup/testing.",
  };
}
export function getCurrentTimeContext({
  activePark = null,
  familyProfile = null,
  now = new Date(),
} = {}) {
  const orlando = getZonedDateParts(now, ORLANDO_TIME_ZONE);
  const tripContext = familyProfile?.tripContext || {};
  const planningPreferences = familyProfile?.planningPreferences || {};

  const tripStatus = getTripDateStatus(tripContext, orlando.dateString);
  const dayPhase = getDayPhase(orlando.totalMinutes);
  const planningMode = getPlanningModeForNow({
    tripStatus,
    dayPhase,
    planningPreferences,
  });

  const aiAccess = getAiAccessContext({
    tripStatus,
    planningPreferences,
  });

  return {
    nowIso: now.toISOString(),
    timeZone: ORLANDO_TIME_ZONE,

    orlandoDate: orlando.dateString,
    orlandoDateLabel: orlando.dateLabel,
    orlandoTimeLabel: orlando.timeLabel,
    orlandoWeekday: orlando.weekday,
    orlandoHour: orlando.hour,
    orlandoMinute: orlando.minute,
    orlandoTotalMinutes: orlando.totalMinutes,

    activePark,
    dayPhase,
    dayPhaseLabel: getDayPhaseLabel(dayPhase),

    tripStatus,
    planningMode,
    aiAccess,

    isPreTrip: tripStatus.isBeforeTrip && !tripStatus.isDayBeforeTrip,
    isDayBeforeTrip: tripStatus.isDayBeforeTrip,
    isDuringTrip: tripStatus.isDuringTrip,
    isAfterTrip: tripStatus.isAfterTrip,

    shouldThinkLikeDayBeforePlanner: planningMode === "day_before",
    shouldThinkLikeInParkGuide: planningMode.startsWith("day_of"),
    shouldProtectFamilyEnergy:
      dayPhase === "midday_heat_window" ||
      dayPhase === "afternoon_crash_window" ||
      planningPreferences.planningMode === "low_stress",

    summary: `${orlando.dateLabel} · ${orlando.timeLabel} Orlando · ${getDayPhaseLabel(
      dayPhase
    )} · ${tripStatus.message}`,
  };
}
