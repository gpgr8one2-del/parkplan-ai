const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../logger");

const STATIC_SYSTEM_PROMPT = `You are ParkPlan AI, an expert mobile-first Disney World and Universal Orlando planning assistant for 2026.

Rules:
- Be concise, useful, and practical.
- Prioritize the user's actual park, weather, group type, and current waits.
- Recommend realistic next steps, not generic advice.
- Do not invent ride availability.
- If live data is missing, say so briefly and fall back gracefully.
- Keep responses easy to act on while walking in a park.`;

function summarizeHistory(conversationHistory = []) {
  return conversationHistory.slice(-6).map((msg) => ({
    role: msg.role,
    content: String(msg.content || "").slice(0, 500),
  }));
}

function buildDynamicContext(sessionData = {}) {
  const { activePark, weather, completedRideIds = [], skippedRideIds = [] } = sessionData;
  const weatherLine = weather ? `Weather: ${weather.summary || "available"}` : "Weather: unavailable";
  return [
    `Active park: ${activePark || "unknown"}`,
    weatherLine,
    `Completed rides: ${completedRideIds.slice(0, 15).join(", ") || "none"}`,
    `Skipped rides: ${skippedRideIds.slice(0, 15).join(", ") || "none"}`,
  ].join("\n");
}

async function getAIResponse(message, sessionData = {}) {
  const trimmedMessage = String(message || "").trim().slice(0, 500);
  logger.info({ messageLength: trimmedMessage.length }, "AI chat request");

  if (!process.env.ANTHROPIC_API_KEY) {
    return "AI chat is not configured yet, but I can still help with park data, weather, and planning basics.";
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const dynamicContext = buildDynamicContext(sessionData);
  const history = summarizeHistory(sessionData.conversationHistory || []);

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 350,
    temperature: 0.4,
    system: STATIC_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Context:\n${dynamicContext}` },
      ...history,
      { role: "user", content: trimmedMessage },
    ],
  });

  return response.content?.[0]?.text || "I had trouble creating a response. Try again.";
}

module.exports = { getAIResponse };
