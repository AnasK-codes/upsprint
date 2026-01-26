"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api, LeaderboardEntry, Group } from "@/services/api";
import LeaderboardTable from "@/components/LeaderboardTable";
import Skeleton from "@/components/Skeleton";
import WelcomeAnimation from "@/components/WelcomeAnimation";
import GroupManagementModal from "@/components/GroupManagementModal";
import GroupDetails from "@/components/GroupDetails";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Users } from "lucide-react";

export default function LeaderboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    "global" | "leetcode" | "daily" | "groups"
  >("global");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [metric, setMetric] = useState<
    | "score"
    | "activity_7d"
    | "leetcode_streak"
    | "total_solved"
    | "contest_rating"
  >("score");

  const [filters, setFilters] = useState({
    batch: searchParams.get("batch") || "All",
    branch: searchParams.get("branch") || "All",
    platform: searchParams.get("platform") || "All",
  });

  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const pageSize = 20;

  const updateFilters = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const cache = useRef<{ [key: string]: LeaderboardEntry[] }>({});

  useEffect(() => {
    // Check for welcome animation
    const hasWelcomed = sessionStorage.getItem("has_welcomed");
    if (!hasWelcomed) {
      setShowWelcome(true);
      sessionStorage.setItem("has_welcomed", "true");
    }

    let isMounted = true;

    // Create a cache key based on current state
    const cacheKey = `${activeTab}-${page}-${JSON.stringify(filters)}-${selectedGroupId}-${metric}`;

    // Check cache first
    if (cache.current[cacheKey]) {
      setData(cache.current[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let fetcher;
    if (activeTab === "leetcode") {
      // Platform filter doesn't apply to LeetCode tab (it's implicit)
      const { platform, ...restFilters } = filters;
      fetcher = api.getLeetCodeLeaderboard(page, pageSize, restFilters);
    } else if (activeTab === "daily") {
      fetcher = api.getDailyActivityLeaderboard(page, pageSize, filters);
    } else if (activeTab === "groups") {
      if (selectedGroupId) {
        fetcher = api.getGroupLeaderboard(
          selectedGroupId,
          page,
          pageSize,
          metric,
        );
      } else {
        // No group selected yet, just resolve empty
        fetcher = Promise.resolve({ data: [], page: 1, limit: pageSize });
      }
    } else {
      fetcher = api.getLeaderboard(page, pageSize, filters);
    }

    fetcher
      .then((res) => {
        if (isMounted) {
          // Update cache
          cache.current[cacheKey] = res.data;
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
  }, [page, activeTab, filters, selectedGroupId, metric]);

  // Fetch user groups when entering groups tab
  useEffect(() => {
    if (activeTab === "groups" && groups.length === 0) {
      api
        .getUserGroups()
        .then((res) => {
          setGroups(res);
          if (res.length > 0 && !selectedGroupId) {
            setSelectedGroupId(res[0].id);
          }
        })
        .catch((err) => console.error("Failed to fetch groups", err));
    }
  }, [activeTab]);

  const handleNext = () => setPage((p) => p + 1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));

  const handleTabChange = (tab: "global" | "leetcode" | "daily" | "groups") => {
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
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-cyan-50/50 pt-24 sm:pt-32 pb-12 px-6">
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
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 flex items-center gap-3"
          >
            <span>🔥</span> Leaderboard
          </motion.h1>

          <motion.p
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-500 max-w-lg text-lg"
          >
            {activeTab === "leetcode"
              ? "Rankings based only on LeetCode performance."
              : activeTab === "daily"
                ? "Users ranked by current daily streak."
                : activeTab === "groups"
                  ? "Rankings within your private groups."
                  : "See who's currently topping the charts across all platforms."}
          </motion.p>

          {/* Animated Tabs */}
          <div className="flex p-1 bg-slate-50/50 backdrop-blur-md border border-slate-200 rounded-full shadow-sm relative mt-6 overflow-x-auto max-w-full">
            {(["global", "leetcode", "daily", "groups"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative px-6 py-2.5 text-sm font-medium rounded-full transition-colors z-10 ${
                  activeTab === tab
                    ? "text-[#1E3A8A]"
                    : "text-[#475569] hover:text-[#1E3A8A]"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-cyan-500/30"
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

          {/* Filters */}
          {activeTab !== "groups" && (
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <FilterDropdown
                label="Batch"
                options={[
                  "All",
                  "2021",
                  "2022",
                  "2023",
                  "2024",
                  "2025",
                  "2026",
                  "2027",
                  "2028",
                  "2029",
                ]}
                value={filters.batch}
                onChange={(val) => updateFilters("batch", val)}
              />
              <FilterDropdown
                label="Branch"
                options={["All", "CSE", "IT", "ECE", "ME", "EE", "CE", "CHE"]}
                value={filters.branch}
                onChange={(val) => updateFilters("branch", val)}
              />
              {activeTab !== "leetcode" && (
                <FilterDropdown
                  label="Platform"
                  options={["All", "LeetCode", "Codeforces", "CodeChef"]}
                  value={filters.platform}
                  onChange={(val) => updateFilters("platform", val)}
                />
              )}
            </div>
          )}

          {/* Group Selector & Actions */}
          {activeTab === "groups" && (
            <div className="flex flex-col items-center gap-6 mt-6">
              {groups.length > 0 ? (
                <div className="w-full max-w-md">
                  <div className="relative">
                    <select
                      value={selectedGroupId || ""}
                      onChange={(e) => {
                        setSelectedGroupId(Number(e.target.value));
                        setPage(1);
                      }}
                      className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No Groups Yet
                  </h3>
                  <p className="text-gray-500 max-w-xs mx-auto mt-1 mb-6">
                    Join a group to compete with friends or create your own
                    private leaderboard.
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowGroupModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1E3A8A] text-white rounded-full font-medium hover:bg-[#3B82F6] transition-colors shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                {groups.length > 0
                  ? "New / Join Group"
                  : "Create or Join Group"}
              </button>
            </div>
          )}
        </div>

        {/* Group Details View */}
        {activeTab === "groups" && selectedGroupId && (
          <div className="max-w-4xl mx-auto">
            {groups.find((g) => g.id === selectedGroupId) && (
              <GroupDetails
                group={groups.find((g) => g.id === selectedGroupId)!}
                onLeave={() => {
                  // Remove group from local state and select another one if available
                  const updatedGroups = groups.filter(
                    (g) => g.id !== selectedGroupId,
                  );
                  setGroups(updatedGroups);
                  setSelectedGroupId(
                    updatedGroups.length > 0 ? updatedGroups[0].id : null,
                  );
                }}
              />
            )}

            {/* Metric Selector */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-200/60 flex flex-wrap gap-1 mb-8 overflow-x-auto">
              {[
                { id: "score", label: "Global Score", icon: "🏆" },
                { id: "activity_today", label: "Activity (Today)", icon: "⚡" },
                { id: "activity_7d", label: "Activity (7d)", icon: "📅" },
                { id: "leetcode_streak", label: "Streak", icon: "🔥" },
                { id: "total_solved", label: "Total Solved", icon: "✅" },
                { id: "contest_rating", label: "Rating", icon: "📈" },
              ].map((m) => {
                const isActive = metric === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetric(m.id as any)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 whitespace-nowrap justify-center outline-none ${
                      isActive
                        ? "text-white shadow-md transform scale-[1.02]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMetric"
                        className="absolute inset-0 bg-gray-900 rounded-xl"
                        transition={{
                          type: "spring",
                          bounce: 0.15,
                          duration: 0.5,
                        }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="text-base">{m.icon}</span>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            {/* Show leaderboard if not groups tab OR if groups tab has a selected group */}
            {(activeTab !== "groups" ||
              (activeTab === "groups" && selectedGroupId)) && (
              <>
                <LeaderboardTable
                  rows={data}
                  type={
                    activeTab === "groups"
                      ? metric
                      : activeTab === "daily"
                        ? "streak"
                        : "score"
                  }
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
                    Page{" "}
                    <span className="font-medium text-gray-900">{page}</span>
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={data.length < pageSize}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showGroupModal && (
          <GroupManagementModal
            onClose={() => setShowGroupModal(false)}
            onGroupJoined={() => {
              // Refresh groups
              api.getUserGroups().then((res) => {
                setGroups(res);
                // Select the newest group (last one)
                if (res.length > 0) {
                  setSelectedGroupId(res[res.length - 1].id);
                }
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          value !== "All"
            ? "bg-indigo-50 text-[#1E3A8A] border border-indigo-200"
            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
        }`}
      >
        <span>
          {label}: {value}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === option
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
