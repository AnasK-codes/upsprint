import prisma from "../config/db.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";

export async function runAllSnapshots() {
  const accounts = await prisma.linkedAccount.findMany();

  for (const acc of accounts) {
    if (acc.platform !== "codeforces") continue;

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
  }
}
