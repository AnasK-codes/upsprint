import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

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

export default app;
