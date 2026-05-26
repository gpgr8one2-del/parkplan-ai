const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../logger");

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

const STATIC_SYSTEM_PROMPT = `You are ParkPlan AI, a mobile-first Disney World and Universal Orlando park assistant.

You help guests make practical in-park decisions using the live context provided.

Rules:
- Be concise, useful, and practical.
- Act like a calm park expert, not a generic travel blogger.
- Prioritize current park, current land, current activity, weather mode, live waits, and the recommendation cards.
- Use the app's recommendation cards as the source of truth when available.
- If the guest is currently in line for a ride, respect that choice. Do not tell them to skip it unless they say the ride is down, the line is unsafe, someone may be overheating/sick, there is true meltdown risk, or they ask whether to leave.
- If the guest is currently in line, use elapsed line time, posted wait when joined, weather, ride value, and family energy before advising them to stay or leave.
- When the user is already in line and asks whether to leave, do not give a hard "leave the line" answer unless safety/health, a stopped line, true meltdown risk, ride closure, or severe family distress clearly outweighs the ride value.
- If elapsed line time, whether the line is moving, must-do status, or family severity is missing, ask one quick clarifying question or give a clear stay-vs-leave threshold.
- For high-value waits on headliners or weather-demand rides, bias toward staying if the line is moving and the family can realistically make it, then recommend food, water, AC, or a resort break immediately after.
- If the guest is currently in line, focus on what to do after that ride, nearby backups, weather-safe options, and pacing.
- Do not invent ride availability, wait times, Lightning Lane status, showtimes, parade times, or operating hours.
- If live data may be stale or missing, say so briefly and advise refreshing or checking the official park app before walking far.
- Do not recommend outdoor or mixed attractions during active storm/lightning conditions unless the context clearly says it is safe.
- During heat mode, suggest water, shade, AC, indoor rides, quick-service water stops, and resort breaks when appropriate.
- Keep responses easy to act on while walking in a park.
- Avoid long essays. Give the next best move and why.
- If the user asks for a plan, give a simple ordered plan.
- If the user asks whether to cross the park, weigh distance against wait value, weather, and family energy.
- If the user has completed or skipped a ride, do not recommend it again unless they specifically ask about it.

Scope rules:
- Only answer questions related to Disney, Universal, theme parks, park strategy, rides, shows, food, weather, resorts, transportation, accessibility, family pacing, current trip logistics, or using ParkPlan AI.
- Do not help with unrelated topics such as schoolwork, coding, legal advice, medical advice, finance, stock trading, job applications, general research, personal writing, recipes, or anything outside park/trip support.
- If the user asks something unrelated, politely redirect them back to park planning.
- Keep redirects short and friendly.`;

const OFF_TOPIC_REPLY =
  "I’m here to help with your park day, ride strategy, weather, food breaks, resorts, transportation, and trip planning. Ask me what to do next in the park and I’ll help.";

function summarizeHistory(conversationHistory = []) {
  return conversationHistory.slice(-6).map((msg) => ({
    role: msg.role,
    content: String(msg.content || "").slice(0, 500),
  }));
}

