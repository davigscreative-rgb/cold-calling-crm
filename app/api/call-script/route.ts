import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { generateCallScript } from "@/lib/claude";
import { PrismaClient } from "@prisma/client";

const { prisma } = await import("@/lib/prisma");

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadCacheId } = body;

  const lead = await prisma.leadCache.findUnique({ where: { id: leadCacheId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (lead.callScript) {
    return NextResponse.json({ script: lead.callScript });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });

  const script = await generateCallScript({
    businessName: lead.businessName,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    hasWebsite: lead.hasWebsite,
    hasGoogleAds: lead.hasGoogleAds,
    phone: lead.phone,
    scriptTone: user?.scriptTone ?? "PROFESSIONAL",
  });

  await prisma.leadCache.update({
    where: { id: leadCacheId },
    data: { callScript: script },
  });

  return NextResponse.json({ script });
}


