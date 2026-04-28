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
