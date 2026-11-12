import { Router } from "express";
import { login, register, logout, exchangeCode } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerBody, loginBody, exchangeBody } from "../validation/schemas.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerBody }), register);
router.post("/login", authLimiter, validate({ body: loginBody }), login);
router.post("/exchange", authLimiter, validate({ body: exchangeBody }), exchangeCode);
router.post("/logout", logout);

export default router;
