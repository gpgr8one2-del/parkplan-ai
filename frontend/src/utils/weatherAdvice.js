export function getWeatherMode(weather) {
  const tempF = weather?.tempF ?? null;
  const rainRisk = weather?.rainRisk ?? 0;
  const stormMode = weather?.stormMode === true;

  if (stormMode) {
    return {
      mode: "storm",
      label: "Storm Smart Mode",
      severity: "high",
      message:
        "Storms may affect outdoor attractions. Prioritize indoor rides, shows, food breaks, and covered queues.",
    };
  }

  if (rainRisk >= 0.45) {
    return {
      mode: "rain",
      label: "Rain Watch",
      severity: "medium",
      message:
        "Rain chances are elevated. Keep outdoor rides flexible and prioritize indoor options nearby.",
    };
  }

  if (tempF >= 98) {
    return {
      mode: "extreme_heat",
      label: "Extreme Heat Mode",
      severity: "high",
      message:
        "This is a recovery-first window. Prioritize AC, indoor seating, water breaks, and consider a resort/pool break if staying onsite.",
    };
  }

  if (tempF >= 93) {
    return {
      mode: "hot",
      label: "Beat the Heat Mode",
      severity: "medium",
      message:
        "Heat is high. Mix in indoor attractions, AC shows, and water breaks before pushing more outdoor rides.",
    };
  }

  if (tempF >= 88) {
    return {
      mode: "warm",
      label: "Hydration Reminder",
      severity: "low",
      message:
        "It is warm. Build in water and shade breaks between attractions.",
    };
  }

  return {
    mode: "normal",
    label: "Good Conditions",
    severity: "low",
    message: "Weather looks manageable right now.",
  };
}

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

export function getRecoverySuggestions({ parkId, weather }) {
  const weatherMode = getWeatherMode(weather);

  if (weatherMode.mode === "normal") return [];

  const common = [
    {
      title: "Free water reset",
      text: "Stop at any quick-service location and ask for free cups of ice water.",
    },
    {
      title: "AC break",
      text: "Prioritize an indoor attraction or show before the next major outdoor push.",
    },
  ];

  const byPark = {
    magic_kingdom: [
      {
        title: "Magic Kingdom cool-down picks",
        text: "Carousel of Progress, PhilharMagic, Monsters Inc. Laugh Floor, Pirates, or Hall of Presidents are strong recovery options.",
      },
      {
        title: "Resort break option",
        text: "If staying onsite, consider a midday pool/rest break and return later when heat and crowds soften.",
      },
    ],
  };

  return [...common, ...(byPark[parkId] || [])];
}
