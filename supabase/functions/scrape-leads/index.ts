// Edge function: scraping REAL do Google Maps (sem API key, sem navegador).
// Estratégia: GET /maps/search → extrai URL canônica → pagina &start=N → parse JSON.
// MELHORIAS desta versão:
//  - Bairros REAIS das maiores cidades BR (não só "zona sul")
//  - Sub-áreas para advocacia (trabalhista, criminal, civil, família, tributário...)
//  - Extração de email + Instagram do site oficial
//  - Retry em falhas de fetch
//  - Dedup por placeId + telefone + nome normalizado

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
  email?: string | null;
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

function normalizeName(n: string): string {
  return (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

// ============ Sinônimos + sub-áreas ============
const NICHE_VARIATIONS: Record<string, string[]> = {
  'dentista': ['dentista', 'consultório odontológico', 'clínica odontológica', 'odontologia', 'implantodontia', 'ortodontia'],
  'advogado': [
    'advogado', 'escritório de advocacia', 'advocacia',
    'advogado trabalhista', 'advogado criminalista', 'advogado civil',
    'advogado de família', 'advogado tributarista', 'advogado previdenciário',
    'advogado empresarial', 'advogado imobiliário', 'sociedade de advogados',
  ],
  'medico': ['médico', 'clínica médica', 'consultório médico'],
  'clinica medica': ['clínica médica', 'consultório médico', 'centro médico'],
  'restaurante': ['restaurante', 'rotisseria', 'bistrô'],
  'academia': ['academia', 'studio de musculação', 'crossfit', 'box de crossfit'],
  'salao de beleza': ['salão de beleza', 'cabeleireiro', 'studio de beleza'],
  'barbearia': ['barbearia', 'barber shop'],
  'estetica': ['clínica de estética', 'estética avançada', 'centro estético', 'harmonização facial'],
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
  return n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function nicheVariations(niche: string): string[] {
  const key = normalizeNiche(niche);
  if (NICHE_VARIATIONS[key]) return NICHE_VARIATIONS[key];
  for (const k of Object.keys(NICHE_VARIATIONS)) {
    if (key.includes(k) || k.includes(key)) return NICHE_VARIATIONS[k];
  }
  return [niche];
}

// ============ Bairros REAIS das grandes cidades ============
const NEIGHBORHOODS: Record<string, string[]> = {
  'sao paulo': [
    'centro', 'paulista', 'pinheiros', 'vila madalena', 'itaim bibi', 'moema', 'jardins',
    'vila olimpia', 'brooklin', 'morumbi', 'tatuape', 'mooca', 'santana', 'lapa',
    'butantã', 'campo belo', 'vila mariana', 'liberdade', 'bela vista', 'perdizes',
    'higienopolis', 'ipiranga', 'penha', 'santo amaro',
  ],
  'rio de janeiro': [
    'centro', 'copacabana', 'ipanema', 'leblon', 'barra da tijuca', 'botafogo', 'flamengo',
    'tijuca', 'recreio', 'jacarepagua', 'meier', 'campo grande', 'madureira', 'sao cristovao',
    'icarai', 'lagoa', 'gloria', 'lapa',
  ],
  'belo horizonte': [
    'centro', 'savassi', 'lourdes', 'funcionarios', 'buritis', 'pampulha', 'barreiro',
    'venda nova', 'cidade nova', 'castelo', 'belvedere', 'sion', 'anchieta', 'cruzeiro',
  ],
  'brasilia': ['asa sul', 'asa norte', 'lago sul', 'lago norte', 'sudoeste', 'taguatinga', 'aguas claras', 'ceilandia', 'gama', 'guara'],
  'curitiba': ['centro', 'batel', 'agua verde', 'bigorrilho', 'cabral', 'ahu', 'portao', 'boqueirao', 'cic', 'sitio cercado'],
  'porto alegre': ['centro', 'moinhos de vento', 'bela vista', 'petropolis', 'menino deus', 'cidade baixa', 'cristal', 'partenon'],
  'salvador': ['centro', 'barra', 'pituba', 'itaigara', 'caminho das arvores', 'graça', 'rio vermelho', 'cabula', 'piata'],
  'fortaleza': ['centro', 'aldeota', 'meireles', 'cocó', 'papicu', 'fátima', 'parquelandia', 'messejana'],
  'recife': ['centro', 'boa viagem', 'pina', 'casa forte', 'aflitos', 'derby', 'graças', 'jaqueira', 'imbiribeira'],
};

const GENERIC_ZONES = [
  '', 'centro', 'zona sul', 'zona norte', 'zona leste', 'zona oeste', 'região metropolitana',
];

function zonesFor(city: string, count: number): string[] {
  const key = normalizeNiche(city);
  const hoods = NEIGHBORHOODS[key];
  if (hoods && hoods.length) {
    return ['', ...hoods].slice(0, count);
  }
  return GENERIC_ZONES.slice(0, Math.min(count, GENERIC_ZONES.length));
}

// ============ Fetch com retry ============
async function fetchWithRetry(url: string, opts: RequestInit, timeoutMs = 15000, retries = 1): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) continue;
      return res;
    } catch { /* retry */ }
  }
  return null;
}

