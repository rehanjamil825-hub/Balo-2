ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON TABLE public.admin_approval_requests IS 'DEPRECATED: replaced by single-owner email OTP verification in the admin sign-in flow; retained temporarily for migration safety.';
REVOKE SELECT ON public.admin_approval_requests FROM authenticated;
COMMENT ON FUNCTION public.admin_approval_status_check() IS 'DEPRECATED: retained only for the legacy admin_approval_requests table; not used by current admin authentication.';