// Edge function: busca leads reais via OpenStreetMap (Overpass API) — sem API key
// Para cada empresa encontrada, tenta extrair Instagram/WhatsApp do site (se houver)

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
  phoneFromInstagram?: boolean;
  adsStatus?: 'tubarao' | 'none' | 'unknown';
}

// Mapeia nicho em PT para tags do OSM
function nicheToOsmFilter(niche: string): string {
  const n = niche.toLowerCase();
  const map: Record<string, string> = {
    'advogado': 'office=lawyer',
    'advocacia': 'office=lawyer',
    'advogados': 'office=lawyer',
    'restaurante': 'amenity=restaurant',
    'restaurantes': 'amenity=restaurant',
    'pizzaria': 'amenity=restaurant',
    'lanchonete': 'amenity=fast_food',
    'cafe': 'amenity=cafe',
    'cafeteria': 'amenity=cafe',
    'bar': 'amenity=bar',
    'padaria': 'shop=bakery',
    'mercado': 'shop=supermarket',
    'farmacia': 'amenity=pharmacy',
    'farmácia': 'amenity=pharmacy',
    'dentista': 'amenity=dentist',
    'medico': 'amenity=doctors',
    'clinica': 'amenity=clinic',
    'clínica': 'amenity=clinic',
    'hospital': 'amenity=hospital',
    'hotel': 'tourism=hotel',
    'pousada': 'tourism=guest_house',
    'academia': 'leisure=fitness_centre',
    'salao': 'shop=hairdresser',
    'salão': 'shop=hairdresser',
    'barbearia': 'shop=hairdresser',
    'estetica': 'shop=beauty',
    'estética': 'shop=beauty',
    'pet': 'shop=pet',
    'petshop': 'shop=pet',
    'oficina': 'shop=car_repair',
    'mecanica': 'shop=car_repair',
    'mecânica': 'shop=car_repair',
    'imobiliaria': 'office=estate_agent',
    'imobiliária': 'office=estate_agent',
    'contador': 'office=accountant',
    'contabilidade': 'office=accountant',
    'arquiteto': 'office=architect',
    'engenheiro': 'office=engineer',
    'loja': 'shop=*',
    'escola': 'amenity=school',
    'igreja': 'amenity=place_of_worship',
    'banco': 'amenity=bank',
    'posto': 'amenity=fuel',
  };
  for (const [key, val] of Object.entries(map)) {
    if (n.includes(key)) return val;
  }
  // fallback: busca em qualquer "name" que case
  return '';
}

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lon: number; bbox: [number, number, number, number] } | null> {
  const q = encodeURIComponent(`${city}, ${state}, Brazil`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LeadsHunter/1.0 (scraper)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  const item = data[0];
  const bb = item.boundingbox.map(Number); // [south, north, west, east]
  return {
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    bbox: [bb[0], bb[2], bb[1], bb[3]], // [south, west, north, east]
  };
}

async function overpassQuery(filter: string, niche: string, bbox: [number, number, number, number], limit: number) {
  const [s, w, n, e] = bbox;
  let body: string;
  if (filter) {
    const [k, v] = filter.split('=');
    const valQ = v === '*' ? '' : `="${v}"`;
    body = `
[out:json][timeout:15];
(
  node["${k}"${valQ}](${s},${w},${n},${e});
  way["${k}"${valQ}](${s},${w},${n},${e});
);
out tags center ${limit};
`;
  } else {
    body = `
[out:json][timeout:15];
(
  node["name"~"${niche}",i](${s},${w},${n},${e});
  way["name"~"${niche}",i](${s},${w},${n},${e});
);
out tags center ${limit};
`;
  }
  // Race em paralelo entre múltiplos mirrors do Overpass
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];
  const tryFetch = (url: string) =>
    new Promise<any[]>(async (resolve, reject) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url + '?data=' + encodeURIComponent(body), {
          method: 'GET',
          headers: { 'User-Agent': 'LeadsHunter/1.0', 'Accept': 'application/json' },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok) {
          console.error('[overpass]', url, 'status', res.status);
          return reject(new Error(`status ${res.status}`));
        }
        const data = await res.json();
        const els = data.elements || [];
        console.log('[overpass]', url, 'returned', els.length);
        resolve(els);
      } catch (e) {
        console.error('[overpass]', url, 'err', String(e));
        reject(e);
      }
    });

  try {
    return await Promise.any(endpoints.map(tryFetch));
  } catch {
    return [];
  }
}

