import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// City coordinates lookup (lat/lng for major cities per country)
const CITY_COORDS: Record<string, [number, number]> = {
  // US
  "New York City": [40.7128, -74.006], "Los Angeles": [34.0522, -118.2437],
  "Chicago": [41.8781, -87.6298], "Houston": [29.7604, -95.3698],
  "Phoenix": [33.4484, -112.074], "Philadelphia": [39.9526, -75.1652],
  "San Antonio": [29.4241, -98.4936], "San Diego": [32.7157, -117.1611],
  "Dallas": [32.7767, -96.797], "Austin": [30.2672, -97.7431],
  "Miami": [25.7617, -80.1918], "Atlanta": [33.749, -84.388],
  "Seattle": [47.6062, -122.3321], "Denver": [39.7392, -104.9903],
  "Boston": [42.3601, -71.0589], "Nashville": [36.1627, -86.7816],
  "Tampa": [27.9506, -82.4572], "Orlando": [28.5383, -81.3792],
  "Portland": [45.5231, -122.6765], "Las Vegas": [36.1699, -115.1398],
  // UK
  "London": [51.5074, -0.1278], "Manchester": [53.4808, -2.2426],
  "Birmingham": [52.4862, -1.8904], "Leeds": [53.8008, -1.5491],
  "Edinburgh": [55.9533, -3.1883], "Glasgow": [55.8642, -4.2518],
  "Bristol": [51.4545, -2.5879], "Cardiff": [51.4816, -3.1791],
  // BR
  "São Paulo": [-23.5505, -46.6333], "Rio de Janeiro": [-22.9068, -43.1729],
  "Belo Horizonte": [-19.9167, -43.9345], "Brasília": [-15.7942, -47.8825],
  "Fortaleza": [-3.7172, -38.5433], "Salvador": [-12.9714, -38.5014],
  "Curitiba": [-25.4284, -49.2733], "Porto Alegre": [-30.0277, -51.2287],
  "Campina Grande": [-7.2306, -35.8811], "João Pessoa": [-7.1195, -34.8450],
  "Recife": [-8.0476, -34.877], "Manaus": [-3.1190, -60.0217],
  // AU
  "Sydney": [-33.8688, 151.2093], "Melbourne": [-37.8136, 144.9631],
  "Brisbane": [-27.4698, 153.0251], "Perth": [-31.9505, 115.8605],
  "Adelaide": [-34.9285, 138.6007], "Gold Coast": [-28.0167, 153.4],
  "Canberra": [-35.2809, 149.13], "Darwin": [-12.4634, 130.8456],
};

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Group leads by city + country
    const leads = await prisma.leadCache.groupBy({
      by: ["city", "country"],
      _count: { id: true },
      _avg: { score: true },
      orderBy: { _count: { id: "desc" } },
      take: 200,
    });

    const points = leads
      .map((l) => {
        const coords = CITY_COORDS[l.city];
        if (!coords) return null;
        return {
          city: l.city,
          country: l.country,
          lat: coords[0],
          lng: coords[1],
          count: l._count.id,
          avgScore: Math.round(l._avg.score ?? 0),
        };
      })
      .filter(Boolean);

    // Pipeline leads by city for conquest data
    const pipelineByCity = await prisma.pipelineLead.groupBy({
      by: [],
      _count: { id: true },
    });

    return NextResponse.json({ points, total: points.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ points: [], total: 0 });
  }
}
