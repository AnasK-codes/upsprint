"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserProfile } from "@/services/api";
import { Edit2, Save, X, Trophy, Target, Zap } from "lucide-react";
import { clsx } from "clsx";

interface ProfileCardProps {
  user: UserProfile;
  stats?: {
    rank: number;
    score: number;
    streak: number;
  };
  onUpdate: (data: Partial<UserProfile>) => Promise<void>;
}

export default function ProfileCard({
  user,
  stats,
  onUpdate,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    batch: user.batch || "",
    branch: user.branch || "",
    avatarUrl: user.avatarUrl || "",
  });

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(formData);
    setSaving(false);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-100"
    >
      {/* Premium Header Gradient */}
      <div className="absolute top-0 left-0 w-full h-48 bg-[#0F172A]">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative px-8 md:px-12 pt-28 pb-10">
        <div className="flex flex-col md:flex-row items-end md:items-start gap-8">
          {/* Avatar */}
          <motion.div className="relative" whileHover={{ scale: 1.02 }}>
            <div className="w-40 h-40 rounded-[2rem] border-[6px] border-white shadow-2xl overflow-hidden bg-white relative z-10">
              <img
                src={
                  formData.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${user.name || "User"}&background=random`
                }
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://ui-avatars.com/api/?name=User&background=random";
                }}
              />
            </div>
            {!isEditing && (
              <div className="absolute -bottom-2 -right-2 z-20 bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg border-[4px] border-white">
                <Trophy className="w-5 h-5" />
              </div>
            )}
          </motion.div>

          {/* Info & Edit Form */}
          <div className="flex-1 w-full pt-4 md:pt-14">
            <div className="flex justify-between items-start">
              <div className="w-full">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Full Name
                      </label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Batch
                      </label>
                      <input
                        name="batch"
                        value={formData.batch}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="2024"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Branch
                      </label>
                      <input
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="CSE"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Avatar URL
                      </label>
                      <input
                        name="avatarUrl"
                        value={formData.avatarUrl}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono text-slate-600"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
                      {user.name || "Anonymous User"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 text-sm font-bold border border-slate-200">
                        {user.batch || "Batch N/A"}
                      </span>
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 text-sm font-bold border border-slate-200">
                        {user.branch || "Branch N/A"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 font-mono text-sm">
                        {user.email}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={saving}
                className={clsx(
                  "p-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-bold text-sm ml-4",
                  isEditing
                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
                )}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isEditing ? (
                  <>
                    <Save className="w-4 h-4" /> Save Attributes
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Stats */}
        {!isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
            <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-24 h-24 text-emerald-500 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold uppercase tracking-wider text-xs">
                  <Trophy className="w-4 h-4" /> Global Rank
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">
                  {stats?.rank ? `#${stats.rank}` : "--"}
                </div>
                <div className="mt-2 text-sm text-slate-400 font-medium">
                  Top {stats?.rank ? "1%" : "--"} of players
                </div>
              </div>
            </div>

            <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-24 h-24 text-indigo-500 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <Target className="w-4 h-4" /> Total Score
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">
                  {stats?.score?.toLocaleString() ?? "--"}
                </div>
                <div className="mt-2 text-sm text-slate-400 font-medium">
                  Points accumulated
                </div>
              </div>
            </div>

            <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24 text-orange-500 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-orange-600 font-bold uppercase tracking-wider text-xs">
                  <Zap className="w-4 h-4" /> Active Streak
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tight">
                  {stats?.streak ? `${stats.streak}` : "0"}{" "}
                  <span className="text-2xl text-slate-400 font-bold">
                    Days
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400 font-medium">
                  Keep it going!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
