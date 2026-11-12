import "./env.js";
import app from "./app.js";
import { startCronJobs } from "./jobs/scheduler.js";
import { closeDb } from "./config/db.js";
import { closeRedis } from "./config/redis.js";
import { markShuttingDown } from "./services/health.service.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 4000;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  startCronJobs();
});

let shuttingDown = false;

/**
 * Graceful shutdown: fail readiness, stop accepting connections, let in-flight
 * requests drain, then close Prisma/pg and Redis. A hard timeout guarantees exit.
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);
  markShuttingDown();

  const forceExit = setTimeout(() => {
    logger.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      // Stops accepting new connections; callback fires once all have ended.
      server.close((err) => (err ? reject(err) : resolve()));
      // Drop keep-alive sockets that are idle so they don't hold the drain open.
      server.closeIdleConnections();
    });
    await Promise.all([closeDb(), closeRedis()]);
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown", { error: err });
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
