import { motion } from "framer-motion";
import { Check, Plus, ExternalLink, X } from "lucide-react";
import { clsx } from "clsx";

interface PlatformCardProps {
  platform: string;
  isConnected: boolean;
  username?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function PlatformCard({
  platform,
  isConnected,
  username,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  const getTheme = (p: string) => {
    switch (p.toLowerCase()) {
      case "leetcode":
        return "from-orange-500 to-yellow-500 shadow-orange-200";
      case "codeforces":
        return "from-blue-600 to-indigo-600 shadow-blue-200";
      case "codechef":
        return "from-amber-700 to-brown-600 shadow-amber-200"; // brown not std tailwind, using amber
      default:
        return "from-gray-700 to-gray-900 shadow-gray-200";
    }
  };

  const getLightTheme = (p: string) => {
    switch (p.toLowerCase()) {
      case "leetcode":
        return "bg-orange-50 text-orange-600 border-orange-100";
      case "codeforces":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "codechef":
        return "bg-amber-50 text-amber-800 border-amber-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      className={clsx(
        "relative group flex flex-col justify-between p-6 rounded-3xl border transition-all h-44 overflow-hidden",
        isConnected
          ? "bg-white border-slate-200 shadow-sm hover:shadow-2xl"
          : "bg-slate-50 border-dashed border-slate-200 hover:border-slate-300 hover:bg-white",
        // Platform specific hover glows
        isConnected &&
          platform.toLowerCase() === "leetcode" &&
          "hover:shadow-orange-500/10 hover:border-orange-200",
        isConnected &&
          platform.toLowerCase() === "codeforces" &&
          "hover:shadow-blue-500/10 hover:border-blue-200",
        isConnected &&
          platform.toLowerCase() === "codechef" &&
          "hover:shadow-amber-500/10 hover:border-amber-200",
      )}
    >
      {/* Background Decor (Subtle) */}
      {isConnected && (
        <div
          className={clsx(
            "absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-3xl",
            platform.toLowerCase() === "leetcode" && "bg-orange-500",
            platform.toLowerCase() === "codeforces" && "bg-blue-500",
            platform.toLowerCase() === "codechef" && "bg-amber-500",
          )}
        />
      )}

      <div className="flex justify-between items-start relative z-10">
        <div
          className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-transform group-hover:scale-105 bg-gradient-to-br",
            isConnected
              ? getTheme(platform)
              : "from-slate-200 to-slate-200 text-slate-400 shadow-none",
          )}
        >
          {/* Logo or Initials */}
          {platform.substring(0, 1)}
        </div>

        {isConnected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDisconnect();
            }}
            className="p-2 rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Disconnect"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h3
          className={clsx(
            "font-black text-xl tracking-tight mb-1",
            isConnected
              ? "text-slate-900"
              : "text-slate-400 group-hover:text-slate-600 transition-colors",
          )}
        >
          {platform}
        </h3>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border",
                getLightTheme(platform),
              )}
            >
              <Check className="w-3 h-3" /> Connected
            </span>
            <span className="text-xs font-medium text-slate-400 truncate max-w-[100px]">
              @{username}
            </span>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="mt-1 text-sm font-bold text-indigo-600 flex items-center gap-1 group/btn"
          >
            Connect Now{" "}
            <ExternalLink className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
