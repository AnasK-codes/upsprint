"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useParams } from "next/navigation";
import Loading from "@/components/Loading";

export default function UserRankPage() {
  const params = useParams();
  const userId = Number(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getUserRank(userId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Loading />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🤷‍♂️</div>
        <h2 className="text-2xl font-bold text-gray-900">User Not Found</h2>
        <p className="text-gray-500 mt-2">
          We couldn't find a rank for this user yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-lg mx-auto bg-white/60 backdrop-blur-2xl shadow-2xl rounded-[32px] overflow-hidden border border-white/40 ring-1 ring-white/50">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full mx-auto flex items-center justify-center text-4xl font-bold mb-4 shadow-inner ring-1 ring-white/20">
              {data.user.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data.user.name}
            </h1>
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mt-1">
              Competitive Programmer
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 p-6 rounded-2xl text-center border border-white/60 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Global Rank
              </span>
              <p className="text-4xl font-black text-slate-900">#{data.rank}</p>
            </div>
            <div className="bg-white/50 p-6 rounded-2xl text-center border border-white/60 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Total Score
              </span>
              <p className="text-4xl font-black text-indigo-900">
                {data.score.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {data.user.accounts?.map((acc: any) => {
              let url = "#";
              let label = acc.platform;
              let bgClass = "bg-slate-900 hover:bg-slate-800";

              if (acc.platform === "leetcode") {
                url = `https://leetcode.com/u/${acc.username}/`;
                label = "LeetCode";
                bgClass = "bg-[#FFA116] hover:bg-orange-500";
              } else if (acc.platform === "codeforces") {
                url = `https://codeforces.com/profile/${acc.username}`;
                label = "Codeforces";
                bgClass = "bg-[#1F8ACB] hover:bg-blue-600";
              } else if (acc.platform === "codechef") {
                url = `https://www.codechef.com/users/${acc.username}`;
                label = "CodeChef";
                bgClass = "bg-[#5D4037] hover:bg-brown-600";
              }

              return (
                <a
                  key={acc.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all hover:scale-105 shadow-lg ${bgClass}`}
                >
                  {label}
                  <span aria-hidden="true">&rarr;</span>
                </a>
              );
            })}

            {(!data.user.accounts || data.user.accounts.length === 0) && (
              <p className="text-sm text-gray-500 italic">
                No connected accounts visible.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
