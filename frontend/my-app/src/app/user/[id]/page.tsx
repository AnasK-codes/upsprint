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
    <div className="max-w-lg mx-auto">
      <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl overflow-hidden border border-white/50">
        <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 p-6 text-white text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3 shadow-inner">
            {data.user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{data.user.name}</h1>
          <p className="text-indigo-100 text-sm">Competitive Programmer</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rank
              </span>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                #{data.rank}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Score
              </span>
              <p className="text-3xl font-bold text-indigo-600 mt-1">
                {data.score.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <a
              href={`https://codeforces.com/profile/${data.user.name}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View External Profile &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
