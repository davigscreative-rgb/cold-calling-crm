import { HIGH_INTENT_INDUSTRIES } from "@/data/industries";

export interface LeadInput {
  hasWebsite: boolean;
  websiteDead?: boolean;
  websiteQuality?: "poor" | "average" | "good" | null;
  hasGoogleAds: boolean;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  industry: string;
}

export interface ScoreResult {
  score: number;
  scoreLabel: "A+" | "A" | "B+" | "B" | "C" | "SKIP";
  breakdown: {
    noWebsite: number;
    weakWebsite: number;
    noAds: number;
    highRating: number;
    reviewBonus: number;
    phoneBonus: number;
    industryBonus: number;
  };
  salesAngle: string;
}

export function scoreLead(lead: LeadInput): ScoreResult {
  const breakdown = {
    noWebsite: 0,
    weakWebsite: 0,
    noAds: 0,
    highRating: 0,
    reviewBonus: 0,
    phoneBonus: 0,
    industryBonus: 0,
  };

  // Website scoring (most impactful — 40pts max)
  if (!lead.hasWebsite || lead.websiteDead) {
    breakdown.noWebsite = 40;
  } else if (lead.websiteQuality === "poor") {
    breakdown.weakWebsite = 30; // Poor website = near as good as no website
  } else if (lead.websiteQuality === "average") {
    breakdown.weakWebsite = 15;
  }
  // Good website = 0 bonus (they have digital presence)

  // Google Ads
  if (!lead.hasGoogleAds) {
    breakdown.noAds = 20;
  }

  // Rating
  if (lead.rating !== null && lead.rating >= 4.5) {
    breakdown.highRating = 15;
  } else if (lead.rating !== null && lead.rating >= 4.0) {
    breakdown.highRating = 8;
  }

  // Review count (social proof = willingness to invest)
  if (lead.reviewCount !== null && lead.reviewCount >= 100) {
    breakdown.reviewBonus = 15;
  } else if (lead.reviewCount !== null && lead.reviewCount >= 50) {
    breakdown.reviewBonus = 10;
  } else if (lead.reviewCount !== null && lead.reviewCount >= 20) {
    breakdown.reviewBonus = 5;
  }

  // Phone (must have for calling)
  if (lead.phone) {
    breakdown.phoneBonus = 5;
  }

  // High-intent industry bonus
  if (HIGH_INTENT_INDUSTRIES.has(lead.industry)) {
    breakdown.industryBonus = 10;
  }

  const score = Math.min(
    breakdown.noWebsite +
      breakdown.weakWebsite +
      breakdown.noAds +
      breakdown.highRating +
      breakdown.reviewBonus +
      breakdown.phoneBonus +
      breakdown.industryBonus,
    100
  );

  let scoreLabel: ScoreResult["scoreLabel"];
  if (score >= 85) scoreLabel = "A+";
  else if (score >= 70) scoreLabel = "A";
  else if (score >= 58) scoreLabel = "B+";
  else if (score >= 45) scoreLabel = "B";
  else if (score >= 35) scoreLabel = "C";
  else scoreLabel = "SKIP";

  // Sales angle — what to say on the call
  let salesAngle = "";
  if (!lead.hasWebsite || lead.websiteDead) {
    salesAngle = "🎯 No online presence — huge opportunity to pitch website/digital services";
  } else if (lead.websiteQuality === "poor") {
    salesAngle = "⚡ Outdated/poor website detected — pitch redesign & modernization";
  } else if (lead.websiteQuality === "average") {
    salesAngle = "📈 Basic website exists — pitch SEO, ads, or upgrade services";
  } else {
    salesAngle = "💡 Good digital presence — pitch advanced marketing or automation";
  }

  return { score, scoreLabel, breakdown, salesAngle };
}

export function getScoreColor(label: string): string {
  switch (label) {
    case "A+": return "text-emerald-700 bg-emerald-50 border-emerald-300";
    case "A":  return "text-green-600 bg-green-50 border-green-200";
    case "B+": return "text-amber-700 bg-amber-50 border-amber-300";
    case "B":  return "text-amber-600 bg-amber-50 border-amber-200";
    case "C":  return "text-gray-600 bg-gray-50 border-gray-200";
    default:   return "text-gray-400 bg-gray-50 border-gray-100";
  }
}

export function getPriorityTag(score: number): { label: string; classes: string } {
  if (score >= 85) return { label: "HOT 🔥", classes: "bg-red-100 text-red-700 border border-red-200" };
  if (score >= 70) return { label: "HIGH", classes: "bg-orange-100 text-orange-700 border border-orange-200" };
  if (score >= 50) return { label: "MED", classes: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
  return { label: "LOW", classes: "bg-gray-100 text-gray-500 border border-gray-200" };
}
