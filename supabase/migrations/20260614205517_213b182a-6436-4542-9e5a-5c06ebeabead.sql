
CREATE OR REPLACE FUNCTION public.current_session_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  );
$$;
