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
      whileHover={{ y: -4 }}
      className={clsx(
        "relative group flex flex-col justify-between p-6 rounded-2xl border transition-all h-40",
        isConnected
          ? getLightTheme(platform)
          : "bg-white border-dashed border-gray-200 hover:border-gray-300",
      )}
    >
      <div className="flex justify-between items-start">
        <div
          className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br",
            isConnected
              ? getTheme(platform)
              : "from-gray-100 to-gray-200 text-gray-400 shadow-none grayscale",
          )}
        >
          {platform.substring(0, 2).toUpperCase()}
        </div>

        {isConnected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDisconnect();
            }}
            className="p-1.5 rounded-full bg-white/50 hover:bg-red-100 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        )}
      </div>

      <div>
        <h3
          className={clsx(
            "font-bold text-lg capitalize",
            isConnected ? "" : "text-gray-400 group-hover:text-gray-600",
          )}
        >
          {platform}
        </h3>

        {isConnected ? (
          <div className="flex items-center gap-1.5 mt-1 font-medium opacity-80 decoration-slice">
            <span className="truncate">@{username}</span>
            <Check className="w-3 h-3" />
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="mt-2 text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            Connect Account <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
