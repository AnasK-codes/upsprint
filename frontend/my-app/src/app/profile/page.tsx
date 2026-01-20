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

const MOCK_BADGES: Badge[] = [
  {
    id: "1",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    isUnlocked: true,
    category: "streak",
    icon: "🔥",
  },
  {
    id: "2",
    name: "Problem Solver",
    description: "Solve 100 problems total",
    isUnlocked: true,
    category: "milestone",
    icon: "🧠",
  },
  {
    id: "3",
    name: "Top 10",
    description: "Reach the top 10 leaderboard",
    isUnlocked: false,
    category: "rank",
    icon: "🏆",
  },
  {
    id: "4",
    name: "Early Bird",
    description: "Solve a problem before 8 AM",
    isUnlocked: false,
    category: "milestone",
    icon: "🌅",
  },
  {
    id: "5",
    name: "Connector",
    description: "Link 2+ platforms",
    isUnlocked: true,
    category: "milestone",
    icon: "🔗",
  },
  {
    id: "6",
    name: "LeetGod",
    description: "Solve 500 LeetCode problems",
    isUnlocked: false,
    category: "rank",
    icon: "⚡",
  },
];

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "badge_unlock",
    title: "Unlocked 'Week Warrior'",
    description: "You maintained a 7-day streak!",
    date: "2 hours ago",
  },
  {
    id: "2",
    type: "solve",
    title: "Solved 'Two Sum'",
    description: "LeetCode - Easy",
    date: "5 hours ago",
  },
  {
    id: "3",
    type: "rank_up",
    title: "Reached Rank #42",
    description: "You passed @johndoe",
    date: "1 day ago",
  },
  {
    id: "4",
    type: "connection",
    title: "Connected Codeforces",
    description: "Profile synced successfully",
    date: "2 days ago",
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
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
    <div className="min-h-screen bg-gray-50/50 -m-6 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <ProfileCard user={user} onUpdate={handleUpdateProfile} />

        {/* Platforms Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">
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
          {/* Badges Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 px-2">
                Badges & Achievements
              </h2>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                3 / 6 Unlocked
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MOCK_BADGES.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 px-2">
              Recent Activity
            </h2>
            <ActivityTimeline activities={MOCK_ACTIVITIES} />
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Connect {selectedPlatform}
                  </h3>
                  <form onSubmit={handleConnectSubmit}>
                    <input
                      autoFocus
                      type="text"
                      placeholder={`${selectedPlatform} username`}
                      value={connectUsername}
                      onChange={(e) => setConnectUsername(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowConnectModal(false)}
                        className="flex-1 py-2.5 font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
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
