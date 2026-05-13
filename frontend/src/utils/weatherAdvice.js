import { getWaterOptionsForLand } from "../parkAmenities";

/* -------------------------------------------------------------------------- */
/* Current weather condition helpers                                          */
/* -------------------------------------------------------------------------- */

function getWeatherSummary(weather) {
  return String(weather?.summary || "").toLowerCase();
}

function isCurrentlyRaining(weather) {
  const summary = getWeatherSummary(weather);

  return (
    summary.includes("rain") ||
    summary.includes("drizzle") ||
    summary.includes("shower") ||
    summary.includes("showers")
  );
}

function isCurrentlyStorming(weather) {
  const summary = getWeatherSummary(weather);

  return (
    weather?.stormMode === true ||
    summary.includes("thunderstorm") ||
    summary.includes("storm") ||
    summary.includes("lightning")
  );
}

export function getWeatherMode(weather) {
  const tempF = weather?.tempF ?? null;
  const rainRisk = weather?.rainRisk ?? 0;
  const stormMode = isCurrentlyStorming(weather);
  const currentlyRaining = isCurrentlyRaining(weather);

  if (stormMode) {
    return {
      mode: "storm",
      label: "Storm Smart Mode",
      message:
        "Active storms or lightning may pause outdoor and mixed attractions. Stay indoors, avoid open paths and bodies of water, and wait the worst of it out before heading back out.",
    };
  }

  if (currentlyRaining) {
    return {
      mode: "rain",
      label: "Rain Watch",
      message:
        "Rain is being reported right now. Keep your plan flexible, lean on indoor options nearby, and be careful before walking across the park for outdoor rides.",
    };
  }

  if (rainRisk >= 0.45) {
    return {
      mode: "rain",
      label: "Rain Watch",
      message:
        "Rain chances are elevated. Outdoor rides may pause briefly. Keep your plan flexible and lean on indoor options nearby.",
    };
  }

  if (tempF >= 98) {
    return {
      mode: "extreme_heat",
      label: "Extreme Heat Mode",
      message:
        "It’s very hot out. A water stop, shade break, indoor attraction, or longer resort reset can help keep everyone feeling good.",
    };
  }

  if (tempF >= 93) {
    return {
      mode: "hot",
      label: "Heat Smart Mode",
      message:
        "It’s warm out. A quick water stop, shade break, or indoor attraction can help keep everyone feeling good.",
    };
  }

  if (tempF >= 88) {
    return {
      mode: "warm",
      label: "Hydration Reminder",
      message:
        "It’s warm out. A quick water stop or indoor break between attractions can help keep the day smooth.",
    };
  }

  return {
    mode: "normal",
    label: "Good Conditions",
    message: "Weather looks manageable right now.",
  };
}

/**
 * Legacy ride-level weather modifier kept for backward compatibility.
 * The metadata-driven engine in rideRecommendations.js now handles weather
 * scoring through getContextModifier, so this is no longer the primary
 * weather signal. Left in place so any older import still works.
 */
export function getWeatherRideModifier(ride, weather) {
  const weatherMode = getWeatherMode(weather);

  if (weatherMode.mode === "storm") {
    return ride.outdoor ? -35 : 10;
  }

  if (weatherMode.mode === "rain") {
    return ride.outdoor ? -20 : 6;
  }

  if (weatherMode.mode === "extreme_heat") {
    return ride.outdoor ? -18 : 10;
  }

  if (weatherMode.mode === "hot") {
    return ride.outdoor ? -10 : 6;
  }

  if (weatherMode.mode === "warm") {
    return ride.outdoor ? -4 : 2;
  }

  return 0;
}

/* -------------------------------------------------------------------------- */
/* Water helpers                                                              */
/* -------------------------------------------------------------------------- */

