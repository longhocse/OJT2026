const { env } = require("./config/env");
const { AppDataSource } = require("./config/database");
const { createApp } = require("./app");
const logger = require("./utils/logger");
const { startBookingExpiryWorker } = require("./services/bookingExpiryWorker");

const createGracefulShutdown = ({
  server,
  dataSource = AppDataSource,
  timeoutMs = 10000,
  stopWorker = () => {},
}) => {
  let shutdownPromise;

  return (signal = "manual") => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      logger.info("shutdown_started", { signal });
      stopWorker();
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.error("http_shutdown_timeout", { timeoutMs });
          server.closeAllConnections?.();
          resolve();
        }, timeoutMs);
        timeout.unref?.();

        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
        server.closeIdleConnections?.();
      });

      if (dataSource.isInitialized) {
        await dataSource.destroy();
        logger.info("database_disconnected");
      }
      logger.info("shutdown_completed", { signal });
    })();

    return shutdownPromise;
  };
};

const startServer = async () => {
  await AppDataSource.initialize();
  logger.info("database_connected");

  const app = createApp({ dataSource: AppDataSource });
  const server = app.listen(env.PORT, () => {
    logger.info("server_started", { port: env.PORT, corsOrigins: env.CORS_ALLOWED_ORIGINS });
  });
  const shutdown = createGracefulShutdown({ server, stopWorker: startBookingExpiryWorker() });
  server.shutdown = shutdown;

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      shutdown(signal).catch((error) => {
        logger.error("shutdown_failed", { signal, error });
        process.exitCode = 1;
      });
    });
  }
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    logger.error("server_start_failed", { error });
    process.exitCode = 1;
  });
}

module.exports = { createGracefulShutdown, startServer };
