import { useState } from "react";
import { motion } from "framer-motion";
import { UserProfile } from "@/services/api";
import { Edit2, Save, X, Trophy, Target, Zap } from "lucide-react";
import { clsx } from "clsx";

interface ProfileCardProps {
  user: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => Promise<void>;
}

export default function ProfileCard({ user, onUpdate }: ProfileCardProps) {
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
      className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl"
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />

      <div className="relative px-8 pt-20 pb-8">
        <div className="flex flex-col md:flex-row items-end md:items-start gap-6">
          {/* Avatar */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotate: 2 }}
          >
            <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-white">
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
              <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-xl shadow-lg border border-gray-100">
                <span className="text-xl">🎓</span>
              </div>
            )}
          </motion.div>

          {/* Info & Edit Form */}
          <div className="flex-1 w-full pt-2 md:pt-12">
            <div className="flex justify-between items-start">
              <div className="w-full">
                {isEditing ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Name
                      </label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Batch
                        </label>
                        <input
                          name="batch"
                          value={formData.batch}
                          onChange={handleChange}
                          className="w-full mt-1 p-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Branch
                        </label>
                        <input
                          name="branch"
                          value={formData.branch}
                          onChange={handleChange}
                          className="w-full mt-1 p-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Avatar URL
                      </label>
                      <input
                        name="avatarUrl"
                        value={formData.avatarUrl}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                      {user.name || "Anonymous User"}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-500 font-medium mt-1">
                      <span>{user.batch || "Batch N/A"}</span>
                      <span>•</span>
                      <span>{user.branch || "Branch N/A"}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-400 font-mono">
                      {user.email}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={saving}
                className={clsx(
                  "p-2 rounded-xl transition-all shadow-sm",
                  isEditing
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-green-200"
                    : "bg-white text-gray-600 hover:text-purple-600 hover:bg-purple-50 border border-gray-100",
                )}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isEditing ? (
                  <Save className="w-5 h-5" />
                ) : (
                  <Edit2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Stats */}
        {!isEditing && (
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-100">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-600 uppercase">
                  Rank
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900">#42</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-blue-600 uppercase">
                  Score
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900">1250</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-purple-600 uppercase">
                  Streak
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900">7 Days</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
