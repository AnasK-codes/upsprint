import prisma from "../config/db.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";
import { fetchLeetCodeProfile } from "../services/leetcode.service.js";
import { fetchCodeChefProfile } from "../services/codechef.service.js";
import logger from "../utils/logger.js";

/**
 * Ingests a snapshot for a single linked account.
 * 
 * This function:
 * 1. Fetches the latest public profile data from the platform's API.
 * 2. Stores a `PlatformSnapshot` record (archival).
 * 3. For LeetCode: Parses the `submissionCalendar` to update the `DailyActivity` table.
 * 4. Calculates and updates the `currentStreak` based on the calendar heatmap.
 * 
 * @param acc - The LinkedAccount database object
 */
export async function processAccountSnapshot(acc: any) {
  try {
    if (acc.platform === "codeforces") {
      const data = await fetchCodeforcesUser(acc.username);
      await prisma.platformSnapshot.create({
        data: {
          linkedAccountId: acc.id,
          rating: data.rating ?? null,
          rankTitle: data.rank ?? null,
          problemsSolved: data.maxRating ?? null,
          rawData: data,
        },
      });
      logger.info(`Processed Codeforces snapshot for ${acc.username}`);
    } else if (acc.platform === "leetcode") {
      const data = await fetchLeetCodeProfile(acc.username);

      // Process Daily Activity & Calculate Streaks
      if (data.submissionCalendar) {
        let calendar = data.submissionCalendar;
        if (typeof calendar === 'string') {
          try { calendar = JSON.parse(calendar); } catch (e) { calendar = {}; }
        }

        const calendarKeys = Object.keys(calendar);
        const totalActiveDays = calendarKeys.length;

        // Find the latest activity date from the calendar
        let maxTimestamp = 0;
        for (const key of calendarKeys) {
          const ts = Number(key);
          if (ts > maxTimestamp) maxTimestamp = ts;
        }
        const lastActivityDate: Date | null = maxTimestamp > 0
          ? new Date(maxTimestamp * 1000)
          : null;

        // ─── Optimization 1: O(S) Streak Calculation ───
        // Instead of sorting ALL timestamps (O(N log N)), walk backward from
        // today using O(1) dictionary lookups. Cost = O(S) where S = streak length.
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const ONE_DAY_SECS = 86400;
        const todayUnix = Math.floor(today.getTime() / 1000);

        // Build a Set of normalized day timestamps for O(1) lookup
        const activeDaySet = new Set<number>();
        for (const key of calendarKeys) {
          const ts = Number(key);
          // Normalize to midnight UTC (floor to day boundary)
          const dayTs = ts - (ts % ONE_DAY_SECS);
          activeDaySet.add(dayTs);
        }

        let currentStreak = 0;
        // Start checking from today; if no activity today, check yesterday
        let checkDay = todayUnix - (todayUnix % ONE_DAY_SECS);

        if (!activeDaySet.has(checkDay)) {
          // No activity today — check if yesterday has activity to keep streak alive
          checkDay -= ONE_DAY_SECS;
          if (!activeDaySet.has(checkDay)) {
            // No activity today or yesterday — streak is 0
            currentStreak = 0;
          } else {
            // Activity yesterday, walk backward
            currentStreak = 1;
            checkDay -= ONE_DAY_SECS;
            while (activeDaySet.has(checkDay)) {
              currentStreak++;
              checkDay -= ONE_DAY_SECS;
            }
          }
        } else {
          // Activity exists today, walk backward
          currentStreak = 1;
          checkDay -= ONE_DAY_SECS;
          while (activeDaySet.has(checkDay)) {
            currentStreak++;
            checkDay -= ONE_DAY_SECS;
          }
        }

        // ─── Optimization 2: Short-Circuit Early Exit ───
        // If the user's data hasn't changed since the last sync, skip all DB writes.
        // We detect "no change" when the latest activity date and streak are identical.
        const prevLastActivity = acc.lastActivityDate ? new Date(acc.lastActivityDate).getTime() : 0;
        const newLastActivity = lastActivityDate ? lastActivityDate.getTime() : 0;
        const hasNewActivity = newLastActivity !== prevLastActivity;
        const streakChanged = currentStreak !== (acc.currentStreak ?? 0);
        const totalChanged = totalActiveDays !== (acc.totalActiveDays ?? 0);

        if (!hasNewActivity && !streakChanged && !totalChanged) {
          // Nothing changed — skip snapshot and DB writes entirely
          logger.info(`No changes detected for ${acc.username}, skipping DB writes`);
        } else {
          // ─── Create snapshot only when there are actual changes ───
          await prisma.platformSnapshot.create({
            data: {
              linkedAccountId: acc.id,
              rating: data.rating,
              rankTitle: null,
              problemsSolved: data.totalSolved,
              rawData: data.raw,
            },
          });

          // ─── Optimization 3: Delta Sync (Watermark-Based Upserts) ───
          // For existing users: only upsert activity records >= lastActivityDate.
          // For new users (no lastActivityDate): full sync of entire history.
          const operations = [];

          const syncFromTime = acc.lastActivityDate
            ? new Date(acc.lastActivityDate).setUTCHours(0, 0, 0, 0)
            : 0; // 0 means "sync everything" (new user)

          for (const [timestampStr, count] of Object.entries(calendar)) {
            const timestamp = Number(timestampStr);
            const date = new Date(timestamp * 1000);
            date.setUTCHours(0, 0, 0, 0);

            // Only upsert if this date is on or after the last known sync point
            if (date.getTime() >= syncFromTime) {
              operations.push(
                prisma.dailyActivity.upsert({
                  where: {
                    linkedAccountId_date: {
                      linkedAccountId: acc.id,
                      date: date,
                    },
                  },
                  update: { count: Number(count) },
                  create: {
                    linkedAccountId: acc.id,
                    date: date,
                    count: Number(count),
                  },
                })
              );
            }
          }

          // Update LinkedAccount stats
          operations.push(
            prisma.linkedAccount.update({
              where: { id: acc.id },
              data: {
                currentStreak,
                totalActiveDays,
                lastActivityDate
              }
            })
          );

          await prisma.$transaction(operations);
          logger.info(`Processed daily activity & Updated streak (${currentStreak}) for ${acc.username} [${operations.length - 1} activity records synced]`);
        }
      } else {
        // No submissionCalendar available — still save the snapshot for rating/solve tracking
        await prisma.platformSnapshot.create({
          data: {
            linkedAccountId: acc.id,
            rating: data.rating,
            rankTitle: null,
            problemsSolved: data.totalSolved,
            rawData: data.raw,
          },
        });
      }

      logger.info(`Processed LeetCode snapshot for ${acc.username}`);
    } else if (acc.platform === "codechef") {
      const data = await fetchCodeChefProfile(acc.username);
      await prisma.platformSnapshot.create({
        data: {
          linkedAccountId: acc.id,
          rating: data.rating,
          rankTitle: data.stars || null,
          problemsSolved: null,
          rawData: data.raw,
        },
      });
      logger.info(`Processed CodeChef snapshot for ${acc.username}`);
    }
  } catch (err: any) {
    logger.error(`Failed snapshot for ${acc.platform}:${acc.username}`, { error: err.message });
  }
}

export async function runAllSnapshots() {
  const accounts = await prisma.linkedAccount.findMany();
  for (const acc of accounts) {
    await processAccountSnapshot(acc);
  }
}
