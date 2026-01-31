import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getProfile, updateProfile, connectAccount, disconnectAccount, getAccounts, getUserActivity, updateLeaderboardVisibility } from "../controllers/user.controller.js";

const router = Router();

/* GET current user */
router.get("/me", authenticate, getProfile);

/* PUT update user profile */
router.put("/me", authenticate, updateProfile);

/* PATCH update leaderboard visibility */
router.patch("/leaderboard-visibility", authenticate, updateLeaderboardVisibility);

/* POST connect a coding account */
router.post("/accounts/connect", authenticate, connectAccount);

/* DELETE disconnect a coding account */
router.delete("/accounts/:id", authenticate, disconnectAccount);

/* GET connected accounts */
router.get("/accounts", authenticate, getAccounts);

/* GET user activity feed */
router.get("/activity", authenticate, getUserActivity);

export default router;
