
import prisma from "../config/db.js";

export async function getUserGroups(userId: number) {
  return prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: true,
    },
  });
}

export async function getGroupLeaderboard(
  groupId: number,
  page = 1,
  limit = 50
) {
  const skip = (page - 1) * limit;

  // Fetch only members of this group that are also in the global leaderboard
  // If a user is not in the leaderboard table yet, they won't show up here.
  const rows = await prisma.leaderboard.findMany({
    where: {
      user: {
        groups: {
          some: { groupId },
        },
      },
    },
    orderBy: { rank: "asc" },
    skip,
    take: limit,
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
  });

  return rows;
}
