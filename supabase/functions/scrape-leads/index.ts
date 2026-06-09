// Edge function: scraping REAL do Google Maps (sem API key, sem navegador).
// Estratégia em 2 passos (HTTP puro):
//   1) GET /maps/search/{query} → extrai URL canônica com pb=
//   2) GET dessa URL (paginando com &start=N) → JSON prefixado por )]}'
//   3) Resultados em data[64]; cada place é um array com offsets conhecidos
// MELHORIA: expande nicho em variações (sinônimos) e roda em paralelo p/ trazer MUITO mais leads.

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

// Sinônimos/variações por nicho (PT-BR). Bate o nicho normalizado contra chaves.
const NICHE_VARIATIONS: Record<string, string[]> = {
  'dentista': ['dentista', 'consultório odontológico', 'clínica odontológica', 'odontologia'],
  'advogado': ['advogado', 'escritório de advocacia', 'advocacia'],
  'medico': ['médico', 'clínica médica', 'consultório médico'],
  'clinica medica': ['clínica médica', 'consultório médico', 'centro médico'],
  'restaurante': ['restaurante', 'rotisseria', 'bistrô'],
  'academia': ['academia', 'studio de musculação', 'crossfit'],
  'salao de beleza': ['salão de beleza', 'cabeleireiro', 'studio de beleza'],
  'barbearia': ['barbearia', 'barber shop'],
  'estetica': ['clínica de estética', 'estética avançada', 'centro estético'],
  'imobiliaria': ['imobiliária', 'corretor de imóveis'],
  'contabilidade': ['contabilidade', 'escritório contábil', 'contador'],
  'pet shop': ['pet shop', 'pet center', 'clínica veterinária'],
  'mecanica': ['mecânica', 'oficina mecânica', 'auto center'],
  'ar condicionado': ['ar condicionado', 'instalação de ar condicionado', 'manutenção ar condicionado', 'refrigeração'],
  'placa solar': ['energia solar', 'placa solar', 'painel solar', 'energia fotovoltaica'],
  'energia solar': ['energia solar', 'painel solar', 'energia fotovoltaica', 'instalação solar'],
  'eletricista': ['eletricista', 'serviços elétricos', 'instalação elétrica'],
  'encanador': ['encanador', 'serviços hidráulicos', 'desentupidora'],
  'pedreiro': ['pedreiro', 'construção civil', 'reforma e construção'],
  'pintor': ['pintor', 'pintura residencial', 'serviços de pintura'],
  'marceneiro': ['marceneiro', 'marcenaria', 'móveis planejados'],
  'arquiteto': ['arquiteto', 'escritório de arquitetura'],
  'psicologo': ['psicólogo', 'consultório de psicologia', 'clínica de psicologia'],
  'nutricionista': ['nutricionista', 'consultório de nutrição'],
  'fisioterapeuta': ['fisioterapeuta', 'clínica de fisioterapia'],
};

function normalizeNiche(n: string): string {
  return n.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function nicheVariations(niche: string): string[] {
  const key = normalizeNiche(niche);
  if (NICHE_VARIATIONS[key]) return NICHE_VARIATIONS[key];
  // fuzzy: chave contém ou está contida
  for (const k of Object.keys(NICHE_VARIATIONS)) {
    if (key.includes(k) || k.includes(key)) return NICHE_VARIATIONS[k];
  }
  return [niche];
}

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
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    let raw = await res.text();
    if (raw.startsWith(")]}'")) raw = raw.slice(4).trim();
    else return [];
    const data = JSON.parse(raw);
    const arr = data[64];
    if (!Array.isArray(arr)) return [];
    return arr.map((e: any) => Array.isArray(e) && e[1] ? e[1] : null).filter(Boolean);
  } catch { return []; }
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
  const phoneLocal: string =
    safe(r, 178, 0, 3) || safe(r, 178, 0, 1, 0, 0) || safe(r, 178, 0, 0) || '';
  const phoneIntl: string = safe(r, 178, 0, 1, 1, 0) || '';
  const phone = normalizeBR(phoneIntl || phoneLocal);

  return {
    placeId, name, address, category,
    website: website || null,
    rating: typeof rating === 'number' ? rating : 0,
    reviewCount: typeof reviewCount === 'number' ? reviewCount : 0,
    phone,
    mapsUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : `https://www.google.com/maps/?cid=${safe(r, 10) || ''}`,
  };
}

