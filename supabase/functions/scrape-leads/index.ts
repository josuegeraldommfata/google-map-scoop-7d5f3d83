// Edge function: busca leads reais via OpenStreetMap (Overpass API) — sem API key
// Para cada empresa: enriquecimento profundo + validação ativa de WhatsApp

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

type PhoneSource = 'osm' | 'website' | 'instagram' | 'linktree' | 'unknown';

interface PhoneCandidate {
  number: string; // dígitos puros, formato BR sem 55 (10 ou 11 dígitos)
  source: PhoneSource;
  /** veio de um link wa.me explícito (alta confiança) */
  fromWaLink?: boolean;
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
  phoneFromInstagram?: boolean;
  adsStatus?: 'tubarao' | 'none' | 'unknown';
  whatsappVerified?: boolean;
  whatsappScore?: number;
  phoneSource?: PhoneSource;
}

// ===================== OSM helpers =====================

/** Retorna lista de filtros OSM (tag=valor) prováveis para o nicho. Pode ser vazia. */
function nicheToOsmFilters(niche: string): string[] {
  const n = niche.toLowerCase();
  const map: Record<string, string[]> = {
    'advogado': ['office=lawyer'], 'advocacia': ['office=lawyer'], 'advogados': ['office=lawyer'],
    'restaurante': ['amenity=restaurant'], 'restaurantes': ['amenity=restaurant'],
    'pizzaria': ['amenity=restaurant'], 'lanchonete': ['amenity=fast_food'],
    'cafe': ['amenity=cafe'], 'cafeteria': ['amenity=cafe'], 'bar': ['amenity=bar'],
    'padaria': ['shop=bakery'], 'mercado': ['shop=supermarket'],
    'farmacia': ['amenity=pharmacy'], 'farmácia': ['amenity=pharmacy'],
    'dentista': ['amenity=dentist'], 'medico': ['amenity=doctors'],
    'clinica': ['amenity=clinic'], 'clínica': ['amenity=clinic'],
    'hospital': ['amenity=hospital'],
    'hotel': ['tourism=hotel'], 'pousada': ['tourism=guest_house'],
    'academia': ['leisure=fitness_centre'],
    'salao': ['shop=hairdresser'], 'salão': ['shop=hairdresser'], 'barbearia': ['shop=hairdresser'],
    'estetica': ['shop=beauty'], 'estética': ['shop=beauty'],
    'pet': ['shop=pet'], 'petshop': ['shop=pet'],
    'oficina': ['shop=car_repair'], 'mecanica': ['shop=car_repair'], 'mecânica': ['shop=car_repair'],
    'imobiliaria': ['office=estate_agent'], 'imobiliária': ['office=estate_agent'],
    'contador': ['office=accountant'], 'contabilidade': ['office=accountant'],
    'arquiteto': ['office=architect'], 'engenheiro': ['office=engineer'],
    'escola': ['amenity=school'],
    'igreja': ['amenity=place_of_worship'], 'banco': ['amenity=bank'],
    'posto': ['amenity=fuel'],
    // prestadores de serviço / técnicos — OSM usa craft=* e shop=*
    'ar condicionado': ['craft=hvac', 'shop=appliance', 'craft=electrician'],
    'climatizacao': ['craft=hvac'], 'climatização': ['craft=hvac'], 'refrigeracao': ['craft=hvac'], 'refrigeração': ['craft=hvac'],
    'placa solar': ['craft=photovoltaic', 'craft=electrician'],
    'energia solar': ['craft=photovoltaic', 'craft=electrician'],
    'solar': ['craft=photovoltaic'],
    'eletricista': ['craft=electrician'],
    'encanador': ['craft=plumber'], 'hidraulica': ['craft=plumber'], 'hidráulica': ['craft=plumber'],
    'pedreiro': ['craft=builder'], 'construcao': ['craft=builder'], 'construção': ['craft=builder'],
    'pintor': ['craft=painter'], 'pintura': ['craft=painter'],
    'marceneiro': ['craft=carpenter'], 'marcenaria': ['craft=carpenter'],
    'serralheria': ['craft=metal_construction'], 'serralheiro': ['craft=metal_construction'],
    'vidraceiro': ['craft=glaziery'], 'vidracaria': ['craft=glaziery'],
    'jardineiro': ['craft=gardener'], 'paisagismo': ['craft=gardener'],
    'dedetizadora': ['craft=pest_control'], 'dedetizacao': ['craft=pest_control'], 'dedetização': ['craft=pest_control'],
    'chaveiro': ['craft=key_cutter', 'shop=locksmith'],
    'tapeceiro': ['craft=upholsterer'],
    'informatica': ['shop=computer'], 'informática': ['shop=computer'],
    'assistencia tecnica': ['shop=electronics', 'shop=mobile_phone'],
    'celular': ['shop=mobile_phone'],
    'borracharia': ['shop=tyres'], 'pneus': ['shop=tyres'],
    'auto eletrica': ['shop=car_repair'], 'funilaria': ['shop=car_repair'],
    'lavanderia': ['shop=laundry'],
    'otica': ['shop=optician'], 'ótica': ['shop=optician'],
    'loja': ['shop=*'],
  };
  for (const [key, val] of Object.entries(map)) {
    if (n.includes(key)) return val;
  }
  return [];
}

