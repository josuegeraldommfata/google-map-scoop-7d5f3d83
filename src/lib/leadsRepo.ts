// Persistência simples (sem login) — escopo por session_id no localStorage.
// O session_id é enviado via header `x-session-id` e validado pelas RLS policies.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Lead, SearchQuery, SearchHistory } from "@/types/lead";

const SESSION_KEY = "leads_hunter_session";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Cliente dedicado que envia o session_id em todo request, permitindo
// que as RLS policies escopem leitura/escrita por sessão.
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-session-id": getSessionId() } },
});


export async function saveSearch(query: SearchQuery, leads: Lead[]): Promise<string | null> {
  const session_id = getSessionId();
  const hot = leads.filter(l => l.type === 'hot').length;
  const cold = leads.filter(l => l.type === 'cold').length;

  const { data: search, error } = await supabase
    .from('saved_searches')
    .insert({
      session_id,
      niche: query.niche,
      keywords: query.keywords,
      cities: query.cities,
      state: query.state,
      quantity: query.quantity,
      leads_found: leads.length,
      hot_leads: hot,
      cold_leads: cold,
    })
    .select('id')
    .single();
  if (error || !search) { console.error(error); return null; }

  if (leads.length) {
    const rows = leads.map(l => ({
      session_id,
      search_id: search.id,
      lead_key: `${l.name}|${l.city}|${l.phone || l.placeId || l.id}`.toLowerCase(),
      data: l as any,
    }));
    // upsert pra não duplicar leads já capturados em buscas anteriores
    await supabase.from('saved_leads').upsert(rows, { onConflict: 'session_id,lead_key', ignoreDuplicates: true });
  }
  return search.id;
}

export async function loadAll(): Promise<{ leads: Lead[]; history: SearchHistory[] }> {
  const session_id = getSessionId();
  const [{ data: leadRows }, { data: searchRows }] = await Promise.all([
    supabase.from('saved_leads').select('data').eq('session_id', session_id).order('created_at', { ascending: false }).limit(2000),
    supabase.from('saved_searches').select('*').eq('session_id', session_id).order('executed_at', { ascending: false }).limit(50),
  ]);
  const leads = (leadRows || []).map(r => r.data as unknown as Lead);
  const history: SearchHistory[] = (searchRows || []).map(s => ({
    id: s.id,
    query: {
      niche: s.niche, keywords: s.keywords || [], cities: s.cities || [],
      state: s.state, quantity: s.quantity,
    },
    leadsFound: s.leads_found,
    hotLeads: s.hot_leads,
    coldLeads: s.cold_leads,
    executedAt: s.executed_at,
  }));
  return { leads, history };
}

export async function clearAll(): Promise<void> {
  const session_id = getSessionId();
  await Promise.all([
    supabase.from('saved_leads').delete().eq('session_id', session_id),
    supabase.from('saved_searches').delete().eq('session_id', session_id),
  ]);
}
