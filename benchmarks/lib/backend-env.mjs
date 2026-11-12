// Sets the env the built backend modules require (env.js exits otherwise) and returns helpers to import them.
// Always pins DATABASE_URL so a stray backend/.env can never redirect a benchmark to another database.
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DB_URL = process.env.DATABASE_URL ?? "postgresql://bench:bench@localhost:5433/upsprint_bench";

export function prepareBackendEnv() {
  const dbName = new URL(DB_URL).pathname.slice(1);
  if (!dbName.includes("bench")) throw new Error(`refusing database "${dbName}": name must contain "bench"`);
  process.env.DATABASE_URL = DB_URL;
  const defaults = {
    JWT_SECRET: "bench-secret", JWT_EXPIRES_IN: "7d", GOOGLE_CLIENT_ID: "bench", GOOGLE_CLIENT_SECRET: "bench",
    GOOGLE_CALLBACK_URL: "http://localhost:4000/cb", FRONTEND_URL: "http://localhost:3000", NODE_ENV: "production",
    ADMIN_EMAILS: "admin@bench.local", NEXT_PUBLIC_API_URL: "http://localhost:4000", DISABLE_CRON: "true",
  };
  for (const [k, v] of Object.entries(defaults)) process.env[k] ??= v;
}

export async function importBackend(rel) {
  prepareBackendEnv();
  const p = path.resolve(import.meta.dirname, "../../backend/dist", rel);
  return import(pathToFileURL(p).href);
}
