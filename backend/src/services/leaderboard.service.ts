import prisma from "../config/db.js";

const PLATFORM_WEIGHTS: Record<string, number> = {
  codeforces: 1.0,
  leetcode: 0.6,
  codechef: 0.4,
};

function normalizeRating(platform: string, data: any) {
  // prefer explicit maxRating, fallback heuristics
  const rating = data.rating ?? data.maxRating ?? null;
  const max = data.maxRating ?? (platform === "codeforces" ? 4000 : 3000);
  if (!rating) return 0;
  return Math.min(1, rating / max);
}

export async function scoreLatestSnapshotForAccount(linkedAccountId: number) {
  const snapshot = await prisma.platformSnapshot.findFirst({
    where: { linkedAccountId },
    orderBy: { createdAt: "desc" },
    include: { linkedAccount: true }, // ✅ FIX
  });

  if (!snapshot) return 0;

  const platform = snapshot.linkedAccount.platform;
  const weight = PLATFORM_WEIGHTS[platform] ?? 1;
  const normalized = normalizeRating(platform, snapshot.rawData ?? {});

  return normalized * weight * 1000;
}

