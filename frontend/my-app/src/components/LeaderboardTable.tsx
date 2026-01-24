import { LeaderboardEntry } from "@/services/api";
import LeaderboardRow from "./LeaderboardRow";
import { AnimatePresence, motion } from "framer-motion";

export default function LeaderboardTable({
  rows,
  type = "score",
}: {
  rows: LeaderboardEntry[];
  type?:
    | "score"
    | "streak"
    | "activity_7d"
    | "activity_today"
    | "leetcode_streak"
    | "total_solved"
    | "contest_rating";
}) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Row */}
      <div className="grid grid-cols-[3rem_1fr_auto] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        <div className="text-center">Rank</div>
        <div>User</div>
        <div className="text-right">
          {type === "streak" || type === "leetcode_streak"
            ? "Streak"
            : type === "activity_7d" || type === "activity_today"
              ? "Activity"
              : type === "total_solved"
                ? "Solved"
                : type === "contest_rating"
                  ? "Rating"
                  : "Score"}
        </div>
      </div>

      {/* List */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="popLayout">
          {rows.map((row, index) => (
            <LeaderboardRow
              key={row.user.id}
              entry={row}
              index={index}
              type={type}
            />
          ))}
        </AnimatePresence>

        {rows.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            No active users found for this period.
          </motion.div>
        )}
      </div>
    </div>
  );
}
