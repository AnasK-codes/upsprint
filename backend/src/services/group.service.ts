
import { Prisma } from "@prisma/client";
import prisma from "../config/db.js";
import { generateInviteCode } from "../utils/inviteCode.js";
import { competitionRanks } from "../utils/ranking.js";

export async function getUserGroups(userId: number) {
  return prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: true,
    },
  });
}

const MAX_CODE_ATTEMPTS = 5;

export async function createGroup(userId: number, name: string, description?: string) {
  // Codes are random; on the (rare) unique-constraint collision, retry with a new one.
  // The retry wraps the whole transaction because a failed statement aborts it in Postgres.
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: { name, description, code: generateInviteCode() },
        });

        await tx.groupMember.create({
          data: { userId, groupId: group.id, role: "ADMIN" },
        });

        return group;
      });
    } catch (err) {
      const collision =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!collision || attempt >= MAX_CODE_ATTEMPTS) throw err;
    }
  }
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
  return prisma.$transaction(async (tx) => {
    const left = await tx.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    // Never leave a group without an admin.
    if (left.role === "ADMIN") {
      const remainingAdmins = await tx.groupMember.count({ where: { groupId, role: "ADMIN" } });
      if (remainingAdmins === 0) {
        const oldest = await tx.groupMember.findFirst({
          where: { groupId },
          orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        });
        if (oldest) {
          await tx.groupMember.update({ where: { id: oldest.id }, data: { role: "ADMIN" } });
        } else {
          // Last member left: remove the empty group.
          await tx.group.delete({ where: { id: groupId } });
        }
      }
    }

    return left;
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
      // DailyActivity dates are stored at UTC midnight, so compare UTC days.
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      value = m.user.accounts.reduce((acc: number, account: any) => {
        // Filter dailyActivity manually if the DB query didn't limit it strictly enough or for safety
        const todayActivity = account.dailyActivity.find((d: any) => {
          const dDate = new Date(d.date);
          dDate.setUTCHours(0, 0, 0, 0);
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

  // Standard competition ranking over the whole sorted group (ties share a rank).
  const ranks = competitionRanks(rankedMembers, (m) => m.value);
  const pagedRanks = ranks.slice((page - 1) * limit, page * limit);

  // Map to LeaderboardEntry format
  return paged.map((item, index) => ({
    id: index + 1,
    rank: pagedRanks[index],
    score: item.value,
    user: {
      id: item.user.id,
      name: item.user.name || "Anonymous",
      avatarUrl: item.user.avatarUrl,
    },
    currentStreak: metric === "leetcode_streak" ? item.value : undefined,
  }));
}
