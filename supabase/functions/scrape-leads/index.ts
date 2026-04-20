// Edge function: Google Maps web scraping (no API keys, pure HTTP)
// Uses Google Maps internal search endpoint that returns structured data

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

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];
const ua = () => UAS[Math.floor(Math.random() * UAS.length)];

// Strip Google's protective `)]}'` prefix and parse JSON
function parseGooglePayload(text: string): any {
  const cleaned = text.replace(/^\)\]\}'\s*/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting first JSON array
    const m = cleaned.match(/\[.*\]/s);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

// Recursively find all entries that look like place objects
function findPlaces(node: any, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    // Heuristic: a place entry tends to be an array containing a name string at index 11
    // and a coordinate sub-array. Easier to do brute walk.
    for (const item of node) findPlaces(item, out);
    // Also try treating this array as a place
    if (node.length > 14 && typeof node[11] === 'string' && node[11].length > 1 && node[11].length < 120) {
      out.push(node);
    }
  } else {
    for (const k of Object.keys(node)) findPlaces(node[k], out);
  }
  return out;
}

function safeString(v: any): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function deepFindFirst(node: any, predicate: (v: any) => boolean): any {
  if (predicate(node)) return node;
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const it of node) {
      const r = deepFindFirst(it, predicate);
      if (r != null) return r;
    }
  } else {
    for (const k of Object.keys(node)) {
      const r = deepFindFirst(node[k], predicate);
      if (r != null) return r;
    }
  }
  return null;
}

function deepFindAll(node: any, predicate: (v: any) => boolean, out: any[] = []): any[] {
  if (predicate(node)) out.push(node);
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const it of node) deepFindAll(it, predicate, out);
  } else {
    for (const k of Object.keys(node)) deepFindAll(node[k], predicate, out);
  }
  return out;
}

function extractFromPlace(place: any) {
  const name = safeString(place[11]) || safeString(place[2]) || null;
  if (!name) return null;

  // Address often at place[18] or contained within array
  const address = safeString(place[18]) || safeString(deepFindFirst(place, v => typeof v === 'string' && /\d.*[-,].*[A-Z]{2}/.test(v))) || null;

  // Phone: find string matching Brazilian format
  const phoneStr = deepFindFirst(place, v =>
    typeof v === 'string' && /^\+?55?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, ' '))
  ) || deepFindFirst(place, v =>
    typeof v === 'string' && /\(\d{2}\)\s?\d{4,5}-\d{4}/.test(v)
  );

  // Website: any http url that's not google's
  const websiteCandidates = deepFindAll(place, v =>
    typeof v === 'string' &&
    /^https?:\/\//i.test(v) &&
    !/(google\.|gstatic|googleusercontent|ggpht|schema\.org|maps\.app)/i.test(v)
  );
  const website = websiteCandidates[0] || null;

  // Instagram
  const igCandidate = websiteCandidates.find((w: string) => /instagram\.com/i.test(w));
  let instagram: string | null = null;
  if (igCandidate) {
    const m = String(igCandidate).match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    if (m) instagram = `@${m[1]}`;
  }

  // Rating: look for [rating, count] sub-array where rating is float 1-5
  const ratingNode = deepFindFirst(place, v =>
    Array.isArray(v) && v.length >= 2 &&
    typeof v[0] === 'number' && v[0] >= 1 && v[0] <= 5 &&
    typeof v[1] === 'number' && v[1] > 0 && v[1] < 1000000
  );
  const rating = ratingNode ? ratingNode[0] : 0;
  const reviewCount = ratingNode ? ratingNode[1] : 0;

  return {
    name,
    address,
    phone: phoneStr ? String(phoneStr) : null,
    website,
    instagram,
    rating,
    reviewCount,
  };
}

