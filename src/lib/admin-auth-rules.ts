export const ADMIN_OWNER_EMAIL = "baloindia2015@gmail.com";

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isAuthorizedAdminEmail(value: string) {
  return value.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}

export function isVerifiedAdminAccount(email: string | null | undefined, confirmedAt: string | null | undefined) {
  return isAuthorizedAdminEmail(email ?? "") && Boolean(confirmedAt);
}