
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getUserGroups,
  getGroupLeaderboard,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
} from "../services/group.service.js";

const router = Router();

/**
 * GET /groups/me
 * Fetch groups the authenticated user belongs to
 */
router.get("/me", authenticate, async (req: any, res) => {
  try {
    const userId = req.userId;
    const groups = await getUserGroups(userId);
    res.json(groups.map((g) => g.group));
  } catch (err) {
    console.error("GET /groups/me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /groups
 * Create a new group
 */
router.post("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.userId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = await createGroup(userId, name, description);
    res.json(group);
  } catch (err) {
    console.error("POST /groups error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /groups/join
 * Join a group via code
 */
router.post("/join", authenticate, async (req: any, res) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const member = await joinGroup(userId, code);
    res.json(member.group);
  } catch (err: any) {
    console.error("POST /groups/join error:", err);
    if (err.message === "Group not found") {
      return res.status(404).json({ message: "Invalid invite code" });
    }
    if (err.message === "Already a member") {
      return res.status(400).json({ message: "You are already a member of this group" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /groups/:groupId/leave
 * Leave a group
 */
router.post("/:groupId/leave", authenticate, async (req: any, res) => {
  try {
    const userId = req.userId;
    const groupId = Number(req.params.groupId);

    await leaveGroup(userId, groupId);
    res.json({ message: "Left group successfully" });
  } catch (err) {
    console.error("POST /groups/:groupId/leave error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /groups/:groupId/members
 * Get members of a group
 */
router.get("/:groupId/members", authenticate, async (req: any, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const members = await getGroupMembers(groupId);
    res.json(members);
  } catch (err) {
    console.error("GET /groups/:groupId/members error:", err);
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
    const metric = req.query.metric as "score" | "activity_7d" | "leetcode_streak" | "total_solved" | "contest_rating" || "score";

    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const data = await getGroupLeaderboard(groupId, page, limit, metric);

    res.json({ page, limit, data });
  } catch (err) {
    console.error("GET /groups/:groupId/leaderboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
