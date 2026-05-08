import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Returns SVG win card as image (can be screenshotted/shared)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "Anonymous";
  const amount = url.searchParams.get("amount") ?? "500";
  const time = url.searchParams.get("time") ?? "8 minutes";
  const industry = url.searchParams.get("industry") ?? "local business";
  const city = url.searchParams.get("city") ?? "";

  const svg = `<svg width="600" height="315" viewBox="0 0 600 315" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e1b4b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b"/>
      <stop offset="100%" style="stop-color:#fbbf24"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="600" height="315" fill="url(#bg)"/>
  
  <!-- Gold accent lines -->
  <line x1="0" y1="4" x2="600" y2="4" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
  <line x1="0" y1="311" x2="600" y2="311" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
  
  <!-- Money emoji large -->
  <text x="60" y="100" font-size="64" text-anchor="middle" filter="url(#glow)">💰</text>
  
  <!-- DEAL CLOSED text -->
  <text x="300" y="70" font-family="Arial Black, sans-serif" font-size="13" font-weight="900" 
    text-anchor="middle" fill="#f59e0b" letter-spacing="6">DEAL CLOSED</text>
  
  <!-- Amount -->
  <text x="300" y="140" font-family="Arial Black, sans-serif" font-size="64" font-weight="900" 
    text-anchor="middle" fill="url(#gold)" filter="url(#glow)">$${amount}</text>
  
  <!-- Details -->
  <text x="300" y="180" font-family="Arial, sans-serif" font-size="16" 
    text-anchor="middle" fill="#94a3b8">closed in ${time} · ${industry}${city ? " · " + city : ""}</text>
  
  <!-- Divider -->
  <line x1="100" y1="200" x2="500" y2="200" stroke="#334155" stroke-width="1"/>
  
  <!-- Footer -->
  <text x="300" y="228" font-family="Arial, sans-serif" font-size="13" 
    text-anchor="middle" fill="#475569">@${name} · powered by</text>
  <text x="300" y="250" font-family="Arial Black, sans-serif" font-size="18" font-weight="900" 
    text-anchor="middle" fill="#3b82f6">⚡ ColdCRM</text>
  <text x="300" y="272" font-family="Arial, sans-serif" font-size="11" 
    text-anchor="middle" fill="#334155">coldcrm.app</text>
  
  <!-- Stars -->
  <text x="30" y="280" font-size="14" opacity="0.4">⭐</text>
  <text x="555" y="60" font-size="14" opacity="0.4">⭐</text>
  <text x="560" y="280" font-size="20" opacity="0.3">✨</text>
  <text x="25" y="60" font-size="20" opacity="0.3">✨</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    },
  });
}
