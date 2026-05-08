"use client";

import { useState, useEffect } from "react";
import { getLevelFromXP, getNextLevel, getXPProgress, RARITY_COLORS, type Badge } from "@/lib/gamification";
import { Trophy, Star, Zap, Target, Phone, TrendingUp, Share2, Copy, Check } from "lucide-react";

interface ProfileData {
  user: { email: string; username: string };
  stats: { totalCalls: number; totalClosed: number; totalLeadsScanned: number; bestStreak: number; currentStreak: number };
  badges: Badge[];
  allBadges: Badge[];
  level: { level: number; title: string; icon: string; color: string; bg: string };
  nextLevel: { title: string; minXP: number; icon: string } | null;
  xp: number;
  xpProgress: number;
  revenue: number;
  dailyHistory: any[];
}

interface MissionData {
  missions: { id: string; title: string; description: string; emoji: string; xpReward: number; type: string; target: number }[];
  progress: Record<string, number>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [missions, setMissions] = useState<MissionData | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "badges" | "missions">("overview");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/missions").then((r) => r.json()),
    ]).then(([p, m]) => { setProfile(p); setMissions(m); });
  }, []);

  function copyProfileLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${profile?.user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!profile) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 animate-pulse text-lg">Loading your stats...</div>
    </div>
  );

  const { stats, level, nextLevel, xp, xpProgress, badges, allBadges, revenue } = profile;
  const unearnedBadges = allBadges.filter((b) => !badges.find((e) => e.id === b.id));
  const closeRate = stats.totalCalls > 0 ? ((stats.totalClosed / stats.totalCalls) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 border-b border-gray-800 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className={`w-20 h-20 rounded-2xl ${level.bg} border-2 border-gray-700 flex items-center justify-center text-4xl shadow-xl`}>
                {level.icon}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">@{profile.user.username}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-bold ${level.color}`}>{level.title}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-sm text-gray-400">{xp.toLocaleString()} XP</span>
                </div>
                {/* XP bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-40 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${xpProgress}%` }} />
                  </div>
                  {nextLevel && <span className="text-xs text-gray-500">{xpProgress}% → {nextLevel.icon} {nextLevel.title}</span>}
                  {!nextLevel && <span className="text-xs text-yellow-400 font-bold">👑 MAX LEVEL</span>}
                </div>
              </div>
            </div>
            {/* Share */}
            <button onClick={copyProfileLink}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              {copied ? <><Check className="w-4 h-4 text-green-400" /> Copied!</> : <><Share2 className="w-4 h-4" /> Share Profile</>}
            </button>
          </div>

          {/* Current streak banner */}
          {stats.currentStreak >= 3 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-orange-900/40 border border-orange-700 rounded-xl px-4 py-2">
              <span className="text-2xl">🔥</span>
              <span className="text-orange-300 font-bold">{stats.currentStreak} Day Streak!</span>
              <span className="text-orange-500 text-sm">Keep it going</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Calls", value: stats.totalCalls, icon: "📞", color: "text-blue-400" },
            { label: "Deals Closed", value: stats.totalClosed, icon: "💰", color: "text-green-400" },
            { label: "Close Rate", value: `${closeRate}%`, icon: "🎯", color: "text-amber-400" },
            { label: "Best Streak", value: `${stats.bestStreak}🔥`, icon: "⚡", color: "text-orange-400" },
            { label: "Badges", value: badges.length, icon: "🏆", color: "text-purple-400" },
          ].map((k) => (
            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-xl mb-1">{k.icon}</div>
              <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          {(["overview", "badges", "missions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}>{t}</button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Revenue card */}
            <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-700/50 rounded-2xl p-6">
              <p className="text-green-400 text-sm font-semibold mb-1">💵 Estimated Revenue Generated</p>
              <p className="text-4xl font-black text-white">${revenue.toLocaleString()}</p>
              <p className="text-green-600 text-sm mt-1">{stats.totalClosed} deals closed · avg ${stats.totalClosed > 0 ? Math.round(revenue / stats.totalClosed) : 0}/deal</p>
            </div>

            {/* Recent badges */}
            <div>
              <h3 className="font-bold text-lg mb-3">🏆 Recent Badges</h3>
              {badges.length === 0 ? (
                <p className="text-gray-600 text-sm">Make your first call to start earning badges!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {badges.slice(0, 8).map((b) => (
                    <div key={b.id} className={`border rounded-xl p-3 text-center ${RARITY_COLORS[b.rarity]}`}>
                      <div className="text-3xl mb-1">{b.emoji}</div>
                      <p className="text-xs font-bold">{b.title}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">+{b.xpReward} XP</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-bold mb-4">📊 Activity (30 days)</h3>
              <div className="flex items-end gap-1 h-16">
                {profile.dailyHistory.length === 0
                  ? Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="flex-1 bg-gray-800 rounded-t-sm h-1" />
                    ))
                  : profile.dailyHistory.map((d, i) => {
                      const h = Math.max((d.callsMade / Math.max(...profile.dailyHistory.map((x) => x.callsMade), 1)) * 64, d.callsMade > 0 ? 4 : 2);
                      return (
                        <div key={i} className="flex-1 rounded-t-sm transition-all"
                          style={{ height: h, backgroundColor: d.closedCount > 0 ? "#22c55e" : "#3b82f6", opacity: 0.8 }} />
                      );
                    })
                }
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>30 days ago</span>
                <span className="flex items-center gap-3">
                  <span><span className="inline-block w-2 h-2 bg-blue-500 rounded-sm mr-1" />Calls</span>
                  <span><span className="inline-block w-2 h-2 bg-green-500 rounded-sm mr-1" />Closed</span>
                </span>
                <span>Today</span>
              </div>
            </div>
          </div>
        )}

        {/* BADGES TAB */}
        {tab === "badges" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">All Badges</h3>
              <span className="text-sm text-gray-400">{badges.length}/{allBadges.length} earned</span>
            </div>
            {["legendary", "epic", "rare", "common"].map((rarity) => {
              const rarityBadges = allBadges.filter((b) => b.rarity === rarity);
              return (
                <div key={rarity} className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider font-bold mb-3 text-gray-500">{rarity}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rarityBadges.map((b) => {
                      const earned = !!badges.find((e) => e.id === b.id);
                      return (
                        <div key={b.id} className={`border rounded-xl p-4 text-center transition-all ${
                          earned ? RARITY_COLORS[b.rarity] : "border-gray-800 bg-gray-900/50 opacity-40 grayscale"
                        }`}>
                          <div className="text-3xl mb-2">{b.emoji}</div>
                          <p className="text-xs font-bold">{b.title}</p>
                          <p className="text-[10px] opacity-70 mt-1">{b.description}</p>
                          <p className="text-[10px] font-bold mt-1 opacity-60">+{b.xpReward} XP</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MISSIONS TAB */}
        {tab === "missions" && missions && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">🎯 Daily Missions</h3>
              <span className="text-xs text-gray-500">Resets midnight</span>
            </div>
            <div className="space-y-4">
              {missions.missions.map((m) => {
                const current = missions.progress[m.type] ?? 0;
                const pct = Math.min((current / m.target) * 100, 100);
                const done = current >= m.target;
                return (
                  <div key={m.id} className={`border rounded-2xl p-5 transition-all ${
                    done ? "border-green-700 bg-green-900/20" : "border-gray-800 bg-gray-900"
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{m.emoji}</span>
                        <div>
                          <p className="font-bold text-white">{m.title}</p>
                          <p className="text-sm text-gray-400">{m.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold text-sm">+{m.xpReward} XP</p>
                        {done && <p className="text-green-400 text-xs font-bold">✅ Complete!</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${done ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums">{Math.min(current, m.target)}/{m.target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-gray-400 text-sm">Complete all missions for bonus XP</p>
              <p className="text-amber-400 font-bold mt-1">+{missions.missions.reduce((a, m) => a + m.xpReward, 0)} XP total available today</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
