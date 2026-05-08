import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const lead = await prisma.pipelineLead.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      leadCache: true,
      activityLog: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      followUps: {
        orderBy: { createdAt: "desc" },
      },
      meetings: {
        orderBy: { scheduledAt: "asc" },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lead });
}