async function scrapeGmaps(query: string, limit: number, maxPages = 8): Promise<Partial<Lead>[]> {
  const searchUrl = await getSearchUrl(query);
  if (!searchUrl) return [];
  const out: Partial<Lead>[] = [];
  const seen = new Set<string>();

  const firstPage = await fetchPage(searchUrl, 0);
  for (const r of firstPage) {
    const p = extractPlace(r);
    if (p?.placeId && !seen.has(p.placeId)) { seen.add(p.placeId); out.push(p); }
  }
  if (out.length >= limit) return out.slice(0, limit);

  const starts: number[] = [];
  const pages = Math.min(maxPages, Math.ceil((limit - out.length) / 20) + 1);
  for (let i = 1; i <= pages; i++) starts.push(i * 20);
  const batches = await Promise.all(starts.map(s => fetchPage(searchUrl, s)));
  for (const page of batches) {
    for (const r of page) {
      const p = extractPlace(r);
      if (p?.placeId && !seen.has(p.placeId)) { seen.add(p.placeId); out.push(p); }
    }
  }
  return out.slice(0, limit);
}

// ===================== WhatsApp verification =====================

const waCache = new Map<string, boolean>();

async function verifyWhatsApp(numberBR: string): Promise<boolean> {
  if (!numberBR || !isMobileBR(numberBR)) return false;
  if (waCache.has(numberBR)) return waCache.get(numberBR)!;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://wa.me/55${numberBR}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
      redirect: 'follow', signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) { waCache.set(numberBR, false); return false; }
    const html = (await res.text()).toLowerCase();
    const invalid = html.includes('phone number shared via url is invalid')
      || (html.includes('número de telefone') && html.includes('inválido'));
    const positive = html.includes('continue to chat') || html.includes('continuar para o chat')
      || html.includes('use whatsapp') || html.includes('usar o whatsapp');
    const ok = !invalid && positive;
    waCache.set(numberBR, ok);
    return ok;
  } catch { waCache.set(numberBR, false); return false; }
}

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
    const kw = (q.keywords || []).filter(Boolean).join(' ');
    const variations = nicheVariations(q.niche);
    console.log('[leads] niche=', q.niche, 'variations=', variations, 'cities=', cities, 'total=', total);

    const seenPlace = new Set<string>();
    const seenPhones = new Set<string>();
    const allPlaces: Array<Partial<Lead> & { _city: string }> = [];

    // Roda TODAS as combinações (variação × cidade) em paralelo
    const combos: Array<{ variation: string; city: string; query: string }> = [];
    for (const city of cities) {
      for (const variation of variations) {
        const query = `${variation} ${kw} ${city} ${q.state}`.replace(/\s+/g, ' ').trim();
        combos.push({ variation, city, query });
      }
    }

    // Limita páginas por combo conforme número de combos pra não estourar tempo
    const perCombo = Math.max(20, Math.ceil((total * 1.5) / combos.length));
    const maxPagesPerCombo = combos.length > 8 ? 4 : combos.length > 4 ? 6 : 10;

    const results = await Promise.all(
      combos.map(c => scrapeGmaps(c.query, perCombo, maxPagesPerCombo).then(places => ({ ...c, places })))
    );

    for (const { city, places } of results) {
      for (const p of places) {
        if (!p.placeId || seenPlace.has(p.placeId)) continue;
        seenPlace.add(p.placeId);
        allPlaces.push({ ...p, _city: city });
      }
    }

    console.log(`[leads] ${allPlaces.length} places únicos coletados de ${combos.length} buscas`);

    // Trunca antes de enriquecer (custoso) — pega 20% extra pra compensar duplicatas de phone
    const toEnrich = allPlaces.slice(0, Math.ceil(total * 1.2));

    const enriched = await Promise.all(toEnrich.map(async (p) => {
      let instagram: string | null = null;
      if (p.website) instagram = await fetchInstagramFromSite(p.website);
      const phone = p.phone || '';
      const verified = phone ? await verifyWhatsApp(phone) : false;
      const lead: Lead = {
        id: p.placeId || crypto.randomUUID(),
        name: p.name || '',
        address: p.address || `${p._city}, ${q.state}`,
        phone, whatsapp: phone || null,
        website: p.website || null,
        instagram,
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        type: p.website ? 'cold' : 'hot',
        niche: q.niche,
        city: p._city, state: q.state,
        foundAt: new Date().toISOString(),
        category: p.category, placeId: p.placeId, mapsUrl: p.mapsUrl,
        phoneFromInstagram: false, adsStatus: 'unknown',
        whatsappVerified: verified,
        whatsappScore: verified ? 95 : (phone ? 30 : 0),
        phoneSource: phone ? 'gmaps' : 'unknown',
      };
      return lead;
    }));

    const finalLeads: Lead[] = [];
    for (const l of enriched) {
      const key = l.whatsapp || l.phone;
      if (key && seenPhones.has(key)) continue;
      if (key) seenPhones.add(key);
      finalLeads.push(l);
      if (finalLeads.length >= total) break;
    }

    const verifiedCount = finalLeads.filter(l => l.whatsappVerified).length;
    console.log(`[leads] retornando ${finalLeads.length} (${verifiedCount} WhatsApp verificados)`);

    return new Response(JSON.stringify({ leads: finalLeads, total: finalLeads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[leads] erro', e);
    return new Response(JSON.stringify({ error: String(e), leads: [], total: 0 }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
