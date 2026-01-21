import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

const VALID_PLATFORMS = ["codeforces", "leetcode", "codechef"];

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        batch: true,
        branch: true,
        avatarUrl: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, batch, branch, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        batch,
        branch,
        avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        batch: true,
        branch: true,
        avatarUrl: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const connectAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { platform, username } = req.body;

    if (!platform || !username) {
      return res.status(400).json({ message: "Platform and username are required" });
    }

    if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
      return res.status(400).json({ message: "Invalid platform" });
    }

    const existingAccount = await prisma.linkedAccount.findFirst({
      where: {
        userId: req.userId,
        platform: platform.toLowerCase(),
      },
    });

    if (existingAccount) {
      return res.status(400).json({ message: "Account already connected for this platform" });
    }

    const newAccount = await prisma.linkedAccount.create({
      data: {
        userId: req.userId!,
        platform: platform.toLowerCase(),
        username,
      },
    });


    // Immediate snapshot fetch
    try {
      if (platform.toLowerCase() === "codeforces") {
        const { fetchCodeforcesUser } = await import("../services/codeforces.service.js");
        const data = await fetchCodeforcesUser(username);
        await prisma.platformSnapshot.create({
          data: {
            linkedAccountId: newAccount.id,
            rating: data.rating ?? null,
            rankTitle: data.rank ?? null,
            problemsSolved: data.maxRating ?? null,
            rawData: data,
          },
        });
      } else if (platform.toLowerCase() === "leetcode") {
        const { fetchLeetCodeProfile } = await import("../services/leetcode.service.js");
        const data = await fetchLeetCodeProfile(username);
        await prisma.platformSnapshot.create({
          data: {
            linkedAccountId: newAccount.id,
            rating: data.rating,
            rankTitle: null,
            problemsSolved: data.totalSolved,
            rawData: data.raw,
          },
        });
      } else if (platform.toLowerCase() === "codechef") {
        const { fetchCodeChefProfile } = await import("../services/codechef.service.js");
        const data = await fetchCodeChefProfile(username);
        await prisma.platformSnapshot.create({
          data: {
            linkedAccountId: newAccount.id,
            rating: data.rating,
            rankTitle: data.stars || null,
            problemsSolved: null,
            rawData: data.raw,
          },
        });
      }

      // --- INSTANT LEADERBOARD UPDATE START ---
      // We explicitly import helpers to compute the new score for this user immediately
      const { fetchLatestSnapshotsWithAccountUser, computeScore } = await import("../services/leaderboard.service.js");

      // Calculate scores for THIS user only
      // We can reuse the service logic but filter in memory or just fetch all for simplicity (but costly)
      // Better: Re-run global rebuild? Data volume is low enough for now.
      // Or even better: just fetch snapshots for this user.
      // For now, let's trigger a full rebuild as data volume is low and it guarantees consistency.
      // Optimize later if needed.
      const { rebuildLeaderboard } = await import("../jobs/leaderboard.job.js");
      await rebuildLeaderboard();
      // --- INSTANT LEADERBOARD UPDATE END ---

    } catch (fetchErr: any) {
      console.error(`Immediate fetch/update failed for ${platform}:${username}`, fetchErr.message);
      // Optional: Undo account creation if valid username check is desired
      await prisma.linkedAccount.delete({ where: { id: newAccount.id } });
      return res.status(400).json({ message: "Invalid username or API error" });
    }

    res.status(201).json(newAccount);

  } catch (error) {
    console.error("Connect account error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const disconnectAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const account = await prisma.linkedAccount.findUnique({
      where: { id: Number(id) },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (account.userId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.linkedAccount.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Account disconnected successfully" });
  } catch (error) {
    console.error("Disconnect account error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.linkedAccount.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        platform: true,
        username: true,
      },
    });

    res.json(accounts);
  } catch (error) {
    console.error("Get accounts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserActivity = async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.linkedAccount.findMany({
      where: { userId: req.userId },
      select: { id: true, platform: true, username: true, createdAt: true }
    });

    const accountIds = accounts.map(a => a.id);

    // Fetch daily activities (problems solved)
    const dailyActivities = await prisma.dailyActivity.findMany({
      where: { linkedAccountId: { in: accountIds } },
      orderBy: { date: 'desc' },
      take: 20
    });

    // Transform into "Activity" shape
    const activities = dailyActivities.map(activity => {
      const account = accounts.find(a => a.id === activity.linkedAccountId);
      return {
        id: `daily-${activity.id}`,
        type: 'solve', // Icon type
        title: `Solved ${activity.count} problems`,
        description: `${account?.platform} (${account?.username})`,
        date: activity.date.toISOString(), // Send ISO date, let frontend format
        timestamp: activity.date.getTime()
      };
    });

    // Also include "Account Connected" events
    const connectionEvents = accounts.map(account => ({
      id: `conn-${account.id}`,
      type: 'connection',
      title: `Connected ${account.platform}`,
      description: `Synced as ${account.username}`,
      date: account.createdAt.toISOString(),
      timestamp: account.createdAt.getTime()
    }));

    // Merge and Sort
    const allActivity = [...activities, ...connectionEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // Limit to recent 20 items

    res.json(allActivity);
  } catch (error) {
    console.error("Get user activity error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
