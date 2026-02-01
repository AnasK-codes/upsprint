"use client";

import { useEffect, useState } from "react";
import { Group, GroupMember, api } from "@/services/api";
import { Copy, Check, LogOut, Users, Shield, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/hooks/useToast";

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
  const { error: toastError, success: toastSuccess } = useToast();

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
        toastError("Failed to leave group. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Premium Header Card - Light Theme */}
      <div className="relative bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-8 overflow-hidden shadow-xl shadow-indigo-500/5">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-96 h-96 bg-gradient-to-tr from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-white/80 backdrop-blur-md text-indigo-600 border border-indigo-100 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-sm">
                Private Group
              </span>
              {group.description && (
                <span className="text-slate-400 text-sm hidden sm:inline-block">
                  •
                </span>
              )}
              {group.description && (
                <span className="text-slate-500 text-sm font-medium">
                  {group.description}
                </span>
              )}
            </div>

            <h2 className="text-5xl font-black tracking-tight text-slate-900">
              {group.name}
            </h2>

            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-lg border border-white/60">
                <Users className="w-4 h-4 text-indigo-500" />
                {loading ? "..." : members.length} Members
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">
                  Invite Code
                </span>
                <span className="font-mono text-xl font-bold text-slate-900 tracking-widest">
                  {group.code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 border border-transparent hover:border-slate-100"
                title="Copy Code"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              onClick={handleLeave}
              className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wide px-2 py-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Leave Group
            </button>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Users className="w-4 h-4" /> Group Members ({members.length})
        </h3>

        <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                      <div className="relative w-12 h-12 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-gray-100">
                        <Image
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          fill
                          className="object-cover"
                        />
                      </div>
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
    </div>
  );
}
