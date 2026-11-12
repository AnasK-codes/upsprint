import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { getProfile, updateProfile, connectAccount, disconnectAccount, getAccounts, getUserActivity, updateLeaderboardVisibility } from "../controllers/user.controller.js";
import { updateProfileBody, visibilityBody, connectAccountBody, idParams } from "../validation/schemas.js";

const router = Router();

/* GET current user */
router.get("/me", authenticate, getProfile);

/* PUT update user profile */
router.put("/me", authenticate, validate({ body: updateProfileBody }), updateProfile);

/* PATCH update leaderboard visibility */
router.patch("/leaderboard-visibility", authenticate, validate({ body: visibilityBody }), updateLeaderboardVisibility);

/* POST connect a coding account */
router.post("/accounts/connect", authenticate, validate({ body: connectAccountBody }), connectAccount);

/* DELETE disconnect a coding account */
router.delete("/accounts/:id", authenticate, validate({ params: idParams }), disconnectAccount);

/* GET connected accounts */
router.get("/accounts", authenticate, getAccounts);

/* GET user activity feed */
router.get("/activity", authenticate, getUserActivity);

export default router;
