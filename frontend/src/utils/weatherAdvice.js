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
  if (weather?.currentPrecipitation === true ) return true;
  if (weather?.currentPrecipitation === false) return false;

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

function getUpcomingPrecipitationWindow(weather) {
  const rainWindow = weather?.nextPrecipitationWindow;

  if (!weather?.upcomingPrecipitation && !rainWindow) {
    return null;
  }

  if (!rainWindow || typeof rainWindow !== "object") {
    return weather?.upcomingPrecipitation ? {} : null;
  }

  const summary = String(rainWindow.summary || "").toLowerCase();
  const rainRisk = Number(rainWindow.rainRisk || 0);
  const probability = Number(rainWindow.precipitationProbability || 0);
  const intensity = Number(rainWindow.precipitationIntensityInPerHr || 0);

  if (
    weather?.upcomingPrecipitation === true ||
    intensity > 0 ||
    probability >= 40 ||
    rainRisk >= 0.4 ||
    summary.includes("rain") ||
    summary.includes("drizzle") ||
    summary.includes("shower") ||
    summary.includes("storm") ||
    summary.includes("thunder") ||
    summary.includes("lightning")
  ) {
    return rainWindow;
  }

  return null;
}

function isUpcomingStorming(rainWindow) {
  const summary = String(rainWindow?.summary || "").toLowerCase();
  const rainRisk = Number(rainWindow?.rainRisk || 0);

  return (
    rainRisk >= 0.75 ||
    summary.includes("thunderstorm") ||
    summary.includes("storm") ||
    summary.includes("thunder") ||
    summary.includes("lightning") ||
    summary.includes("heavy rain")
  );
}

function buildUpcomingPrecipitationMessage(rainWindow, upcomingStorm) {
  const probability = Number(rainWindow?.precipitationProbability || 0);
  const probabilityText =
    probability >= 40 ? ` Forecast chance is around ${probability}%.` : "";

  if (upcomingStorm) {
    return `Storm risk may be building near the park soon.${probabilityText} Favor indoor or covered options nearby, avoid long exposed walks, and wait for the signal to clear before committing to outdoor rides.`;
  }

  return `Rain may move near the park soon.${probabilityText} Keep your plan flexible, favor indoor or covered options nearby, and be careful before walking across the park for outdoor rides.`;
}

