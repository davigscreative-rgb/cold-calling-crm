import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { PrismaClient } from "@prisma/client";

const { prisma } = await import("@/lib/prisma");
export async function GET(_req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      dailyGoalUsd: true, defaultIndustry: true, defaultState: true,
      scriptTone: true, emailEnabled: true, twilioEnabled: true,
      followUp1Template: true, followUp2Template: true,
      zoomAccessToken: true,
    },
  });

  return NextResponse.json({
    settings: user,
    zoomConnected: Boolean(user?.zoomAccessToken),
  });
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.user.upsert({
    where: { email: session.user.email! },
    update: {
      dailyGoalUsd: body.dailyGoalUsd,
      defaultIndustry: body.defaultIndustry,
      defaultState: body.defaultState,
      scriptTone: body.scriptTone,
      emailEnabled: body.emailEnabled,
      twilioEnabled: body.twilioEnabled,
      followUp1Template: body.followUp1Template,
      followUp2Template: body.followUp2Template,
    },
    create: {
      email: session.user.email!,
      name: session.user.user_metadata?.full_name,
      dailyGoalUsd: body.dailyGoalUsd ?? 1000,
    },
  });

  return NextResponse.json({ success: true });
}

