import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/db.js";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../utils/constants.js";
import { consumeOAuthCode } from "../services/oauthCode.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, batch, branch } = req.body;

    // Body is validated by validate(registerBody) in auth.routes.ts.
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        batch,
        branch,
      },
    });

    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTIONS);

    // The JWT is only delivered via the httpOnly cookie, never in the body.
    res.status(201).json({
      message: "User created successfully",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const generateToken = (userId: number | string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /auth/exchange: trade the one-time code from the Google redirect for
 * the httpOnly auth cookie. The code is single use and expires after ~60s.
 */
export const exchangeCode = async (req: Request, res: Response) => {
  try {
    const userId = await consumeOAuthCode(req.body.code);
    if (userId === null) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    res.cookie("token", generateToken(user.id), COOKIE_OPTIONS);
    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ message: "Logged out successfully" });
};