import { getOpeningStrategyMeta } from "../rideMetadata";

const NUDGE_PRIORITY_SCORE = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PARK_LABELS = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood: "Hollywood Studios",
  animal_kingdom: "Animal Kingdom",
};

function normalizeString(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getParkLabel(parkId = "") {
  return PARK_LABELS[parkId] || String(parkId || "the park").replace(/_/g, " ");
}

function hasYoungKids(familyProfile = {}) {
  return Boolean(
    familyProfile.hasSmallChildren ||
      familyProfile.hasUnder3 ||
      familyProfile.ageSummary?.under3Count > 0 ||
      familyProfile.ageSummary?.childCount > 0
  );
}

function getPreferences(tripPlan = {}) {
  return tripPlan?.preferences || {};
}

function getMustDoCount(tripPlan = {}) {
  return Array.isArray(tripPlan?.mustDoExperiences)
    ? tripPlan.mustDoExperiences.length
    : 0;
}


function getMustDoExperiences(tripPlan = {}) {
  return Array.isArray(tripPlan?.mustDoExperiences) ? tripPlan.mustDoExperiences : [];
}

function getMustDosForPark(tripPlan = {}, activePark = "") {
  return getMustDoExperiences(tripPlan).filter((experience) => experience?.parkId === activePark);
}

function formatExperienceList(experiences = [], max = 2) {
  const names = experiences
    .map((experience) => experience?.name)
    .filter(Boolean)
    .slice(0, max);

  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function isEarlyEntryLikelyEligible(familyProfile = {}) {
  return Boolean(
    familyProfile.resortContext?.stayingOnProperty === "yes" ||
      (familyProfile.resortProfile?.eligibleForEarlyEntry === true || familyProfile.resortProfile?.eligibleForEarlyEntry === "yes") ||
      familyProfile.resortProfile?.isDisneyResort ||
      familyProfile.resortProfile?.areaLabel
  );
}

function getOpeningStrategySummary(activePark, experiences = []) {
  const items = experiences
    .map((experience) => ({
      experience,
      opening: getOpeningStrategyMeta(activePark, experience?.id || experience?.name),
    }))
    .filter((item) => item.experience?.name);

  const earlyEntryTargets = items.filter(
    (item) =>
      item.opening?.earlyEntry?.eligible &&
      item.opening?.earlyEntry?.confidence === "official"
  );

  const verifyDayOfTargets = items.filter(
    (item) => item.opening?.earlyEntry?.strategyUse === "verify_day_of"
  );

  const ropeDropTargets = items.filter(
    (item) =>
      !item.opening?.earlyEntry?.eligible &&
      item.opening?.ropeDrop?.viable &&
      item.opening?.ropeDrop?.strategyUse === "official_open_target"
  );

  return {
    earlyEntryTargets,
    verifyDayOfTargets,
    ropeDropTargets,
    earlyEntryLabel: formatExperienceList(earlyEntryTargets.map((item) => item.experience), 2),
    verifyDayOfLabel: formatExperienceList(verifyDayOfTargets.map((item) => item.experience), 1),
    ropeDropLabel: formatExperienceList(ropeDropTargets.map((item) => item.experience), 2),
  };
}


function isHeatMode(weatherMode = {}, weather = {}) {
  const mode = normalizeString(weatherMode?.mode);

  return (
    mode === "warm" ||
    mode === "hot" ||
    mode === "extreme_heat" ||
    weather?.feelsLikeF >= 90 ||
    weather?.tempF >= 88 ||
    weather?.humidity >= 75
  );
}

function isRainOrStormMode(weatherMode = {}, weather = {}) {
  const mode = normalizeString(weatherMode?.mode);
  const summary = normalizeString(weather?.summary);

  return (
    mode === "rain" ||
    mode === "storm" ||
    weather?.stormMode === true ||
    summary.includes("rain") ||
    summary.includes("storm") ||
    summary.includes("lightning")
  );
}

function isEnergyManagementWindow(timeContext = {}) {
  const dayPhase = normalizeString(timeContext?.dayPhase);
  const planningMode = normalizeString(timeContext?.planningMode);

  return (
    dayPhase === "midday_heat_window" ||
    dayPhase === "afternoon_crash_window" ||
    planningMode === "day_of_energy_management"
  );
}

function isOpeningWindowContext(timeContext = {}, planTabState = {}) {
  const dayPhase = normalizeString(timeContext?.dayPhase);
  const planningMode = normalizeString(timeContext?.planningMode);
  const tripStatus = normalizeString(
    timeContext?.tripStatus?.status || timeContext?.tripStatus
  );
  const totalMinutes = Number(timeContext?.orlandoTotalMinutes);

  return Boolean(
    planTabState?.mode === "pre_trip" ||
      planTabState?.mode === "morning_of" ||
      planTabState?.isBeforeParkOpen ||
      timeContext?.isPreTrip ||
      timeContext?.isDayBeforeTrip ||
      tripStatus === "before_trip" ||
      tripStatus === "day_before_trip" ||
      planningMode === "pre_trip" ||
      planningMode === "day_before" ||
      planningMode === "day_of_rope_drop" ||
      dayPhase === "overnight" ||
      dayPhase === "early_morning" ||
      dayPhase === "rope_drop_window" ||
      (Number.isFinite(totalMinutes) && totalMinutes < 11 * 60)
  );
}

function isEarlyEntryWindowContext(timeContext = {}, planTabState = {}) {
  const dayPhase = normalizeString(timeContext?.dayPhase);
  const planningMode = normalizeString(timeContext?.planningMode);

  return Boolean(
    planTabState?.mode === "morning_of" ||
      planTabState?.isBeforeParkOpen ||
      planningMode === "day_of_rope_drop" ||
      dayPhase === "overnight" ||
      dayPhase === "early_morning" ||
      dayPhase === "rope_drop_window"
  );
}

function isEveningWindowContext(timeContext = {}) {
  const dayPhase = normalizeString(timeContext?.dayPhase);
  const totalMinutes = Number(timeContext?.orlandoTotalMinutes);

  return Boolean(
    dayPhase === "evening" ||
      dayPhase === "late_evening" ||
      (Number.isFinite(totalMinutes) && totalMinutes >= 17 * 60)
  );
}

function isActivelyInPark(planTabState = {}, timeContext = {}) {
  const planningMode = normalizeString(timeContext?.planningMode);

  if (planTabState?.mode === "in_park") {
    return !planTabState?.isBeforeParkOpen && !planTabState?.isAfterParkClose;
  }

  return Boolean(
    timeContext?.isDuringTrip &&
      (planningMode === "day_of_active" ||
        planningMode === "day_of_energy_management" ||
        planningMode === "day_of_evening_strategy")
  );
}

function hasLowWalkingTolerance(familyProfile = {}) {
  const walkingTolerance = normalizeString(familyProfile.walkingTolerance);
  const pace = normalizeString(familyProfile.pace);

  return (
    walkingTolerance === "low" ||
    walkingTolerance === "limited" ||
    pace === "leisurely" ||
    pace === "slow"
  );
}

function addNudge(nudges, nudge) {
  if (!nudge?.id) return;

  const existing = nudges.find((item) => item.id === nudge.id);
  if (existing) return;

  nudges.push({
    priority: "medium",
    tone: "calm",
    ...nudge,
  });
}

export function generatePlanNudges({
  familyProfile = {},
  tripPlan = {},
  activePark = "",
  planningPark = activePark,
  weather = {},
  weatherMode = {},
  timeContext = {},
  planTabState = {},
  tripPlanFreshness = {},
  recommendations = {},
} = {}) {
  const nudges = [];
  const preferences = getPreferences(tripPlan);
  const heatMode = isHeatMode(weatherMode, weather);
  const rainOrStorm = isRainOrStormMode(weatherMode, weather);
  const energyWindow = isEnergyManagementWindow(timeContext);
  const openingWindow = isOpeningWindowContext(timeContext, planTabState);
  const earlyEntryWindow = isEarlyEntryWindowContext(timeContext, planTabState);
  const eveningWindow = isEveningWindowContext(timeContext);
  const activelyInPark = isActivelyInPark(planTabState, timeContext);
  const lowWalking = hasLowWalkingTolerance(familyProfile);
  const youngKids = hasYoungKids(familyProfile);
  const targetPark = planningPark || activePark;
  const activeParkMustDos = getMustDosForPark(tripPlan, targetPark);
  const openingSummary = getOpeningStrategySummary(targetPark, activeParkMustDos);
  const earlyEntryEligible = isEarlyEntryLikelyEligible(familyProfile);
  const bestMoveWait = recommendations?.bestMove?.waitTime;
  const parkLabel = getParkLabel(targetPark);

  if (tripPlanFreshness?.isStale) {
    addNudge(nudges, {
      id: "stale_plan",
      priority: "high",
      eyebrow: "PLAN CHECK",
      title: "Refresh before leaning on the next move.",
      body:
        "Your timing, weather, park, or trip setup changed since this plan was refreshed. A quick refresh keeps TOHI using the right context.",
      actionLabel: "Refresh plan",
      action: "refresh_plan",
    });
  }

  if (
    earlyEntryWindow &&
    preferences.startStrategy === "rope_drop" &&
    earlyEntryEligible &&
    openingSummary.earlyEntryTargets.length > 0
  ) {
    addNudge(nudges, {
      id: "early_entry_first_window",
      priority: "high",
      eyebrow: "EARLY ENTRY",
      title: `Use Early Entry for ${openingSummary.earlyEntryLabel}.`,
      body:
        "Because your setup appears resort-eligible, treat Early Entry as its own 30-minute window before regular rope drop. Use it on the official eligible target instead of mixing it up with full park opening.",
    });
  }

  if (
    openingWindow &&
    preferences.startStrategy === "rope_drop" &&
    openingSummary.ropeDropTargets.length > 0 &&
    (!earlyEntryEligible || openingSummary.earlyEntryTargets.length === 0)
  ) {
    addNudge(nudges, {
      id: "official_rope_drop_target",
      priority: "medium",
      eyebrow: "ROPE DROP",
      title: `Use official park open for ${openingSummary.ropeDropLabel}.`,
      body:
        "This is regular rope drop strategy, not Early Entry. Arrive for official park opening and use the first public window before the park gets heavy.",
    });
  }

  if (
    openingWindow &&
    preferences.startStrategy === "rope_drop" &&
    openingSummary.verifyDayOfTargets.length > 0
  ) {
    addNudge(nudges, {
      id: "verify_day_of_opening_strategy",
      priority: "high",
      eyebrow: "VERIFY DAY-OF",
      title: `${openingSummary.verifyDayOfLabel} is not official Early Entry.`,
      body:
        "Do not treat this as guaranteed Early Entry. Check day-of access and use it as either a verified queue-access play or an official park-open rope-drop target.",
    });
  }

  if (heatMode && energyWindow) {
    addNudge(nudges, {
      id: "heat_energy_window",
      priority: "high",
      eyebrow: "PACE CHECK",
      title: "Heat is climbing — cool down earlier.",
      body:
        "This is the window where families usually wait too long to cool down. Use water, AC, food, shade, or a seated show before the day gets harder.",
    });
  }

  if (rainOrStorm) {
    addNudge(nudges, {
      id: "weather_pivot",
      priority: "high",
      eyebrow: "WEATHER PIVOT",
      title:
        weatherMode?.mode === "storm"
          ? "Storm risk changes the plan."
          : "Rain makes nearby indoor choices smarter.",
      body:
        "Favor indoor, covered, or nearby options until conditions settle. Do not cross the park for a small wait-time win during weather.",
    });
  }

  if (energyWindow && lowWalking) {
    addNudge(nudges, {
      id: "low_walking_energy_window",
      priority: "high",
      eyebrow: "PACE CHECK",
      title: "Avoid cross-park moves right now.",
      body:
        "Low walking tolerance plus this timing window means small route mistakes get expensive. Stay nearby unless the next move is truly worth it.",
    });
  }

  if (energyWindow && youngKids) {
    addNudge(nudges, {
      id: "young_kids_reset",
      priority: "medium",
      eyebrow: "FAMILY ENERGY",
      title: "Watch for the quiet crash before it gets loud.",
      body:
        "With younger kids, the heads up signs can be subtle. Food, AC, stroller time, or a calm seated break now can save the evening.",
    });
  }

  if (
    preferences.nighttimeImportance === "must_see_fireworks" &&
    !eveningWindow &&
    energyWindow
  ) {
    addNudge(nudges, {
      id: "save_energy_for_night",
      priority: "medium",
      eyebrow: "NIGHTTIME ANCHOR",
      title: "Save patience for the nighttime plan.",
      body:
        "If the nighttime show matters, the afternoon has to stay lighter. Do not spend every bit of family energy before the final anchor.",
    });
  }

  if (preferences.breakPreference === "resort_return" && activelyInPark && energyWindow) {
    addNudge(nudges, {
      id: "resort_break_window",
      priority: "medium",
      eyebrow: "BREAK WINDOW",
      title: "If a resort reset is the plan, do it before everyone is cooked.",
      body:
        "A resort break works best while the family still has enough energy to leave, reset, and return without it feeling like a rescue mission.",
    });
  }

  if (activeParkMustDos.length > 0 && energyWindow) {
    addNudge(nudges, {
      id: "must_do_visibility",
      priority: "medium",
      eyebrow: "MUST-DO CHECK",
      title: "Keep your priorities from getting crowded out.",
      body:
        "Before chasing stray waits, check whether one selected priority has a good window. One meaningful win beats scattered filler.",
    });
  }

  if (bestMoveWait != null && bestMoveWait >= 45 && (energyWindow || heatMode || lowWalking)) {
    addNudge(nudges, {
      id: "long_wait_caution",
      priority: "medium",
      eyebrow: "WAIT REALITY",
      title: "A good ride can still be a bad move.",
      body:
        `The current best move is showing a longer wait. In ${parkLabel}, that may be worth it only if the family has energy to spend.`,
    });
  }

  return nudges
    .sort((a, b) => {
      const scoreA = NUDGE_PRIORITY_SCORE[a.priority] ?? NUDGE_PRIORITY_SCORE.medium;
      const scoreB = NUDGE_PRIORITY_SCORE[b.priority] ?? NUDGE_PRIORITY_SCORE.medium;

      if (scoreA !== scoreB) return scoreA - scoreB;
      return String(a.id).localeCompare(String(b.id));
    })
    .slice(0, 3);
}

export default generatePlanNudges;
