import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { generateWebsitePrompt } from "@/lib/claude";
import { PrismaClient } from "@prisma/client";

const { prisma } = await import("@/lib/prisma");

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadCacheId } = await req.json();

  const lead = await prisma.leadsCache.findUnique({ where: { id: leadCacheId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (lead.websitePrompt) {
    return NextResponse.json({ prompt: lead.websitePrompt });
  }

  const prompt = await generateWebsitePrompt({
    businessName: lead.businessName,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    hasWebsite: lead.hasWebsite,
    hasGoogleAds: lead.hasGoogleAds,
    address: lead.address,
    hours: lead.hours,
  });

  await prisma.leadsCache.update({
    where: { id: leadCacheId },
    data: { websitePrompt: prompt },
  });

  return NextResponse.json({ prompt });
}
