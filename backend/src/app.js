const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("node:crypto");

const { env } = require("./config/env");
const { AppDataSource } = require("./config/database");
const routes = require("./routes");
const logger = require("./utils/logger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const rateLimitHandler = (code, message) => (req, res) =>
  res.status(429).json({
    code,
    message,
    errors: [],
  });

const createApp = ({
  enableRequestLogging = env.NODE_ENV !== "test",
  dataSource = AppDataSource,
} = {}) => {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        const allowed = env.CORS_ALLOWED_ORIGINS;
        if (!origin || allowed.includes("*") || allowed.includes(origin)) {
          callback(null, true);
          return;
        }
        const error = new Error("Origin is not allowed");
        error.status = 403;
        error.code = "CORS_ORIGIN_DENIED";
        callback(error);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use((req, res, next) => {
    const incomingRequestId = req.headers["x-request-id"];
    req.id =
      typeof incomingRequestId === "string" && /^[A-Za-z0-9-]{1,100}$/.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();
    res.setHeader("X-Request-Id", req.id);

    if (enableRequestLogging) {
      const startedAt = Date.now();
      res.on("finish", () =>
        logger.info("request_completed", {
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    }
    next();
  });

  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      handler: rateLimitHandler("RATE_LIMITED", "Too many requests"),
    }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("AUTH_RATE_LIMITED", "Too many authentication attempts"),
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  app.use("/api", routes);
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/ready", async (req, res) => {
    if (!dataSource.isInitialized) {
      res.status(503).json({ status: "not_ready" });
      return;
    }

    try {
      await dataSource.query("SELECT 1 AS ready");
      res.json({ status: "ready" });
    } catch (error) {
      logger.error("readiness_check_failed", { requestId: req.id, error });
      res.status(503).json({ status: "not_ready" });
    }
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
