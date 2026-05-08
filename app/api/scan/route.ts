import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { state?: string; city?: string; industry?: string; country?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { state, city, industry, country = "US" } = body;

    if (!state || !city || !industry) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: session.user.email } });
    }

    // Cache check
    const now = new Date();
    const cached = await prisma.leadCache.findMany({
      where: {
        city: { equals: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
        country: { equals: country, mode: "insensitive" },
        industry: { equals: industry, mode: "insensitive" },
        expiresAt: { gt: now },
      },
      orderBy: { score: "desc" },
    });

    if (cached.length > 0) {
      return NextResponse.json({ leads: cached, fromCache: true, total: cached.length });
    }

    const { scrapeGoogleMaps } = await import("@/lib/scraper");
    const { scoreLead } = await import("@/lib/scorer");
    const { batchCheckWebsites, checkWebsiteQuality } = await import("@/lib/websiteCheck");

    const rawLeads = await scrapeGoogleMaps(industry, city, state, 60);

    if (rawLeads.length === 0) {
      return NextResponse.json({ leads: [], fromCache: false, total: 0 });
    }

    const websiteMap = await batchCheckWebsites(
      rawLeads.map((l, i) => ({ id: String(i), website: l.website }))
    );

    const results = [];

    for (let i = 0; i < rawLeads.length; i++) {
      const raw = rawLeads[i];
      try {
        const webCheck = websiteMap.get(String(i));
        const hasWebsite = Boolean(raw.website) && (webCheck?.isLive ?? false);
        const websiteDead = Boolean(raw.website) && (webCheck?.isDead ?? false);

        // Quality check for live sites
        let websiteQuality: string | null = null;
        let websiteQualityLabel: string | null = null;
        let websiteQualityDetails: string[] = [];

        if (raw.website && hasWebsite) {
          const qual = await checkWebsiteQuality(raw.website).catch(() => null);
          if (qual) {
            websiteQuality = qual.score;
            websiteQualityLabel = qual.label;
            websiteQualityDetails = qual.details;
          }
        }

        const { score, scoreLabel, salesAngle } = scoreLead({
          hasWebsite,
          websiteDead,
          websiteQuality: websiteQuality as "poor" | "average" | "good" | null,
          hasGoogleAds: false,
          rating: raw.rating,
          reviewCount: raw.reviewCount,
          phone: raw.phone,
          industry,
        });

        if (scoreLabel === "SKIP") continue;

        const placeId = raw.placeId ?? `${raw.businessName}-${city}-${state}-${country}-${i}`;

        const lead = await prisma.leadCache.upsert({
          where: { placeId },
          update: {
            score,
            scoreLabel,
            salesAngle,
            websiteQuality,
            websiteQualityLabel,
            websiteQualityDetails,
            expiresAt: addDays(new Date(), 1),
          },
          create: {
            city,
            state,
            country,
            industry,
            businessName: raw.businessName,
            phone: raw.phone,
            address: raw.address,
            websiteUrl: raw.website,
            rating: raw.rating,
            reviewCount: raw.reviewCount,
            hasWebsite,
            websiteDead,
            websiteQuality,
            websiteQualityLabel,
            websiteQualityDetails,
            hasGoogleAds: false,
            googleMapsUrl: raw.googleMapsUrl,
            placeId,
            category: raw.category,
            hours: raw.hours,
            lat: raw.lat,
            lng: raw.lng,
            score,
            scoreLabel,
            salesAngle,
            expiresAt: addDays(new Date(), 1),
          },
        });

        results.push(lead);
      } catch (e) {
        console.error("Lead error:", e);
        continue;
      }
    }

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({ leads: results, fromCache: false, total: results.length });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }
}
