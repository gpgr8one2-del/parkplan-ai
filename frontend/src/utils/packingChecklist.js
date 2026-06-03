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
    return weatherMode?.mode === "rain" || weatherMode?.mode === "storm" ? 0.65 : 0;
  }

  return rawRain > 1 ? rawRain / 100 : rawRain;
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
  return Number(familyProfile.childCount || 0) > 0 ||
    (Array.isArray(familyProfile.children) && familyProfile.children.length > 0);
}

function usesStroller(familyProfile = {}) {
  return Boolean(familyProfile.mobilityAccessibility?.usesStroller);
}

function usesMobilitySupport(familyProfile = {}) {
  return Boolean(familyProfile.mobilityAccessibility?.usesWheelchair);
}

function getPriorities(familyProfile = {}) {
  return Array.isArray(familyProfile.priorities) ? familyProfile.priorities : [];
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
} = {}) {
  const items = [];
  const temperatureF = getTemperatureF(weather);
  const rainChance = getRainChance(weather, weatherMode);
  const heatSensitivity = normalizeString(familyProfile.heatSensitivity);
  const waterRidePreference = normalizeString(familyProfile.waterRidePreference);
  const stormTolerance = normalizeString(familyProfile.stormTolerance);
  const priorities = getPriorities(familyProfile);
  const youngerKids = hasYoungKids(familyProfile);
  const childrenPresent = hasAnyChildren(familyProfile);
  const stroller = usesStroller(familyProfile);
  const mobilitySupport = usesMobilitySupport(familyProfile);
  const parkLabel = activePark ? activePark.replace(/_/g, " ") : "the park";
  const planningMode = normalizeString(timeContext?.planningMode);

  addItem(items, {
    id: "sunscreen",
    category: "essentials",
    label: "Sunscreen",
    reason: "Florida park days punish families who forget this, even when the forecast looks mild.",
    priority: "must",
  });

  addItem(items, {
    id: "battery_pack",
    category: "essentials",
    label: "Portable battery pack",
    reason: "TOHI, park apps, mobile ordering, photos, and ride updates all depend on your phone staying alive.",
    priority: "must",
  });

  addItem(items, {
    id: "water_bottles",
    category: "essentials",
    label: "Refillable water bottles",
    reason: "Hydration is one of the cheapest ways to protect family energy before heat turns into crankiness.",
    priority: "must",
  });

  addItem(items, {
    id: "small_snacks",
    category: "essentials",
    label: "Small backup snacks",
    reason: "A quick snack can prevent a bad line, delayed meal, or transportation wait from becoming a meltdown moment.",
    priority: childrenPresent ? "must" : "should",
  });

  if (temperatureF == null || temperatureF >= 85 || heatSensitivity === "high" || heatSensitivity === "medium") {
    addItem(items, {
      id: "cooling_towel",
      category: "weather",
      label: "Cooling towel",
      reason:
        temperatureF != null
          ? `The current comfort read is around ${temperatureF}°F, so heat management needs to be part of the plan.`
          : "Your family profile says heat matters, so this is cheap protection against the afternoon crash.",
      priority: temperatureF != null && temperatureF >= 90 ? "must" : "should",
    });
  }

  if (temperatureF != null && temperatureF >= 88) {
    addItem(items, {
      id: "portable_fan",
      category: "weather",
      label: "Portable fan",
      reason: `A ${temperatureF}°F park day can turn waits, stroller time, and transportation lines into real family-energy problems.`,
      priority: heatSensitivity === "high" || stroller ? "must" : "should",
    });
  }

  if (rainChance >= 0.35 || weather?.stormMode || weatherMode?.mode === "storm" || weatherMode?.mode === "rain") {
    addItem(items, {
      id: "ponchos",
      category: "weather",
      label: "Ponchos for each person",
      reason:
        rainChance >= 0.35
          ? `Rain risk is high enough (${Math.round(rainChance * 100)}%) that buying ponchos in the park would be the expensive version of the same fix.`
          : "Weather mode suggests rain or storms may affect the day.",
      priority: stormTolerance === "indoor_only" || weather?.stormMode ? "must" : "should",
    });
  }

  if (stroller) {
    addItem(items, {
      id: "stroller_fan",
      category: "kids",
      label: "Stroller fan",
      reason: "Your setup says you use a stroller. Airflow matters when a child is parked in heat or a slow outdoor queue.",
      priority: temperatureF != null && temperatureF >= 85 ? "must" : "should",
    });

    addItem(items, {
      id: "stroller_rain_cover",
      category: "kids",
      label: "Stroller rain cover",
      reason: "A wet stroller can wreck naps, comfort, and the rest of the day faster than people expect.",
      priority: rainChance >= 0.35 || weather?.stormMode ? "should" : "nice_to_have",
    });
  }

  if (childrenPresent) {
    addItem(items, {
      id: "change_of_clothes",
      category: "kids",
      label: "Change of clothes for kids",
      reason:
        waterRidePreference === "love" || waterRidePreference === "okay_with_warning" || waterRidePreference === "depends"
          ? "Kids plus water rides, rain, spills, or sweat can turn one small discomfort into a long afternoon problem."
          : "Even without water rides, a dry backup outfit can save the day after sweat, spills, or rain.",
      priority: waterRidePreference === "love" || rainChance >= 0.35 ? "should" : "nice_to_have",
    });
  }

  if (waterRidePreference === "love" || waterRidePreference === "okay_with_warning" || waterRidePreference === "depends") {
    addItem(items, {
      id: "zip_bags",
      category: "attraction_specific",
      label: "Ziploc bags for phones and small items",
      reason: "Water rides and sudden rain are a lot less stressful when phones, snacks, and small essentials have a dry place to go.",
      priority: waterRidePreference === "love" ? "should" : "nice_to_have",
    });
  }

  if (youngerKids || priorities.includes("shows_parades") || priorities.includes("young_kid_moments")) {
    addItem(items, {
      id: "ear_protection",
      category: "comfort",
      label: "Kid ear protection",
      reason: "Parades, fireworks, indoor show effects, and loud queues can overwhelm younger or sensory-sensitive kids.",
      priority: youngerKids ? "should" : "nice_to_have",
    });
  }

  if (mobilitySupport) {
    addItem(items, {
      id: "mobility_charger_or_backup",
      category: "comfort",
      label: "Mobility device charger or backup plan",
      reason: "Your setup includes mobility support. The day needs to protect movement, charging, and realistic reset options.",
      priority: "must",
    });
  }

  if (stormTolerance === "indoor_only") {
    addItem(items, {
      id: "indoor_wait_plan",
      category: "weather",
      label: "Indoor-storm fallback mindset",
      reason: "Your storm setting says outdoor waits are not the move. Plan to pivot to indoor shows, food, shops, or resort cover instead of forcing it.",
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
