"use client";

import { useEffect, useState } from "react";
import { Group, GroupMember, api } from "@/services/api";
import { Copy, Check, LogOut, Users, Shield, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface GroupDetailsProps {
  group: Group;
  currentUserEmail?: string;
  onLeave: () => void;
}

export default function GroupDetails({
  group,
  currentUserEmail,
  onLeave,
}: GroupDetailsProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getGroupMembers(group.id)
      .then(setMembers)
      .catch((err) => console.error("Failed to load members", err))
      .finally(() => setLoading(false));
  }, [group.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        await api.leaveGroup(group.id);
        onLeave();
      } catch (err) {
        console.error("Failed to leave group", err);
        alert("Failed to leave group. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Premium Header Card */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 overflow-hidden shadow-2xl text-white">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Private Group
              </span>
              {group.description && (
                <span className="text-gray-400 text-sm hidden sm:inline-block">
                  •
                </span>
              )}
              {group.description && (
                <span className="text-gray-300 text-sm">
                  {group.description}
                </span>
              )}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">
              {group.name}
            </h2>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-300">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                {loading ? "..." : members.length} Members
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <div className="px-4 py-2">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">
                  Invite Code
                </span>
                <span className="font-mono text-xl font-bold text-white tracking-widest">
                  {group.code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 hover:bg-white/10 rounded-lg transition-colors text-white"
                title="Copy Code"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              onClick={handleLeave}
              className="flex items-center gap-2 text-xs font-semibold text-red-300 hover:text-red-200 transition-colors uppercase tracking-wide opacity-60 hover:opacity-100"
            >
              <LogOut className="w-3 h-3" /> Leave Group
            </button>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Users className="w-4 h-4" /> Group Members
        </h3>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all bg-white group"
              >
                <div className="relative">
                  {member.user.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.name}
                      className="w-12 h-12 rounded-full bg-gray-100 object-cover ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600 flex items-center justify-center font-bold text-lg ring-2 ring-white shadow-sm">
                      {member.user.name[0]?.toUpperCase()}
                    </div>
                  )}
                  {member.role === "ADMIN" && (
                    <div
                      className="absolute -bottom-1 -right-1 bg-amber-100 text-amber-600 p-1 rounded-full border-2 border-white"
                      title="Admin"
                    >
                      <Shield className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {member.user.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Joined{" "}
                    {new Date(member.joinedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
