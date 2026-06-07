// Edge function: scraping REAL do Google Maps (sem API key, sem navegador).
// Estratégia em 2 passos (HTTP puro):
//   1) GET /maps/search/{query} → extrai URL canônica com pb=
//   2) GET dessa URL (paginando com &start=N) → JSON prefixado por )]}'
//   3) Resultados em data[64]; cada place é um array com offsets conhecidos
// Pipeline opcional: validação ativa do WhatsApp + enriquecimento leve (Instagram do site).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchQuery {
  niche: string;
  keywords: string[];
  cities: string[];
  state: string;
  quantity: number;
}

interface Lead {
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
  category?: string;
  placeId?: string;
  mapsUrl?: string;
  phoneFromInstagram?: boolean;
  adsStatus?: 'tubarao' | 'none' | 'unknown';
  whatsappVerified?: boolean;
  whatsappScore?: number;
  phoneSource?: 'gmaps' | 'website' | 'instagram' | 'unknown';
}

// ===================== Utils =====================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function safe(obj: any, ...path: (number | string)[]): any {
  try { let o = obj; for (const k of path) o = o[k as any]; return o; } catch { return undefined; }
}

function normalizeBR(raw: string): string {
  if (!raw) return '';
  let d = String(raw).replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return '';
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return '';
  return d;
}

function isMobileBR(d: string): boolean { return d.length === 11 && d[2] === '9'; }

// ===================== Google Maps scraper =====================

async function getSearchUrl(query: string): Promise<string | null> {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=pt-BR&gl=br`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) { console.log('[gmaps] step1 status', res.status); return null; }
    const html = await res.text();
    const m = html.match(/href="(\/search\?tbm=map[^"]+)"/);
    if (!m) { console.log('[gmaps] pb url não encontrada (consent wall?)'); return null; }
    return 'https://www.google.com' + m[1].replace(/&amp;/g, '&');
  } catch (e) {
    console.log('[gmaps] step1 erro', String(e));
    return null;
  }
}

async function fetchPage(searchUrl: string, start: number): Promise<any[]> {
  const url = start === 0 ? searchUrl : `${searchUrl}&start=${start}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) { console.log('[gmaps] page', start, 'status', res.status); return []; }
    let raw = await res.text();
    if (raw.startsWith(")]}'")) raw = raw.slice(4).trim();
    else { console.log('[gmaps] prefixo inesperado page', start); return []; }
    const data = JSON.parse(raw);
    const arr = data[64];
    if (!Array.isArray(arr)) return [];
    return arr.map((e: any) => Array.isArray(e) && e[1] ? e[1] : null).filter(Boolean);
  } catch (e) {
    console.log('[gmaps] page', start, 'erro', String(e));
    return [];
  }
}

function extractPlace(r: any): Partial<Lead> | null {
  const placeId = safe(r, 78);
  const name = safe(r, 11);
  if (!name) return null;
  const address: string = safe(r, 39) || '';
  const category: string = safe(r, 13, 0) || '';
  const website: string = safe(r, 7, 0) || '';
  const rating: number = safe(r, 4, 7) || 0;
  const reviewCount: number = safe(r, 4, 8) || safe(r, 37, 1) || 0;
  const lat = safe(r, 9, 2);
  const lng = safe(r, 9, 3);
  // Telefones: índice [178][0][1][0][0]=local, [178][0][1][1][0]=internacional
  // Em PT-BR, costuma vir só local em [178][0][3] formato "(11) 99999-9999"
  const phoneLocal: string =
    safe(r, 178, 0, 3) ||
    safe(r, 178, 0, 1, 0, 0) ||
    safe(r, 178, 0, 0) ||
    '';
  const phoneIntl: string = safe(r, 178, 0, 1, 1, 0) || '';
  const phoneRaw = phoneIntl || phoneLocal;
  const phone = normalizeBR(phoneRaw);

  return {
    placeId,
    name,
    address,
    category,
    website: website || null,
    rating: typeof rating === 'number' ? rating : 0,
    reviewCount: typeof reviewCount === 'number' ? reviewCount : 0,
    phone,
    mapsUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : `https://www.google.com/maps/?cid=${safe(r, 10) || ''}`,
    // armazenamos lat/lng só pra debug futuro se precisar
  } as Partial<Lead> & { lat?: number; lng?: number };
}

