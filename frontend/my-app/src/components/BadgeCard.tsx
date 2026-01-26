import { motion } from "framer-motion";
import { Lock, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { clsx } from "clsx";

export interface Badge {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  category: "streak" | "rank" | "milestone";
  icon: string; // Emoji or Lucide icon name fallback
}

interface BadgeCardProps {
  badge: Badge;
}

export default function BadgeCard({ badge }: BadgeCardProps) {
  const handleConfetti = (e: React.MouseEvent) => {
    if (!badge.isUnlocked) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      origin: { x, y },
      particleCount: 50,
      spread: 70,
      startVelocity: 30,
      gravity: 0.8,

      ticks: 200,
      colors: ["#06b6d4", "#f1f5f9", "#cbd5e1"], // Cyan, Slate-100, Slate-300
    });
  };

  return (
    <motion.div
      layout
      whileHover={badge.isUnlocked ? { scale: 1.05, y: -5 } : {}}
      onClick={handleConfetti}
      className={clsx(
        "relative group p-4 rounded-2xl border transition-all cursor-default overflow-hidden flex flex-col items-center text-center h-full",
        badge.isUnlocked
          ? "bg-white border-slate-200 shadow-sm hover:shadow-cyan-100/50 hover:border-cyan-200 cursor-pointer"
          : "bg-slate-50 border-dashed border-slate-200 opacity-70",
      )}
    >
      {/* Background Glow for Unlocked */}
      {badge.isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/50 via-cyan-50/30 to-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Icon */}
      <div
        className={clsx(
          "w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-sm relative z-10 transition-transform",
          badge.isUnlocked
            ? "bg-white text-slate-900 group-hover:scale-110"
            : "bg-slate-200 text-slate-400 grayscale",
        )}
      >
        {badge.isUnlocked ? (
          <span>{badge.icon}</span>
        ) : (
          <Lock className="w-6 h-6" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h4
          className={clsx(
            "font-bold",
            badge.isUnlocked ? "text-slate-900" : "text-slate-500",
          )}
        >
          {badge.name}
        </h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {badge.description}
        </p>
      </div>

      {/* Category Badge */}
      <div
        className={clsx(
          "absolute top-2 right-2 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-sm",
          badge.isUnlocked
            ? "bg-white/80 text-slate-400"
            : "bg-slate-200 text-slate-400",
        )}
      >
        {badge.category}
      </div>
    </motion.div>
  );
}