function isClearlyOffTopic(message = "") {
  const text = String(message || "").toLowerCase().trim();

  if (!text) return false;

  const parkTerms = [
    "park",
    "ride",
    "rides",
    "line",
    "queue",
    "wait",
    "wait time",
    "disney",
    "magic kingdom",
    "epcot",
    "hollywood studios",
    "animal kingdom",
    "universal",
    "islands of adventure",
    "epic universe",
    "tron",
    "tiana",
    "big thunder",
    "haunted mansion",
    "pirates",
    "space mountain",
    "jungle cruise",
    "peoplemover",
    "carousel of progress",
    "small world",
    "peter pan",
    "seven dwarfs",
    "guardians",
    "remy",
    "frozen",
    "soarin",
    "test track",
    "weather",
    "rain",
    "storm",
    "lightning",
    "heat",
    "hydration",
    "water",
    "food",
    "restaurant",
    "quick service",
    "snack",
    "resort",
    "hotel",
    "transportation",
    "bus",
    "monorail",
    "skyliner",
    "boat",
    "walking",
    "stroller",
    "wheelchair",
    "scooter",
    "mobility",
    "family",
    "kids",
    "toddler",
    "break",
    "meltdown",
    "nap",
    "lightning lane",
    "multipass",
    "single pass",
    "rope drop",
    "fireworks",
    "parade",
    "show",
    "castle",
    "characters",
    "what should we do",
    "what should i do",
    "what next",
    "next",
  ];

  if (parkTerms.some((term) => text.includes(term))) {
    return false;
  }

  const offTopicPatterns = [
    /\b(stock|stocks|crypto|bitcoin|trading|portfolio|investment|investing)\b/,
    /\b(homework|essay|paper|school assignment|research paper)\b/,
    /\b(resume|cover letter|job application|interview prep)\b/,
    /\b(code|coding|javascript|python|react|sql|debug this|write a program)\b/,
    /\b(recipe|cook|bake|keto|ingredients|nutrition label)\b/,
    /\b(legal|lawsuit|contract|attorney|court)\b/,
    /\b(medical|diagnose|symptoms|medicine|doctor|rash|headache)\b/,
    /\b(write me|rewrite|summarize this|translate|make a poem|song lyrics)\b/,
    /\b(math|algebra|calculus|equation|solve this)\b/,
  ];

  return offTopicPatterns.some((pattern) => pattern.test(text));
}

function formatRideCard(label, ride) {
  if (!ride) return `${label}: none`;

  const name = ride.name || "Unknown";
  const wait =
    ride.waitTime === null || ride.waitTime === undefined
      ? "unknown wait"
      : `${ride.waitTime} min wait`;

  const land = ride.land ? ` · land: ${ride.land}` : "";
  const reason = ride.reason ? ` · reason: ${ride.reason}` : "";
  const planAheadReason = ride.planAheadReason
    ? ` · strategy: ${ride.planAheadReason}`
    : "";
  const distance = ride.proximityDistance
    ? ` · proximity: ${ride.proximityDistance}`
    : "";
  const waitStatus = ride.waitValueStatus?.status
    ? ` · wait value: ${ride.waitValueStatus.status}`
    : "";

  return `${label}: ${name} · ${wait}${land}${distance}${waitStatus}${reason}${planAheadReason}`;
}

