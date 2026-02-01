import dotenv from "dotenv";
dotenv.config();

const requiredKeys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "FRONTEND_URL"
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error("Missing required environment variables:", missingKeys);
  process.exit(1);
}

export default process.env;
