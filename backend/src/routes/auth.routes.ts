import { Router } from "express";
import { login, register, logout } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

export default router;
