
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getUserGroups,
  getGroupLeaderboard,
} from "../services/group.service.js";

const router = Router();

/**
 * GET /groups/me
 * Fetch groups the authenticated user belongs to
 */
router.get("/me", authenticate, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const groups = await getUserGroups(userId);
    res.json(groups.map((g) => g.group));
  } catch (err) {
    console.error("GET /groups/me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /groups/:groupId/leaderboard
 * Fetch leaderboard for a specific group
 */
router.get("/:groupId/leaderboard", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const data = await getGroupLeaderboard(groupId, page, limit);

    res.json({ page, limit, data });
  } catch (err) {
    console.error("GET /groups/:groupId/leaderboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
