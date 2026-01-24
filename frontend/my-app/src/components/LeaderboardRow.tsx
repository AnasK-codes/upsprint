import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/services/api";
import Link from "next/link";
import { Crown, Medal, Trophy, Flame, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Tooltip from "./Tooltip";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  type?:
    | "score"
    | "streak"
    | "activity_7d"
    | "activity_today"
    | "leetcode_streak"
    | "total_solved"
    | "contest_rating";
}

export default function LeaderboardRow({
  entry,
  index,
  type = "score",
}: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3;

  // Streak Logic
  const steakValue = entry.currentStreak || entry.score || 0; // Use score if type implies it holds the value
  const isStreakBroken =
    (type === "streak" || type === "leetcode_streak") &&
    steakValue === 0 &&
    (entry.totalActiveDays || 0) > 0;

  const getStreakIntensity = (s: number) => {
    if (s >= 30)
      return {
        color: "text-purple-600",
        fill: "fill-purple-600",
        shadow: "shadow-purple-200",
        flameAnim: "animate-bounce",
      };
    if (s >= 7)
      return {
        color: "text-red-500",
        fill: "fill-red-500",
        shadow: "shadow-red-200",
        flameAnim: "animate-pulse",
      };
    if (s >= 3)
      return {
        color: "text-orange-500",
        fill: "fill-orange-500",
        shadow: "shadow-orange-200",
        flameAnim: "",
      };
    return {
      color: "text-gray-400",
      fill: "fill-gray-300",
      shadow: "",
      flameAnim: "",
    };
  };

  const streak =
    type === "leetcode_streak" ? entry.score || 0 : entry.currentStreak || 0;
  const streakStyles = getStreakIntensity(streak);

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200 shadow-amber-100/50";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-slate-100 border-slate-200 shadow-slate-100/50";
      case 3:
        return "bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-200 shadow-orange-100/50";
      default:
        return "bg-white border-gray-100 hover:bg-gray-50";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Crown className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
        );
      case 2:
        return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-orange-400 fill-orange-400" />;
      default:
        return (
          <span className="text-gray-500 font-mono font-medium w-6 text-center">
            {rank}
          </span>
        );
    }
  };

  const renderValue = () => {
    if (type === "streak" || type === "leetcode_streak") {
      return (
        <Tooltip
          content={
            <div className="text-center">
              <p className="font-bold">{streak} day streak</p>
              {isStreakBroken && (
                <p className="text-red-300 text-[10px] mt-1">Streak lost!</p>
              )}
            </div>
          }
        >
          <div className="flex flex-col items-end cursor-help">
            <div
              className={clsx(
                "flex items-center gap-1.5 font-bold transition-colors",
                streakStyles.color,
              )}
            >
              <Flame
                className={clsx(
                  "w-4 h-4 transition-all",
                  streakStyles.fill,
                  streakStyles.flameAnim,
                )}
                style={{ animationDuration: streak >= 30 ? "1s" : "2s" }}
              />
              <span>{streak}</span>
            </div>
          </div>
        </Tooltip>
      );
    }

    if (type === "activity_7d" || type === "activity_today") {
      return (
        <div className="flex items-center gap-1.5 text-blue-600 font-bold">
          <TrendingUp className="w-4 h-4" />
          <span>{entry.score}</span>
        </div>
      );
    }

    if (type === "total_solved") {
      return (
        <div className="flex items-center gap-1.5 text-green-600 font-bold">
          <span>{entry.score}</span>
          <span className="text-xs font-medium text-gray-400 uppercase">
            Solved
          </span>
        </div>
      );
    }

    if (type === "contest_rating") {
      return (
        <div className="flex items-center gap-1.5 text-fuchsia-600 font-bold">
          <span className="text-xs">Rating:</span>
          <span>{entry.score}</span>
        </div>
      );
    }

    // Default Score
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
          <TrendingUp className="w-4 h-4" />
          <span>{(entry.score || 0).toFixed(2)}</span>
        </div>
        {entry.rank === 1 && (
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-tight">
            Current Leader
          </span>
        )}
      </div>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: isStreakBroken ? 0.7 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        type: "spring",
        stiffness: 100,
      }}
      whileHover={{
        scale: 1.02,
        backgroundColor: isStreakBroken ? "#f9fafb" : undefined,
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)",
        zIndex: 10,
        opacity: 1,
      }}
      className={twMerge(
        "relative flex items-center p-4 rounded-xl border-2 transition-colors mb-3",
        getRankStyles(entry.rank),
        isStreakBroken &&
          "grayscale-[0.5] border-dashed border-gray-200 bg-gray-50/50",
      )}
    >
      {/* Rank Indicator */}
      <div className="flex-shrink-0 w-12 flex justify-center items-center">
        <div
          className={clsx(
            "w-8 h-8 flex items-center justify-center rounded-full",
            isTop3 ? "bg-white shadow-sm" : "bg-gray-100",
          )}
        >
          {getRankIcon(entry.rank)}
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1 ml-4 min-w-0">
        <Link href={`/user/${entry.user.id}`} className="block group">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "font-bold truncate transition-colors",
                isStreakBroken
                  ? "text-gray-500"
                  : "text-gray-900 group-hover:text-indigo-600",
              )}
            >
              {entry.user.name}
            </span>
            {isTop3 && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/50 border border-black/5 text-black/50"
              >
                Top {entry.rank}
              </motion.span>
            )}
            {isStreakBroken && (
              <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                Streak Broken
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Score / Streak / Value */}
      <div className="flex-shrink-0 text-right">{renderValue()}</div>
    </motion.div>
  );
}
