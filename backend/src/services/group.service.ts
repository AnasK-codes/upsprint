
import prisma from "../config/db.js";

export async function getUserGroups(userId: number) {
  return prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: true,
    },
  });
}

export async function createGroup(userId: number, name: string, description?: string) {
  // Generate a random 6-character code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create group and add creator as admin
  // Use a transaction to ensure integrity
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name,
        description,
        code,
      },
    });

    await tx.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: "ADMIN",
      },
    });

    return group;
  });
}

export async function joinGroup(userId: number, code: string) {
  const group = await prisma.group.findUnique({
    where: { code },
  });

  if (!group) throw new Error("Group not found");

  const existingMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId: group.id,
      },
    },
  });

  if (existingMember) throw new Error("Already a member");

  return prisma.groupMember.create({
    data: {
      userId,
      groupId: group.id,
      role: "MEMBER",
    },
    include: { group: true },
  });
}

export async function leaveGroup(userId: number, groupId: number) {
  return prisma.groupMember.delete({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });
}

export async function getGroupMembers(groupId: number) {
  return prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function getGroupLeaderboard(
  groupId: number,
  page = 1,
  limit = 50,
  metric: "score" | "activity_7d" | "activity_today" | "leetcode_streak" | "total_solved" | "contest_rating" = "score"
) {
  // Fetch group members with all necessary data
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        include: {
          leaderboard: true,
          accounts: {
            include: {
              snapshots: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              dailyActivity: {
                where: {
                  date: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate value for each member
  const rankedMembers = members.map((m) => {
    let value = 0;

    // Default score from global leaderboard
    if (metric === "score") {
      value = m.user.leaderboard?.score || 0;
    }

    // Activity: Sum of counts in last 7 days
    else if (metric === "activity_7d") {
      value = m.user.accounts.reduce((acc: number, account: any) => {
        return acc + account.dailyActivity.reduce((sum: number, day: any) => sum + day.count, 0);
      }, 0);
    }

    // Activity: Today
    else if (metric === "activity_today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      value = m.user.accounts.reduce((acc: number, account: any) => {
        // Filter dailyActivity manually if the DB query didn't limit it strictly enough or for safety
        const todayActivity = account.dailyActivity.find((d: any) => {
          const dDate = new Date(d.date);
          dDate.setHours(0, 0, 0, 0);
          return dDate.getTime() === today.getTime();
        });
        return acc + (todayActivity?.count || 0);
      }, 0);
    }

    // LeetCode Streak
    else if (metric === "leetcode_streak") {
      const lc = m.user.accounts.find((a: any) => a.platform.toLowerCase() === "leetcode");
      value = lc?.currentStreak || 0;
    }

    // Total Solved (LeetCode primarily)
    else if (metric === "total_solved") {
      const lc = m.user.accounts.find((a: any) => a.platform.toLowerCase() === "leetcode");
      const lastSnap = lc?.snapshots[0];
      // rawData is Json, assume it has solved count or use problemsSolved if schema has it
      value = lastSnap?.problemsSolved || 0;
    }

    // Contest Rating (LeetCode)
    else if (metric === "contest_rating") {
      const lc = m.user.accounts.find((a: any) => a.platform.toLowerCase() === "leetcode");
      const lastSnap = lc?.snapshots[0];
      value = lastSnap?.rating || 0;
    }

    return {
      userId: m.userId,
      user: m.user,
      value,
    };
  });

  // Sort Descending
  rankedMembers.sort((a, b) => b.value - a.value);

  // Paginate
  const paged = rankedMembers.slice((page - 1) * limit, page * limit);

  // Map to LeaderboardEntry format
  return paged.map((item, index) => ({
    id: index + 1, // rank for this specific view
    rank: (page - 1) * limit + index + 1,
    score: item.value, // Used generically for the metric value
    user: {
      id: item.user.id,
      name: item.user.name || "Anonymous",
      email: item.user.email,
      avatarUrl: item.user.avatarUrl,
    },
    // Populate extra fields if useful for UI context
    currentStreak: metric === "leetcode_streak" ? item.value : undefined,
  }));
}
