export function getWeatherMode(weather) {
  const tempF = weather?.tempF ?? null;
  const rainRisk = weather?.rainRisk ?? 0;
  const stormMode = weather?.stormMode === true;

  if (stormMode) {
    return {
      mode: "storm",
      label: "Storm Smart Mode",
      message:
        "Active storms or lightning may pause outdoor and mixed attractions. Stay indoors, avoid open paths and bodies of water, and wait the worst of it out before heading back out.",
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
        "This is a recovery-first window. Prioritize AC, indoor seating, water breaks, and consider a resort/pool break if staying onsite.",
    };
  }

  if (tempF >= 93) {
    return {
      mode: "hot",
      label: "Beat the Heat Mode",
      message:
        "Heat is high. Mix in indoor attractions, AC shows, and water breaks before pushing more outdoor rides.",
    };
  }

  if (tempF >= 88) {
    return {
      mode: "warm",
      label: "Hydration Reminder",
      message:
        "It is warm. Build in water and shade breaks between attractions.",
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
/* Mode-specific recovery suggestions                                         */
/*                                                                            */
/* Each mode returns its OWN advice. We never share copy across modes — pool  */
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
        text: "Be Our Guest, Crystal Palace, Cosmic Ray's, Tortuga Tavern, or Pinocchio Village Haus give you a real break from the storm.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getRainSuggestions(parkId) {
  const common = [
    {
      title: "Lean on indoor rides",
      text: "Some outdoor rides may pause briefly while it passes. Stick to indoor options until it clears.",
    },
    {
      title: "Pack ponchos, not umbrellas",
      text: "Umbrellas aren't allowed on most rides. A poncho keeps you moving without storage hassle.",
    },
  ];

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom rain-safe picks",
        text: "Pirates, Haunted Mansion, Peter Pan's Flight, Little Mermaid, Buzz Lightyear, Winnie the Pooh, and \"it's a small world\" all stay open and dry.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getHeatSuggestions(parkId, severity) {
  const common = [
    {
      title: "Free water reset",
      text: "Stop at any quick-service location and ask for free cups of ice water.",
    },
    {
      title: "AC break between rides",
      text: "Prioritize an indoor attraction or show before the next major outdoor push.",
    },
  ];

  if (severity === "extreme_heat") {
    common.push({
      title: "Resort break window",
      text: "If staying onsite, midday is a smart time to head back to the hotel for the pool or AC for a couple hours, then return when conditions soften.",
    });
  }

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom cool-down picks",
        text: "Carousel of Progress, PhilharMagic, Pirates, Haunted Mansion, and Hall of Presidents are AC-safe recovery options.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getWarmSuggestions() {
  return [
    {
      title: "Hydration check",
      text: "It's warm. Carry water and grab a refill between rides.",
    },
    {
      title: "Mix in indoor breaks",
      text: "Drop in an indoor show or AC ride between outdoor pushes.",
    },
  ];
}

export function getRecoverySuggestions({ parkId, weather }) {
  const weatherMode = getWeatherMode(weather);

  switch (weatherMode.mode) {
    case "storm":
      return getStormSuggestions(parkId);
    case "rain":
      return getRainSuggestions(parkId);
    case "extreme_heat":
      return getHeatSuggestions(parkId, "extreme_heat");
    case "hot":
      return getHeatSuggestions(parkId, "hot");
    case "warm":
      return getWarmSuggestions();
    case "normal":
    default:
      return [];
  }
}
