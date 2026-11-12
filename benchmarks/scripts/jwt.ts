// Usage: JWT_SECRET=... npx tsx scripts/jwt.ts <userId> [expiresInSec]
// Prints a Bearer-compatible token (also usable as the "token" cookie value).
// @ts-ignore
import { signJwt } from "../lib/jwt.mjs";

const userId = Number(process.argv[2]);
if (!Number.isInteger(userId)) {
  console.error("usage: JWT_SECRET=... tsx scripts/jwt.ts <userId> [expiresInSec]");
  process.exit(1);
}
const secret = process.env.JWT_SECRET ?? "bench-secret"; // matches .env.bench.example
console.log(signJwt({ userId }, secret, Number(process.argv[3] ?? 86400)));
