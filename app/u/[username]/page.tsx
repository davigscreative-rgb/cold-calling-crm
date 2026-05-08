import { prisma } from "@/lib/prisma";
import { BADGES, getLevelFromXP, getNextLevel, getXPProgress, RARITY_COLORS } from "@/lib/gamification";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `@${params.username} · ColdCRM`,
    description: `Check out ${params.username}'s cold calling stats on ColdCRM`,
    openGraph: {
      title: `@${params.username} on ColdCRM ⚡`,
      description: "Real-time Sales Execution. Cold calls. Closed deals.",
      images: [`/api/win-card?name=${params.username}`],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const user = await (prisma.user as any).findFirst({
    where: { OR: [{ username: params.username }, { email: { startsWith: params.username + "@" } }] },
  });

  if (!user) notFound();

  const allStats = await prisma.dailyStats.aggregate({
    where: { userId: user.id },
    _sum: { callsMade: true, closedCount: true, closedValueUsd: true },
  });

  const totalCalls = allStats._sum.callsMade ?? 0;
  const totalClosed = allStats._sum.closedCount ?? 0;
  const totalRevenue = allStats._sum.closedValueUsd ?? 0;
  const closeRate = totalCalls > 0 ? ((totalClosed / totalCalls) * 100).toFixed(1) : "0";

  const userStats = {
    totalCalls, totalClosed, totalLeadsScanned: 0,
    currentStreak: user.currentStreak ?? 0, bestStreak: user.bestStreak ?? 0,
    noWebsiteLeadsCalled: 0, citiesConquered: 0,
    totalXP: user.totalXP ?? 0, warRoomSessions: 0, speedRoundsCompleted: 0,
  };

  const earnedBadges = BADGES.filter((b) => b.check(userStats));
  const xp = user.totalXP ?? 0;
  const level = getLevelFromXP(xp);
  const xpProgress = getXPProgress(xp);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <div className={`w-24 h-24 rounded-3xl ${level.bg} border-2 border-gray-700 flex items-center justify-center text-5xl mx-auto mb-4 shadow-2xl`}>
            {level.icon}
          </div>
          <h1 className="text-3xl font-black">@{user.username ?? params.username}</h1>
          <p className={`text-lg font-bold mt-1 ${level.color}`}>{level.title}</p>
          <p className="text-gray-500 text-sm mt-1">{xp.toLocaleString()} XP</p>

          {/* XP bar */}
          <div className="mt-3 max-w-xs mx-auto">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* Badges row */}
          {earnedBadges.length > 0 && (
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              {earnedBadges.slice(0, 6).map((b) => (
                <span key={b.id} title={b.title} className="text-2xl cursor-default">{b.emoji}</span>
              ))}
              {earnedBadges.length > 6 && (
                <span className="text-sm text-gray-500 self-center">+{earnedBadges.length - 6} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Calls", value: totalCalls, emoji: "📞", color: "text-blue-400" },
            { label: "Deals Closed", value: totalClosed, emoji: "💰", color: "text-green-400" },
            { label: "Close Rate", value: `${closeRate}%`, emoji: "🎯", color: "text-amber-400" },
            { label: "Best Streak", value: `${userStats.bestStreak}🔥`, emoji: "⚡", color: "text-orange-400" },
          ].map((k) => (
            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-1">{k.emoji}</div>
              <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue highlight */}
        {totalRevenue > 0 && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-2xl p-6 text-center mb-8">
            <p className="text-green-400 text-sm font-semibold mb-1">💵 Revenue Closed</p>
            <p className="text-4xl font-black text-white">${totalRevenue.toLocaleString()}</p>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-8">
            <h2 className="font-black text-lg mb-4">🏆 Badges Earned</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {earnedBadges.map((b) => (
                <div key={b.id} className={`border rounded-xl p-3 text-center ${RARITY_COLORS[b.rarity]}`}>
                  <div className="text-3xl mb-1">{b.emoji}</div>
                  <p className="text-xs font-bold">{b.title}</p>
                  <p className="text-[10px] opacity-60 mt-0.5 capitalize">{b.rarity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400 mb-1">Want results like this?</p>
          <p className="text-white font-bold text-lg mb-4">Start cold calling smarter with ColdCRM</p>
          <a href="/scan" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            ⚡ Get Started Free
          </a>
        </div>
      </div>
    </div>
  );
}
