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

      // Fetch dynamic stats
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
      const updatedUser = await api.updateProfile(data);
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

        {/* Gamification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-slate-900">
                Live Activity
              </h2>
            </div>
            {activities.length > 0 ? (
              <ActivityTimeline activities={activities} />
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                No recent activity found. Solve some problems!
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4 text-center">
            {/* Coming Soon badges */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-2">Badges</h3>
              <p className="text-sm text-indigo-600 mb-4">
                Complete challenges to earn badges. Coming soon!
              </p>
              <div className="flex justify-center gap-2 opacity-50">
                <div className="w-10 h-10 rounded-full bg-white/50" />
                <div className="w-10 h-10 rounded-full bg-white/50" />
                <div className="w-10 h-10 rounded-full bg-white/50" />
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
