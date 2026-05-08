"use client";

import { useState, useEffect } from "react";
import { Trophy, Phone, TrendingUp, Star } from "lucide-react";

interface LeaderEntry {
  rank: number; username: string; calls: number; closed: number; revenue: number; xp: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_STYLES = [
  "bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-600/50",
  "bg-gradient-to-r from-gray-700/40 to-gray-600/40 border-gray-500/50",
  "bg-gradient-to-r from-orange-900/40 to-amber-900/30 border-orange-600/50",
  "bg-gray-900 border-gray-800",
];

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"closed" | "calls" | "revenue" | "xp">("closed");

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => {
      setData(d.leaderboard ?? []);
      setLoading(false);
    });
  }, []);

  const sorted = [...data].sort((a, b) => b[sort] - a[sort]).map((e, i) => ({ ...e, rank: i + 1 }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-black">Leaderboard</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">All time</span>
        </div>
        <div className="flex gap-1">
          {(["closed", "calls", "revenue", "xp"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                sort === s ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-gray-800"
              }`}>{s === "closed" ? "💰 Closed" : s === "calls" ? "📞 Calls" : s === "revenue" ? "💵 Revenue" : "⚡ XP"}</button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-xl font-bold text-gray-400">No one on the board yet</p>
            <p className="text-gray-600 mt-2">Make your first call to appear here</p>
            <a href="/war-room" className="inline-block mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">
              Enter War Room →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((entry) => {
              const style = RANK_STYLES[Math.min(entry.rank - 1, 3)];
              return (
                <div key={entry.username}
                  className={`border rounded-2xl px-5 py-4 flex items-center gap-4 transition-all ${style}`}>
                  <div className="w-10 text-center">
                    {entry.rank <= 3
                      ? <span className="text-2xl">{MEDALS[entry.rank - 1]}</span>
                      : <span className="text-gray-500 font-bold text-lg">#{entry.rank}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-white">@{entry.username}</p>
                    <p className="text-xs text-gray-500">{entry.xp.toLocaleString()} XP</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-blue-400 font-bold tabular-nums">{entry.calls}</p>
                      <p className="text-[10px] text-gray-600">calls</p>
                    </div>
                    <div>
                      <p className="text-green-400 font-bold tabular-nums">{entry.closed}</p>
                      <p className="text-[10px] text-gray-600">closed</p>
                    </div>
                    <div>
                      <p className="text-emerald-400 font-bold tabular-nums">${entry.revenue.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-600">revenue</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