function buildWeatherContext(weather, weatherMode) {
  if (!weather && !weatherMode) {
    return "Weather: unavailable";
  }

  const temp = weather?.tempF ? `${weather.tempF}°F` : "temp unavailable";
  const feelsLike =
    weather?.feelsLikeF !== undefined && weather?.feelsLikeF !== null
      ? `feels like ${weather.feelsLikeF}°F`
      : "feels-like unavailable";
  const humidity =
    weather?.humidity !== undefined && weather?.humidity !== null
      ? `humidity: ${weather.humidity}%`
      : "humidity unavailable";
  const summary = weather?.summary || "summary unavailable";
  const rainRisk =
    weather?.rainRisk !== undefined && weather?.rainRisk !== null
      ? `rain risk: ${weather.rainRisk}`
      : "rain risk unavailable";
  const stormMode = weather?.stormMode ? "storm mode active" : "storm mode inactive";

  const mode = weatherMode?.mode || "unknown";
  const label = weatherMode?.label || "unknown";
  const message = weatherMode?.message || "";

  return [
    `Weather: ${temp} · ${feelsLike} · ${humidity} · ${summary} · ${rainRisk} · ${stormMode}`,
    `Weather mode: ${label} (${mode})`,
    message ? `Weather advice: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCurrentActivityContext(currentActivity) {
  if (!currentActivity) {
    return "Current activity: none";
  }

  if (currentActivity.type === "in_line") {
    const rideName = currentActivity.rideName || "unknown ride";
    const land = currentActivity.land ? ` · land: ${currentActivity.land}` : "";
    const postedWait =
      currentActivity.postedWaitAtStart !== null &&
      currentActivity.postedWaitAtStart !== undefined
        ? ` · posted wait when joined: ${currentActivity.postedWaitAtStart} min`
        : " · posted wait when joined: unknown";
    const elapsed =
      currentActivity.elapsedMinutesInLine !== null &&
      currentActivity.elapsedMinutesInLine !== undefined
        ? ` · elapsed time in line: ${currentActivity.elapsedMinutesInLine} min`
        : " · elapsed time in line: unknown";
    const startedAt = currentActivity.startedAt
      ? ` · started at: ${currentActivity.startedAt}`
      : "";
    const summary = currentActivity.summary
      ? `\nCurrent activity summary: ${currentActivity.summary}`
      : "";

    return `Current activity: guest is in line for ${rideName}${land}${postedWait}${elapsed}${startedAt}${summary}`;
  }

  return `Current activity: ${currentActivity.type || "unknown"}`;
}

function buildDynamicContext(sessionData = {}) {
  const {
    activePark,
    currentLand,
    currentActivity,
    currentActivityContext,
    parkPlanBehaviorHints,
    weather,
    weatherMode,
    recommendations = {},
    completedRideIds = [],
    skippedRideIds = [],
    reportedRideIssueIds = [],
  } = sessionData;

  return [
    `Active park: ${activePark || "unknown"}`,
    `Current land/location: ${currentLand || "unknown"}`,
    buildCurrentActivityContext(currentActivityContext || currentActivity),
    buildWeatherContext(weather, weatherMode),
    "",
    "Current recommendation cards:",
    formatRideCard("Best Move", recommendations.bestMove),
    formatRideCard("Smart Backup", recommendations.backup),
    formatRideCard("Worth the Walk", recommendations.worthTheWalk),
    formatRideCard("Plan Ahead", recommendations.planAhead),
    formatRideCard("Wait On This", recommendations.waitOnThis),
    "",
    `Completed ride IDs: ${completedRideIds.slice(0, 25).join(", ") || "none"}`,
    `Skipped ride IDs: ${skippedRideIds.slice(0, 25).join(", ") || "none"}`,
    `Reported ride issue IDs: ${reportedRideIssueIds.slice(0, 25).join(", ") || "none"}`,
    parkPlanBehaviorHints?.inLineDecisionRule
      ? `In-line decision rule from app: ${parkPlanBehaviorHints.inLineDecisionRule}`
      : null,
    parkPlanBehaviorHints?.familyEnergyRule
      ? `Family energy rule from app: ${parkPlanBehaviorHints.familyEnergyRule}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function getAIResponse(message, sessionData = {}) {
  const trimmedMessage = String(message || "").trim().slice(0, 500);

  logger.info(
    {
      messageLength: trimmedMessage.length,
      activePark: sessionData.activePark,
      currentLand: sessionData.currentLand,
      currentActivityType:
        sessionData.currentActivityContext?.type || sessionData.currentActivity?.type,
      currentActivityRide:
        sessionData.currentActivityContext?.rideName ||
        sessionData.currentActivity?.rideName,
      elapsedMinutesInLine:
        sessionData.currentActivityContext?.elapsedMinutesInLine ??
        sessionData.currentActivity?.elapsedMinutesInLine,
      weatherMode: sessionData.weatherMode?.mode,
      model: ANTHROPIC_MODEL,
    },
    "AI chat request"
  );

  if (isClearlyOffTopic(trimmedMessage)) {
    logger.info(
      {
        messageLength: trimmedMessage.length,
        reason: "off_topic_guardrail",
      },
      "AI chat blocked off-topic request"
    );

    return OFF_TOPIC_REPLY;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return "AI chat is not configured yet, but I can still help with park data, weather, and planning basics.";
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const dynamicContext = buildDynamicContext(sessionData);
  const history = summarizeHistory(sessionData.conversationHistory || []);

  const response = await Promise.race([
    anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      temperature: 0.35,
      system: STATIC_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current ParkPlan app context:\n${dynamicContext}`,
        },
        ...history,
        {
          role: "user",
          content: trimmedMessage,
        },
      ],
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI chat request timed out")), 15000)
    ),
  ]);

  return response.content?.[0]?.text || "I had trouble creating a response. Try again.";
}

module.exports = { getAIResponse };
