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
      await prisma.platformSnapshot.create({
        data: {
          linkedAccountId: acc.id,
          rating: data.rating,
          rankTitle: null,
          problemsSolved: data.totalSolved,
          rawData: data.raw,
        },
      });

      // Process Daily Activity & Calculate Streaks
      if (data.submissionCalendar) {
        let calendar = data.submissionCalendar;
        // Defensive: ensure calendar is an object
        if (typeof calendar === 'string') {
          try { calendar = JSON.parse(calendar); } catch (e) { calendar = {}; }
        }

        const operations = [];
        let totalActiveDays = 0;
        let lastActivityDate: Date | null = null;

        // Parse and sort dates
        const timestamps = Object.keys(calendar).map(Number).sort((a, b) => b - a); // Descending

        let currentStreak = 0;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Helper to normalize date
        const toDay = (ts: number) => {
          const d = new Date(ts * 1000);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        };

        // Calculate total active days & find last activity
        if (timestamps.length > 0) {
          lastActivityDate = new Date(timestamps[0] * 1000);
          totalActiveDays = timestamps.length;
        }

        // Calculate Streak (consecutive days looking back from today or yesterday)
        // If processed today (based on server time), streak continues if activity exists today or yesterday
        let streak = 0;
        let expectedDate = today;

        // If no activity today, check if activity exists yesterday to keep streak alive?
        // Actually, scan timestamps. If top is today, streak starts 1. Next must be yesterday.
        // If top is yesterday, streak starts 1. Next must be day before yesterday.
        // If top is older, streak is 0.

        if (timestamps.length > 0) {
          const lastTs = timestamps[0];
          const lastDate = toDay(lastTs);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) { // Activity today (0) or yesterday (1) keeps streak alive
            streak = 1;
            let prevDate = lastDate;

            for (let i = 1; i < timestamps.length; i++) {
              const currDate = toDay(timestamps[i]);
              const gap = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
              if (gap === 1) {
                streak++;
                prevDate = currDate;
              } else {
                break; // Streak broken
              }
            }
          }
        }
        currentStreak = streak;

        for (const [timestampStr, count] of Object.entries(calendar)) {
          const timestamp = Number(timestampStr);
          const date = new Date(timestamp * 1000);
          date.setUTCHours(0, 0, 0, 0);

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
        logger.info(`Processed daily activity & Updated streak (${currentStreak}) for ${acc.username}`);
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
