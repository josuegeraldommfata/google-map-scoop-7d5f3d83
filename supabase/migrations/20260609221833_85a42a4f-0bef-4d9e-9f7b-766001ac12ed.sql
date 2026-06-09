
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  niche TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  state TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  leads_found INT NOT NULL DEFAULT 0,
  hot_leads INT NOT NULL DEFAULT 0,
  cold_leads INT NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO anon, authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access saved_searches" ON public.saved_searches FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_saved_searches_session ON public.saved_searches(session_id, executed_at DESC);

CREATE TABLE public.saved_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  search_id UUID REFERENCES public.saved_searches(id) ON DELETE SET NULL,
  lead_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_leads TO anon, authenticated;
GRANT ALL ON public.saved_leads TO service_role;
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access saved_leads" ON public.saved_leads FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX idx_saved_leads_session_key ON public.saved_leads(session_id, lead_key);
CREATE INDEX idx_saved_leads_session_created ON public.saved_leads(session_id, created_at DESC);
