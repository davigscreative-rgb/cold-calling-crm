import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "pipeline"; // pipeline | all-leads

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let csvRows: string[] = [];

  if (mode === "all-leads") {
    // Export all scanned leads (not just pipeline)
    const leads = await prisma.leadCache.findMany({
      orderBy: { score: "desc" },
      take: 5000,
    });

    csvRows = [
      [
        "Business Name", "Phone", "Email", "Address", "City", "State", "Country",
        "Industry", "Rating", "Reviews", "Website URL", "Website Status",
        "Website Quality", "Has Google Ads", "Score", "Score Label", "Sales Angle",
      ].join(","),
      ...leads.map((l) => [
        `"${l.businessName}"`,
        l.phone ?? "",
        l.email ?? "",
        `"${(l.address ?? "").replace(/"/g, "'")}"`,
        `"${l.city}"`,
        `"${l.state}"`,
        l.country ?? "US",
        l.industry,
        l.rating ?? "",
        l.reviewCount ?? "",
        l.websiteUrl ?? "",
        l.hasWebsite ? (l.websiteDead ? "Dead" : "Active") : "None",
        l.websiteQualityLabel ?? "",
        l.hasGoogleAds ? "Yes" : "No",
        l.score,
        l.scoreLabel,
        `"${(l.salesAngle ?? "").replace(/"/g, "'")}"`,
      ].join(",")),
    ];
  } else {
    // Pipeline leads (default)
    const leads = await prisma.pipelineLead.findMany({
      where: { userId: user.id },
      include: { leadCache: true },
      orderBy: { addedAt: "desc" },
    });

    csvRows = [
      [
        "Business Name", "Phone", "Email", "Address", "City", "State", "Country",
        "Industry", "Rating", "Reviews", "Website URL", "Website Status",
        "Website Quality", "Sales Angle", "Has Google Ads",
        "Score", "Score Label", "Pipeline Status", "Deal Value ($)", "Notes", "Added Date",
      ].join(","),
      ...leads.map((l) => [
        `"${l.leadCache.businessName}"`,
        l.leadCache.phone ?? "",
        l.leadCache.email ?? "",
        `"${(l.leadCache.address ?? "").replace(/"/g, "'")}"`,
        `"${l.leadCache.city}"`,
        `"${l.leadCache.state}"`,
        (l.leadCache as any).country ?? "US",
        l.leadCache.industry,
        l.leadCache.rating ?? "",
        l.leadCache.reviewCount ?? "",
        (l.leadCache as any).websiteUrl ?? "",
        l.leadCache.hasWebsite ? ((l.leadCache as any).websiteDead ? "Dead" : "Active") : "None",
        (l.leadCache as any).websiteQualityLabel ?? "",
        `"${((l.leadCache as any).salesAngle ?? "").replace(/"/g, "'")}"`,
        l.leadCache.hasGoogleAds ? "Yes" : "No",
        l.leadCache.score ?? "",
        l.leadCache.scoreLabel,
        l.status,
        l.dealValueUsd ?? "",
        `"${(l.notes ?? "").replace(/"/g, "'")}"`,
        l.addedAt.toISOString().split("T")[0],
      ].join(",")),
    ];
  }

  const csv = csvRows.join("\n");
  const filename = `coldcrm-${mode}-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}


