const BOT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function checkWebsiteLive(url: string): Promise<{
  isLive: boolean;
  isDead: boolean;
}> {
  if (!url) return { isLive: false, isDead: false };

  try {
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;

    // HEAD first (fast)
    let controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), 8000);
    let res = await fetch(cleanUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": BOT_UA },
    });
    clearTimeout(timer);

    // Many real sites return 403/405 on HEAD — retry with GET
    if (res.status === 403 || res.status === 405) {
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 8000);
      res = await fetch(cleanUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": BOT_UA },
      });
      clearTimeout(timer);
    }

    // Any non-5xx = site exists (2xx ok, 3xx redirect, 4xx blocked-but-up)
    if (res.status < 500) {
      return { isLive: true, isDead: false };
    }
    return { isLive: false, isDead: true };
  } catch {
    // DNS fail, timeout, network error = truly dead
    return { isLive: false, isDead: true };
  }
}

export interface WebsiteQuality {
  score: "poor" | "average" | "good";
  label: string;
  details: string[];
}

export async function checkWebsiteQuality(url: string): Promise<WebsiteQuality> {
  if (!url) return { score: "poor", label: "No website", details: [] };

  try {
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(cleanUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": BOT_UA },
    });
    clearTimeout(timer);

    const html = await res.text();
    const details: string[] = [];
    let points = 0;

    // HTTPS
    if (cleanUrl.startsWith("https://")) {
      points++;
      details.push("✅ HTTPS secure");
    } else {
      details.push("❌ No HTTPS");
    }

    // Mobile viewport
    if (html.includes('name="viewport"') || html.includes("name='viewport'")) {
      points++;
      details.push("✅ Mobile-friendly");
    } else {
      details.push("❌ Not mobile-friendly");
    }

    // Contact info
    const hasContact =
      /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/.test(html) ||
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(html);
    if (hasContact) {
      points++;
      details.push("✅ Has contact info");
    } else {
      details.push("❌ No contact info found");
    }

    // SEO title
    if (/<title>.+<\/title>/i.test(html)) {
      points++;
      details.push("✅ Has page title (SEO)");
    } else {
      details.push("❌ Missing page title");
    }

    // Social links
    if (
      html.includes("facebook.com") ||
      html.includes("instagram.com") ||
      html.includes("linkedin.com")
    ) {
      points++;
      details.push("✅ Has social links");
    } else {
      details.push("❌ No social media links");
    }

    // Real content (not a placeholder/parked domain)
    if (html.length > 5000) {
      points++;
      details.push("✅ Has real content");
    } else {
      details.push("❌ Very thin content (placeholder?)");
    }

    let score: WebsiteQuality["score"];
    let label: string;
    if (points >= 5) {
      score = "good";
      label = "Good website";
    } else if (points >= 3) {
      score = "average";
      label = "Average website";
    } else {
      score = "poor";
      label = "Poor website";
    }

    return { score, label, details };
  } catch {
    return { score: "poor", label: "Unreachable", details: ["❌ Could not load website"] };
  }
}

export async function checkGoogleAds(
  businessName: string,
  city: string,
  serpApiKey: string
): Promise<{ hasAds: boolean; confidence: "low" | "high" }> {
  if (!serpApiKey) return { hasAds: false, confidence: "low" };

  try {
    const query = encodeURIComponent(`${businessName} ${city}`);
    const url = `https://serpapi.com/search.json?q=${query}&api_key=${serpApiKey}&num=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { hasAds: false, confidence: "low" };
    const data = await res.json();
    const hasAds =
      data.ads?.length > 0 ||
      data.shopping_results?.some((r: { title?: string }) =>
        r.title?.toLowerCase().includes(businessName.toLowerCase().split(" ")[0])
      );
    return { hasAds: Boolean(hasAds), confidence: "high" };
  } catch {
    return { hasAds: false, confidence: "low" };
  }
}

export async function batchCheckWebsites(
  leads: Array<{ website: string | null; id: string }>
): Promise<Map<string, { isLive: boolean; isDead: boolean }>> {
  const results = new Map<string, { isLive: boolean; isDead: boolean }>();
  const chunks: typeof leads[] = [];
  for (let i = 0; i < leads.length; i += 10) {
    chunks.push(leads.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    const checks = await Promise.allSettled(
      chunk.map(async (lead) => {
        if (!lead.website) return { id: lead.id, isLive: false, isDead: false };
        const result = await checkWebsiteLive(lead.website);
        return { id: lead.id, ...result };
      })
    );
    for (const check of checks) {
      if (check.status === "fulfilled") {
        results.set(check.value.id, {
          isLive: check.value.isLive,
          isDead: check.value.isDead,
        });
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}