async function geocodeCity(city: string, state: string): Promise<{ bbox: [number, number, number, number] } | null> {
  const q = encodeURIComponent(`${city}, ${state}, Brazil`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'LeadsHunter/1.0 (scraper)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  const bb = data[0].boundingbox.map(Number);
  return { bbox: [bb[0], bb[2], bb[1], bb[3]] };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function overpassQuery(
  filters: string[],
  niche: string,
  keywords: string[],
  bbox: [number, number, number, number],
  limit: number,
) {
  const [s, w, n, e] = bbox;
  const parts: string[] = [];

  // 1) filtros tag=valor conhecidos
  for (const filter of filters) {
    const [k, v] = filter.split('=');
    const valQ = v === '*' ? '' : `="${v}"`;
    parts.push(`node["${k}"${valQ}](${s},${w},${n},${e});`);
    parts.push(`way["${k}"${valQ}](${s},${w},${n},${e});`);
  }

  // 2) fallback por regex em name — cobre nichos não mapeados (ex: "ar condicionado", "placa solar")
  const terms = [niche, ...keywords].filter(Boolean).map(t => t.trim()).filter(Boolean);
  if (terms.length) {
    const regex = terms.map(escapeRegex).join('|');
    // Busca em categorias onde prestadores costumam estar cadastrados
    const categories = ['shop', 'craft', 'office', 'amenity', 'trade', 'industrial'];
    for (const cat of categories) {
      parts.push(`node["${cat}"]["name"~"${regex}",i](${s},${w},${n},${e});`);
      parts.push(`way["${cat}"]["name"~"${regex}",i](${s},${w},${n},${e});`);
    }
    // Busca também por name puro (qualquer POI nomeado)
    parts.push(`node["name"~"${regex}",i](${s},${w},${n},${e});`);
    parts.push(`way["name"~"${regex}",i](${s},${w},${n},${e});`);
  }

  if (!parts.length) return [];

  const body = `[out:json][timeout:25];(${parts.join('')});out tags center ${limit};`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];
  const tryFetch = (url: string) => new Promise<any[]>(async (resolve, reject) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url + '?data=' + encodeURIComponent(body), {
        headers: { 'User-Agent': 'LeadsHunter/1.0', 'Accept': 'application/json' },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return reject(new Error(`status ${res.status}`));
      const data = await res.json();
      resolve(data.elements || []);
    } catch (e) { reject(e); }
  });
  try { return await Promise.any(endpoints.map(tryFetch)); } catch { return []; }
}

// ===================== Phone helpers =====================

/** Normaliza para formato BR: 10 ou 11 dígitos (DDD + número), sem 55. Retorna '' se inválido. */
function normalizeBR(raw: string): string {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return '';
  // DDD válido brasileiro (11..99, sem zero inicial)
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return '';
  return d;
}

function isMobileBR(d: string): boolean {
  return d.length === 11 && d[2] === '9';
}

/** Extrai TODOS os telefones BR de um texto (10 ou 11 dígitos). */
function extractAllPhonesBR(text: string): string[] {
  const re = /(?:\+?55[\s.\-]?)?\(?([1-9]{2})\)?[\s.\-]?(9?\d{4})[\s.\-]?(\d{4})/g;
  const out = new Set<string>();
  for (const m of text.matchAll(re)) {
    const full = `${m[1]}${m[2]}${m[3]}`.replace(/\D/g, '');
    if (full.length === 10 || full.length === 11) out.add(full);
  }
  return [...out];
}

