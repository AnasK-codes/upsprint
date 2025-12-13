import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import pool from "./config/db.ts";

const app = express();
console.log("Database URL:", process.env.DATABASE_URL);
// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});
app.get("/db-test", async (_, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows[0]);
});

export default app;
