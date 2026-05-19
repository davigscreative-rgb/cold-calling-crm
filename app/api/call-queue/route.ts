import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const industry = url.searchParams.get("industry") ?? undefined;
    const country = url.searchParams.get("country") ?? undefined;
    const minScore = parseInt(url.searchParams.get("minScore") ?? "35");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");

    const now = new Date();

    const leads = await prisma.leadCache.findMany({
      where: {
        expiresAt: { gt: now },
        score: { gte: minScore },
        phone: { not: null },
        ...(industry ? { industry } : {}),
        ...(country ? { country } : {}),
      },
      orderBy: { score: "desc" },
      take: limit,
    });

    return NextResponse.json({ leads, total: leads.length });
  } catch (error) {
    console.error("Call queue error:", error);
    return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
  }
}