/** Extrai todos os números que aparecem em links wa.me / api.whatsapp.com (alta confiança). */
function extractWaLinks(html: string): string[] {
  const re = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?\d{10,15})/gi;
  const out = new Set<string>();
  for (const m of html.matchAll(re)) {
    const norm = normalizeBR(m[1]);
    if (norm) out.add(norm);
  }
  return [...out];
}

// ===================== Validação ativa WhatsApp =====================
// Estratégia: bate em https://wa.me/55<num> e checa o HTML.
// Se número NÃO existe no WhatsApp, a página retorna texto contendo
// "Phone number shared via url is invalid" / "número de telefone compartilhado
// na URL é inválido". Caso contrário, mostra "Continue para o chat" / "use
// o WhatsApp" com o número formatado — sinal positivo.

const validationCache = new Map<string, boolean>();

async function verifyWhatsApp(numberBR: string): Promise<boolean> {
  if (!numberBR) return false;
  if (validationCache.has(numberBR)) return validationCache.get(numberBR)!;
  // Só vale tentar verificar celulares (números fixos quase nunca têm WA)
  if (!isMobileBR(numberBR)) {
    validationCache.set(numberBR, false);
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(`https://wa.me/55${numberBR}`, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      validationCache.set(numberBR, false);
      return false;
    }
    const html = (await res.text()).toLowerCase();
    const invalid =
      html.includes('phone number shared via url is invalid') ||
      html.includes('número de telefone compartilhado') ||
      html.includes('numero de telefone compartilhado') ||
      html.includes('telefone inválido') ||
      html.includes('telefone invalido');
    const positive =
      html.includes('continue to chat') ||
      html.includes('continuar para o chat') ||
      html.includes('use whatsapp') ||
      html.includes('usar o whatsapp') ||
      html.includes('open whatsapp') ||
      html.includes('abrir o whatsapp');
    const ok = !invalid && positive;
    validationCache.set(numberBR, ok);
    console.log(`[wa-verify] ${numberBR} → ${ok ? '✅' : '❌'}`);
    return ok;
  } catch (e) {
    console.log(`[wa-verify] ${numberBR} → erro: ${String(e)}`);
    validationCache.set(numberBR, false);
    return false;
  }
}

// ===================== Enriquecimento =====================

async function fetchHtml(url: string, timeout = 4000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
}

interface SiteEnrichment {
  instagram: string | null;
  candidates: PhoneCandidate[];
}

async function enrichFromWebsite(website: string): Promise<SiteEnrichment> {
  const base = website.replace(/\/$/, '');
  // Coleta home + páginas de contato comuns em PT-BR
  const paths = ['', '/contato', '/contact', '/fale-conosco', '/atendimento'];
  const htmls = await Promise.all(paths.map(p => fetchHtml(base + p)));
  const fullHtml = htmls.join('\n');
  if (!fullHtml.trim()) return { instagram: null, candidates: [] };

  const igMatch = fullHtml.match(/instagram\.com\/(?!p\/|reel|reels|explore|stories|accounts|about)([A-Za-z0-9_.]{2,30})/i);
  const instagram = igMatch ? `@${igMatch[1].replace(/\/$/, '')}` : null;

  const candidates: PhoneCandidate[] = [];
  for (const wa of extractWaLinks(fullHtml)) {
    candidates.push({ number: wa, source: 'website', fromWaLink: true });
  }
  for (const ph of extractAllPhonesBR(fullHtml)) {
    const norm = normalizeBR(ph);
    if (norm) candidates.push({ number: norm, source: 'website' });
  }
  return { instagram, candidates };
}

async function findInstagramViaSearch(name: string, city: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`site:instagram.com "${name}" ${city}`);
    const html = await fetchHtml(`https://duckduckgo.com/html/?q=${q}`);
    if (!html) return null;
    const re = /instagram\.com\/(?!p\/|reel|reels|explore|stories|accounts|about|directory)([A-Za-z0-9_.]{2,30})/gi;
    const m = [...html.matchAll(re)];
    if (!m.length) return null;
    return `@${m[0][1].replace(/\/$/, '')}`;
  } catch { return null; }
}

