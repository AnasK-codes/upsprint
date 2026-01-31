import { LeaderboardEntry } from "@/services/api";
import LeaderboardRow from "./LeaderboardRow";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useEffect } from "react";

export default function LeaderboardTable({
  rows,
  type = "score",
  headerLabel,
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
  headerLabel?: string;
}) {
  // Store previous ranks using a Map for O(1) lookup
  // Key: userId, Value: rank
  const prevRanks = useRef(new Map<number, number>());

  // Effect to update previous ranks AFTER rendering
  useEffect(() => {
    const newRanks = new Map<number, number>();
    rows.forEach((row, index) => {
      newRanks.set(row.user.id, index + 1);
    });
    prevRanks.current = newRanks;
  }); // Run on every render to capture the "previous" state for the NEXT render

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
                  : headerLabel || "Score"}
        </div>
      </div>

      {/* List */}
      <div className="relative min-h-[500px]">
        {rows.map((row, index) => {
          const currentRank = index + 1;
          const previousRank = prevRanks.current.get(row.user.id);

          let rankChange: "up" | "down" | "same" | "new" = "same";

          if (previousRank === undefined) {
            rankChange = "new";
          } else if (currentRank < previousRank) {
            rankChange = "up";
          } else if (currentRank > previousRank) {
            rankChange = "down";
          }

          return (
            <LeaderboardRow
              key={row.user.id}
              entry={row}
              index={index}
              type={type}
              rankChange={rankChange}
            />
          );
        })}

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