async function enrichFromWebsite(website: string): Promise<{ instagram: string | null; whatsapp: string | null }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadsHunter/1.0)' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { instagram: null, whatsapp: null };
    const html = await res.text();
    const ig = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
    const wa = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([0-9+]+)/i);
    return {
      instagram: ig ? `@${ig[1].replace(/\/$/, '')}` : null,
      whatsapp: wa ? wa[1].replace(/\D/g, '') : null,
    };
  } catch {
    return { instagram: null, whatsapp: null };
  }
}

// Fallback: tenta achar Instagram via busca pública (DuckDuckGo HTML — sem API key)
async function findInstagramViaSearch(name: string, city: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`site:instagram.com "${name}" ${city}`);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://duckduckgo.com/html/?q=${q}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadsHunter/1.0)' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    // Pega o primeiro handle válido (evita explore/p/reels/stories etc)
    const re = /instagram\.com\/(?!p\/|reel|reels|explore|stories|accounts|about|directory)([A-Za-z0-9_.]{2,30})/gi;
    const matches = [...html.matchAll(re)];
    if (!matches.length) return null;
    const handle = matches[0][1].replace(/\/$/, '');
    return `@${handle}`;
  } catch {
    return null;
  }
}

function normalizePhone(p?: string): string {
  if (!p) return '';
  return p.replace(/[^\d+]/g, '');
}

// Considera celular BR válido (11 dígitos, 9 após DDD)
function isMobileBR(p: string): boolean {
  let d = p.replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  return d.length === 11 && d[2] === '9';
}

// Tenta extrair telefone de uma string (formato BR)
function extractPhoneBR(text: string): string | null {
  // (11) 99999-9999 | 11999999999 | +55 11 99999-9999
  const re = /(?:\+?55[\s.-]?)?\(?([1-9]{2})\)?[\s.-]?(9?\d{4})[\s.-]?(\d{4})/g;
  const matches = [...text.matchAll(re)];
  for (const m of matches) {
    const ddd = m[1];
    const part1 = m[2];
    const part2 = m[3];
    const full = `${ddd}${part1}${part2}`.replace(/\D/g, '');
    if (full.length === 11 && full[2] === '9') return full;
  }
  return null;
}

/**
 * Instagram Discovery — tenta:
 * 1) ig embed público (https://www.instagram.com/{handle}/embed) → menos bloqueado
 * 2) se a bio tiver linktr.ee/beacons.ai/lnk.bio → segue e raspa
 * Retorna o telefone celular encontrado, se houver.
 */
async function enrichFromInstagram(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, '').replace(/\/$/, '');
  const tryFetch = async (url: string, timeout = 4000): Promise<string> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return '';
      return await res.text();
    } catch {
      clearTimeout(t);
      return '';
    }
  };

  // 1) embed do IG
  const embedHtml = await tryFetch(`https://www.instagram.com/${clean}/embed/`);
  let phone = embedHtml ? extractPhoneBR(embedHtml) : null;
  let bioHtml = embedHtml;

  // 2) tenta página principal se embed nao trouxe nada
  if (!phone) {
    const mainHtml = await tryFetch(`https://www.instagram.com/${clean}/`);
    if (mainHtml) {
      bioHtml = bioHtml + ' ' + mainHtml;
      phone = extractPhoneBR(mainHtml);
    }
  }

  // 3) procura link de árvore de links na bio e raspa ele
  if (!phone && bioHtml) {
    const linkMatch = bioHtml.match(/https?:\/\/(?:linktr\.ee|beacons\.ai|lnk\.bio|bio\.link|hotm\.art|linklist\.bio)\/[A-Za-z0-9_.\-/]+/i);
    if (linkMatch) {
      const treeHtml = await tryFetch(linkMatch[0], 5000);
      if (treeHtml) {
        // procura wa.me primeiro, é o mais confiável
        const wa = treeHtml.match(/wa\.me\/(?:55)?(\d{10,13})/i);
        if (wa) {
          const num = wa[1].replace(/^55/, '');
          if (num.length === 11 && num[2] === '9') phone = num;
        }
        if (!phone) phone = extractPhoneBR(treeHtml);
      }
    }
  }

  if (phone) console.log(`[ig-discovery] @${clean} → telefone encontrado: ${phone}`);
  else console.log(`[ig-discovery] @${clean} → nada`);
  return phone;
}

/**
 * Checa Meta Ads Library — busca por nome da empresa.
 * Endpoint público (não-API): retorna HTML que indica se há anúncios ativos.
 */
