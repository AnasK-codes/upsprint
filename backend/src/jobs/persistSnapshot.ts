import prisma from "../config/db.js";
import logger from "../utils/logger.js";
import type { SnapshotStats } from "../platforms/types.js";

/** Subset of LinkedAccount the persistence logic needs. */
export interface AccountRef {
  id: number;
  username: string;
  lastActivityDate?: Date | string | null;
  currentStreak?: number | null;
  totalActiveDays?: number | null;
}

const ONE_DAY_SECS = 86400;

/**
 * Stores a snapshot for one account.
 *
 * Without a calendar (Codeforces, CodeChef) it simply inserts a PlatformSnapshot.
 * With a calendar (LeetCode) it also:
 * - computes the current streak in O(S) by walking back from today,
 * - skips every DB write when nothing changed since the last sync,
 * - delta-syncs DailyActivity from the last known activity date.
 */
export async function persistSnapshot(acc: AccountRef, stats: SnapshotStats): Promise<void> {
  const snapshotData = {
    linkedAccountId: acc.id,
    rating: stats.rating,
    rankTitle: stats.rankTitle,
    problemsSolved: stats.problemsSolved,
    rawData: stats.rawData,
  };

  const calendar = stats.calendar;
  if (!calendar) {
    await prisma.platformSnapshot.create({ data: snapshotData });
    return;
  }

  const calendarKeys = Object.keys(calendar);
  const totalActiveDays = calendarKeys.length;

  // Latest activity date from the calendar
  let maxTimestamp = 0;
  for (const key of calendarKeys) {
    const ts = Number(key);
    if (ts > maxTimestamp) maxTimestamp = ts;
  }
  const lastActivityDate: Date | null = maxTimestamp > 0 ? new Date(maxTimestamp * 1000) : null;

  // O(S) streak: walk backward from today using O(1) set lookups.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayUnix = Math.floor(today.getTime() / 1000);

  const activeDaySet = new Set<number>();
  for (const key of calendarKeys) {
    const ts = Number(key);
    activeDaySet.add(ts - (ts % ONE_DAY_SECS));
  }

  let currentStreak = 0;
  let checkDay = todayUnix - (todayUnix % ONE_DAY_SECS);
  // No activity today keeps the streak alive if yesterday had some.
  if (!activeDaySet.has(checkDay)) checkDay -= ONE_DAY_SECS;
  while (activeDaySet.has(checkDay)) {
    currentStreak++;
    checkDay -= ONE_DAY_SECS;
  }

  // Short-circuit: identical activity date, streak and day count means no new data.
  const prevLastActivity = acc.lastActivityDate ? new Date(acc.lastActivityDate).getTime() : 0;
  const newLastActivity = lastActivityDate ? lastActivityDate.getTime() : 0;
  const unchanged =
    newLastActivity === prevLastActivity &&
    currentStreak === (acc.currentStreak ?? 0) &&
    totalActiveDays === (acc.totalActiveDays ?? 0);
  if (unchanged) {
    logger.info(`No changes detected for ${acc.username}, skipping DB writes`);
    return;
  }

  await prisma.platformSnapshot.create({ data: snapshotData });

  // Delta sync: only upsert days on or after the last known activity day
  // (everything for a new account).
  const syncFromTime = acc.lastActivityDate
    ? new Date(acc.lastActivityDate).setUTCHours(0, 0, 0, 0)
    : 0;

  const operations = [];
  for (const [timestampStr, count] of Object.entries(calendar)) {
    const date = new Date(Number(timestampStr) * 1000);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getTime() >= syncFromTime) {
      operations.push(
        prisma.dailyActivity.upsert({
          where: { linkedAccountId_date: { linkedAccountId: acc.id, date } },
          update: { count: Number(count) },
          create: { linkedAccountId: acc.id, date, count: Number(count) },
        })
      );
    }
  }
  const activityRecords = operations.length;
  operations.push(
    prisma.linkedAccount.update({
      where: { id: acc.id },
      data: { currentStreak, totalActiveDays, lastActivityDate },
    }) as never
  );

  await prisma.$transaction(operations);
  logger.info(
    `Updated streak (${currentStreak}) for ${acc.username} [${activityRecords} activity records synced]`
  );
}
