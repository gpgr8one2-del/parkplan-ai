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
    heightWarning: z.any().optional(),
    familyProfileModifier: z.number().optional(),
    rawFamilyProfileModifier: z.number().optional(),
    planAheadRealityCheckModifier: z.number().optional(),
    scheduledShowModifier: z.number().optional(),
    wetRideModifier: z.number().optional(),

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

const resortProfileSchema = z
  .object({
    id: z.string().max(100).optional(),
    name: z.string().max(250).optional(),
    area: z.string().max(150).optional(),
    areaLabel: z.string().max(250).optional(),
    coordinates: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .passthrough()
      .optional(),
    nearestParks: z.array(z.string().max(100)).max(10).optional(),
    transportation: z.array(z.string().max(100)).max(20).optional(),
    directAccess: z.record(z.any()).optional(),
    breakStrategy: z.record(z.string().max(1200)).optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const familyProfileSchema = z
  .object({
    isSetupComplete: z.boolean().optional(),
    adultCount: z.number().nullable().optional(),
    childCount: z.number().nullable().optional(),
    partySize: z.number().nullable().optional(),

    children: z
      .array(
        z
          .object({
            id: z.string().max(100).optional(),
            label: z.string().max(100).optional(),
            age: z.union([z.string(), z.number()]).optional(),
            heightInches: z.union([z.string(), z.number()]).optional(),
          })
          .passthrough()
      )
      .max(20)
      .optional(),

    guests: z
      .array(
        z
          .object({
            id: z.string().max(100).optional(),
            label: z.string().max(100).optional(),
            age: z.union([z.string(), z.number()]).optional(),
            heightInches: z.union([z.string(), z.number()]).optional(),
            isAdultPlaceholder: z.boolean().optional(),
          })
          .passthrough()
      )
      .max(30)
      .optional(),

    ageSummary: z
      .object({
        under3Count: z.number().optional(),
        childCount: z.number().optional(),
        disneyAdultCount: z.number().optional(),
      })
      .passthrough()
      .optional(),

    shortestHeightInches: z.number().nullable().optional(),
    hasUnder3: z.boolean().optional(),
    hasSmallChildren: z.boolean().optional(),
    hasHeightLimitedRiders: z.boolean().optional(),

    wholeGroupRidesTogether: z.string().max(50).optional(),
    thrillTolerance: z.string().max(50).optional(),
    walkingTolerance: z.string().max(50).optional(),
    heatSensitivity: z.string().max(50).optional(),
    waterRidePreference: z.string().max(50).optional(),
    pace: z.string().max(50).optional(),
    priorities: z.array(z.string().max(100)).max(30).optional(),

    tripContext: z
      .object({
        tripStartDate: z.string().max(50).optional(),
        tripEndDate: z.string().max(50).optional(),
        tripLengthDays: z.number().optional(),
        parkDays: z.number().optional(),
        selectedParks: z.array(z.string().max(100)).max(20).optional(),
        firstPark: z.string().max(100).optional(),
        priorityPark: z.string().max(100).optional(),
        parkHopper: z.string().max(50).optional(),
      })
      .passthrough()
      .optional(),

    planningPreferences: z
      .object({
        planningMode: z.string().max(100).optional(),
        dayBeforeHelp: z.string().max(100).optional(),
        dayOfHelp: z.string().max(100).optional(),
        ropeDropStyle: z.string().max(100).optional(),
        arrivalStyle: z.string().max(100).optional(),
        middayBreakStyle: z.string().max(100).optional(),
        napOrPoolBreak: z.string().max(100).optional(),
        diningStyle: z.string().max(100).optional(),
        mustDoMode: z.string().max(100).optional(),
        aiTone: z.string().max(100).optional(),
      })
      .passthrough()
      .optional(),

    resortContext: z
      .object({
        stayingOnProperty: z.string().max(50).optional(),
        resortId: z.string().max(100).optional(),
        resortName: z.string().max(250).optional(),
        offPropertyHotelName: z.string().max(250).optional(),
        transportationMode: z.string().max(100).optional(),
      })
      .passthrough()
      .optional(),

    resortProfile: resortProfileSchema,
    tripAccessStatus: z.any().optional(),
    lightningLanePreference: z.string().max(100).optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const timeContextSchema = z
  .object({
    nowIso: z.string().max(100).optional(),
    timeZone: z.string().max(100).optional(),

    orlandoDate: z.string().max(50).optional(),
    orlandoDateLabel: z.string().max(150).optional(),
    orlandoTimeLabel: z.string().max(100).optional(),
    orlandoWeekday: z.string().max(50).optional(),
    orlandoHour: z.number().optional(),
    orlandoMinute: z.number().optional(),
    orlandoTotalMinutes: z.number().optional(),

    activePark: z.string().max(100).nullable().optional(),
    dayPhase: z.string().max(100).optional(),
    dayPhaseLabel: z.string().max(150).optional(),

    tripStatus: z.any().optional(),
    planningMode: z.string().max(100).optional(),
    aiAccess: z
      .object({
        phase: z.string().max(100).optional(),
        shouldAllowAi: z.boolean().optional(),
        reason: z.string().max(500).optional(),
      })
      .passthrough()
      .optional(),

    isPreTrip: z.boolean().optional(),
    isDayBeforeTrip: z.boolean().optional(),
    isDuringTrip: z.boolean().optional(),
    isAfterTrip: z.boolean().optional(),

    shouldThinkLikeDayBeforePlanner: z.boolean().optional(),
    shouldThinkLikeInParkGuide: z.boolean().optional(),
    shouldProtectFamilyEnergy: z.boolean().optional(),

    summary: z.string().max(500).optional(),
  })
  .passthrough()
  .nullable()
  .optional();


const tripPlanPreferenceSchema = z
  .object({
    startStrategy: z.string().max(100).optional(),
    breakPreference: z.string().max(100).optional(),
    diningStyle: z.string().max(100).optional(),
    showsImportance: z.string().max(100).optional(),
    nighttimeImportance: z.string().max(100).optional(),
    paidQueueStrategy: z.string().max(100).optional(),
  })
  .passthrough()
  .optional();

const mustDoExperienceSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().max(200).optional(),
    parkId: z.string().max(100).optional(),
    type: z.string().max(80).optional(),
    priority: z.string().max(80).optional(),
    land: z.string().max(120).optional(),
    source: z.string().max(100).optional(),
  })
  .passthrough();

const tripPlanSchema = z
  .object({
    version: z.number().optional(),
    system: z.string().max(100).optional(),
    preferences: tripPlanPreferenceSchema,
    mustDoExperiences: z.array(mustDoExperienceSchema).max(30).optional(),
    updatedAt: z.string().max(100).nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const dayGamePlanItemSchema = z
  .object({
    id: z.string().max(100).optional(),
    order: z.number().optional(),
    eyebrow: z.string().max(100).optional(),
    title: z.string().max(220).optional(),
    body: z.string().max(900).optional(),
    detail: z.string().max(700).nullable().optional(),
    priority: z.string().max(80).optional(),
    priorityLabel: z.string().max(100).optional(),
    generatedFrom: tripPlanPreferenceSchema,
  })
  .passthrough();

const dayGamePlanSchema = z.array(dayGamePlanItemSchema).max(10).optional();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  sessionData: z
    .object({
      activePark: z.string().max(100).optional(),
      currentLand: z.string().max(100).nullable().optional(),
      familyProfile: familyProfileSchema,
      tripPlan: tripPlanSchema,
      mustDoExperiences: z.array(mustDoExperienceSchema).max(30).optional(),
      dayGamePlan: dayGamePlanSchema,
      timeContext: timeContextSchema,
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
        timeContext: parsed.data?.sessionData?.timeContext,
        familyProfileSummary: parsed.data?.sessionData?.familyProfile
          ? {
              isSetupComplete: parsed.data.sessionData.familyProfile.isSetupComplete,
              partySize: parsed.data.sessionData.familyProfile.partySize,
              shortestHeightInches:
                parsed.data.sessionData.familyProfile.shortestHeightInches,
              planningMode:
                parsed.data.sessionData.familyProfile.planningPreferences?.planningMode,
              selectedParks:
                parsed.data.sessionData.familyProfile.tripContext?.selectedParks,
              resortName:
                parsed.data.sessionData.familyProfile.resortContext?.resortName,
            }
          : null,
        currentActivity:
          parsed.data?.sessionData?.currentActivityContext ||
          parsed.data?.sessionData?.currentActivity,
        tripPlanSummary: parsed.data?.sessionData?.tripPlan
          ? {
              startStrategy:
                parsed.data.sessionData.tripPlan.preferences?.startStrategy,
              breakPreference:
                parsed.data.sessionData.tripPlan.preferences?.breakPreference,
              mustDoCount:
                parsed.data.sessionData.mustDoExperiences?.length ||
                parsed.data.sessionData.tripPlan.mustDoExperiences?.length ||
                0,
              dayGamePlanCount:
                parsed.data.sessionData.dayGamePlan?.length || 0,
            }
          : null,
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