async function scrapeMaps(query: string, city: string, state: string, limit: number) {
  // Google Maps internal search endpoint — returns JS payload with structured data
  const term = `${query} ${city} ${state}`;
  const url = `https://www.google.com/search?tbm=map&q=${encodeURIComponent(term)}&hl=pt-BR&gl=br`;

  console.log(`[scrape] GET ${term}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': ua(),
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': 'https://www.google.com/maps',
    },
  });

  if (!res.ok) {
    console.error(`[scrape] HTTP ${res.status} for "${term}"`);
    return [];
  }

  const text = await res.text();
  const data = parseGooglePayload(text);

  if (!data) {
    console.warn(`[scrape] could not parse payload for "${term}" (len=${text.length})`);
    // Fallback: try regex extraction on raw HTML/text
    return regexFallback(text, query, city, state, limit);
  }

  const places = findPlaces(data);
  console.log(`[scrape] found ${places.length} place candidates for "${term}"`);

  const results: any[] = [];
  const seen = new Set<string>();

  for (const p of places) {
    if (results.length >= limit) break;
    const ext = extractFromPlace(p);
    if (!ext || !ext.name) continue;
    const key = ext.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const phoneDigits = ext.phone ? ext.phone.replace(/\D/g, '') : '';
    const whatsapp = phoneDigits.length >= 10
      ? (phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits)
      : null;

    results.push({
      id: `${city}-${results.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: ext.name,
      address: ext.address || `${city}, ${state}`,
      phone: ext.phone || 'N/A',
      whatsapp,
      website: ext.website,
      instagram: ext.instagram,
      rating: ext.rating || 0,
      reviewCount: ext.reviewCount || 0,
      type: !ext.website ? 'hot' : 'cold',
      niche: query,
      city,
      state,
      foundAt: new Date().toISOString(),
    });
  }

  return results;
}

// Fallback: brute regex extraction when JSON parse fails
function regexFallback(text: string, query: string, city: string, state: string, limit: number) {
  const results: any[] = [];
  const seen = new Set<string>();

  // Match place entries with name + lat/lng nearby
  const namePattern = /"([^"\\]{4,80})",null,\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/g;
  let m;
  while ((m = namePattern.exec(text)) !== null && results.length < limit) {
    const name = m[1];
    if (seen.has(name) || /^https?:|\.(com|jpg|png|svg)$|^image|maps\.app/i.test(name)) continue;
    seen.add(name);

    // Search ~2000 chars around match for phone & website
    const start = Math.max(0, m.index - 500);
    const end = Math.min(text.length, m.index + 2000);
    const slice = text.slice(start, end);

    const phoneM = slice.match(/(\(\d{2}\)\s?\d{4,5}-?\d{4}|\+?55\s?\d{2}\s?\d{4,5}-?\d{4})/);
    const webM = slice.match(/"(https?:\/\/(?!(?:www\.)?(?:google\.|gstatic|googleusercontent|ggpht|schema\.org|maps\.app))[^"\s]+)"/);
    const igM = slice.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    const ratingM = slice.match(/\[(\d\.\d),(\d{1,5})\]/);

    const phone = phoneM ? phoneM[1] : 'N/A';
    const phoneDigits = phone.replace(/\D/g, '');
    const whatsapp = phoneDigits.length >= 10
      ? (phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits)
      : null;

    results.push({
      id: `${city}-${results.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      address: `${city}, ${state}`,
      phone,
      whatsapp,
      website: webM ? webM[1] : null,
      instagram: igM ? `@${igM[1]}` : null,
      rating: ratingM ? parseFloat(ratingM[1]) : 0,
      reviewCount: ratingM ? parseInt(ratingM[2]) : 0,
      type: !webM ? 'hot' : 'cold',
      niche: query,
      city,
      state,
      foundAt: new Date().toISOString(),
    });
  }

  console.log(`[regexFallback] extracted ${results.length} from text(len=${text.length})`);
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body: ScrapeRequest = await req.json();
    const { niche, keywords = [], cities, state, quantity } = body;

    if (!niche || !cities?.length || !state || !quantity) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: niche, cities, state, quantity' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const perCity = Math.ceil(quantity / cities.length);
    const queries = [niche, ...keywords.slice(0, 1)].filter(Boolean);

    const all: any[] = [];
    const tasks: Promise<void>[] = [];
    for (const city of cities) {
      for (const q of queries) {
        tasks.push(
          scrapeMaps(q, city, state, perCity)
            .then((found) => { all.push(...found); })
            .catch((e) => console.error(`[task] ${q}/${city}:`, e.message))
        );
      }
    }
    await Promise.all(tasks);

    const dedup = new Map<string, any>();
    for (const l of all) {
      const k = `${l.name}|${l.city}`;
      if (!dedup.has(k)) dedup.set(k, l);
    }
    const final = Array.from(dedup.values()).slice(0, quantity);

    console.log(`[scrape-leads] returned ${final.length}/${quantity}`);

    return new Response(JSON.stringify({ leads: final, total: final.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[scrape-leads] fatal:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
