import { getOpeningStrategyMeta } from "../rideMetadata";

const PARK_LABELS = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood: "Hollywood Studios",
  animal_kingdom: "Animal Kingdom",
};

const START_LABELS = {
  rope_drop: "Rope drop start",
  moderate_morning: "Moderate morning",
  late_start: "Late start",
  evening_only: "Evening-only visit",
};

const PRIORITY_LABELS = {
  must: "High priority",
  should: "Smart move",
  optional: "Flexible",
};

function getPreferences(tripPlan = {}) {
  return tripPlan?.preferences || {};
}

function getMustDoExperiences(tripPlan = {}) {
  return Array.isArray(tripPlan?.mustDoExperiences) ? tripPlan.mustDoExperiences : [];
}

function getMustDosForPark(tripPlan = {}, activePark = "") {
  return getMustDoExperiences(tripPlan).filter((experience) => experience?.parkId === activePark);
}

function formatExperienceList(experiences = [], max = 3) {
  const names = experiences
    .map((experience) => experience?.name)
    .filter(Boolean)
    .slice(0, max);

  if (!names.length) return "";

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}


function getOpeningStrategyForExperience(activePark, experience = {}) {
  return getOpeningStrategyMeta(activePark, experience?.id || experience?.name);
}

function getOpeningStrategySummary(activePark, experiences = []) {
  const items = experiences
    .map((experience) => ({
      experience,
      opening: getOpeningStrategyForExperience(activePark, experience),
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
    hasEarlyEntryTarget: earlyEntryTargets.length > 0,
    hasVerifyDayOfTarget: verifyDayOfTargets.length > 0,
    hasRopeDropTarget: ropeDropTargets.length > 0,
    earlyEntryLabel: formatExperienceList(earlyEntryTargets.map((item) => item.experience), 2),
    verifyDayOfLabel: formatExperienceList(verifyDayOfTargets.map((item) => item.experience), 1),
    ropeDropLabel: formatExperienceList(ropeDropTargets.map((item) => item.experience), 2),
  };
}

function isEarlyEntryLikelyEligible(familyProfile = {}) {
  return Boolean(
    familyProfile.resortContext?.stayingOnProperty === "yes" ||
      (familyProfile.resortProfile?.eligibleForEarlyEntry === true || familyProfile.resortProfile?.eligibleForEarlyEntry === "yes") ||
      familyProfile.resortProfile?.isDisneyResort ||
      familyProfile.resortProfile?.areaLabel
  );
}


function hasPriority(familyProfile = {}, priority) {
  return Array.isArray(familyProfile.priorities) && familyProfile.priorities.includes(priority);
}

function isHighHeatProfile(familyProfile = {}, weather = {}) {
  return (
    familyProfile.heatSensitivity === "high" ||
    weather?.feelsLikeF >= 90 ||
    weather?.tempF >= 88 ||
    weather?.humidity >= 75
  );
}

function hasYoungKids(familyProfile = {}) {
  return Boolean(
    familyProfile.hasSmallChildren ||
      familyProfile.hasUnder3 ||
      familyProfile.ageSummary?.under3Count > 0 ||
      familyProfile.ageSummary?.childCount > 0
  );
}

function getResortName(familyProfile = {}) {
  return (
    familyProfile.resortProfile?.name ||
    familyProfile.resortContext?.resortName ||
    familyProfile.resortContext?.offPropertyHotelName ||
    ""
  );
}

function buildStartPlan({ preferences, familyProfile, activePark, timeContext, tripPlan }) {
  const parkLabel = PARK_LABELS[activePark] || "the park";
  const startStrategy = preferences.startStrategy || "moderate_morning";
  const firstParkLabel = familyProfile.tripContext?.firstPark
    ? PARK_LABELS[familyProfile.tripContext.firstPark] || familyProfile.tripContext.firstPark
    : parkLabel;
  const activeParkMustDos = getMustDosForPark(tripPlan, activePark);
  const mustDoLabel = formatExperienceList(activeParkMustDos, 2);
  const openingSummary = getOpeningStrategySummary(activePark, activeParkMustDos);
  const earlyEntryEligible = isEarlyEntryLikelyEligible(familyProfile);

  if (startStrategy === "rope_drop") {
    if (earlyEntryEligible && openingSummary.hasEarlyEntryTarget) {
      return {
        id: "start_plan",
        eyebrow: "MORNING TARGET",
        title: `Use Early Entry for ${openingSummary.earlyEntryLabel}.`,
        body:
          `Because your setup appears Early Entry eligible, treat the resort-only 30-minute window separately from regular rope drop. ${openingSummary.earlyEntryLabel} is an official Early Entry target, so use that first window intentionally before the full park crowd arrives.`,
        priority: "must",
        detail:
          "Early Entry is not the same as rope drop. Early Entry is resort-eligible only; rope drop starts at official park open for everyone.",
      };
    }

    if (openingSummary.hasVerifyDayOfTarget) {
      return {
        id: "start_plan",
        eyebrow: "MORNING TARGET",
        title: `${openingSummary.verifyDayOfLabel} needs a day-of check.`,
        body:
          `${openingSummary.verifyDayOfLabel} is not listed as an official Early Entry attraction. Do not build the morning around it as guaranteed Early Entry; treat it as verify-day-of or an official park-open rope-drop play.`,
        priority: "must",
        detail:
          "This keeps the plan from calling something Early Entry when Disney does not list it that way.",
      };
    }

    if (openingSummary.hasRopeDropTarget) {
      return {
        id: "start_plan",
        eyebrow: "MORNING TARGET",
        title: `Use official park-open rope drop for ${openingSummary.ropeDropLabel}.`,
        body:
          `${openingSummary.ropeDropLabel} is not an Early Entry target, but it can be a strong official park-open move. Arrive for regular rope drop and use that opening rush without confusing it with resort-only Early Entry.`,
        priority: "must",
        detail:
          "Rope drop means official park opening for all guests. Early Entry is a separate resort-eligible window.",
      };
    }

    return {
      id: "start_plan",
      eyebrow: "MORNING TARGET",
      title: mustDoLabel ? `Use the opening window for ${mustDoLabel}.` : "Make room for the first big move.",
      body: mustDoLabel
        ? `Treat ${firstParkLabel} like the day’s first anchor. Because ${mustDoLabel} is marked as important, the first cool, lower-wait window should be used intentionally instead of wandering into whatever looks close.`
        : `Treat ${firstParkLabel} like the day’s first anchor. Arrive early, do one high-value attraction before the park gets heavy, then slow the pace before the family burns out.`,
      priority: "must",
      detail:
        "This keeps the morning from turning into an all-day sprint. Win the first window, then keep energy in the day.",
    };
  }

  if (startStrategy === "late_start") {
    return {
      id: "start_plan",
      eyebrow: "MORNING TARGET",
      title: "Start slower on purpose.",
      body:
        `Do not pretend this is a rope-drop day. Build around a smoother arrival, fewer cross-park walks, and one clear first target once everyone is actually inside ${parkLabel}.`,
      priority: "should",
      detail:
        mustDoLabel
          ? `Since ${mustDoLabel} is a must-do, make room for it with timing instead of hoping it works out later.`
          : "Late starts can still work, but only if the plan stops chasing everything at once.",
    };
  }

  if (startStrategy === "evening_only") {
    return {
      id: "start_plan",
      eyebrow: "MORNING TARGET",
      title: "Make this a focused evening visit.",
      body:
        `Skip the full-day mindset. Use the cooler window for atmosphere, one or two priority moves, snacks, and a clean exit before everyone crashes.`,
      priority: "should",
      detail:
        mustDoLabel
          ? `Do not bury ${mustDoLabel} behind filler. Treat it as the evening target if waits cooperate.`
          : timeContext?.summary || "Evening visits should feel focused, not overloaded.",
    };
  }

  return {
    id: "start_plan",
    eyebrow: "MORNING TARGET",
    title: "Pick one clean first target.",
    body:
      `Use the first park window for one clear target near your starting area. Do that first, then let nearby waits and family energy shape the next move.`,
    priority: "should",
    detail:
      mustDoLabel
        ? `Keep ${mustDoLabel} visible in the plan so it does not get crowded out by stray wait-time chasing.`
        : "The morning should feel directed, not frantic.",
  };
}

function buildMorningPriority({ preferences, familyProfile, activePark, tripPlan }) {
  const activeParkMustDos = getMustDosForPark(tripPlan, activePark);
  const mustDoLabel = formatExperienceList(activeParkMustDos, 3);

  if (mustDoLabel && preferences.startStrategy === "rope_drop") {
    const openingSummary = getOpeningStrategySummary(activePark, activeParkMustDos);
    const earlyEntryEligible = isEarlyEntryLikelyEligible(familyProfile);

    if (earlyEntryEligible && openingSummary.hasEarlyEntryTarget) {
      return {
        id: "morning_priority",
        eyebrow: "MUST-DO WATCHLIST",
        title: "Use Early Entry for the right target, not everything.",
        body:
          `${openingSummary.earlyEntryLabel} is an official Early Entry target for eligible guests. Use that resort-only window first, then switch to regular rope-drop logic once the park officially opens.`,
        priority: "must",
        detail:
          "Early Entry and rope drop are separate strategy windows. Keep them separate so the morning does not get muddy.",
      };
    }

    if (openingSummary.hasRopeDropTarget) {
      return {
        id: "morning_priority",
        eyebrow: "MUST-DO WATCHLIST",
        title: "Use regular rope drop on the official-open target.",
        body:
          `${openingSummary.ropeDropLabel} is not Early Entry, but it can be a strong official park-open move. This is rope drop strategy, not resort-only Early Entry strategy.`,
        priority: "must",
        detail:
          "This makes room for the opening rush without implying resort eligibility or Early Entry access.",
      };
    }

    return {
      id: "morning_priority",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Use the low-wait window on what matters.",
      body:
        `Your selected must-do moments include ${mustDoLabel}. If one of them is open, nearby, and reasonable early, this is the window to make room for it before heat and crowds make the day harder.`,
      priority: "must",
      detail:
        "Opening strategy is not about doing everything. It is about using the best family-energy window on the right thing.",
    };
  }

  if (preferences.paidQueueStrategy === "use_paid") {
    return {
      id: "morning_priority",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Use paid access to remove pressure.",
      body:
        mustDoLabel
          ? `Use Lightning Lane / paid access as a pressure release for must-dos like ${mustDoLabel}, not as a trophy. The goal is keeping the day easier.`
          : "Treat Lightning Lane / paid access as a pressure release, not a trophy. Use it on the ride most likely to cause a long walk, a long wait, or a family-energy crash.",
      priority: "should",
      detail:
        "The goal is not maximizing rides. The goal is keeping the day easier.",
    };
  }

  if (preferences.paidQueueStrategy === "avoid_paid") {
    return {
      id: "morning_priority",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Be selective with free standby moves.",
      body:
        mustDoLabel
          ? `Since paid access is not the plan, use the best standby windows carefully. Do not waste strong early energy before checking whether ${mustDoLabel} is realistic.`
          : "Since paid access is not the plan, avoid wasting the best energy of the day on mediocre waits. Pick one high-value target, then use nearby backups.",
      priority: "should",
      detail:
        "Free strategy only works if you stop chasing far-away rides just because they look tempting.",
    };
  }

  if (hasPriority(familyProfile, "characters") || hasPriority(familyProfile, "young_kid_moments")) {
    return {
      id: "morning_priority",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Make room for the emotional win early.",
      body:
        "Do not let headliners swallow the whole morning. If characters, younger-kid moments, or classic memories matter, make room for one of those before everyone is tired.",
      priority: "must",
      detail:
        "This keeps the morning centered on the family, not just the ride count.",
    };
  }

  return {
    id: "morning_priority",
    eyebrow: "MUST-DO WATCHLIST",
    title: "Keep the must-dos visible, not loud.",
    body:
      "Use the watchlist to keep what matters in view, then choose the calmest realistic window instead of chasing every wait drop.",
    priority: "should",
    detail:
      mustDoLabel
        ? `Your must-do list gives TOHI the target: ${mustDoLabel}.`
        : "The watchlist is a guide, not a command to sprint.",
  };
}

function buildMiddayReset({ preferences, familyProfile, activePark, weather }) {
  const resortName = getResortName(familyProfile);
  const highHeat = isHighHeatProfile(familyProfile, weather);
  const youngKids = hasYoungKids(familyProfile);

  if (preferences.breakPreference === "resort_return") {
    return {
      id: "midday_reset",
      eyebrow: "MIDDAY RESET",
      title: resortName ? `Plan a real reset at ${resortName}.` : "Plan a real resort reset.",
      body:
        "Do not wait until the family is already cooked. Leave while people still have enough energy to return, especially if heat or crowds are climbing.",
      priority: highHeat || youngKids ? "must" : "should",
      detail:
        "A resort break only works if transportation is realistic and the return plan is simple.",
    };
  }

  if (preferences.breakPreference === "kids_nap_window") {
    return {
      id: "midday_reset",
      eyebrow: "MIDDAY RESET",
      title: "Make room for the nap/rest window.",
      body:
        "Build the middle of the day around quiet, food, AC, stroller rest, or leaving the park. A tired kid can wreck the best plan faster than a bad wait time.",
      priority: "must",
      detail:
        "This is family-energy management, not lost time.",
    };
  }

  if (preferences.breakPreference === "no_break") {
    return {
      id: "midday_reset",
      eyebrow: "MIDDAY RESET",
      title: "Schedule small resets before anyone crashes.",
      body:
        "No formal break can work, but only if water, shade, AC, food, and seated pauses happen before everyone is visibly done.",
      priority: highHeat ? "must" : "should",
      detail:
        "No-break days fail when every pause feels optional.",
    };
  }

  return {
    id: "midday_reset",
    eyebrow: "MIDDAY RESET",
    title: "Use the park as the reset.",
    body:
      "Aim for indoor rides, shaded paths, quick-service seating, shows, and snack breaks when the middle of the day gets heavier.",
    priority: highHeat || youngKids ? "must" : "should",
    detail:
      "This keeps the family inside the park without pretending energy is unlimited.",
  };
}

function buildWeatherStrategy({ weather, weatherMode, familyProfile }) {
  const highHeat = isHighHeatProfile(familyProfile, weather);

  if (weatherMode?.mode && weatherMode.mode !== "normal") {
    return {
      id: "weather_strategy",
      eyebrow: "WEATHER / HEAT FALLBACK",
      title: weatherMode.label || "Weather is shaping the plan.",
      body:
        weatherMode.message ||
        "Favor indoor, shaded, lower-walking choices until conditions improve.",
      priority: "must",
      detail:
        "A good plan should bend around weather instead of forcing the original idea.",
    };
  }

  if (highHeat) {
    return {
      id: "weather_strategy",
      eyebrow: "WEATHER / HEAT FALLBACK",
      title: "Have the heat fallback ready.",
      body:
        "Treat hydration, cooling, shade, and AC as the fallback plan before heat starts making decisions for the family.",
      priority: "must",
      detail:
        "This keeps the day steadier before heat starts draining patience.",
    };
  }

  return {
    id: "weather_strategy",
    eyebrow: "WEATHER / HEAT FALLBACK",
    title: "Keep a simple weather fallback.",
    body:
      "No major weather adjustment is needed right now. Still keep water, sunscreen, and one easy indoor fallback ready.",
    priority: "optional",
    detail:
      "Normal weather does not mean no planning. It just means do not overreact.",
  };
}

function buildEveningPivot({ preferences, familyProfile, activePark, tripPlan }) {
  const activeParkMustDos = getMustDosForPark(tripPlan, activePark);
  const mustDoLabel = formatExperienceList(activeParkMustDos, 2);

  if (preferences.nighttimeImportance === "must_see_fireworks") {
    return {
      id: "evening_pivot",
      eyebrow: "EVENING FINISH",
      title: "Save energy for nighttime.",
      body:
        "If the nighttime show is a must, the afternoon has to be calmer. Do not spend every bit of patience before the final emotional anchor.",
      priority: "must",
      detail:
        mustDoLabel
          ? `If ${mustDoLabel} is still unfinished by evening, compare it against the nighttime show before the family runs out of energy.`
          : "Nighttime plans fail in the afternoon, not at showtime.",
    };
  }

  if (preferences.nighttimeImportance === "kids_will_be_done") {
    return {
      id: "evening_pivot",
      eyebrow: "EVENING FINISH",
      title: "Do not build around a late finish.",
      body:
        "Assume the family exits before the late-night push. Use the earlier part of the day for must-do moments instead of saving everything for the end.",
      priority: "should",
      detail:
        mustDoLabel
          ? `Do not save ${mustDoLabel} for a tired family unless the wait is clearly better later.`
          : "This prevents the classic mistake of saving the best thing for a family that is already finished.",
    };
  }

  return {
    id: "evening_pivot",
    eyebrow: "EVENING FINISH",
    title: "Finish with one clean win.",
    body:
      "If everyone still feels good, use the evening for atmosphere, one final ride, or entertainment. If not, leave cleanly and call the day a win.",
    priority: "optional",
    detail:
      mustDoLabel
        ? `If ${mustDoLabel} is still open and the family has energy, this can become the final clean win.`
        : "Optional nighttime plans keep the day from feeling like a failure if the family is done early.",
  };
}

function buildMustDoPriorities({ preferences, familyProfile, activePark, tripPlan }) {
  const allMustDos = getMustDoExperiences(tripPlan);
  const activeParkMustDos = getMustDosForPark(tripPlan, activePark);
  const activeParkLabel = formatExperienceList(activeParkMustDos, 4);
  const allMustDoLabel = formatExperienceList(allMustDos, 4);

  if (activeParkMustDos.length > 0) {
    return {
      id: "must_do_priorities",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Protect the must-do watchlist.",
      body:
        `Your must-do watchlist in this park includes ${activeParkLabel}. TOHI treats those as success targets, not background nice-to-haves.`,
      priority: "must",
      detail:
        preferences.startStrategy === "rope_drop"
          ? "Because this is a rope-drop style day, early low-wait windows matter before heat and crowds make it harder."
          : "These shape what TOHI surfaces so what actually matters stays in view for the family.",
    };
  }

  if (allMustDos.length > 0) {
    return {
      id: "must_do_priorities",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Keep selected must-dos visible across the trip.",
      body:
        `Your priorities include ${allMustDoLabel}. They are not in the current park view, but they still define what a successful trip feels like.`,
      priority: "should",
      detail:
        "When you switch parks, those targets should come back into view instead of every park day feeling generic.",
    };
  }

  if (preferences.showsImportance === "high" || hasPriority(familyProfile, "shows_parades")) {
    return {
      id: "must_do_priorities",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Make room for shows and parade-style moments.",
      body:
        "Treat shows, parades, and character moments like real anchors, not filler. Check official times and build around one of them before the day gets chaotic.",
      priority: "must",
      detail:
        "For many families, the emotional memory is not the ride count.",
    };
  }

  if (hasPriority(familyProfile, "food_snacks")) {
    return {
      id: "must_do_priorities",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Use food as a planned reset.",
      body:
        "Do not wait until everyone is starving. Use snacks or a quick-service stop as an intentional pause that keeps the day pleasant.",
      priority: "should",
      detail:
        "Food is not just fuel in a theme park. It is pacing.",
    };
  }

  if (hasPriority(familyProfile, "low_stress")) {
    return {
      id: "must_do_priorities",
      eyebrow: "MUST-DO WATCHLIST",
      title: "Choose the calmer path when it matters.",
      body:
        "If the choice is one more attraction or keeping everyone in a good mood, the calmer move wins. A better memory beats a higher ride count.",
      priority: "must",
      detail:
        "TOHI will keep this in mind when the day starts feeling stretched.",
    };
  }

  return {
    id: "must_do_priorities",
    eyebrow: "MUST-DO WATCHLIST",
    title: "Choose the memory over the checklist.",
    body:
      "Pick one moment that would make the day feel successful, then keep it from getting crowded out by stray wait-time chasing.",
    priority: "should",
    detail:
      "A good day needs an emotional anchor, not just efficient movement.",
  };
}

export function generateDayGamePlan({
  familyProfile = {},
  tripPlan = {},
  activePark = "magic_kingdom",
  weather = {},
  weatherMode = {},
  timeContext = {},
  packingChecklist = [],
} = {}) {
  const preferences = getPreferences(tripPlan);
  const mustDoExperiences = getMustDoExperiences(tripPlan);

  const plan = [
    buildStartPlan({ preferences, familyProfile, activePark, timeContext, tripPlan }),
    buildMorningPriority({ preferences, familyProfile, activePark, tripPlan }),
    buildMiddayReset({ preferences, familyProfile, activePark, weather }),
    buildWeatherStrategy({ weather, weatherMode, familyProfile }),
    buildEveningPivot({ preferences, familyProfile, activePark, tripPlan }),
    buildMustDoPriorities({ preferences, familyProfile, activePark, tripPlan }),
  ];

  return plan.map((item, index) => ({
    ...item,
    order: index + 1,
    priorityLabel: PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.optional,
    packingSupportCount: Array.isArray(packingChecklist)
      ? packingChecklist.filter((packingItem) => packingItem.priority === "must").length
      : 0,
    generatedFrom: {
      startStrategy: preferences.startStrategy,
      breakPreference: preferences.breakPreference,
      diningStyle: preferences.diningStyle,
      showsImportance: preferences.showsImportance,
      nighttimeImportance: preferences.nighttimeImportance,
      paidQueueStrategy: preferences.paidQueueStrategy,
      mustDoExperienceCount: mustDoExperiences.length,
    },
  }));
}

export default generateDayGamePlan;
