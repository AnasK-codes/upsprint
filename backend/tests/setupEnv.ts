import { inject } from "vitest";

// Runs before every test file and before any src/ module is imported, so
// config/db.ts, passport.ts and the JWT code see these values. They are fake,
// test-only values; real .env files are never read.
process.env.DATABASE_URL = inject("databaseUrl");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "7d";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:4000/auth/google/callback";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.ADMIN_EMAILS = "admin@example.test";
process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
process.env.LOG_LEVEL = "error";
delete process.env.METRICS_TOKEN;
