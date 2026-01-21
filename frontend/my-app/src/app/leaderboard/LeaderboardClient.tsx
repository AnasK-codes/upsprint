"use client";

import { useEffect, useState } from "react";
import { api, LeaderboardEntry } from "@/services/api";
import LeaderboardTable from "@/components/LeaderboardTable";
import Skeleton from "@/components/Skeleton";
import WelcomeAnimation from "@/components/WelcomeAnimation";
import { motion, AnimatePresence } from "framer-motion";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"global" | "leetcode" | "daily">(
    "global",
  );
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    // Check for welcome animation
    const hasWelcomed = sessionStorage.getItem("has_welcomed");
    if (!hasWelcomed) {
      setShowWelcome(true);
      sessionStorage.setItem("has_welcomed", "true");
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    let fetcher;
    if (activeTab === "leetcode") {
      fetcher = api.getLeetCodeLeaderboard(page, pageSize);
    } else if (activeTab === "daily") {
      fetcher = api.getDailyActivityLeaderboard(page, pageSize);
    } else {
      fetcher = api.getLeaderboard(page, pageSize);
    }

    fetcher
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load leaderboard:", err);
          setError(
            "Failed to refresh leaderboard data. Please try again later.",
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, activeTab]);

  const handleNext = () => setPage((p) => p + 1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));

  const handleTabChange = (tab: "global" | "leetcode" | "daily") => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setPage(1); // Reset to page 1
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg shadow-sm border border-red-100 max-w-md">
          <p className="font-semibold mb-1">Error Loading Data</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setPage((p) => p)} // Trigger re-render/fetch
            className="mt-4 text-xs font-semibold uppercase tracking-wide bg-white border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 pt-24 sm:pt-32 pb-12 px-6">
      <AnimatePresence>
        {showWelcome && (
          <WelcomeAnimation onComplete={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3"
          >
            <span>🔥</span> Leaderboard
          </motion.h1>

          <motion.p
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-500 max-w-lg text-lg"
          >
            {activeTab === "leetcode"
              ? "Rankings based only on LeetCode performance."
              : activeTab === "daily"
                ? "Users ranked by current daily streak."
                : "See who's currently topping the charts across all platforms."}
          </motion.p>

          {/* Animated Tabs */}
          <div className="flex p-1 bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-full shadow-sm relative mt-6">
            {(["global", "leetcode", "daily"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative px-6 py-2.5 text-sm font-medium rounded-full transition-colors z-10 ${
                  activeTab === tab
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-gray-100/50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span className="relative z-10 capitalize">
                  {tab === "daily" ? "Daily Activity" : tab}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {/* Header Skeleton */}
            <div className="h-12 bg-gray-100 rounded-lg w-full animate-pulse" />
            {/* Rows Skeleton */}
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <LeaderboardTable
              rows={data}
              type={activeTab === "daily" ? "streak" : "score"}
            />

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handlePrev}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Previous
              </button>
              <span className="text-sm text-gray-500">
                Page <span className="font-medium text-gray-900">{page}</span>
              </span>
              <button
                onClick={handleNext}
                disabled={data.length < pageSize}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
