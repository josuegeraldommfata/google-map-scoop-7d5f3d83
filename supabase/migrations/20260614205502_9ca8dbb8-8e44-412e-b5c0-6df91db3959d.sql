
DROP POLICY IF EXISTS "public access saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "public access saved_leads" ON public.saved_leads;

-- Helper: lê x-session-id do header da request
CREATE OR REPLACE FUNCTION public.current_session_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  );
$$;

CREATE POLICY "session can read own searches"
  ON public.saved_searches FOR SELECT
  USING (session_id IS NOT NULL AND session_id = public.current_session_id());

CREATE POLICY "session can insert own searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND session_id = public.current_session_id());

CREATE POLICY "session can update own searches"
  ON public.saved_searches FOR UPDATE
  USING (session_id = public.current_session_id())
  WITH CHECK (session_id = public.current_session_id());

CREATE POLICY "session can delete own searches"
  ON public.saved_searches FOR DELETE
  USING (session_id = public.current_session_id());

CREATE POLICY "session can read own leads"
  ON public.saved_leads FOR SELECT
  USING (session_id IS NOT NULL AND session_id = public.current_session_id());

CREATE POLICY "session can insert own leads"
  ON public.saved_leads FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND session_id = public.current_session_id());

CREATE POLICY "session can update own leads"
  ON public.saved_leads FOR UPDATE
  USING (session_id = public.current_session_id())
  WITH CHECK (session_id = public.current_session_id());

CREATE POLICY "session can delete own leads"
  ON public.saved_leads FOR DELETE
  USING (session_id = public.current_session_id());
