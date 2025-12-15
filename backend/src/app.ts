import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import snapshotRoutes from "./routes/snapshot.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
console.log("Database URL:", process.env.DATABASE_URL);
// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/platforms", platformRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/leaderboard", leaderboardRoutes);

export default app;
