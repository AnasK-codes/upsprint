import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import snapshotRoutes from "./routes/snapshot.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import userRoutes from "./routes/user.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import { getMetricsText } from "./utils/metrics.js";

const app = express();
console.log("Database URL:", process.env.DATABASE_URL);
// Middleware
app.use(cors());
app.use(express.json());
app.use(errorHandler);
app.use(apiLimiter);


app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/platforms", platformRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/admin", adminRoutes);

// Sample route
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(getMetricsText());
});

export default app;