async function scrapeGmaps(query: string, limit: number): Promise<Partial<Lead>[]> {
  const searchUrl = await getSearchUrl(query);
  if (!searchUrl) return [];
  const out: Partial<Lead>[] = [];
  const seen = new Set<string>();
  let start = 0;
  // 20 por página; busca paralela depois da 1ª pra acelerar
  const firstPage = await fetchPage(searchUrl, 0);
  for (const r of firstPage) {
    const p = extractPlace(r);
    if (p && p.placeId && !seen.has(p.placeId)) { seen.add(p.placeId); out.push(p); }
  }
  if (out.length >= limit) return out.slice(0, limit);

  // Próximas páginas em paralelo (até 15 páginas = ~300 leads)
  const maxPages = Math.min(15, Math.ceil((limit - out.length) / 20) + 1);
  const starts: number[] = [];
  for (let i = 1; i <= maxPages; i++) starts.push(i * 20);
  const batches = await Promise.all(starts.map(s => fetchPage(searchUrl, s)));
  for (const page of batches) {
    for (const r of page) {
      const p = extractPlace(r);
      if (p && p.placeId && !seen.has(p.placeId)) { seen.add(p.placeId); out.push(p); }
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

// ===================== WhatsApp verification (rápida, em batch) =====================

const waCache = new Map<string, boolean>();

async function verifyWhatsApp(numberBR: string): Promise<boolean> {
  if (!numberBR || !isMobileBR(numberBR)) return false;
  if (waCache.has(numberBR)) return waCache.get(numberBR)!;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://wa.me/55${numberBR}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) { waCache.set(numberBR, false); return false; }
    const html = (await res.text()).toLowerCase();
    const invalid = html.includes('phone number shared via url is invalid')
      || html.includes('número de telefone') && html.includes('inválido');
    const positive = html.includes('continue to chat') || html.includes('continuar para o chat')
      || html.includes('use whatsapp') || html.includes('usar o whatsapp');
    const ok = !invalid && positive;
    waCache.set(numberBR, ok);
    return ok;
  } catch { waCache.set(numberBR, false); return false; }
}

// ===================== Instagram leve a partir do site =====================

async function fetchInstagramFromSite(website: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(website, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/instagram\.com\/(?!p\/|reel|reels|explore|stories|accounts|about)([A-Za-z0-9_.]{2,30})/i);
    return m ? `@${m[1].replace(/\/$/, '')}` : null;
  } catch { return null; }
}

// ===================== Handler =====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const q = (await req.json()) as SearchQuery;
    const total = Math.max(1, Math.min(500, q.quantity || 20));
    const cities = (q.cities?.length ? q.cities : ['']).map(c => c.trim()).filter(Boolean);
    const perCity = Math.ceil(total / Math.max(1, cities.length));
    const kw = (q.keywords || []).filter(Boolean).join(' ');
    console.log('[leads] gmaps niche=', q.niche, 'kw=', kw, 'cities=', cities, 'state=', q.state, 'total=', total);

    const allLeads: Lead[] = [];
    const seenPhones = new Set<string>();
    const seenPlace = new Set<string>();

    for (const city of cities) {
      const query = `${q.niche} ${kw} ${city} ${q.state}`.replace(/\s+/g, ' ').trim();
      console.log('[leads] query →', query);
      const places = await scrapeGmaps(query, perCity);
      console.log(`[leads] ${city}: ${places.length} places do Google Maps`);

      // Enriquecimento + validação em paralelo (rápido)
      const enriched = await Promise.all(places.map(async (p) => {
        if (p.placeId && seenPlace.has(p.placeId)) return null;
        if (p.placeId) seenPlace.add(p.placeId);

        let instagram: string | null = null;
        if (p.website) instagram = await fetchInstagramFromSite(p.website);

        const phone = p.phone || '';
        const verified = phone ? await verifyWhatsApp(phone) : false;

        const lead: Lead = {
          id: p.placeId || crypto.randomUUID(),
          name: p.name || '',
          address: p.address || `${city}, ${q.state}`,
          phone,
          whatsapp: phone || null,
          website: p.website || null,
          instagram,
          rating: p.rating || 0,
          reviewCount: p.reviewCount || 0,
          type: p.website ? 'cold' : 'hot',
          niche: q.niche,
          city,
          state: q.state,
          foundAt: new Date().toISOString(),
          category: p.category,
          placeId: p.placeId,
          mapsUrl: p.mapsUrl,
          phoneFromInstagram: false,
          adsStatus: 'unknown',
          whatsappVerified: verified,
          whatsappScore: verified ? 95 : (phone ? 30 : 0),
          phoneSource: phone ? 'gmaps' : 'unknown',
        };
        return lead;
      }));

      for (const l of enriched) {
        if (!l) continue;
        const key = l.whatsapp || l.phone;
        if (key && seenPhones.has(key)) continue;
        if (key) seenPhones.add(key);
        allLeads.push(l);
      }
      if (allLeads.length >= total) break;
    }

    const finalLeads = allLeads.slice(0, total);
    const verifiedCount = finalLeads.filter(l => l.whatsappVerified).length;
    console.log(`[leads] retornando ${finalLeads.length} (${verifiedCount} WhatsApp verificados)`);

    return new Response(JSON.stringify({ leads: finalLeads, total: finalLeads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[leads] erro', e);
    return new Response(JSON.stringify({ error: String(e), leads: [], total: 0 }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
