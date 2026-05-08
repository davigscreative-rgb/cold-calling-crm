export interface RawLead {
  businessName: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string | null;
  placeId: string | null;
  category: string | null;
  hours: string | null;
  lat: number | null;
  lng: number | null;
}

async function fetchPage(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}

export async function scrapeGoogleMaps(
  industry: string,
  city: string,
  state: string,
  maxResults = 60
): Promise<RawLead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const query = `${industry} in ${city}, ${state}`;
  const results: RawLead[] = [];
  let pageToken: string | null = null;

  do {
    const url = pageToken
      ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    const data = await fetchPage(url);

    if (!data.results || data.results.length === 0) break;

    for (const place of data.results) {
      if (results.length >= maxResults) break;

      // Get details for phone, website, hours
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,opening_hours,formatted_address,rating,user_ratings_total,geometry,types,url&key=${apiKey}`;
      const detailsData = await fetchPage(detailsUrl);
      const d = detailsData.result ?? {};

      results.push({
        businessName: d.name ?? place.name,
        phone: d.formatted_phone_number ?? null,
        address: d.formatted_address ?? place.formatted_address ?? null,
        website: d.website ?? null,
        rating: d.rating ?? place.rating ?? null,
        reviewCount: d.user_ratings_total ?? place.user_ratings_total ?? null,
        googleMapsUrl: d.url ?? null,
        placeId: place.place_id,
        category: d.types?.[0]?.replace(/_/g, " ") ?? industry,
        hours: d.opening_hours?.weekday_text?.join(", ") ?? null,
        lat: d.geometry?.location?.lat ?? place.geometry?.location?.lat ?? null,
        lng: d.geometry?.location?.lng ?? place.geometry?.location?.lng ?? null,
      });
    }

    pageToken = data.next_page_token ?? null;
    if (pageToken && results.length < maxResults) {
      await new Promise((r) => setTimeout(r, 2000));
    }

  } while (pageToken && results.length < maxResults);

  return results;
}

export async function scrapeBusinessWebsite(
  url: string
): Promise<{ email: string | null; phone: string | null }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const content = await res.text();

    const emailMatch = content.match(
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
    );
    const email = emailMatch ? emailMatch[0] : null;

    const phoneMatch = content.match(
      /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/
    );
    const phone = phoneMatch ? phoneMatch[0].trim() : null;

    return { email, phone };
  } catch {
    return { email: null, phone: null };
  }
}