function buildWaterNearbySuggestion(parkId, currentLand) {
  const waterOptions = getWaterOptionsForLand(parkId, currentLand);

  const quickService = waterOptions.quickService || [];
  const bottleRefill = waterOptions.bottleRefill || [];

  if (!quickService.length && !bottleRefill.length) {
    return null;
  }

  const quickServiceText = quickService
    .map((spot) => `${spot.name}: ${spot.note}`)
    .join(" ");

  const bottleRefillText = bottleRefill.length
    ? ` Bottle refill stations nearby: ${bottleRefill
        .map((spot) => `${spot.name}: ${spot.note}`)
        .join(" ")}`
    : "";

  return {
    title: "Water nearby",
    text: `${quickServiceText}${bottleRefillText}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Mode-specific recovery suggestions                                         */
/*                                                                            */
/* Each mode returns its OWN advice. We never share copy across modes. Pool   */
/* breaks belong in heat advice, not storm advice. Free-water reminders make  */
/* sense in heat, not in lightning.                                           */
/* -------------------------------------------------------------------------- */

function getStormSuggestions(parkId) {
  const common = [
    {
      title: "Stay indoors until the storm clears",
      text: "Lightning can pause outdoor and mixed attractions, including coasters and water rides. Move to an indoor ride, show, restaurant, or shop and wait it out.",
    },
    {
      title: "Avoid open areas and water",
      text: "No pool time during active lightning. Stay away from open paths, lagoons, and exposed walkways until the storm passes.",
    },
  ];

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom storm-safe rides",
        text: "Pirates, Haunted Mansion, Buzz Lightyear, Peter Pan's Flight, Little Mermaid, Winnie the Pooh, and \"it's a small world\" are all indoor and stay open during storms.",
      },
      {
        title: "AC shows to wait it out",
        text: "Carousel of Progress, PhilharMagic, Monsters Inc. Laugh Floor, Hall of Presidents, Tiki Room, and Country Bears all keep you out of the weather.",
      },
      {
        title: "Indoor dining shelter",
        text: "Crystal Palace, Cosmic Ray's, Columbia Harbour House, Pecos Bill, or Pinocchio Village Haus can be useful places to wait out heavy weather.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getRainSuggestions(parkId) {
  const common = [
    {
      title: "Lean on indoor rides",
      text: "Rain is active right now. Outdoor rides may become uncomfortable or pause briefly, so favor indoor attractions, shows, shops, and restaurants nearby.",
    },
    {
      title: "Avoid unnecessary cross-park walks",
      text: "A short indoor option nearby is usually smarter than crossing the park through rain for a slightly better wait.",
    },
    {
      title: "Pack ponchos, not umbrellas",
      text: "Umbrellas are awkward around queues and rides. A poncho keeps you moving without storage hassle.",
    },
  ];

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom rain-safe picks",
        text: "Pirates, Haunted Mansion, Tiki Room, Country Bears, Hall of Presidents, PhilharMagic, Carousel of Progress, Laugh Floor, Buzz Lightyear, Peter Pan's Flight, Little Mermaid, Winnie the Pooh, and \"it's a small world\" are better rain choices.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getHeatSuggestions(parkId, severity, currentLand) {
  const common = [
    {
      title: "Free water reset",
      text: "Most quick-service locations can provide free cups of ice water. This is an easy reset when the heat starts catching up.",
    },
    {
      title: "AC break",
      text: "Mix in an indoor ride or show between outdoor attractions.",
    },
  ];

  const waterNearby = buildWaterNearbySuggestion(parkId, currentLand);
  if (waterNearby) {
    common.push(waterNearby);
  }

  if (severity === "extreme_heat" || severity === "hot") {
    common.push({
      title: "Resort break option",
      text: "If you’re staying onsite or nearby, a midday resort or pool break can be a smart reset before coming back later.",
    });
  }

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom cool-down picks",
        text: "Carousel of Progress, PhilharMagic, Pirates, Haunted Mansion, Hall of Presidents, Monsters Inc. Laugh Floor, and Country Bears are strong recovery options.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getWarmSuggestions(parkId, currentLand) {
  const suggestions = [
    {
      title: "Free water reset",
      text: "Most quick-service locations can provide free cups of ice water. This is an easy reset when the heat starts catching up.",
    },
    {
      title: "Mix in indoor breaks",
      text: "Drop in an indoor show or AC ride between outdoor pushes.",
    },
  ];

  const waterNearby = buildWaterNearbySuggestion(parkId, currentLand);
  if (waterNearby) {
    suggestions.push(waterNearby);
  }

  return suggestions;
}

export function getRecoverySuggestions({ parkId, weather, currentLand }) {
  const weatherMode = getWeatherMode(weather);

  switch (weatherMode.mode) {
    case "storm":
      return getStormSuggestions(parkId);
    case "rain":
      return getRainSuggestions(parkId);
    case "extreme_heat":
      return getHeatSuggestions(parkId, "extreme_heat", currentLand);
    case "hot":
      return getHeatSuggestions(parkId, "hot", currentLand);
    case "warm":
      return getWarmSuggestions(parkId, currentLand);
    case "normal":
    default:
      return [];
  }
}
