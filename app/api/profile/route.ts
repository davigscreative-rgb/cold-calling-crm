import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { BADGES, getLevelFromXP, getNextLevel, getXPProgress, type UserStats } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Aggregate all-time stats
    const allStats = await prisma.dailyStats.aggregate({
      where: { userId: user.id },
      _sum: { callsMade: true, closedCount: true, closedValueUsd: true, leadsAdded: true, scansUsed: true },
    });

    const pipelineLeads = await prisma.pipelineLead.count({ where: { userId: user.id } });
    const closedLeads = await prisma.pipelineLead.count({ where: { userId: user.id, status: "CLOSED" } });
    const cachedLeads = await prisma.leadCache.count();

    const userStats: UserStats = {
      totalCalls: allStats._sum.callsMade ?? 0,
      totalClosed: allStats._sum.closedCount ?? 0,
      totalLeadsScanned: cachedLeads,
      currentStreak: (user as any).currentStreak ?? 0,
      bestStreak: (user as any).bestStreak ?? 0,
      noWebsiteLeadsCalled: 0, // future
      citiesConquered: 0, // future
      totalXP: (user as any).totalXP ?? 0,
      warRoomSessions: (user as any).warRoomSessions ?? 0,
      speedRoundsCompleted: (user as any).speedRoundsCompleted ?? 0,
    };

    // Compute earned badges
    const earnedBadges = BADGES.filter((b) => b.check(userStats));
    const xp = (user as any).totalXP ?? 0;
    const level = getLevelFromXP(xp);
    const nextLevel = getNextLevel(xp);
    const xpProgress = getXPProgress(xp);

    // Last 30 days for chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyHistory = await prisma.dailyStats.findMany({
      where: { userId: user.id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      user: { email: user.email, username: (user as any).username ?? user.email?.split("@")[0] },
      stats: userStats,
      badges: earnedBadges,
      allBadges: BADGES,
      level, nextLevel, xp, xpProgress,
      revenue: allStats._sum.closedValueUsd ?? 0,
      pipelineLeads, closedLeads,
      dailyHistory,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
