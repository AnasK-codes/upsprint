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
import oauthRoutes from "./routes/oauth.routes.js";
import helmet from "helmet";

const app = express();
app.set("trust proxy", 1);

// Use Helmet to set default security headers
app.use(helmet());


// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Cookie parser
app.use(cookieParser());

// JSON body parser
app.use(express.json({ limit: "10kb" }));

// Passport initialization
app.use(passport.initialize());

// Rate limiting
app.use(apiLimiter);

// API Routes
app.use("/auth", oauthRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/groups", groupRoutes);
app.use("/admin", adminRoutes);

// Error handling
app.use(errorHandler);

// Metrics endpoint
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(getMetricsText());
});

export default app;