async function enrichFromInstagram(handle: string): Promise<PhoneCandidate[]> {
  const clean = handle.replace(/^@/, '').replace(/\/$/, '');
  const out: PhoneCandidate[] = [];
  const embedHtml = await fetchHtml(`https://www.instagram.com/${clean}/embed/`);
  const mainHtml = await fetchHtml(`https://www.instagram.com/${clean}/`);
  const bioHtml = embedHtml + ' ' + mainHtml;

  // wa.me na bio (alta confiança)
  for (const wa of extractWaLinks(bioHtml)) {
    out.push({ number: wa, source: 'instagram', fromWaLink: true });
  }
  // telefones brutos na bio
  for (const ph of extractAllPhonesBR(bioHtml)) {
    const norm = normalizeBR(ph);
    if (norm) out.push({ number: norm, source: 'instagram' });
  }

  // Linktree e similares
  const linkMatch = bioHtml.match(/https?:\/\/(?:linktr\.ee|beacons\.ai|lnk\.bio|bio\.link|hotm\.art|linklist\.bio)\/[A-Za-z0-9_.\-/]+/i);
  if (linkMatch) {
    const treeHtml = await fetchHtml(linkMatch[0], 5000);
    for (const wa of extractWaLinks(treeHtml)) {
      out.push({ number: wa, source: 'linktree', fromWaLink: true });
    }
    for (const ph of extractAllPhonesBR(treeHtml)) {
      const norm = normalizeBR(ph);
      if (norm) out.push({ number: norm, source: 'linktree' });
    }
  }
  return out;
}

// ===================== Ads Library =====================

async function checkAdsLibrary(name: string): Promise<'tubarao' | 'none' | 'unknown'> {
  try {
    const q = encodeURIComponent(name);
    const html = await fetchHtml(
      `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${q}&search_type=keyword_unordered`,
      5000,
    );
    if (!html) return 'unknown';
    if (/Nenhum resultado encontrado|No results found/i.test(html)) return 'none';
    if (/Biblioteca de an[úu]ncios|Ad Library/i.test(html) && new RegExp(name.split(' ')[0], 'i').test(html)) {
      return 'tubarao';
    }
    return 'none';
  } catch { return 'unknown'; }
}

// ===================== Score & escolha do melhor número =====================

function sourceWeight(s: PhoneSource): number {
  return ({ linktree: 30, instagram: 25, website: 20, osm: 10, unknown: 0 } as Record<PhoneSource, number>)[s];
}

interface BestPhone {
  number: string;
  source: PhoneSource;
  verified: boolean;
  score: number;
  fromInstagram: boolean;
}

async function pickBestPhone(candidates: PhoneCandidate[]): Promise<BestPhone | null> {
  if (!candidates.length) return null;
  // Dedup por número, mantendo melhor source + flag waLink
  const map = new Map<string, PhoneCandidate>();
  for (const c of candidates) {
    const prev = map.get(c.number);
    if (!prev) { map.set(c.number, c); continue; }
    const better = sourceWeight(c.source) > sourceWeight(prev.source);
    map.set(c.number, {
      number: c.number,
      source: better ? c.source : prev.source,
      fromWaLink: prev.fromWaLink || c.fromWaLink,
    });
  }
  const uniq = [...map.values()];

  // Prioriza celulares; verifica até 3 candidatos celulares mais promissores
  const mobiles = uniq.filter(c => isMobileBR(c.number))
    .sort((a, b) => {
      const aScore = (a.fromWaLink ? 50 : 0) + sourceWeight(a.source);
      const bScore = (b.fromWaLink ? 50 : 0) + sourceWeight(b.source);
      return bScore - aScore;
    });

  for (const c of mobiles.slice(0, 3)) {
    const verified = c.fromWaLink ? true : await verifyWhatsApp(c.number);
    if (verified) {
      return {
        number: c.number,
        source: c.source,
        verified: true,
        score: Math.min(100, 60 + sourceWeight(c.source) + (c.fromWaLink ? 15 : 0)),
        fromInstagram: c.source === 'instagram' || c.source === 'linktree',
      };
    }
  }

  // Sem verificação positiva — devolve melhor celular se houver
  if (mobiles.length) {
    const c = mobiles[0];
    return {
      number: c.number,
      source: c.source,
      verified: false,
      score: Math.min(55, 25 + sourceWeight(c.source) + (c.fromWaLink ? 10 : 0)),
      fromInstagram: c.source === 'instagram' || c.source === 'linktree',
    };
  }

  // Só sobrou fixo
  const fix = uniq[0];
  return {
    number: fix.number,
    source: fix.source,
    verified: false,
    score: 5,
    fromInstagram: false,
  };
}

