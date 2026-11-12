import prisma from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * Run `fn` and record it in the JobRun table: start time, finish time,
 * duration, and status ("running" -> "success" | "failed"). Failures are
 * recorded with the error message and then re-thrown. Bookkeeping errors never
 * affect the job itself.
 */
export async function recordJobRun<T>(
  jobName: string,
  fn: () => Promise<T>,
  summarize?: (result: T) => string
): Promise<T> {
  const startedAt = new Date();
  let runId: number | null = null;

  try {
    const run = await prisma.jobRun.create({
      data: { jobName, status: "running", startedAt },
    });
    runId = run.id;
  } catch (err) {
    logger.error("jobRun: failed to record start", { jobName, error: err });
  }

  const finish = async (status: "success" | "failed", message?: string) => {
    if (runId === null) return;
    const finishedAt = new Date();
    try {
      await prisma.jobRun.update({
        where: { id: runId },
        data: {
          status,
          message: message?.slice(0, 1000),
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      });
    } catch (err) {
      logger.error("jobRun: failed to record finish", { jobName, error: err });
    }
  };

  try {
    const result = await fn();
    await finish("success", summarize?.(result));
    return result;
  } catch (err) {
    await finish("failed", err instanceof Error ? err.message : String(err));
    throw err;
  }
}
