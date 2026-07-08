const CATEGORY_ORDER = ["essentials", "weather", "kids", "comfort", "attraction_specific"];
const PRIORITY_ORDER = { must: 0, should: 1, nice_to_have: 2 };

function normalizeString(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getNumeric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getTemperatureF(weather = {}) {
  return getNumeric(weather?.feelsLikeF) ?? getNumeric(weather?.tempF);
}

function getRainChance(weather = {}, weatherMode = {}) {
  const rawRain =
    getNumeric(weather?.rainChance) ??
    getNumeric(weather?.rainRisk) ??
    getNumeric(weather?.precipChance) ??
    getNumeric(weather?.precipProbability);

  if (rawRain == null) {
    return isStormOrRainMode(weather, weatherMode) ? 0.65 : 0;
  }

  return rawRain > 1 ? rawRain / 100 : rawRain;
}

function getWeatherSummary(weather = {}, weatherMode = {}) {
  return normalizeString(
    [
      weather?.summary,
      weather?.description,
      weather?.conditions,
      weatherMode?.label,
      weatherMode?.message,
      weatherMode?.mode,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isStormOrRainMode(weather = {}, weatherMode = {}) {
  const mode = normalizeString(weatherMode?.mode);
  const summary = getWeatherSummary(weather, weatherMode);

  return Boolean(
    mode === "storm" ||
      mode === "rain" ||
      summary.includes("storm") ||
      summary.includes("rain") ||
      summary.includes("shower")
  );
}

function isHotDay({ temperatureF, humidity, heatSensitivity }) {
  return Boolean(
    (temperatureF != null && temperatureF >= 88) ||
      (temperatureF != null && temperatureF >= 84 && humidity != null && humidity >= 70) ||
      (temperatureF != null && temperatureF >= 80 && heatSensitivity === "high")
  );
}

function isWarmEnoughForCooling({ temperatureF, humidity, heatSensitivity }) {
  return Boolean(
    isHotDay({ temperatureF, humidity, heatSensitivity }) ||
      (temperatureF != null && temperatureF >= 82) ||
      (temperatureF != null && temperatureF >= 78 && heatSensitivity === "high") ||
      (temperatureF == null && heatSensitivity === "high")
  );
}

function isCoolEnoughForLayer({ temperatureF, startStrategy, nighttimeImportance }) {
  const eveningForwardPlan =
    startStrategy === "evening_only" || nighttimeImportance === "must_see_fireworks";

  if (temperatureF == null) return false;
  if (temperatureF <= 64) return true;

  return eveningForwardPlan && temperatureF <= 66;
}

function isDaytimeForwardPlan(startStrategy = "") {
  return startStrategy !== "evening_only";
}

function hasYoungKids(familyProfile = {}) {
  if (familyProfile.hasSmallChildren || familyProfile.hasUnder3) return true;

  const children = Array.isArray(familyProfile.children) ? familyProfile.children : [];
  return children.some((child) => {
    const age = getNumeric(child.age);
    return age != null && age <= 7;
  });
}

function hasAnyChildren(familyProfile = {}) {
  return (
    Number(familyProfile.childCount || 0) > 0 ||
    (Array.isArray(familyProfile.children) && familyProfile.children.length > 0)
  );
}

function usesStroller(familyProfile = {}) {
  return Boolean(familyProfile.mobilityAccessibility?.usesStroller);
}

function usesMobilitySupport(familyProfile = {}) {
  return Boolean(
    familyProfile.mobilityAccessibility?.usesWheelchair ||
      familyProfile.mobilityAccessibility?.usesScooter ||
      familyProfile.mobilityAccessibility?.mobilitySupport
  );
}

function hasSensorySupportNeed(familyProfile = {}) {
  return Boolean(
    familyProfile.mobilityAccessibility?.sensorySupport ||
      familyProfile.mobilityAccessibility?.sensorySensitivity ||
      familyProfile.mobilityAccessibility?.needsQuietBreaks
  );
}

function getPriorities(familyProfile = {}) {
  return Array.isArray(familyProfile.priorities) ? familyProfile.priorities : [];
}

function getTripPreferences(tripPlan = {}) {
  return tripPlan?.preferences || {};
}

function addItem(items, item) {
  if (!item?.id) return;

  const existing = items.find((entry) => entry.id === item.id);

  if (!existing) {
    items.push(item);
    return;
  }

  // If two rules add the same item, keep the more urgent priority and combine reasons.
  if (PRIORITY_ORDER[item.priority] < PRIORITY_ORDER[existing.priority]) {
    existing.priority = item.priority;
  }

  if (item.reason && !existing.reason.includes(item.reason)) {
    existing.reason = `${existing.reason} ${item.reason}`;
  }
}

export function generatePackingChecklist({
  familyProfile = {},
  weather = {},
  weatherMode = {},
  activePark = "",
  timeContext = {},
  tripPlan = {},
} = {}) {
  const items = [];
  const temperatureF = getTemperatureF(weather);
  const humidity = getNumeric(weather?.humidity);
  const rainChance = getRainChance(weather, weatherMode);
  const rainOrStormLikely = rainChance >= 0.35 || isStormOrRainMode(weather, weatherMode);
  const heatSensitivity = normalizeString(familyProfile.heatSensitivity);
  const waterRidePreference = normalizeString(familyProfile.waterRidePreference);
  const stormTolerance = normalizeString(familyProfile.stormTolerance);
  const priorities = getPriorities(familyProfile);
  const preferences = getTripPreferences(tripPlan);
  const startStrategy = normalizeString(preferences.startStrategy);
  const breakPreference = normalizeString(preferences.breakPreference);
  const nighttimeImportance = normalizeString(preferences.nighttimeImportance);
  const diningStyle = normalizeString(preferences.diningStyle);
  const youngerKids = hasYoungKids(familyProfile);
  const childrenPresent = hasAnyChildren(familyProfile);
  const stroller = usesStroller(familyProfile);
  const mobilitySupport = usesMobilitySupport(familyProfile);
  const sensorySupport = hasSensorySupportNeed(familyProfile);
  const parkLabel = activePark ? activePark.replace(/_/g, " ") : "the park";
  const planningMode = normalizeString(timeContext?.planningMode);

  const hotDay = isHotDay({ temperatureF, humidity, heatSensitivity });
  const coolingUseful = isWarmEnoughForCooling({ temperatureF, humidity, heatSensitivity });
  const daytimeForwardPlan = isDaytimeForwardPlan(startStrategy);
  const eveningForwardPlan = startStrategy === "evening_only" || nighttimeImportance === "must_see_fireworks";
  const layerUseful = isCoolEnoughForLayer({ temperatureF, startStrategy, nighttimeImportance });
  const waterRidesLikely = ["love", "okay_with_warning", "depends"].includes(waterRidePreference);
  const waterRidesStrong = waterRidePreference === "love";
  const snackHeavyDay =
    childrenPresent ||
    diningStyle === "snack_through_day" ||
    diningStyle === "quick_service" ||
    breakPreference === "no_break";

  addItem(items, {
    id: "battery_pack",
    category: "essentials",
    label: "Portable battery pack",
    reason: "Your phone powers TOHI, park apps, mobile ordering, photos, and ride updates all day.",
    priority: "must",
  });

  addItem(items, {
    id: "water_bottles",
    category: "essentials",
    label: "Refillable water bottles",
    reason: hotDay
      ? "Today’s heat makes hydration part of keeping the family’s mood steady, not just a nice extra."
      : "Even on easier weather days, refillable water keeps small delays from turning into avoidable stress.",
    priority: hotDay ? "must" : "should",
  });

  if (daytimeForwardPlan || temperatureF == null || temperatureF >= 72) {
    addItem(items, {
      id: "sunscreen",
      category: "essentials",
      label: "Sunscreen",
      reason:
        startStrategy === "evening_only" && temperatureF != null
          ? "This is lower priority for an evening-focused plan, but it still belongs in the bag if you arrive before full dark."
          : "Today’s plan includes enough daytime park time that sun support should not be a last-second purchase.",
      priority: startStrategy === "evening_only" ? "should" : "must",
    });
  }

  if (snackHeavyDay) {
    addItem(items, {
      id: "small_snacks",
      category: "essentials",
      label: "Small backup snacks",
      reason: childrenPresent
        ? "A quick snack can prevent a bad line, delayed meal, or transportation wait from becoming a hard moment."
        : "A small snack gives the day a buffer if mobile ordering, transportation, or a longer-than-expected wait gets in the way.",
      priority: childrenPresent ? "must" : "should",
    });
  }

  if (coolingUseful) {
    addItem(items, {
      id: "cooling_towel",
      category: "weather",
      label: "Cooling towel",
      reason:
        temperatureF != null
          ? `It feels around ${temperatureF}°F right now, so cooling support is worth having close.`
          : "Your family profile says heat sensitivity is high, so this is a reasonable backup even without a clean forecast read.",
      priority: hotDay || heatSensitivity === "high" ? "must" : "should",
    });
  }

  if (temperatureF != null && temperatureF >= 84) {
    addItem(items, {
      id: "portable_fan",
      category: "weather",
      label: "Portable fan",
      reason: `A ${temperatureF}°F park day can turn waits, stroller time, and transportation lines into real family-energy problems.`,
      priority: hotDay || heatSensitivity === "high" ? "must" : "should",
    });
  }

  if (layerUseful) {
    addItem(items, {
      id: "light_layer",
      category: "weather",
      label: "Light hoodie or layer",
      reason:
        eveningForwardPlan
          ? `It is around ${temperatureF}°F right now. If you will be out late, a light layer may be worth checking before you leave.`
          : `It is cool enough right now that a light layer may be worth checking before you leave.`,
      priority: eveningForwardPlan ? "should" : "nice_to_have",
    });
  }

  if (rainOrStormLikely) {
    addItem(items, {
      id: "ponchos",
      category: "weather",
      label: "Ponchos for each person",
      reason:
        rainChance >= 0.35
          ? `Rain risk is high enough (${Math.round(rainChance * 100)}%) that buying ponchos in the park would be the expensive version of the same fix.`
          : "Weather mode suggests rain or storms may affect the day.",
      priority:
        stormTolerance === "indoor_only" || normalizeString(weatherMode?.mode) === "storm"
          ? "must"
          : "should",
    });
  }

  if (stroller && coolingUseful) {
    addItem(items, {
      id: "stroller_fan",
      category: "kids",
      label: "Stroller fan",
      reason: "Your setup says you use a stroller, and today is warm enough that airflow could keep comfort in the day during waits or transportation.",
      priority: hotDay || heatSensitivity === "high" ? "must" : "should",
    });
  }

  if (stroller && rainOrStormLikely) {
    addItem(items, {
      id: "stroller_rain_cover",
      category: "kids",
      label: "Stroller rain cover",
      reason: "A wet stroller can make naps, comfort, and the rest of the day harder fast.",
      priority:
        normalizeString(weatherMode?.mode) === "storm" || rainChance >= 0.55
          ? "must"
          : "should",
    });
  }

  if (childrenPresent && (waterRidesLikely || rainOrStormLikely || hotDay)) {
    addItem(items, {
      id: "change_of_clothes",
      category: "kids",
      label: "Change of clothes for kids",
      reason: waterRidesLikely
        ? "Kids plus water rides can turn one soaked outfit into a long afternoon problem."
        : rainOrStormLikely
        ? "Rain risk makes a dry backup outfit more useful than a vague just-in-case item."
        : "Heat and sweat can make a backup shirt useful for keeping kids comfortable later.",
      priority: waterRidesStrong || rainChance >= 0.55 ? "should" : "nice_to_have",
    });
  }

  if (waterRidesLikely || rainOrStormLikely) {
    addItem(items, {
      id: "zip_bags",
      category: "attraction_specific",
      label: "Ziploc bags for phones and small items",
      reason: waterRidesLikely
        ? "Water rides are part of the plan, so phones, snacks, and small essentials need a dry place to go."
        : "Rain risk makes dry storage useful without overpacking the whole bag.",
      priority: waterRidesStrong || rainChance >= 0.55 ? "should" : "nice_to_have",
    });
  }

  if (
    sensorySupport ||
    (youngerKids && (priorities.includes("shows_parades") || eveningForwardPlan)) ||
    (youngerKids && nighttimeImportance === "must_see_fireworks")
  ) {
    addItem(items, {
      id: "ear_support",
      category: "comfort",
      label: "Kid ear support",
      reason: "Your plan includes the kind of loud show, nighttime, or sensory-heavy moments that can overwhelm younger or sensory-sensitive kids.",
      priority: sensorySupport || nighttimeImportance === "must_see_fireworks" ? "should" : "nice_to_have",
    });
  }

  if (mobilitySupport) {
    addItem(items, {
      id: "mobility_charger_or_backup",
      category: "comfort",
      label: "Mobility device charger or backup plan",
      reason: "Your setup includes mobility support. The day needs to keep movement, charging, and realistic reset options in the plan.",
      priority: "must",
    });
  }

  if (stormTolerance === "indoor_only" && rainOrStormLikely) {
    addItem(items, {
      id: "indoor_wait_plan",
      category: "weather",
      label: "Indoor-storm fallback mindset",
      reason: "Your storm setting says outdoor waits are not the move, and today’s forecast gives that setting a reason to matter.",
      priority: "should",
    });
  }

  if (planningMode === "day_before" || planningMode === "pre_trip") {
    addItem(items, {
      id: "park_bag_staging",
      category: "essentials",
      label: "Stage the park bag tonight",
      reason: `Since TOHI is reading this as a planning window, packing now keeps the ${parkLabel} morning calmer.`,
      priority: "should",
    });
  }

  return items.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  });
}
