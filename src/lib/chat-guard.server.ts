/**
 * Identity guard for the public BALO AI endpoint.
 *
 * The browser used to send a client-chosen `sessionKey`; nothing proved that
 * the caller owned it. Instead the server now mints a random, HMAC-signed id
 * in an HttpOnly cookie and rate-limits on that id (plus the client address).
 * Requests without a valid cookie are still served, but only on the tighter
 * per-address budget.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "balo_ai_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  return (
    process.env.BALO_AI_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "balo-ai-local-development-secret"
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);
}

function verify(value: string, signature: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export type ChatIdentity = {
  /** Verified id, or null when the caller has no valid signed cookie. */
  id: string | null;
  /** Set-Cookie value to return when a fresh id was minted. */
  setCookie?: string;
};

export function resolveChatIdentity(request: Request): ChatIdentity {
  const raw = readCookie(request, COOKIE_NAME);
  if (raw) {
    const [id, signature] = raw.split(".");
    if (id && signature && verify(id, signature)) {
      return { id };
    }
  }

  const id = randomUUID();
  const value = `${id}.${sign(id)}`;
  const secure = /^https:/i.test(request.headers.get("x-forwarded-proto") || request.url);
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return { id, setCookie: cookie };
}

/** Attach the minted cookie (if any) to an outgoing response. */
export function withIdentityCookie(response: Response, identity: ChatIdentity): Response {
  if (!identity.setCookie) return response;
  try {
    response.headers.append("Set-Cookie", identity.setCookie);
  } catch {
    /* immutable headers — nothing to do */
  }
  return response;
}
