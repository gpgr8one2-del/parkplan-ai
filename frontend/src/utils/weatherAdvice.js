import { getWaterOptionsForLand } from "../parkAmenities";

/* -------------------------------------------------------------------------- */
/* Current weather condition helpers                                          */
/* -------------------------------------------------------------------------- */

function getWeatherSummary(weather) {
  return String(weather?.summary || "").toLowerCase();
}

function getEffectiveTempF(weather) {
  return (
    weather?.feelsLikeF ??
    weather?.heatIndexF ??
    weather?.tempF ??
    null
  );
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
  const effectiveTempF = getEffectiveTempF(weather);
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

  if (effectiveTempF >= 98) {
    return {
      mode: "extreme_heat",
      label: "Extreme Heat Mode",
      message:
        "It feels very hot out. A water stop, shade break, indoor attraction, or longer resort reset can help keep everyone feeling good.",
    };
  }

  if (effectiveTempF >= 92) {
    return {
      mode: "hot",
      label: "Heat Smart Mode",
      message:
        "It feels warm enough to plan smarter. A quick water stop, shade break, or indoor attraction can help keep everyone feeling good.",
    };
  }

  if (effectiveTempF >= 87) {
    return {
      mode: "warm",
      label: "Hydration Reminder",
      message:
        "It feels warm out. A quick water stop or indoor break between attractions can help keep the day smooth.",
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
/* EPCOT recovery helpers                                                     */
/* -------------------------------------------------------------------------- */

function getEpcotRainSuggestions(currentLand) {
  const byLand = {
    world_celebration: [
      {
        title: "World Celebration rain plan",
        text: "Stay near the front/center instead of crossing the park. Spaceship Earth, Journey Into Imagination, Disney & Pixar Short Film Festival, Connections, Creations Shop, and nearby indoor spaces are smart rain moves.",
      },
      {
        title: "Avoid a bad weather hike",
        text: "If rain is active or building, do not chase Test Track or deep World Showcase for a small wait-time improvement.",
      },
    ],

    world_discovery: [
      {
        title: "World Discovery rain caution",
        text: "Test Track is weather-sensitive and can pause during rain or lightning. Favor Mission: SPACE, Connections, or a move toward Spaceship Earth until the weather settles.",
      },
      {
        title: "Avoid getting stranded",
        text: "If storms are building, do not walk deep into World Showcase just for a small wait-time improvement.",
      },
    ],

    world_nature: [
      {
        title: "World Nature rain plan",
        text: "The Land and The Seas are excellent rain shelters. Soarin’, Living with the Land, Awesome Planet, Nemo, Turtle Talk, aquarium time, and Sunshine Seasons can absorb a long weather delay.",
      },
      {
        title: "Smart next move",
        text: "If you are near The Land, stay there for a full reset rather than crossing EPCOT in the rain.",
      },
    ],

    world_showcase_west: [
      {
        title: "World Showcase West rain plan",
        text: "Use France, United Kingdom, Canada, or nearby International Gateway cover. Remy, France theater options, Canada Far and Wide, shops, and nearby dining are better than hiking to Test Track.",
      },
      {
        title: "Better escape route",
        text: "If you need a longer indoor reset, move toward World Nature and The Land instead of crossing to World Discovery.",
      },
    ],

    world_showcase_center: [
      {
        title: "World Showcase Center rain plan",
        text: "American Adventure is one of the best long indoor resets in EPCOT. Regal Eagle, Japan shops, Morocco cover, and nearby festival spaces can help you wait out rain without over-walking.",
      },
      {
        title: "Do not overreact",
        text: "From the middle of World Showcase, both front-of-park sides are a commitment. Pick the nearest indoor shelter first, then move once rain weakens.",
      },
    ],

    world_showcase_east: [
      {
        title: "World Showcase East rain plan",
        text: "Frozen, Gran Fiesta Tour, Mexico pavilion, China pavilion, and Norway shops are your best nearby rain-friendly options. Stay east unless a front-of-park ride is truly worth it.",
      },
      {
        title: "Test Track warning",
        text: "Even though Test Track is closer from this side, it is weather-sensitive. Check conditions before walking that way.",
      },
    ],
  };

  return (
    byLand[currentLand] || [
      {
        title: "EPCOT rain plan",
        text: "Pick the nearest indoor pavilion, shop, show, or restaurant first. EPCOT walks are long, and rain makes small wait-time savings less valuable.",
      },
    ]
  );
}

function getEpcotStormSuggestions(currentLand) {
  const byLand = {
    world_celebration: [
      {
        title: "World Celebration storm shelter",
        text: "Use Spaceship Earth, Connections, Creations Shop, Journey Into Imagination, or Disney & Pixar Short Film Festival until lightning clears.",
      },
    ],

    world_discovery: [
      {
        title: "World Discovery storm shelter",
        text: "Do not count on Test Track during lightning. Use Mission: SPACE, Connections, or nearby indoor shops/restaurants until the storm passes.",
      },
    ],

    world_nature: [
      {
        title: "World Nature storm shelter",
        text: "The Land and The Seas are your best storm shelters. Soarin’, Living with the Land, Awesome Planet, Nemo, Turtle Talk, aquarium time, and food seating can comfortably absorb a delay.",
      },
    ],

    world_showcase_west: [
      {
        title: "World Showcase West storm shelter",
        text: "Stay in France/UK/Canada cover, shops, theater options, or dining. If you can safely move, The Land pavilion is the better long-reset target than World Discovery.",
      },
    ],

    world_showcase_center: [
      {
        title: "World Showcase Center storm shelter",
        text: "American Adventure, Regal Eagle, Japan shops, Morocco cover, and festival indoor areas are your safest nearby reset choices.",
      },
    ],

    world_showcase_east: [
      {
        title: "World Showcase East storm shelter",
        text: "Use Mexico pavilion, Frozen/Norway indoor areas, China pavilion, or nearby covered dining. Avoid walking toward Test Track until lightning risk clears.",
      },
    ],
  };

  return (
    byLand[currentLand] || [
      {
        title: "EPCOT storm shelter",
        text: "Get inside the nearest pavilion, shop, restaurant, or indoor attraction. EPCOT has long exposed walkways, so wait for lightning risk to clear before crossing the park.",
      },
    ]
  );
}

function getEpcotHeatSuggestions(currentLand, severity) {
  const strongHeat = severity === "extreme_heat" || severity === "hot";

  const byLand = {
    world_celebration: [
      {
        title: "World Celebration cool-down",
        text: "Use Spaceship Earth, Connections, Creations Shop, Journey Into Imagination, or Disney & Pixar Short Film Festival before pushing into the lagoon loop.",
      },
    ],

    world_discovery: [
      {
        title: "World Discovery cool-down",
        text: "Mission: SPACE and Connections are your easiest AC resets. Test Track can be rough in heat because of the outdoor section and exposed walking.",
      },
    ],

    world_nature: [
      {
        title: "World Nature cool-down",
        text: "The Land and The Seas are EPCOT heat anchors. Soarin’, Living with the Land, Awesome Planet, Nemo, Turtle Talk, aquarium time, and Sunshine Seasons can reset the whole group.",
      },
    ],

    world_showcase_west: [
      {
        title: "World Showcase West cool-down",
        text: "Use France/UK/Canada shops, Les Halles, theater options, Remy if reasonable, or move toward The Land for a longer AC reset.",
      },
    ],

    world_showcase_center: [
      {
        title: "World Showcase Center cool-down",
        text: "American Adventure and Regal Eagle are strong seated AC resets. Japan, Morocco, Germany, and Italy also have shops or food stops that can slow the pace.",
      },
    ],

    world_showcase_east: [
      {
        title: "World Showcase East cool-down",
        text: "Use Mexico pavilion, Gran Fiesta Tour, Norway shops, Frozen if reasonable, China pavilion, or Lotus Blossom Café before walking farther around the lagoon.",
      },
    ],
  };

  const extra = strongHeat
    ? [
        {
          title: "Do not over-walk EPCOT in heat",
          text: "EPCOT distances are sneaky. A nearby AC reset is usually better than crossing the park for a slightly better wait.",
        },
      ]
    : [];

  return [...(byLand[currentLand] || []), ...extra];
}

/* -------------------------------------------------------------------------- */
/* Mode-specific recovery suggestions                                         */
/*                                                                            */
/* Each mode returns its OWN advice. We never share copy across modes. Pool   */
/* breaks belong in heat advice, not storm advice. Free-water reminders make  */
/* sense in heat, not in lightning.                                           */
/* -------------------------------------------------------------------------- */

function getStormSuggestions(parkId, currentLand) {
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

    epcot: getEpcotStormSuggestions(currentLand),
  };

  return [...common, ...(byPark[parkId] || [])];
}

function getRainSuggestions(parkId, currentLand) {
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

    epcot: getEpcotRainSuggestions(currentLand),
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

    epcot: getEpcotHeatSuggestions(currentLand, severity),
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

  if (parkId === "epcot") {
    suggestions.push(...getEpcotHeatSuggestions(currentLand, "warm"));
  }

  return suggestions;
}

export function getRecoverySuggestions({ parkId, weather, currentLand }) {
  const weatherMode = getWeatherMode(weather);

  switch (weatherMode.mode) {
    case "storm":
      return getStormSuggestions(parkId, currentLand);
    case "rain":
      return getRainSuggestions(parkId, currentLand);
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
