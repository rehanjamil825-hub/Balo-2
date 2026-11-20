/**
 * Admin identity data shared by server functions and the login screen.
 * The rules themselves live in `admin-auth-rules.ts` so they stay testable.
 */
export {
  OWNER_EMAIL,
  AUTHORIZED_ADMIN_EMAILS,
  isAuthorizedAdminEmail,
  isVerifiedAdminAccount,
  normalizeAdminUsername,
  resolveAdminAuthRedirect,
} from "@/lib/admin-auth-rules";
