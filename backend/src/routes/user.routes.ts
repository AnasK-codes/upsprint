import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getProfile, updateProfile, connectAccount, disconnectAccount, getAccounts } from "../controllers/user.controller.js";

const router = Router();

/* GET current user */
router.get("/me", authenticate, getProfile);

/* PUT update user profile */
router.put("/me", authenticate, updateProfile);

/* POST connect a coding account */
router.post("/accounts/connect", authenticate, connectAccount);

/* DELETE disconnect a coding account */
router.delete("/accounts/:id", authenticate, disconnectAccount);

/* GET connected accounts */
router.get("/accounts", authenticate, getAccounts);

export default router;