export function getWeatherMode(weather) {
  const effectiveTempF = getEffectiveTempF(weather);
  const rainRisk = weather?.rainRisk ?? 0;
  const stormMode = isCurrentlyStorming(weather);
  const currentlyRaining = isCurrentlyRaining(weather);
  const activeStormMode = stormMode && currentlyRaining;
  const nearbyStormMode = stormMode && !currentlyRaining;
  const upcomingRainWindow = getUpcomingPrecipitationWindow(weather);
  const upcomingStorm = nearbyStormMode || isUpcomingStorming(upcomingRainWindow);

  if (activeStormMode) {
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
        "Rain is being reported at the park right now. Keep your plan flexible, lean on indoor options nearby, and be careful before walking across the park for outdoor rides.",
    };
  }

  if (upcomingRainWindow || nearbyStormMode) {
    return {
      mode: "rain",
      label: upcomingStorm ? "Storm Watch" : "Rain Watch",
      message: buildUpcomingPrecipitationMessage(upcomingRainWindow, upcomingStorm),
    };
  }

  if (rainRisk >= 0.55) {
    return {
      mode: "rain",
      label: "Rain Watch",
      message:
        "Rain chances are elevated near the park. Outdoor rides may pause briefly. Keep your plan flexible and lean on indoor options nearby.",
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
/* Hollywood Studios recovery helpers                                         */
/* -------------------------------------------------------------------------- */

function getHollywoodRainSuggestions(currentLand) {
  const byLand = {
    hollywood_boulevard: [
      {
        title: "Hollywood Boulevard rain plan",
        text: "Use Mickey & Minnie’s Runaway Railway, shops, The Trolley Car Café, or move toward ABC Commissary if you need a longer indoor reset.",
      },
      {
        title: "Avoid a bad rain hike",
        text: "Do not chase Galaxy’s Edge, Toy Story Land, or Sunset Boulevard through rain unless the wait is truly worth it.",
      },
    ],

    sunset_boulevard: [
      {
        title: "Sunset Boulevard rain plan",
        text: "Tower of Terror and Rock ’n’ Roller Coaster are indoor once you are committed, but the area can still be exposed. Beauty and the Beast works if showtime is close and weather is not severe.",
      },
      {
        title: "If storms build",
        text: "Use nearby shops or move carefully toward Hollywood Boulevard instead of walking to the back of the park.",
      },
    ],

    echo_lake: [
      {
        title: "Echo Lake rain plan",
        text: "Star Tours, Frozen Sing-Along, Backlot Express, and nearby shops are strong rain-friendly choices. This is one of the better areas to absorb a weather delay.",
      },
    ],

    grand_avenue: [
      {
        title: "Grand Avenue rain plan",
        text: "BaseLine Tap House, nearby covered Grand Avenue areas, ABC Commissary, and Backlot Express are better rain-reset choices now. BaseLine is good for shade and water, while ABC Commissary and Backlot Express are stronger indoor AC resets.",
      },
      {
        title: "Smarter next move",
        text: "If rain is active, stay around Grand Avenue or Galaxy’s Edge cover rather than hiking to Sunset Boulevard.",
      },
    ],

    star_wars_galaxys_edge: [
      {
        title: "Galaxy’s Edge rain plan",
        text: "Rise of the Resistance, Smugglers Run, Docking Bay 7, shops, and covered market areas are better than crossing the park in rain.",
      },
      {
        title: "Avoid the long exposed move",
        text: "Tower of Terror and Rock ’n’ Roller Coaster are a real hike from here. Only cross for them if the wait is excellent and weather is clearing.",
      },
    ],

    toy_story_land: [
      {
        title: "Toy Story Land rain caution",
        text: "Toy Story Land is exposed. Slinky Dog and Alien Swirling Saucers can be poor rain choices. Toy Story Mania is the best nearby indoor reset.",
      },
      {
        title: "Better shelter nearby",
        text: "If rain is building, move toward Toy Story Mania, Animation Courtyard, or Galaxy’s Edge cover instead of lingering outside.",
      },
    ],

    animation_courtyard: [
      {
        title: "Animation Courtyard rain plan",
        text: "Walt Disney Presents, Vacation Fun, Disney Junior, nearby shops, and the path toward Toy Story Mania are useful low-stress rain options.",
      },
    ],

    commissary_lane: [
      {
        title: "Commissary Lane rain plan",
        text: "ABC Commissary is one of the easiest indoor AC and water resets in Hollywood Studios. Use it before making a long rainy walk.",
      },
    ],
  };

  return (
    byLand[currentLand] || [
      {
        title: "Hollywood Studios rain plan",
        text: "Pick the nearest indoor show, restaurant, shop, or attraction first. Hollywood Studios has exposed stretches, so small wait-time savings may not be worth a wet cross-park walk.",
      },
    ]
  );
}

function getHollywoodStormSuggestions(currentLand) {
  const byLand = {
    hollywood_boulevard: [
      {
        title: "Hollywood Boulevard storm shelter",
        text: "Use Mickey & Minnie’s Runaway Railway, shops, The Trolley Car Café, or ABC Commissary until lightning clears.",
      },
    ],

    sunset_boulevard: [
      {
        title: "Sunset Boulevard storm shelter",
        text: "Get indoors or under solid cover. Tower and Rock ’n’ Roller are indoor attractions, but avoid exposed walks if lightning is active.",
      },
    ],

    echo_lake: [
      {
        title: "Echo Lake storm shelter",
        text: "Star Tours, Frozen Sing-Along, Backlot Express, and nearby indoor areas are strong shelter choices.",
      },
    ],

    grand_avenue: [
      {
        title: "Grand Avenue storm shelter",
        text: "Use nearby covered Grand Avenue areas if you are stuck there, but for a stronger storm reset, move to ABC Commissary, Backlot Express, or Galaxy’s Edge cover when it is safe to do so.",
      },
    ],

    star_wars_galaxys_edge: [
      {
        title: "Galaxy’s Edge storm shelter",
        text: "Use Docking Bay 7, shops, covered market areas, Rise, or Smugglers Run if available. Do not hike to Sunset Boulevard during active lightning.",
      },
    ],

    toy_story_land: [
      {
        title: "Toy Story Land storm shelter",
        text: "Toy Story Land is exposed. Use Toy Story Mania or move toward Animation Courtyard/Galaxy’s Edge cover if it is safe to do so.",
      },
    ],

    animation_courtyard: [
      {
        title: "Animation Courtyard storm shelter",
        text: "Walt Disney Presents, Vacation Fun, Disney Junior, and nearby indoor spaces can help you wait out lightning.",
      },
    ],

    commissary_lane: [
      {
        title: "Commissary Lane storm shelter",
        text: "ABC Commissary is a strong indoor reset with AC, seating, and water access.",
      },
    ],
  };

  return (
    byLand[currentLand] || [
      {
        title: "Hollywood Studios storm shelter",
        text: "Get inside the nearest attraction, shop, restaurant, or theater. Avoid long exposed paths until lightning risk clears.",
      },
    ]
  );
}

function getHollywoodHeatSuggestions(currentLand, severity) {
  const strongHeat = severity === "extreme_heat" || severity === "hot";

  const byLand = {
    hollywood_boulevard: [
      {
        title: "Hollywood Boulevard cool-down",
        text: "Use Mickey & Minnie’s Runaway Railway, shops, The Trolley Car Café, or ABC Commissary before pushing deeper into the park.",
      },
    ],

    sunset_boulevard: [
      {
        title: "Sunset Boulevard cool-down",
        text: "Tower and Rock ’n’ Roller are indoor, but Sunset Boulevard can still feel hot. Sunset Ranch Market is useful for water, and Beauty and the Beast can work as a seated break when showtime lines up.",
      },
    ],

    echo_lake: [
      {
        title: "Echo Lake cool-down",
        text: "Star Tours, Frozen Sing-Along, and Backlot Express are strong AC and water reset choices.",
      },
    ],

    grand_avenue: [
      {
        title: "Grand Avenue cool-down",
        text: "BaseLine Tap House can help with shade and water, but it is not a true AC reset. For real cooling, move toward ABC Commissary, Backlot Express, or Docking Bay 7 depending on which direction you are headed.",
      },
    ],

    star_wars_galaxys_edge: [
      {
        title: "Galaxy’s Edge cool-down",
        text: "Docking Bay 7 is your best AC and water anchor. Smugglers Run and Rise can also help if waits are reasonable.",
      },
    ],

    toy_story_land: [
      {
        title: "Toy Story Land heat warning",
        text: "Toy Story Land is one of the rougher heat zones. Use Toy Story Mania, refill water, and avoid long exposed waits for Slinky Dog or Alien Swirling Saucers in peak heat.",
      },
    ],

    animation_courtyard: [
      {
        title: "Animation Courtyard cool-down",
        text: "Walt Disney Presents, Vacation Fun, Disney Junior, and nearby indoor spaces are good low-pressure AC resets.",
      },
    ],

    commissary_lane: [
      {
        title: "Commissary Lane cool-down",
        text: "ABC Commissary is one of the strongest Hollywood Studios heat resets: AC, seating, food, and water access in one place.",
      },
    ],
  };

  const extra = strongHeat
    ? [
        {
          title: "Do not over-walk Hollywood Studios in heat",
          text: "Toy Story Land, Galaxy’s Edge, and Sunset Boulevard can feel far apart in the heat. A nearby AC reset is usually smarter than chasing a slightly better wait.",
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
    hollywood: getHollywoodStormSuggestions(currentLand),
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
    hollywood: getHollywoodRainSuggestions(currentLand),
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
    hollywood: getHollywoodHeatSuggestions(currentLand, severity),
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

  if (parkId === "hollywood") {
    suggestions.push(...getHollywoodHeatSuggestions(currentLand, "warm"));
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
