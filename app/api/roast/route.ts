import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { businessName, industry, city, hasWebsite, websiteQuality, websiteUrl, rating, reviewCount } = await req.json();

    const prompt = `You are a brutally honest but funny digital marketing consultant. Roast this business's digital presence in 3-4 sentences. Be specific, funny, but end with a genuine sales opportunity. Like a friend who's also a professional telling hard truths. Don't be mean — be sharp and funny.

Business: ${businessName}
Industry: ${industry}  
City: ${city}
Website: ${hasWebsite ? (websiteQuality === "poor" ? "Has a terrible outdated website" : websiteQuality === "average" ? "Has a mediocre website" : "Has a decent website") : "NO WEBSITE AT ALL"}
${websiteUrl ? `URL: ${websiteUrl}` : ""}
Google Rating: ${rating ?? "No reviews"} (${reviewCount ?? 0} reviews)

Format: 
ROAST: [2-3 funny but true lines about their digital situation]
OPPORTUNITY: [1 line pitch you'd use based on the roast]

Keep it punchy. Max 100 words total.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() ?? "";

    const roastMatch = text.match(/ROAST:\s*([\s\S]*?)(?=OPPORTUNITY:|$)/i);
    const oppMatch = text.match(/OPPORTUNITY:\s*([\s\S]*)/i);

    return NextResponse.json({
      roast: roastMatch?.[1]?.trim() ?? text,
      opportunity: oppMatch?.[1]?.trim() ?? "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ roast: "", opportunity: "" }, { status: 500 });
  }
}
