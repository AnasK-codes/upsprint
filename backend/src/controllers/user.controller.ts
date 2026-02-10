import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { VALID_PLATFORMS, VALID_BRANCHES } from "../utils/constants.js";

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
        leaderboardVisibility: true as any,
        accounts: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      } as any,
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

    if (batch && !/^\d{4}$/.test(String(batch))) {
      return res.status(400).json({ message: "Invalid batch year" });
    }

    if (branch && !VALID_BRANCHES.includes(branch)) {
      return res.status(400).json({ message: "Invalid branch" });
    }

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
        leaderboardVisibility: true as any,
        accounts: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      } as any,
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


    // Immediate snapshot fetch and processing (includes Daily Activity for LeetCode)
    try {
      const { processAccountSnapshot } = await import("../jobs/snapshot.job.js");
      await processAccountSnapshot(newAccount);

      // --- INSTANT LEADERBOARD UPDATE START ---
      const { rebuildLeaderboard } = await import("../jobs/leaderboard.job.js");
      await rebuildLeaderboard();
      // --- INSTANT LEADERBOARD UPDATE END ---

    } catch (fetchErr: any) {
      console.error(`Immediate fetch/update failed for ${platform}:${username}`, fetchErr.message);
      // Undo account creation
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

    // Delete related data first to avoid Foreign Key constraint errors
    await prisma.platformSnapshot.deleteMany({
      where: { linkedAccountId: Number(id) },
    });
    await prisma.dailyActivity.deleteMany({
      where: { linkedAccountId: Number(id) },
    });

    await prisma.linkedAccount.delete({
      where: { id: Number(id) },
    });

    // Check if user has any remaining accounts
    const remainingAccountsCount = await prisma.linkedAccount.count({
      where: { userId: req.userId },
    });

    if (remainingAccountsCount === 0) {
      await prisma.leaderboard.delete({
        where: { userId: req.userId },
      }).catch(() => { }); // Ignore if not found
    }

    // Always rebuild to ensure correct ranking/scores for everyone
    const { rebuildLeaderboard } = await import("../jobs/leaderboard.job.js");
    await rebuildLeaderboard();

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

export const updateLeaderboardVisibility = async (req: AuthRequest, res: Response) => {
  try {
    const { visibility } = req.body;

    if (!["GLOBAL_AND_GROUPS", "GROUPS_ONLY"].includes(visibility)) {
      return res.status(400).json({ message: "Invalid visibility option" });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        leaderboardVisibility: visibility,
      } as any,
      select: {
        id: true,
        leaderboardVisibility: true as any,
      } as any,
    });

    // Clear leaderboard cache so changes are reflected immediately
    await import("../utils/cache.js").then(m => m.clearCachePrefix("leaderboard:"));

    // Fetch full profile to return (ensures consistent state)
    const fullProfile = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        batch: true,
        branch: true,
        avatarUrl: true,
        createdAt: true,
        leaderboardVisibility: true as any,
        accounts: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      } as any,
    });



    res.json(fullProfile);
  } catch (error) {
    console.error("Update visibility error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
