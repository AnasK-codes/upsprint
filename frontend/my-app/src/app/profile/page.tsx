"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, UserProfile } from "../../services/api";
import Skeleton from "../../components/Skeleton";
import ProfileCard from "../../components/ProfileCard";
import PlatformCard from "../../components/PlatformCard";
import BadgeCard, { Badge } from "../../components/BadgeCard";
import ActivityTimeline, { Activity } from "../../components/ActivityTimeline";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Award, Lock } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<
    { rank: number; score: number; streak: number } | undefined
  >();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [connectUsername, setConnectUsername] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setUser(data);
      setError(null);

      // Fetch dynamic stats only if visible globally
      if (data.leaderboardVisibility !== "GROUPS_ONLY") {
        try {
          const rankData = await api.getUserRank(data.id);
          if (rankData) {
            setStats({
              rank: rankData.rank,
              score: rankData.score || 0,
              streak: rankData.currentStreak || 0,
            });
          }
        } catch (e) {
          // User might not be on leaderboard yet, ignore error
          // console.error("Failed to fetch rank:", e);
        }
      }

      try {
        const activityData = await api.getUserActivity();
        setActivities(activityData);
      } catch (e) {
        console.error("Failed to fetch activity:", e);
      }
    } catch (err: any) {
      if (
        err.message?.includes("401") ||
        err.message?.includes("Unauthorized")
      ) {
        localStorage.removeItem("token");
        router.push("/");
      } else {
        setError("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    try {
      let updatedUser;
      if (data.leaderboardVisibility) {
        updatedUser = await api.updateLeaderboardVisibility(
          data.leaderboardVisibility,
        );
      } else {
        updatedUser = await api.updateProfile(data);
      }
      setUser(updatedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  };

  const handleConnectStart = (platform: string) => {
    setSelectedPlatform(platform);
    setConnectUsername("");
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectUsername) return;

    try {
      setConnecting(true);
      const newAccount = await api.connectAccount(
        selectedPlatform,
        connectUsername,
      );
      if (user) {
        setUser({ ...user, accounts: [...user.accounts, newAccount] });
      }
      setShowConnectModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: number) => {
    if (!confirm("Disconnect this account?")) return;
    try {
      await api.disconnectAccount(accountId);
      if (user) {
        setUser({
          ...user,
          accounts: user.accounts.filter((a) => a.id !== accountId),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-8">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );

  if (!user) return null;

  const platforms = ["codeforces", "leetcode", "codechef"];

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 sm:pt-32 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <ProfileCard user={user} stats={stats} onUpdate={handleUpdateProfile} />

        {/* Platforms Grid */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 px-2">
            Connected Platforms
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const account = user.accounts.find(
                (a) => a.platform.toLowerCase() === platform.toLowerCase(),
              );
              return (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  isConnected={!!account}
                  username={account?.username}
                  onConnect={() => handleConnectStart(platform)}
                  onDisconnect={() => account && handleDisconnect(account.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Leaderboard Visibility */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 px-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" />
            Leaderboard Visibility
          </h2>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="GLOBAL_AND_GROUPS"
                    checked={
                      user.leaderboardVisibility === "GLOBAL_AND_GROUPS" ||
                      !user.leaderboardVisibility
                    }
                    onChange={() =>
                      handleUpdateProfile({
                        leaderboardVisibility: "GLOBAL_AND_GROUPS",
                      })
                    }
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-all relative">
                    <div className="absolute inset-0 bg-white rounded-full transform scale-0 peer-checked:scale-50 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block group-hover:text-indigo-700 transition">
                    Show my stats everywhere
                  </span>
                  <span className="text-slate-500 text-sm">
                    Visible on global leaderboards and groups I join.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="GROUPS_ONLY"
                    checked={user.leaderboardVisibility === "GROUPS_ONLY"}
                    onChange={() =>
                      handleUpdateProfile({
                        leaderboardVisibility: "GROUPS_ONLY",
                      })
                    }
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-all relative">
                    <div className="absolute inset-0 bg-white rounded-full transform scale-0 peer-checked:scale-50 transition-transform" />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block group-hover:text-indigo-700 transition">
                    Show my stats only in groups
                  </span>
                  <span className="text-slate-500 text-sm">
                    Your stats won't appear on public global leaderboards.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Gamification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-600" />
              </div>
              Live Activity
            </h3>
            {activities.length > 0 ? (
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50">
                <ActivityTimeline activities={activities} />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                No recent activity found. Solve some problems!
              </div>
            )}
          </div>

          {/* Badges / Sidebar */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-indigo-600" />
              </div>
              Badges
            </h3>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-4 py-8">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-2">
                  <Lock className="w-8 h-8 text-indigo-300" />
                </div>
                <h4 className="text-2xl font-bold">Achievements Vault</h4>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">
                  Complete weekly challenges and daily streaks to unlock
                  exclusive badges.
                  <br />
                  <br />
                  <span className="text-indigo-300 font-semibold uppercase text-xs tracking-widest border border-indigo-500/30 px-3 py-1 rounded-full bg-indigo-500/10">
                    Coming Soon
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Modal */}
        <AnimatePresence>
          {showConnectModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowConnectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Connect {selectedPlatform}
                  </h3>
                  <form onSubmit={handleConnectSubmit}>
                    <input
                      autoFocus
                      type="text"
                      placeholder={`${selectedPlatform} username`}
                      value={connectUsername}
                      onChange={(e) => setConnectUsername(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowConnectModal(false)}
                        className="flex-1 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={connecting || !connectUsername}
                        className="flex-1 py-2.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
                      >
                        {connecting ? "..." : "Connect"}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
