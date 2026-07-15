const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../logger");

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const REVIEW_TIMEOUT_MS = 8000;
const MAX_REVIEW_TEXT_LENGTH = 1000;
const MAX_SHORTLIST_SIZE = 3;

const REVIEW_SYSTEM_PROMPT = `You are TOHI's pick reviewer. A deterministic recommendation engine has already selected one attraction as the family's TOHI Pick.

Rules:
- The topCandidate is the only candidate being reviewed. Approve or veto it; nothing else.
- The shortlist entries are context only. Do not review them, and never recommend or name a replacement attraction of any kind.
- Hard exclusions (closures, height limits, completed or skipped rides, reported issues, stale data) have already been applied. Do not revisit them.
- Veto only when there is a clear family or context mismatch: family fit, location, weather, or timing.
- If the provided context is not enough to judge, use verdict "uncertain" with reasonCode "insufficient_context".
- Respond with JSON only. No text before or after the JSON object. Exact shape:
{"verdict":"approve" | "veto" | "uncertain","candidateId":"<topCandidate.rideId exactly>","reasonCode":"strong_fit" | "family_mismatch" | "location_mismatch" | "weather_mismatch" | "timing_mismatch" | "insufficient_context","reason":"<one concise plain-language sentence under 200 characters>"}`;

function cleanString(value, maxLength = 160) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function sanitizeCandidate(candidate = {}) {
  if (!candidate || typeof candidate !== "object") return null;

  return {
    rideId: candidate.rideId != null ? String(candidate.rideId).slice(0, 80) : null,
    name: cleanString(candidate.name, 160),
    sourceSlot: cleanString(candidate.sourceSlot, 40),
    wait: Number.isFinite(Number(candidate.wait)) ? Number(candidate.wait) : null,
    area: cleanString(candidate.area, 80),
    engineReason: cleanString(candidate.engineReason, 240),
    engineCaution: cleanString(candidate.engineCaution, 240),
    waitValueStatus: cleanString(candidate.waitValueStatus, 40),
    mustDo: candidate.mustDo === true,
    confidenceHints: {
      sameArea: candidate.confidenceHints?.sameArea === true,
      waitKnown: candidate.confidenceHints?.waitKnown === true,
      mustDo: candidate.confidenceHints?.mustDo === true,
      indoorRelief: candidate.confidenceHints?.indoorRelief === true,
    },
  };
}

function sanitizeReviewPayload(payload = {}) {
  const topCandidate = sanitizeCandidate(payload.topCandidate);
  const shortlist = (Array.isArray(payload.shortlist) ? payload.shortlist : [])
    .slice(0, MAX_SHORTLIST_SIZE)
    .map(sanitizeCandidate)
    .filter(Boolean);
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};

  return {
    topCandidate,
    shortlist,
    context: {
      activePark: cleanString(context.activePark, 60),
      currentLand: cleanString(context.currentLand, 60),
      weatherMode: cleanString(context.weatherMode, 40),
      dayPhase: cleanString(context.dayPhase, 40),
      waitDataFreshness: cleanString(context.waitDataFreshness, 40),
      currentActivity:
        context.currentActivity && typeof context.currentActivity === "object"
          ? {
              type: cleanString(context.currentActivity.type, 40),
              rideName: cleanString(context.currentActivity.rideName, 160),
            }
          : null,
      compactFamilyContext:
        context.compactFamilyContext && typeof context.compactFamilyContext === "object"
          ? {
              partySize: Number.isFinite(Number(context.compactFamilyContext.partySize))
                ? Number(context.compactFamilyContext.partySize)
                : null,
              adults: Number.isFinite(Number(context.compactFamilyContext.adults))
                ? Number(context.compactFamilyContext.adults)
                : null,
              kids: Number.isFinite(Number(context.compactFamilyContext.kids))
                ? Number(context.compactFamilyContext.kids)
                : null,
              hasSmallChildren: context.compactFamilyContext.hasSmallChildren === true,
              hasHeightLimitedRiders:
                context.compactFamilyContext.hasHeightLimitedRiders === true,
              thrillTolerance: cleanString(context.compactFamilyContext.thrillTolerance, 40),
              heatSensitivity: cleanString(context.compactFamilyContext.heatSensitivity, 40),
              pace: cleanString(context.compactFamilyContext.pace, 40),
            }
          : null,
    },
  };
}

async function getTohiPickReview(payload = {}) {
  const bounded = sanitizeReviewPayload(payload);

  if (!bounded.topCandidate?.rideId) {
    return { unavailable: true, reason: "invalid_request" };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { unavailable: true, reason: "not_configured" };
  }

  logger.info(
    {
      candidateId: bounded.topCandidate.rideId,
      sourceSlot: bounded.topCandidate.sourceSlot,
      activePark: bounded.context.activePark,
      currentLand: bounded.context.currentLand,
      weatherMode: bounded.context.weatherMode,
      shortlistSize: bounded.shortlist.length,
      model: ANTHROPIC_MODEL,
    },
    "TOHI Pick review request"
  );

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 220,
        temperature: 0,
        system: REVIEW_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Review this TOHI Pick decision:\n${JSON.stringify(bounded)}`,
          },
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TOHI Pick review timed out")), REVIEW_TIMEOUT_MS)
      ),
    ]);

    const reviewText = response.content?.[0]?.text || "";

    if (!reviewText) {
      return { unavailable: true, reason: "empty_response" };
    }

    return { reviewText: String(reviewText).slice(0, MAX_REVIEW_TEXT_LENGTH) };
  } catch (err) {
    logger.error({ err: err?.message || err }, "TOHI Pick review failed");
    return { unavailable: true, reason: "review_failed" };
  }
}

module.exports = { getTohiPickReview };
