import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { PrismaClient } from "@prisma/client";

const { prisma } = await import("@/lib/prisma");

export async function GET(_req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ stats: null });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await prisma.dailyStats.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  return NextResponse.json({ stats, dailyGoal: user.dailyGoalUsd });
}

