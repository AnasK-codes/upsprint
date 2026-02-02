import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import snapshotRoutes from "./routes/snapshot.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import groupRoutes from "./routes/group.routes.js";
import userRoutes from "./routes/user.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import { getMetricsText } from "./utils/metrics.js";
import passport from "passport";
import prisma from "./config/db.js";
import oauthRoutes from "./routes/oauth.routes.js";

const app = express();


// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());
app.use(apiLimiter);

app.use("/auth", oauthRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/groups", groupRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);


app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(getMetricsText());
});

export default app;
