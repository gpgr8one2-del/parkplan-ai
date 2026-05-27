const express = require("express");
const { z } = require("zod");
const { getAIResponse } = require("../services/aiService");

const router = express.Router();

const recommendationSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    waitTime: z.number().nullable().optional(),
    isOpen: z.boolean().optional(),
    land: z.string().optional(),
    reason: z.string().optional(),
    recommendationScore: z.number().optional(),
    proximityDistance: z.string().optional(),
    waitValueStatus: z.any().optional(),
    planningProfile: z.any().optional(),
    planAheadReason: z.string().optional(),
    strategyNote: z.string().optional(),

    // Added from rideRecommendations.js so AI can understand why a ride was promoted.
    nearbyHeadlinerOpportunityModifier: z.number().optional(),
    closestAnchorOpportunityModifier: z.number().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const currentActivitySchema = z
  .object({
    type: z.string().max(50).optional(),
    rideId: z.union([z.string(), z.number()]).optional(),
    rideName: z.string().max(200).optional(),
    land: z.string().max(100).optional(),
    startedAt: z.string().max(100).optional(),
    postedWaitAtStart: z.number().nullable().optional(),

    // Added from App.jsx so AI knows how invested the family already is.
    elapsedMinutesInLine: z.number().nullable().optional(),
    summary: z.string().max(500).nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const detectedLocationSchema = z
  .object({
    source: z.string().max(50).optional(),
    parkId: z.string().max(100).optional(),

    land: z.string().max(100).optional(),
    landKey: z.string().max(100).optional(),
    landLabel: z.string().max(250).optional(),

    nearestAnchorName: z.string().max(250).nullable().optional(),
    nearestAnchorId: z.union([z.string(), z.number()]).nullable().optional(),
    nearestAnchorType: z.string().max(100).nullable().optional(),

    distanceMeters: z.number().nullable().optional(),
    confidence: z.string().max(50).nullable().optional(),
    updatedAt: z.string().max(100).nullable().optional(),

    nearbyAnchors: z
      .array(
        z
          .object({
            parkId: z.string().max(100).optional(),
            landKey: z.string().max(100).optional(),
            landLabel: z.string().max(250).optional(),
            anchorId: z.union([z.string(), z.number()]).optional(),
            anchorName: z.string().max(250).optional(),
            anchorType: z.string().max(100).optional(),
            distanceMeters: z.number().optional(),
          })
          .passthrough()
      )
      .max(10)
      .optional(),

    clusterScores: z
      .array(
        z
          .object({
            landKey: z.string().max(100).optional(),
            landLabel: z.string().max(250).optional(),
            score: z.number().optional(),
            count: z.number().optional(),
            closestDistanceMeters: z.number().optional(),
            closestAnchorName: z.string().max(250).optional(),
          })
          .passthrough()
      )
      .max(10)
      .optional(),

    isBorderArea: z.boolean().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const locationContextSchema = z
  .object({
    type: z.string().max(50).optional(),
    source: z.string().max(50).optional(),

    land: z.string().max(100).optional(),
    landKey: z.string().max(100).optional(),
    landLabel: z.string().max(250).optional(),
    locationMessage: z.string().max(700).optional(),

    nearestAnchorName: z.string().max(250).nullable().optional(),
    nearestAnchorId: z.union([z.string(), z.number()]).nullable().optional(),
    nearestAnchorType: z.string().max(100).nullable().optional(),

    distanceMeters: z.number().nullable().optional(),
    confidence: z.string().max(50).nullable().optional(),
    updatedAt: z.string().max(100).nullable().optional(),

    detectedLocation: detectedLocationSchema,
  })
  .passthrough()
  .nullable()
  .optional();

const parkPlanBehaviorHintsSchema = z
  .object({
    inLineDecisionRule: z.string().max(1000).optional(),
    familyEnergyRule: z.string().max(1000).optional(),
  })
  .passthrough()
  .optional();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  sessionData: z
    .object({
      activePark: z.string().max(100).optional(),
      currentLand: z.string().max(100).optional(),
      locationContext: locationContextSchema,

      currentActivity: currentActivitySchema,
      currentActivityContext: currentActivitySchema,
      parkPlanBehaviorHints: parkPlanBehaviorHintsSchema,

      weather: z.any().optional(),
      weatherMode: z.any().optional(),

      completedRideIds: z.array(z.string().max(100)).max(100).optional(),
      skippedRideIds: z.array(z.string().max(100)).max(100).optional(),
      reportedRideIssueIds: z.array(z.string().max(100)).max(100).optional(),

      recommendations: z
        .object({
          bestMove: recommendationSchema,
          backup: recommendationSchema,
          worthTheWalk: recommendationSchema,
          planAhead: recommendationSchema,
          waitOnThis: recommendationSchema,
        })
        .passthrough()
        .optional(),

      conversationHistory: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(1000),
          })
        )
        .max(12)
        .optional(),
    })
    .passthrough()
    .optional(),
});

router.post("/ai-chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log?.warn(
      {
        issues: parsed.error.flatten(),
      },
      "invalid AI chat payload"
    );

    return res.status(400).json({
      error: "Invalid request payload",
      detail: parsed.error.flatten(),
    });
  }

  try {
    const { message, sessionData = {} } = parsed.data;
    const reply = await getAIResponse(message, sessionData);

    res.json({ reply });
  } catch (err) {
    req.log?.error(
      {
        err: err.message,
        stack: err.stack,
        activePark: parsed.data?.sessionData?.activePark,
        currentLand: parsed.data?.sessionData?.currentLand,
        locationContext: parsed.data?.sessionData?.locationContext,
        currentActivity:
          parsed.data?.sessionData?.currentActivityContext ||
          parsed.data?.sessionData?.currentActivity,
      },
      "AI chat failed"
    );

    res.status(502).json({
      error: "AI service unavailable",
      detail:
        process.env.NODE_ENV === "production"
          ? "AI chat is temporarily unavailable."
          : err.message,
    });
  }
});

module.exports = router;
