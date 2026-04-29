require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const logger = require("./logger");
const { cleanupExpired } = require("./services/cache");
const parkRoutes = require("./routes/park");
const weatherRoutes = require("./routes/weather");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();
  req.log = logger.child({ reqId });
  req.log.info({ method: req.method, path: req.path }, "incoming request");
  res.on("finish", () => {
    req.log.info({ method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start }, "request completed");
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

app.use("/api/park-data", generalApiLimiter);
app.use("/api/weather", generalApiLimiter);
app.use("/api/ai-chat", aiLimiter);

app.use("/api", parkRoutes);
app.use("/api", weatherRoutes);
app.use("/api", aiRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString(), uptime: process.uptime(), env: process.env.NODE_ENV || "development" }));

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, _next) => {
  if (req?.log) req.log.error({ err: err.message }, "unhandled server error");
  else logger.error({ err: err.message }, "unhandled server error");
  res.status(500).json({ error: "Internal server error" });
});

setInterval(() => cleanupExpired(), 15 * 60 * 1000);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "ParkPlan AI backend started");
  logger.info({ openWeather: Boolean(process.env.OPENWEATHER_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) }, "environment check");
});