async function checkAdsLibrary(name: string): Promise<'tubarao' | 'none' | 'unknown'> {
  try {
    const q = encodeURIComponent(name);
    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${q}&search_type=keyword_unordered`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return 'unknown';
    const html = await res.text();
    // Heurística: se a página menciona "resultado(s)" e o nome da empresa, há anúncios.
    // O padrão "Nenhum resultado encontrado" indica vazio.
    if (/Nenhum resultado encontrado|No results found/i.test(html)) return 'none';
    // Procura indicador de cards de anúncio
    if (/Biblioteca de an[úu]ncios|Ad Library/i.test(html) && new RegExp(name.split(' ')[0], 'i').test(html)) {
      return 'tubarao';
    }
    return 'none';
  } catch (e) {
    console.error('[ads-library] erro', String(e));
    return 'unknown';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const query = (await req.json()) as SearchQuery;
    const total = Math.max(1, Math.min(500, query.quantity || 20));
    const perCity = Math.ceil(total / Math.max(1, query.cities.length));
    const filter = nicheToOsmFilter(query.niche);
    console.log('[leads] niche=', query.niche, 'filter=', filter, 'cities=', query.cities);

    const allLeads: Lead[] = [];

    for (const city of query.cities) {
      const geo = await geocodeCity(city.trim(), query.state);
      if (!geo) {
        console.log('[leads] cidade nao encontrada:', city);
        continue;
      }
      const elements = await overpassQuery(filter, query.niche, geo.bbox, perCity * 2);
      console.log(`[leads] ${city}: ${elements.length} elementos OSM`);

      const candidates = elements
        .filter((el: any) => el.tags?.name)
        .slice(0, perCity);

      // Enriquece em paralelo (limitado)
      const enriched = await Promise.all(
        candidates.map(async (el: any, idx: number) => {
          const tags = el.tags;
          const website: string | null = tags.website || tags['contact:website'] || tags.url || null;
          const phone = normalizePhone(tags.phone || tags['contact:phone']);
          let instagram: string | null = tags['contact:instagram']
            ? `@${tags['contact:instagram'].replace(/.*instagram\.com\//, '').replace(/\/$/, '')}`
            : null;
          let whatsapp: string | null = normalizePhone(tags['contact:whatsapp']) || null;

          if (website && (!instagram || !whatsapp)) {
            const url = website.startsWith('http') ? website : `https://${website}`;
            const extra = await enrichFromWebsite(url);
            instagram = instagram || extra.instagram;
            whatsapp = whatsapp || extra.whatsapp;
          }

          // Fallback: se ainda não temos instagram, busca via DuckDuckGo
          if (!instagram) {
            instagram = await findInstagramViaSearch(tags.name, city);
          }

          if (!whatsapp && phone) whatsapp = phone;

          // === Instagram Discovery ===
          // Se telefone atual NÃO é celular válido e temos instagram, tenta enriquecer.
          let phoneFromInstagram = false;
          const currentBest = whatsapp || phone;
          const needsBetterPhone = !currentBest || !isMobileBR(currentBest);
          if (instagram && needsBetterPhone) {
            const igPhone = await enrichFromInstagram(instagram);
            if (igPhone && isMobileBR(igPhone)) {
              whatsapp = igPhone;
              phoneFromInstagram = true;
            }
          }

          // === TUBARÃO: Meta Ads Library ===
          // Roda em paralelo com o resto, mas só pra leads "interessantes" (têm contato)
          const adsStatus = (whatsapp || website)
            ? await checkAdsLibrary(tags.name)
            : 'unknown';

          const addressParts = [
            tags['addr:street'],
            tags['addr:housenumber'],
            tags['addr:suburb'] || tags['addr:neighbourhood'],
            city,
            query.state,
          ].filter(Boolean);

          const lead: Lead = {
            id: `${el.type}-${el.id}`,
            name: tags.name,
            address: addressParts.join(', ') || `${city}, ${query.state}`,
            phone: phone || '',
            whatsapp,
            website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
            instagram,
            rating: 0,
            reviewCount: 0,
            type: website ? 'cold' : 'hot',
            niche: query.niche,
            city,
            state: query.state,
            foundAt: new Date().toISOString(),
            phoneFromInstagram,
            adsStatus,
          };
          return lead;
        })
      );

      allLeads.push(...enriched);
      if (allLeads.length >= total) break;
    }

    const finalLeads = allLeads.slice(0, total);
    console.log(`[leads] retornando ${finalLeads.length}`);

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
