require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const logger = require("./logger");
const { cleanupExpired } = require("./services/cache");
const parkRoutes = require("./routes/park");
const weatherRoutes = require("./routes/weather");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();

  req.log = logger.child({ reqId });

  req.log.info({ method: req.method, path: req.path }, "incoming request");

  res.on("finish", () => {
    req.log.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      },
      "request completed"
    );
  });

  next();
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.log.warn({ path: req.path }, "general rate limit exceeded");
    res.status(429).json({ error: "Too many requests. Please slow down." });
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.log.warn({ path: req.path }, "AI rate limit exceeded");
    res.status(429).json({ error: "Too many AI requests. Try again in a minute." });
  },
});

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.log.warn({ path: req.path }, "event rate limit exceeded");
    res.status(429).json({ error: "Too many events. Please slow down." });
  },
});

/**
 * V1 product analytics event schema.
 *
 * Privacy rule:
 * Keep this anonymous and behavior-focused. Do not send names, emails, raw GPS
 * coordinates, child names, exact addresses, or full AI chat transcripts.
 */
const analyticsEventSchema = z
  .object({
    eventType: z.string().trim().min(1).max(100),

    sessionId: z.string().max(100).optional(),
    anonymousUserId: z.string().max(100).optional(),

    activePark: z.string().max(100).optional(),
    currentLand: z.string().max(100).optional(),

    source: z.string().max(100).optional(),
    screen: z.string().max(100).optional(),

    timestamp: z.string().max(100).optional(),

    profileComplete: z.boolean().optional(),
    devPreviewFullApp: z.boolean().optional(),

    timeContext: z
      .object({
        orlandoDate: z.string().max(50).optional(),
        orlandoTimeLabel: z.string().max(100).optional(),
        dayPhase: z.string().max(100).optional(),
        planningMode: z.string().max(100).optional(),
        tripStatus: z.string().max(100).optional(),
      })
      .passthrough()
      .optional(),

    familyProfileSnapshot: z
      .object({
        adultCount: z.number().nullable().optional(),
        childCount: z.number().nullable().optional(),
        partySize: z.number().nullable().optional(),
        shortestHeightInches: z.number().nullable().optional(),
        hasSmallChildren: z.boolean().optional(),
        thrillTolerance: z.string().max(100).optional(),
        walkingTolerance: z.string().max(100).optional(),
        heatSensitivity: z.string().max(100).optional(),
        waterRidePreference: z.string().max(100).optional(),
        pace: z.string().max(100).optional(),
        priorities: z.array(z.string().max(100)).max(30).optional(),
        selectedParks: z.array(z.string().max(100)).max(20).optional(),
        firstPark: z.string().max(100).optional(),
        priorityPark: z.string().max(100).optional(),
        parkHopper: z.string().max(50).optional(),
        planningMode: z.string().max(100).optional(),
        ropeDropStyle: z.string().max(100).optional(),
        middayBreakStyle: z.string().max(100).optional(),
        stayingOnProperty: z.string().max(50).optional(),
        resortId: z.string().max(100).optional(),
        transportationMode: z.string().max(100).optional(),
      })
      .passthrough()
      .optional(),

    recommendation: z
      .object({
        slot: z.string().max(100).optional(),
        rideId: z.union([z.string(), z.number()]).optional(),
        rideName: z.string().max(250).optional(),
        waitTime: z.number().nullable().optional(),
        land: z.string().max(100).optional(),
        waitValueStatus: z.string().max(100).optional(),
        recommendationScore: z.number().optional(),
        familyProfileModifier: z.number().optional(),
        planAheadRealityCheckModifier: z.number().optional(),
        heightWarning: z.boolean().optional(),
      })
      .passthrough()
      .optional(),

    action: z
      .object({
        type: z.string().max(100).optional(),
        label: z.string().max(200).optional(),
      })
      .passthrough()
      .optional(),

    locationContext: z
      .object({
        source: z.string().max(50).optional(),
        landKey: z.string().max(100).optional(),
        landLabel: z.string().max(250).optional(),
        nearestAnchorName: z.string().max(250).nullable().optional(),
        nearestAnchorType: z.string().max(100).nullable().optional(),
        confidence: z.string().max(50).nullable().optional(),

        // Distance is okay. Raw lat/lng is intentionally not accepted.
        distanceMeters: z.number().nullable().optional(),
      })
      .passthrough()
      .optional(),

    metadata: z.record(z.any()).optional(),
  })
  .passthrough();

function sanitizeAnalyticsEvent(event) {
  return {
    eventType: event.eventType,
    sessionId: event.sessionId,
    anonymousUserId: event.anonymousUserId,

    activePark: event.activePark,
    currentLand: event.currentLand,

    source: event.source,
    screen: event.screen,
    timestamp: event.timestamp || new Date().toISOString(),

    profileComplete: event.profileComplete,
    devPreviewFullApp: event.devPreviewFullApp,

    timeContext: event.timeContext,
    familyProfileSnapshot: event.familyProfileSnapshot,
    recommendation: event.recommendation,
    action: event.action,
    locationContext: event.locationContext,

    // Keep metadata small and intentional.
    metadata: event.metadata,
  };
}

app.post("/api/events", eventLimiter, (req, res) => {
  const parsed = analyticsEventSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      {
        issues: parsed.error.flatten(),
      },
      "invalid analytics event payload"
    );

    return res.status(400).json({
      error: "Invalid event payload",
      detail: parsed.error.flatten(),
    });
  }

  const event = sanitizeAnalyticsEvent(parsed.data);

  req.log.info(
    {
      event,
    },
    "product analytics event"
  );

  // V1 only logs events. Later this can write to Postgres/Supabase/PostHog/etc.
  res.status(202).json({ ok: true });
});

app.use("/api/park-data", generalApiLimiter);
app.use("/api/weather", generalApiLimiter);
app.use("/api/ai-chat", aiLimiter);

app.use("/api", parkRoutes);
app.use("/api", weatherRoutes);
app.use("/api", aiRoutes);

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
  })
);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, _next) => {
  if (req?.log) req.log.error({ err: err.message }, "unhandled server error");
  else logger.error({ err: err.message }, "unhandled server error");

  res.status(500).json({ error: "Internal server error" });
});

setInterval(() => cleanupExpired(), 15 * 60 * 1000);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "ParkPlan AI backend started");
  logger.info(
    {
      openWeather: Boolean(process.env.OPENWEATHER_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    "environment check"
  );
});
