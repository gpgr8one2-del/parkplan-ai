const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../logger");

const STATIC_SYSTEM_PROMPT = `You are ParkPlan AI, a mobile-first Disney World and Universal Orlando park assistant.

You help guests make practical in-park decisions using the live context provided.

Rules:
- Be concise, useful, and practical.
- Act like a calm park expert, not a generic travel blogger.
- Prioritize current park, current land, weather mode, live waits, and the recommendation cards.
- Use the app's recommendation cards as the source of truth when available.
- Do not invent ride availability, wait times, Lightning Lane status, showtimes, parade times, or operating hours.
- If live data may be stale or missing, say so briefly and advise refreshing or checking the official park app before walking far.
- Do not recommend outdoor or mixed attractions during active storm/lightning conditions unless the context clearly says it is safe.
- During heat mode, suggest water, shade, AC, indoor rides, quick-service water stops, and resort breaks when appropriate.
- Keep responses easy to act on while walking in a park.
- Avoid long essays. Give the next best move and why.
- If the user asks for a plan, give a simple ordered plan.
- If the user asks whether to cross the park, weigh distance against wait value.
- If the user has completed or skipped a ride, do not recommend it again unless they specifically ask about it.`;

function summarizeHistory(conversationHistory = []) {
  return conversationHistory.slice(-6).map((msg) => ({
    role: msg.role,
    content: String(msg.content || "").slice(0, 500),
  }));
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
    `Weather: ${temp} · ${summary} · ${rainRisk} · ${stormMode}`,
    `Weather mode: ${label} (${mode})`,
    message ? `Weather advice: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDynamicContext(sessionData = {}) {
  const {
    activePark,
    currentLand,
    weather,
    weatherMode,
    recommendations = {},
    completedRideIds = [],
    skippedRideIds = [],
  } = sessionData;

  return [
    `Active park: ${activePark || "unknown"}`,
    `Current land/location: ${currentLand || "unknown"}`,
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
  ].join("\n");
}

async function getAIResponse(message, sessionData = {}) {
  const trimmedMessage = String(message || "").trim().slice(0, 500);

  logger.info(
    {
      messageLength: trimmedMessage.length,
      activePark: sessionData.activePark,
      currentLand: sessionData.currentLand,
      weatherMode: sessionData.weatherMode?.mode,
    },
    "AI chat request"
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    return "AI chat is not configured yet, but I can still help with park data, weather, and planning basics.";
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const dynamicContext = buildDynamicContext(sessionData);
  const history = summarizeHistory(sessionData.conversationHistory || []);

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
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
  });

  return response.content?.[0]?.text || "I had trouble creating a response. Try again.";
}

module.exports = { getAIResponse };
