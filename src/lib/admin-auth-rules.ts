/**
 * Pure admin-authentication rules.
 *
 * Kept free of server imports so the same rules can be unit-tested (see
 * `tests/admin-auth-rules.test.ts`), used by the login screen and enforced by
 * the server functions.
 */

/** Inbox that receives admin verification and password-reset codes. */
export const OWNER_EMAIL = "shahrehshi@gmail.com";

/** Emails that may register / recover. Codes always go to OWNER_EMAIL. */
export const AUTHORIZED_ADMIN_EMAILS = [OWNER_EMAIL, "baloindia2015@gmail.com"] as const;

export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (AUTHORIZED_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

/**
 * An admin account is only valid when it uses an authorised inbox AND that
 * inbox has actually been verified.
 */
export function isVerifiedAdminAccount(
  email: string | null | undefined,
  emailConfirmedAt: string | null | undefined,
): boolean {
  return isAuthorizedAdminEmail(email) && Boolean(emailConfirmedAt);
}

/** Usernames are matched case-insensitively through this handle. */
export function normalizeAdminUsername(username: string): string {
  return username.trim().toLowerCase();
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const LOVABLE_PREVIEW_ORIGIN =
  /^https:\/\/([a-z0-9-]+\.)*(lovable\.app|lovableproject\.com|lovableproject-dev\.com)$/i;
const PRODUCTION_ORIGINS = ["https://baloindia.org", "https://www.baloindia.org"];

/**
 * Where Supabase may send an admin back after clicking an email link.
 * Anything else is an open-redirect risk, so it is rejected.
 */
export function isAllowedAdminAuthOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.pathname !== "/" && url.pathname !== "") return false;
  if (url.search || url.hash) return false;
  const base = `${url.protocol}//${url.host}`;
  return (
    LOCAL_ORIGIN.test(base) ||
    LOVABLE_PREVIEW_ORIGIN.test(base) ||
    PRODUCTION_ORIGINS.includes(base.toLowerCase())
  );
}

/**
 * Resolve the redirect URL for an admin email link.
 * Prefers the configured SITE_URL, then the request origin when it is allowed.
 */
export function resolveAdminAuthRedirect(
  siteUrl: string | null | undefined,
  requestOrigin?: string | null,
): string | undefined {
  const configured = siteUrl?.trim().replace(/\/$/, "");
  // SITE_URL is server configuration, not user input, so any http(s) origin is
  // trusted here. Only browser-supplied origins go through the allow-list.
  if (configured && /^https?:\/\/[^\s/]+$/i.test(configured)) {
    return `${configured}/admin-reset-password`;
  }
  if (requestOrigin && isAllowedAdminAuthOrigin(requestOrigin)) {
    return `${requestOrigin.replace(/\/$/, "")}/admin-reset-password`;
  }
  return undefined;
}
