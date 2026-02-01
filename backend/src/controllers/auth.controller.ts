import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/db.js";
import jwt from "jsonwebtoken";
import { VALID_BRANCHES, COOKIE_OPTIONS } from "../utils/constants.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, batch, branch } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password required" });
    }

    if (batch && !/^\d{4}$/.test(String(batch))) {
      return res.status(400).json({ message: "Invalid batch year" });
    }

    if (branch && !VALID_BRANCHES.includes(branch)) {
      return res.status(400).json({ message: "Invalid branch" });
    }

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

    res.status(201).json({ message: "User created successfully", token });
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

export const login = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

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
      token,
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

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ message: "Logged out successfully" });
};