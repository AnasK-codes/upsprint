import prisma from "../config/db.js";
import { fetchCodeforcesUser } from "../services/codeforces.service.js";
import logger from "../utils/logger.js";

export async function enqueueSnapshotForAll() {
  const accounts = await prisma.linkedAccount.findMany();
  for (const acc of accounts) {
    try {
      if (acc.platform === "codeforces") {
        const data = await fetchCodeforcesUser(acc.username);
        await prisma.platformSnapshot.create({
          data: { linkedAccountId: acc.id, rating: data.rating ?? null, rankTitle: data.rank ?? null, problemsSolved: data.maxRating ?? null, rawData: data },
        });
        logger.info("Saved snapshot", { accountId: acc.id });
      }
    } catch (err: any) {
      logger.error("Snapshot failed", { accountId: acc.id, err: err.message });
    }
  }
}
