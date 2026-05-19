import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { PrismaClient } from "@prisma/client";

const { prisma } = await import("@/lib/prisma");

export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, dealValueUsd, notes } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.pipelineLead.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.pipelineLead.update({
    where: { id },
    data: {
      ...(status && { status, statusChangedAt: new Date() }),
      ...(dealValueUsd !== undefined && { dealValueUsd }),
      ...(notes !== undefined && { notes }),
    },
    include: { leadCache: true },
  });

  // Log activity
  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        pipelineLeadId: id,
        action: "STATUS_CHANGED",
        fromStatus: existing.status,
        toStatus: status,
      },
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statsUpdate: Record<string, unknown> = {};
    if (status === "CALLED") statsUpdate.callsMade = { increment: 1 };
    if (status === "BOOKED") statsUpdate.meetingsBooked = { increment: 1 };
    if (status === "SHOWED") statsUpdate.showedUp = { increment: 1 };
    if (status === "NOSHOW") statsUpdate.noShows = { increment: 1 };
    if (status === "CLOSED") {
      statsUpdate.closedCount = { increment: 1 };
      if (dealValueUsd) statsUpdate.closedValueUsd = { increment: dealValueUsd };
    }

    if (Object.keys(statsUpdate).length > 0) {
      await prisma.dailyStats.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: statsUpdate,
        create: { userId: user.id, date: today, ...Object.fromEntries(
          Object.entries(statsUpdate).map(([k, v]) => [k, (v as { increment: number }).increment])
        )},
      });
    }
  }

  return NextResponse.json({ lead: updated });
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadCacheId } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.pipelineLead.findFirst({
    where: { userId: user.id, leadCacheId },
  });

  if (existing) {
    return NextResponse.json({ lead: existing, alreadyExists: true });
  }

  const lead = await prisma.pipelineLead.create({
    data: { userId: user.id, leadCacheId, status: "NEW" },
    include: { leadCache: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      pipelineLeadId: lead.id,
      action: "LEAD_ADDED",
      toStatus: "NEW",
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyStats.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { leadsAdded: { increment: 1 } },
    create: { userId: user.id, date: today, leadsAdded: 1 },
  });

  return NextResponse.json({ lead });
}

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const leads = await prisma.pipelineLead.findMany({
    where: { userId: user.id },
    include: { leadCache: true, activityLog: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ leads });
}

