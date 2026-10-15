export const ADMIN_OWNER_EMAIL = "baloindia2015@gmail.com";

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isAllowedAdminAuthOrigin(origin: string) {
  return origin === "http://localhost:8080" ||
    origin === "https://id-preview--260bd6c6-afdc-4219-9095-bec95a6b4f9d.lovable.app";
}

export function isAuthorizedAdminEmail(value: string) {
  return value.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}

export function isVerifiedAdminAccount(email: string | null | undefined, confirmedAt: string | null | undefined) {
  return isAuthorizedAdminEmail(email ?? "") && Boolean(confirmedAt);
}