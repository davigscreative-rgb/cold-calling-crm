import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface LeadContext {
  businessName: string;
  industry: string;
  city: string;
  state: string;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean;
  hasGoogleAds: boolean;
  phone?: string | null;
  address?: string | null;
  scriptTone?: "PROFESSIONAL" | "CASUAL" | "AGGRESSIVE";
}

export async function generateCallScript(lead: LeadContext): Promise<string> {
  const toneInstructions = {
    PROFESSIONAL: "Confident and polished, like a seasoned consultant. Authoritative but respectful.",
    CASUAL: "Friendly and conversational, like talking to a neighbor. Warm and approachable.",
    AGGRESSIVE: "Direct and urgency-driven. Get to the point fast. Time is money.",
  };

  const tone = toneInstructions[lead.scriptTone ?? "PROFESSIONAL"];
  const gaps: string[] = [];
  if (!lead.hasWebsite) gaps.push("no website");
  if (!lead.hasGoogleAds) gaps.push("no Google Ads");
  const gapPhrase = gaps.join(" and ");

  const prompt = `Generate a cold call script for a web design and digital marketing agency calling ${lead.businessName}, a ${lead.industry} business in ${lead.city}, ${lead.state}.

Key facts:
- Rating: ${lead.rating ? `${lead.rating} stars` : "unknown"} with ${lead.reviewCount ?? 0} reviews
- ${!lead.hasWebsite ? "NO website found" : "Has a website"}
- ${!lead.hasGoogleAds ? "NOT running Google Ads" : "Running Google Ads"}
- Gap to exploit: ${gapPhrase || "general digital presence"}

Tone: ${tone}

Script requirements:
1. OPENING: Personalized hook that references a specific detail about them (their review count, years in business, reputation)
2. PAIN POINT: Build urgency around the specific gap (${gapPhrase})
3. OFFER: 5-minute Zoom call to show them what competitors are doing online
4. OBJECTION 1: Handle "I'm too busy"
5. OBJECTION 2: Handle "I'm not interested / we're doing fine"
6. CLOSE: Soft ask for a specific time slot this week

Rules:
- Under 280 words total
- Sound like a real human talking, not reading a script
- Use the business name naturally (not every sentence)
- Include a natural pause cue [pause] where appropriate
- Do NOT mention price on the first call

Format exactly as:
OPENING:
[text]

PAIN POINT:
[text]

OFFER:
[text]

OBJECTION 1 — "I'm too busy":
[text]

OBJECTION 2 — "Not interested":
[text]

CLOSE:
[text]`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

export async function generateWebsitePrompt(lead: LeadContext & {
  address?: string | null;
  hours?: string | null;
}): Promise<string> {
  const prompt = `Generate a complete, detailed website build prompt for a web developer to create a professional website for the following local business.

Business details:
- Name: ${lead.businessName}
- Industry: ${lead.industry}
- Location: ${lead.city}, ${lead.state}
${lead.address ? `- Address: ${lead.address}` : ""}
${lead.rating ? `- Google Rating: ${lead.rating} stars (${lead.reviewCount} reviews)` : ""}
${lead.hours ? `- Hours: ${lead.hours}` : ""}
${!lead.hasWebsite ? "- Currently has NO website (build from scratch)" : "- Has an existing website (redesign/improve)"}

Generate a detailed prompt that covers:
1. Site structure (exact pages needed)
2. Hero section content and CTA
3. Services to highlight specific to this industry
4. Trust signals (reviews, certifications, years in business)
5. Local SEO requirements (NAP, Google Maps embed, schema markup)
6. Lead capture (contact form, phone click-to-call, WhatsApp button)
7. Mobile-first design requirements
8. Color scheme suggestion based on industry
9. Any industry-specific features (booking calendar, before/after gallery, menu, etc.)
10. Performance requirements

Make it comprehensive enough that a developer could build the full site from this prompt alone. Be specific to this exact business.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

export async function generateFollowUpEmail(params: {
  type: "IMMEDIATE" | "REMINDER";
  businessName: string;
  ownerName: string | null;
  industry: string;
  meetingTime: Date;
  zoomJoinUrl: string;
  userName: string;
}): Promise<{ subject: string; body: string }> {
  const timeStr = params.meetingTime.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const greeting = params.ownerName ? `Hi ${params.ownerName.split(" ")[0]}` : `Hi there`;

  if (params.type === "IMMEDIATE") {
    return {
      subject: `Your Zoom link for our call, ${params.ownerName?.split(" ")[0] ?? params.businessName}!`,
      body: `${greeting},

Just confirmed our quick 5-minute Zoom call — really looking forward to connecting!

📅 When: ${timeStr}
🔗 Join Zoom: ${params.zoomJoinUrl}

In those 5 minutes, I'll show you exactly what your competitors in ${params.industry} are doing online and one quick thing we could do for ${params.businessName} to get ahead of them.

No pressure, no pitch — just real intel you can use whether we work together or not.

See you then!

${params.userName}

P.S. If anything comes up, reply here and we'll find another time.`,
    };
  } else {
    return {
      subject: `See you in 90 minutes! 👋`,
      body: `${greeting},

Quick heads up — our 5-minute Zoom call is coming up in about 90 minutes!

📅 ${timeStr}
🔗 Join here: ${params.zoomJoinUrl}

I'll have a quick screen share ready showing what I found about ${params.businessName}'s online presence and what the opportunity looks like. Takes exactly 5 minutes.

See you soon!

${params.userName}`,
    };
  }
}
