import crypto from "crypto";
import prisma from "../config/db.js";

export const OAUTH_CODE_TTL_MS = 60 * 1000;

const hashCode = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

/** Create a random one-time code for a user. Only its hash is stored. */
export async function issueOAuthCode(userId: number): Promise<string> {
  const code = crypto.randomBytes(32).toString("base64url");
  const now = new Date();

  await prisma.$transaction([
    // Opportunistic cleanup of expired codes (indexed on expiresAt).
    prisma.oAuthCode.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.oAuthCode.create({
      data: {
        codeHash: hashCode(code),
        userId,
        expiresAt: new Date(now.getTime() + OAUTH_CODE_TTL_MS),
      },
    }),
  ]);

  return code;
}

/**
 * Redeem a code. Returns the user id, or null if the code is unknown, expired
 * or already used. The conditional updateMany makes redemption atomic, so two
 * concurrent exchanges of the same code cannot both succeed.
 */
export async function consumeOAuthCode(code: string): Promise<number | null> {
  const codeHash = hashCode(code);

  const { count } = await prisma.oAuthCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;

  const row = await prisma.oAuthCode.findUnique({ where: { codeHash }, select: { userId: true } });
  return row?.userId ?? null;
}
