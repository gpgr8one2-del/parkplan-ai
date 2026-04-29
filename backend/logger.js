const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        }
      : undefined,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
