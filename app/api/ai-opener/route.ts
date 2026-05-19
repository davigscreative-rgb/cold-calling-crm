import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { businessName, industry, city, hasWebsite, websiteQuality, websiteUrl } = await req.json();

    const context = !hasWebsite
      ? `They have NO website at all.`
      : websiteQuality === "poor"
      ? `They have a very poor/outdated website.`
      : websiteQuality === "average"
      ? `They have an average website with room for improvement.`
      : `They have a decent website but could improve marketing.`;

    const prompt = `You are an elite cold caller for a web design and digital marketing agency. Generate ONE powerful, natural-sounding cold call opener line for this business. It must be specific, reference their situation, and create instant curiosity. Maximum 2 sentences. No generic lines. Sound human, not salesy.

Business: ${businessName}
Industry: ${industry}
City: ${city}
Digital situation: ${context}
${websiteUrl ? `Website: ${websiteUrl}` : ""}

Return ONLY the opener line, nothing else. Start with "Hey" or a natural greeting.`;

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
    const opener = data.content?.[0]?.text?.trim() ?? "";

    return NextResponse.json({ opener });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ opener: "" }, { status: 500 });
  }
}

