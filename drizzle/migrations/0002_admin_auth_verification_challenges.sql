CREATE TABLE public.admin_auth_challenges (
  purpose text PRIMARY KEY CHECK (purpose IN ('signup', 'recovery')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.admin_auth_challenges FROM anon, authenticated;
GRANT ALL ON public.admin_auth_challenges TO service_role;
ALTER TABLE public.admin_auth_challenges ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.admin_auth_challenges IS 'Server-only hashed one-time proof that an admin signup or password recovery email link was opened.';