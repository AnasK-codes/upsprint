import "dotenv/config";
import http from "node:http";
import { closeDb } from "./config/db.js";
import { closeRedis } from "./config/redis.js";
import { closeQueues } from "./queues/index.js";
import { registerSchedules } from "./queues/scheduler.js";
import { reconcileBreakerPauses, startWorkers } from "./queues/workers.js";
import logger from "./utils/logger.js";

for (const key of ["DATABASE_URL", "REDIS_URL"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 30_000;
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT) || 4001;

await reconcileBreakerPauses();
const handle = startWorkers();
await registerSchedules();
logger.info("Worker started");

// Liveness endpoint for container orchestration.
const health = http
  .createServer((req, res) => {
    const ok = req.url === "/healthz";
    res.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: ok ? "ok" : "not found" }));
  })
  .listen(HEALTH_PORT);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down worker`);
  const force = setTimeout(() => {
    logger.error("Worker shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();
  try {
    health.close();
    await handle.close(); // let active jobs finish
    await closeQueues();
    await Promise.all([closeDb(), closeRedis()]);
    logger.info("Worker shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error("Error during worker shutdown", { error: err });
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
