const NUDGE_PRIORITY_SCORE = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function normalizeString(value = "") {
  return String(value || "").trim().toLowerCase();
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

function isEveningWindow(timeContext = {}) {
  const dayPhase = normalizeString(timeContext?.dayPhase);
  return dayPhase === "evening" || dayPhase === "late_evening";
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
  weather = {},
  weatherMode = {},
  timeContext = {},
  tripPlanFreshness = {},
  recommendations = {},
} = {}) {
  const nudges = [];
  const preferences = getPreferences(tripPlan);
  const heatMode = isHeatMode(weatherMode, weather);
  const rainOrStorm = isRainOrStormMode(weatherMode, weather);
  const energyWindow = isEnergyManagementWindow(timeContext);
  const lowWalking = hasLowWalkingTolerance(familyProfile);
  const youngKids = hasYoungKids(familyProfile);
  const mustDoCount = getMustDoCount(tripPlan);
  const bestMoveWait = recommendations?.bestMove?.waitTime;
  const parkLabel = activePark ? activePark.replace(/_/g, " ") : "the park";

  if (tripPlanFreshness?.isStale) {
    addNudge(nudges, {
      id: "stale_plan",
      priority: "high",
      eyebrow: "PLAN CHECK",
      title: "Refresh before trusting the next move.",
      body:
        "Your timing, weather, park, or trip setup changed since this plan was refreshed. A quick refresh keeps TOHI from leaning on stale context.",
      actionLabel: "Refresh plan",
      action: "refresh_plan",
    });
  }

  if (heatMode && energyWindow) {
    addNudge(nudges, {
      id: "heat_energy_window",
      priority: "high",
      eyebrow: "ENERGY PROTECTION",
      title: "Heat is climbing — protect the reset earlier.",
      body:
        "This is the window where families usually wait too long to cool down. Use water, AC, food, shade, or a seated show before the day turns into damage control.",
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
        "With younger kids, the warning signs can be subtle. Food, AC, stroller time, or a calm seated break now can save the evening.",
    });
  }

  if (
    preferences.nighttimeImportance === "must_see_fireworks" &&
    !isEveningWindow(timeContext) &&
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

  if (preferences.breakPreference === "resort_return" && energyWindow) {
    addNudge(nudges, {
      id: "resort_break_window",
      priority: "medium",
      eyebrow: "BREAK WINDOW",
      title: "If a resort reset is the plan, do it before everyone is cooked.",
      body:
        "A resort break works best while the family still has enough energy to leave, reset, and return without it feeling like a rescue mission.",
    });
  }

  if (mustDoCount > 0 && energyWindow) {
    addNudge(nudges, {
      id: "must_do_visibility",
      priority: "medium",
      eyebrow: "MUST-DO CHECK",
      title: "Keep must-dos from getting crowded out.",
      body:
        "Before chasing random waits, check whether one selected must-do still needs a protected window. One meaningful win beats scattered filler.",
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
