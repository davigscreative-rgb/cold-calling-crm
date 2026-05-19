import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateDailyMissions } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ missions: [], progress: {} });

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Get today's stats
    const todayStats = await prisma.dailyStats.findFirst({
      where: { userId: user.id, date: { gte: today } },
    });

    const missions = generateDailyMissions();
    const progress: Record<string, number> = {
      calls: todayStats?.callsMade ?? 0,
      closed: todayStats?.closedCount ?? 0,
      scan: todayStats?.scansUsed ?? 0,
      streak: (user as any).currentStreak ?? 0,
    };

    return NextResponse.json({ missions, progress });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ missions: [], progress: {} });
  }
}

