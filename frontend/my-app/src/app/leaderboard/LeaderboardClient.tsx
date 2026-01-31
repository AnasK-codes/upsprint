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
import { AuroraBackground } from "@/components/AuroraBackground";

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

    // Create a cache key for logging or debugging if needed, but not unused
    // const cacheKey = ...

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
    <AuroraBackground>
      <div className="relative z-10 min-h-screen pt-24 sm:pt-32 pb-12 px-6">
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
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3"
            >
              <span className="text-indigo-500">🔥</span> Leaderboard
            </motion.h1>

            <motion.p
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-slate-600 max-w-lg text-lg"
            >
              {activeTab === "leetcode"
                ? "Rankings based only on LeetCode performance."
                : activeTab === "daily"
                  ? "Users ranked by current daily streak."
                  : activeTab === "groups"
                    ? "Rankings within your private groups."
                    : "See who's currently topping the charts across all platforms."}
            </motion.p>

            {/* Glassy Animated Tabs */}
            <div className="flex p-1 bg-white/20 backdrop-blur-3xl border border-white/40 rounded-full shadow-lg shadow-black/5 relative mt-8 overflow-x-auto max-w-full">
              {(["global", "leetcode", "daily", "groups"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative px-6 py-2.5 text-sm font-medium rounded-full transition-colors z-10 ${
                      activeTab === tab
                        ? "text-slate-900"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/80 shadow-sm border border-white/50 rounded-full"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <span className="relative z-10 capitalize">
                      {tab === "daily" ? "Daily Activity" : tab}
                    </span>
                  </button>
                ),
              )}
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
                    "2030",
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
              <div className="flex flex-col items-center gap-6 mt-6 w-full max-w-md mx-auto">
                {groups.length > 0 ? (
                  <div className="relative w-full z-20">
                    <GroupSelector
                      groups={groups}
                      selectedId={selectedGroupId}
                      onSelect={(id) => {
                        setSelectedGroupId(id);
                        setPage(1);
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-indigo-50/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                      <Users className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      No Groups Yet
                    </h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-1 mb-6">
                      Join a group to compete with friends or create your own
                      private leaderboard.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowGroupModal(true)}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:shadow-slate-900/20 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-5 h-5" />
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

              {/* Metric Selector - Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { id: "score", label: "Global Score" },
                  { id: "activity_today", label: "Activity (Today)" },
                  { id: "activity_7d", label: "Activity (7d)" },
                  { id: "leetcode_streak", label: "Streak" },
                  { id: "total_solved", label: "Total Solved" },
                  { id: "contest_rating", label: "Rating" },
                ].map((m) => {
                  const isActive = metric === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetric(m.id as any)}
                      className={`relative flex items-center justify-center px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 outline-none group overflow-hidden ${
                        isActive
                          ? "text-indigo-700 shadow-lg shadow-indigo-500/10 scale-[1.02] ring-1 ring-indigo-500/20"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                      }`}
                    >
                      {isActive ? (
                        <motion.div
                          layoutId="activeMetric"
                          className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                          style={{ zIndex: 0 }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-white/20 border border-white/30 rounded-2xl transition-colors group-hover:bg-white/40" />
                      )}

                      <span className="relative z-10 flex items-center gap-2">
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
              <div className="h-12 bg-white/50 rounded-lg w-full animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/40" />
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
                    headerLabel={
                      activeTab === "leetcode"
                        ? "LeetCode Rating"
                        : filters.platform === "LeetCode"
                          ? "LeetCode Rating"
                          : filters.platform === "Codeforces"
                            ? "Codeforces Rating"
                            : filters.platform === "CodeChef"
                              ? "CodeChef Rating"
                              : undefined
                    }
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                    <button
                      onClick={handlePrev}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white/50 border border-white/60 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      &larr; Previous
                    </button>
                    <span className="text-sm text-slate-500">
                      Page{" "}
                      <span className="font-medium text-slate-900">{page}</span>
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={data.length < pageSize}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white/50 border border-white/60 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
                api.getUserGroups().then((res) => {
                  setGroups(res);
                  if (res.length > 0) {
                    setSelectedGroupId(res[res.length - 1].id);
                  }
                });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </AuroraBackground>
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
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all backdrop-blur-md ${
          value !== "All"
            ? "bg-indigo-50/80 text-indigo-700 border border-indigo-200 shadow-sm"
            : "bg-white/40 text-slate-600 border border-white/60 hover:bg-white/60 shadow-sm"
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
            className="absolute top-full left-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 py-2 z-50 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  value === option
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
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

function GroupSelector({
  groups,
  selectedId,
  onSelect,
}: {
  groups: Group[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedGroup = groups.find((g) => g.id === selectedId);

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
        className="w-full flex items-center justify-between px-6 py-4 bg-white/60 backdrop-blur-xl border border-white/60 text-slate-900 rounded-2xl shadow-lg shadow-indigo-500/5 hover:bg-white/80 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selected Group
            </span>
            <span className="block text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {selectedGroup?.name || "Select Group"}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 py-2 z-50 overflow-hidden"
          >
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  onSelect(group.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-6 py-3.5 transition-all ${
                  selectedId === group.id
                    ? "bg-indigo-50/80 text-indigo-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="font-semibold">{group.name}</span>
                {selectedId === group.id && (
                  <motion.div
                    layoutId="check"
                    className="w-2 h-2 rounded-full bg-indigo-500"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
