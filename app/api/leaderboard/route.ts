import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const stats = await prisma.dailyStats.groupBy({
      by: ["userId"],
      _sum: { callsMade: true, closedCount: true, closedValueUsd: true },
      orderBy: { _sum: { closedCount: "desc" } },
      take: 50,
    });

    const userIds = stats.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard = stats.map((s, i) => {
      const user = userMap[s.userId];
      const username = (user as any)?.username ?? user?.email?.split("@")[0] ?? "Anonymous";
      return {
        rank: i + 1,
        username,
        calls: s._sum.callsMade ?? 0,
        closed: s._sum.closedCount ?? 0,
        revenue: s._sum.closedValueUsd ?? 0,
        xp: (user as any)?.totalXP ?? 0,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (err) {
    return NextResponse.json({ leaderboard: [] });
  }
}

