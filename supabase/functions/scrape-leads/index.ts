// Edge function: scrape Google Maps results in real-time
// Returns leads without persisting them

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ScrapeRequest {
  niche: string;
  keywords: string[];
  cities: string[];
  state: string;
  quantity: number;
}

interface ScrapedLead {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  rating: number;
  reviewCount: number;
  type: 'hot' | 'cold';
  niche: string;
  city: string;
  state: string;
  foundAt: string;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Extract phone digits and format as WhatsApp link
function normalizePhone(raw: string): { phone: string; whatsapp: string | null } {
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 10) return { phone: raw, whatsapp: null };
  // Brazilian numbers: prepend 55 if missing
  const wa = digits.length <= 11 ? `55${digits}` : digits;
  return { phone: raw, whatsapp: wa };
}

// Scrape Google Maps search results page
async function scrapeGoogleMaps(query: string, city: string, state: string, limit: number): Promise<Partial<ScrapedLead>[]> {
  const searchTerm = `${query} em ${city} ${state}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/?hl=pt-BR`;

  console.log(`[scrape] ${searchTerm} -> ${url}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) {
    console.error(`[scrape] HTTP ${res.status} for ${searchTerm}`);
    return [];
  }

  const html = await res.text();

  // Google Maps embeds results inside an APP_INITIALIZATION_STATE blob.
  // Extract place arrays via regex on the embedded JSON.
  const leads: Partial<ScrapedLead>[] = [];
  const seen = new Set<string>();

  // Match place entries: name, address, phone, rating, reviews, website
  // Pattern looks for sequences containing place names with their coordinates
  const placePattern = /\\"([^\\"]{3,80})\\",null,\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/g;
  const phonePattern = /"(\+?55[\s\-]?\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4})"/g;
  const websitePattern = /"(https?:\/\/(?!(?:www\.)?google\.|maps\.google|gstatic|googleusercontent|schema\.org)[^"\s]+\.[a-z]{2,}[^"\s]*)"/g;
  const ratingPattern = /\[(\d\.\d),(\d+)\]/g;

  // Extract all candidate names
  const names: string[] = [];
  let m;
  while ((m = placePattern.exec(html)) !== null && names.length < limit * 3) {
    const name = m[1].replace(/\\u[\dA-F]{4}/gi, (s) =>
      String.fromCharCode(parseInt(s.replace(/\\u/g, ''), 16))
    );
    if (!seen.has(name) && !/^https?:|^\/|^image|^icon/i.test(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  // Extract phones and websites in order of appearance
  const phones: string[] = [];
  while ((m = phonePattern.exec(html)) !== null) phones.push(m[1]);

  const websites: string[] = [];
  const seenSites = new Set<string>();
  while ((m = websitePattern.exec(html)) !== null) {
    if (!seenSites.has(m[1])) {
      seenSites.add(m[1]);
      websites.push(m[1]);
    }
  }

  const ratings: Array<{ rating: number; count: number }> = [];
  while ((m = ratingPattern.exec(html)) !== null) {
    const r = parseFloat(m[1]);
    const c = parseInt(m[2]);
    if (r >= 1 && r <= 5 && c > 0 && c < 100000) ratings.push({ rating: r, count: c });
  }

  console.log(`[scrape] ${searchTerm}: names=${names.length} phones=${phones.length} websites=${websites.length} ratings=${ratings.length}`);

  // Combine into leads
  const max = Math.min(names.length, limit);
  for (let i = 0; i < max; i++) {
    const phoneRaw = phones[i] || '';
    const { phone, whatsapp } = normalizePhone(phoneRaw);
    const website = websites[i] || null;
    const rating = ratings[i]?.rating || 0;
    const reviewCount = ratings[i]?.count || 0;

    // Try to detect Instagram from website URL
    let instagram: string | null = null;
    if (website && /instagram\.com/i.test(website)) {
      const ig = website.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
      instagram = ig ? `@${ig[1]}` : null;
    }

    leads.push({
      id: `${city}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: names[i],
      address: `${city}, ${state}`,
      phone: phone || 'N/A',
      whatsapp,
      website,
      instagram,
      rating,
      reviewCount,
      type: !website ? 'hot' : 'cold',
      niche: query,
      city,
      state,
      foundAt: new Date().toISOString(),
    });
  }

  return leads;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ScrapeRequest = await req.json();
    const { niche, keywords = [], cities, state, quantity } = body;

    if (!niche || !cities?.length || !state || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: niche, cities, state, quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perCity = Math.ceil(quantity / cities.length);
    const queries = [niche, ...keywords].filter(Boolean);

    const allLeads: Partial<ScrapedLead>[] = [];

    // Scrape each city in parallel (limit concurrency)
    const tasks: Promise<void>[] = [];
    for (const city of cities) {
      for (const q of queries.slice(0, 2)) {
        tasks.push(
          scrapeGoogleMaps(q, city, state, perCity).then((found) => {
            allLeads.push(...found);
          }).catch((e) => console.error(`[task] ${q}/${city} failed:`, e.message))
        );
      }
    }
    await Promise.all(tasks);

    // Dedupe by name+city, then trim to requested quantity
    const dedup = new Map<string, Partial<ScrapedLead>>();
    for (const l of allLeads) {
      const key = `${l.name}|${l.city}`;
      if (!dedup.has(key)) dedup.set(key, l);
    }
    const final = Array.from(dedup.values()).slice(0, quantity);

    console.log(`[scrape-leads] returned ${final.length} leads (requested ${quantity})`);

    return new Response(JSON.stringify({ leads: final, total: final.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[scrape-leads] fatal:', err);
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