// ===================== Handler =====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const query = (await req.json()) as SearchQuery;
    const total = Math.max(1, Math.min(500, query.quantity || 20));
    const perCity = Math.ceil(total / Math.max(1, query.cities.length));
    const filters = nicheToOsmFilters(query.niche);
    console.log('[leads] niche=', query.niche, 'filters=', filters, 'keywords=', query.keywords, 'cities=', query.cities);

    const allLeads: Lead[] = [];
    const seenPhones = new Set<string>(); // dedup global por telefone
    const seenIds = new Set<string>(); // dedup por id OSM (regex pode duplicar entre categorias)

    for (const city of query.cities) {
      const geo = await geocodeCity(city.trim(), query.state);
      if (!geo) { console.log('[leads] cidade nao encontrada:', city); continue; }
      const elements = await overpassQuery(filters, query.niche, query.keywords || [], geo.bbox, perCity * 3);
      console.log(`[leads] ${city}: ${elements.length} elementos OSM`);

      const unique = elements.filter((el: any) => {
        if (!el.tags?.name) return false;
        const k = `${el.type}-${el.id}`;
        if (seenIds.has(k)) return false;
        seenIds.add(k);
        return true;
      });
      const candidates = unique.slice(0, perCity);

      const enriched = await Promise.all(candidates.map(async (el: any) => {
        const tags = el.tags;
        const website: string | null = tags.website || tags['contact:website'] || tags.url || null;
        const websiteUrl = website ? (website.startsWith('http') ? website : `https://${website}`) : null;

        // === Coleta de candidatos de telefone ===
        const phoneCandidates: PhoneCandidate[] = [];
        const osmPhone = normalizeBR(tags.phone || tags['contact:phone'] || '');
        if (osmPhone) phoneCandidates.push({ number: osmPhone, source: 'osm' });
        const osmWa = normalizeBR(tags['contact:whatsapp'] || '');
        if (osmWa) phoneCandidates.push({ number: osmWa, source: 'osm', fromWaLink: true });

        let instagram: string | null = tags['contact:instagram']
          ? `@${tags['contact:instagram'].replace(/.*instagram\.com\//, '').replace(/\/$/, '')}`
          : null;

        if (websiteUrl) {
          const site = await enrichFromWebsite(websiteUrl);
          if (!instagram) instagram = site.instagram;
          phoneCandidates.push(...site.candidates);
        }

        if (!instagram) {
          instagram = await findInstagramViaSearch(tags.name, city);
        }

        if (instagram) {
          const igCandidates = await enrichFromInstagram(instagram);
          phoneCandidates.push(...igCandidates);
        }

        const best = await pickBestPhone(phoneCandidates);

        // Ads Library só pra leads "interessantes" (com telefone celular ou site)
        const interesting = !!(best && isMobileBR(best.number)) || !!websiteUrl;
        const adsStatus = interesting ? await checkAdsLibrary(tags.name) : 'unknown';

        const addressParts = [
          tags['addr:street'], tags['addr:housenumber'],
          tags['addr:suburb'] || tags['addr:neighbourhood'],
          city, query.state,
        ].filter(Boolean);

        const lead: Lead = {
          id: `${el.type}-${el.id}`,
          name: tags.name,
          address: addressParts.join(', ') || `${city}, ${query.state}`,
          phone: best?.number || osmPhone || '',
          whatsapp: best?.number || null,
          website: websiteUrl,
          instagram,
          rating: 0,
          reviewCount: 0,
          type: websiteUrl ? 'cold' : 'hot',
          niche: query.niche,
          city,
          state: query.state,
          foundAt: new Date().toISOString(),
          phoneFromInstagram: best?.fromInstagram || false,
          adsStatus,
          whatsappVerified: best?.verified || false,
          whatsappScore: best?.score ?? 0,
          phoneSource: best?.source || 'unknown',
        };
        return lead;
      }));

      // Dedup por telefone normalizado entre cidades
      for (const l of enriched) {
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