// ============ Google Maps ============
async function getSearchUrl(query: string): Promise<string | null> {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=pt-BR&gl=br`;
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, 15000, 2);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const m = html.match(/href="(\/search\?tbm=map[^"]+)"/);
  if (!m) return null;
  return 'https://www.google.com' + m[1].replace(/&amp;/g, '&');
}

async function fetchPage(searchUrl: string, start: number): Promise<any[]> {
  const url = start === 0 ? searchUrl : `${searchUrl}&start=${start}`;
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
  }, 20000, 1);
  if (!res || !res.ok) return [];
  let raw = await res.text();
  if (raw.startsWith(")]}'")) raw = raw.slice(4).trim(); else return [];
  try {
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

// ============ WhatsApp ============
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

// ============ Enrich do site (Instagram + Email + Telefone) ============
async function enrichFromSite(website: string): Promise<{ instagram: string | null; email: string | null; phone: string | null }> {
  const empty = { instagram: null, email: null, phone: null };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(website, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return empty;
    const html = await res.text();

    const ig = html.match(/instagram\.com\/(?!p\/|reel|reels|explore|stories|accounts|about)([A-Za-z0-9_.]{2,30})/i);
    const instagram = ig ? `@${ig[1].replace(/\/$/, '')}` : null;

    // Email — ignora imagens e domínios genéricos de exemplo
    const emails = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    const email = emails.find(e =>
      !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e) &&
      !/example\.|sentry\.|wixpress|godaddy|cloudflare/i.test(e)
    ) || null;

    // Telefone do site (fallback)
    const phoneMatch = html.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}/);
    const phone = phoneMatch ? normalizeBR(phoneMatch[0]) : null;

    return { instagram, email, phone: phone || null };
  } catch { return empty; }
}

// ============ Handler ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const q = (await req.json()) as SearchQuery;
    const total = Math.max(1, Math.min(500, q.quantity || 20));
    const cities = (q.cities?.length ? q.cities : ['']).map(c => c.trim()).filter(Boolean);
    const kw = (q.keywords || []).filter(Boolean).join(' ');
    const variations = nicheVariations(q.niche);

    const zoneCount =
      total <= 50 ? 2 :
      total <= 100 ? 4 :
      total <= 200 ? 7 :
      total <= 350 ? 10 : 14;

    // Limita variações de nicho para evitar explosão de combos × CPU
    const maxVariations = total <= 100 ? 3 : total <= 250 ? 5 : 7;
    const usedVariations = variations.slice(0, maxVariations);

    console.log('[leads] niche=', q.niche, 'variations=', usedVariations.length, 'cities=', cities.length, 'zoneCount=', zoneCount, 'total=', total);

    const seenPlace = new Set<string>();
    const seenPhones = new Set<string>();
    const seenNames = new Set<string>();
    const allPlaces: Array<Partial<Lead> & { _city: string }> = [];

    const combos: Array<{ city: string; query: string }> = [];
    for (const city of cities) {
      const zones = zonesFor(city, zoneCount);
      for (const variation of usedVariations) {
        for (const zone of zones) {
          const query = `${variation} ${kw} ${zone} ${city} ${q.state}`.replace(/\s+/g, ' ').trim();
          combos.push({ city, query });
        }
      }
    }

    const perCombo = Math.max(20, Math.ceil((total * 2) / Math.max(1, combos.length)));
    const maxPagesPerCombo =
      combos.length > 60 ? 2 :
      combos.length > 30 ? 3 :
      combos.length > 15 ? 5 : 8;

    console.log(`[leads] ${combos.length} combos, ${perCombo}/combo, ${maxPagesPerCombo} páginas/combo`);

    const BATCH = 10;
    for (let i = 0; i < combos.length; i += BATCH) {
      const batch = combos.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(c => scrapeGmaps(c.query, perCombo, maxPagesPerCombo).then(places => ({ ...c, places })))
      );
      for (const { city, places } of results) {
        for (const p of places) {
          if (!p.placeId || seenPlace.has(p.placeId)) continue;
          const nk = normalizeName(p.name || '');
          if (nk && seenNames.has(nk + '|' + city)) continue;
          seenPlace.add(p.placeId);
          if (nk) seenNames.add(nk + '|' + city);
          allPlaces.push({ ...p, _city: city });
        }
      }
      if (allPlaces.length >= total * 1.2) {
        console.log(`[leads] early-stop: ${allPlaces.length} places`);
        break;
      }
    }

    console.log(`[leads] ${allPlaces.length} places únicos de ${combos.length} buscas`);

    const finalTargetPlaces = allPlaces.slice(0, total);

    // Enriquecimento de site + verificação de WhatsApp são as partes mais caras da função.
    // Para buscas grandes, prioriza entregar volume de leads sem estourar CPU do worker.
    const enrichLimit =
      total <= 50 ? finalTargetPlaces.length :
      total <= 120 ? Math.min(60, finalTargetPlaces.length) :
      total <= 250 ? Math.min(35, finalTargetPlaces.length) : 20;

    const verifyLimit =
      total <= 50 ? finalTargetPlaces.length :
      total <= 120 ? Math.min(40, finalTargetPlaces.length) :
      total <= 250 ? Math.min(20, finalTargetPlaces.length) : 10;

    const enrichIndexes = new Set<number>();
    for (let i = 0; i < finalTargetPlaces.length && enrichIndexes.size < enrichLimit; i++) {
      if (finalTargetPlaces[i].website) enrichIndexes.add(i);
    }

    // Enriquecimento paralelo em lotes (CPU-bound — manter pequeno)
    const enriched: Lead[] = [];
    const ENRICH_BATCH = total <= 120 ? 6 : 4;
    for (let i = 0; i < finalTargetPlaces.length; i += ENRICH_BATCH) {
      const slice = finalTargetPlaces.slice(i, i + ENRICH_BATCH);
      const out = await Promise.all(slice.map(async (p, offset) => {
        const absoluteIndex = i + offset;
        let instagram: string | null = null;
        let email: string | null = null;
        let phone = p.phone || '';
        let phoneSource: Lead['phoneSource'] = phone ? 'gmaps' : 'unknown';
        if (p.website && enrichIndexes.has(absoluteIndex)) {
          const site = await enrichFromSite(p.website);
          instagram = site.instagram;
          email = site.email;
          if (!phone && site.phone) { phone = site.phone; phoneSource = 'website'; }
        }
        const verified = phone && absoluteIndex < verifyLimit ? await verifyWhatsApp(phone) : false;
        const lead: Lead = {
          id: p.placeId || crypto.randomUUID(),
          name: p.name || '',
          address: p.address || `${p._city}, ${q.state}`,
          phone, whatsapp: phone || null,
          website: p.website || null,
          instagram, email,
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
          phoneSource,
        };
        return lead;
      }));
      enriched.push(...out);
      if (enriched.length >= total) break;
    }

    const finalLeads: Lead[] = [];
    for (const l of enriched) {
      const key = l.whatsapp || l.phone;
      if (key && seenPhones.has(key)) continue;
      if (key) seenPhones.add(key);
      finalLeads.push(l);
      if (finalLeads.length >= total) break;
    }

    const verifiedCount = finalLeads.filter(l => l.whatsappVerified).length;
    const withEmail = finalLeads.filter(l => l.email).length;
    console.log(`[leads] retornando ${finalLeads.length} (${verifiedCount} WA verificados, ${withEmail} c/ email)`);

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
