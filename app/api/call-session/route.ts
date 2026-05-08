import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// POST /api/call-session — log a call outcome from Call Mode
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { outcome, leadCacheId, notes, durationSeconds } = body;
    // outcome: "answered" | "voicemail" | "no_answer" | "not_interested" | "callback" | "closed"

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert daily stats
    const isClosed = outcome === "closed";
    const isAnswered = ["answered", "not_interested", "callback", "closed"].includes(outcome);

    await prisma.dailyStats.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {
        callsMade: { increment: 1 },
        closedCount: isClosed ? { increment: 1 } : undefined,
        closedValueUsd: isClosed ? { increment: 500 } : undefined, // default deal value estimate
      },
      create: {
        userId: user.id,
        date: today,
        callsMade: 1,
        closedCount: isClosed ? 1 : 0,
        closedValueUsd: isClosed ? 500 : 0,
        leadsAdded: 0,
        meetingsBooked: 0,
        showedUp: 0,
        noShows: 0,
        scansUsed: 0,
      },
    });

    // If lead exists in pipeline, update status
    if (leadCacheId) {
      const pipelineLead = await prisma.pipelineLead.findFirst({
        where: { userId: user.id, leadCacheId },
      });

      if (pipelineLead) {
        const statusMap: Record<string, string> = {
          answered: "CALLED",
          voicemail: "CALLED",
          no_answer: "CALLED",
          not_interested: "CALLED",
          callback: "CALLED",
          closed: "CLOSED",
        };
        await prisma.pipelineLead.update({
          where: { id: pipelineLead.id },
          data: {
            status: (statusMap[outcome] ?? "CALLED") as any,
            notes: notes ?? pipelineLead.notes,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Call session error:", error);
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  }
}

// GET /api/call-session — fetch call history stats (last 30 days)
export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ stats: [] });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await prisma.dailyStats.findMany({
      where: { userId: user.id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
