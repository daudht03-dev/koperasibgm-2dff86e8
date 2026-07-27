
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';

CREATE TABLE IF NOT EXISTS public.auditor_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  path TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  event TEXT NOT NULL DEFAULT 'page_view',
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditor_access_log_user_idx ON public.auditor_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS auditor_access_log_time_idx ON public.auditor_access_log(accessed_at DESC);

GRANT SELECT ON public.auditor_access_log TO authenticated;
GRANT ALL ON public.auditor_access_log TO service_role;

ALTER TABLE public.auditor_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all auditor access logs"
  ON public.auditor_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
