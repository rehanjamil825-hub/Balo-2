import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  isAuthorizedAdminEmail,
  isVerifiedAdminAccount,
  normalizeAdminUsername,
  OWNER_EMAIL,
} from "@/lib/admin-owner";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Username can use letters, numbers, dots, underscores, and hyphens.");

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);
const adminEmailSchema = z.string().trim().email("Enter a valid admin email.");

function normalizedUsername(value: string) {
  return normalizeAdminUsername(value);
}

function invalidCredentials() {
  return new Error("Invalid username or password.");
}

/** Request origin, used when SITE_URL is not configured yet. */
function requestOrigin(): string | null {
  const request = getRequest();
  if (!request) return null;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

/**
 * Public origin for links in admin emails.
 *
 * SITE_URL is trusted server configuration, so any http(s) origin from it is
 * used. The browser-supplied request origin is only a development fallback and
 * must match the allow-list, otherwise it would be an open redirect.
 */
async function adminLinkRedirect(path: string) {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (configured && /^https?:\/\/[^\s]+$/i.test(configured)) {
    return `${configured}${path}`;
  }
  const { isAllowedAdminAuthOrigin } = await import("@/lib/admin-auth-rules");
  const origin = requestOrigin();
  return origin && isAllowedAdminAuthOrigin(origin) ? `${origin}${path}` : "";
}

/**
 * Public server boundary for registration. The Auth identity and profile are
 * created on the server so the internal Auth email never reaches the browser.
 * The admin role is deliberately not granted until a verified login.
 */
export const registerAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: usernameSchema,
        password: passwordSchema,
        adminEmail: adminEmailSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!isAuthorizedAdminEmail(data.adminEmail)) {
      throw new Error(`Use ${OWNER_EMAIL} — that is the authorised admin email.`);
    }
    const acceptedEmail = OWNER_EMAIL;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPasswordAuthClient } = await import("@/lib/admin-auth.server");
    const normalized = normalizedUsername(data.username);
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from("admin_profiles")
      .select("id")
      .eq("normalized_username", normalized)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;
    if (existingProfile) throw new Error("That username is already registered.");

    // Sign up on the anon client so the service-role singleton never holds a user session.
    const auth = createPasswordAuthClient();
    const { data: authData, error: authError } = await auth.auth.signUp({
      email: acceptedEmail,
      password: data.password,
      options: { emailRedirectTo: (await adminLinkRedirect("/admin-login")) || undefined },
    });
    if (authError) {
      throw new Error("This admin email is already registered or could not be registered.");
    }
    if (!authData.user || authData.user.identities?.length === 0) {
      throw new Error("This admin email is already registered or could not be registered.");
    }

    const { error: profileError } = await supabaseAdmin.from("admin_profiles").insert({
      user_id: authData.user.id,
      username: data.username.trim(),
      normalized_username: normalized,
    });
    if (profileError) throw profileError;

    return { verificationRequired: !authData.user.email_confirmed_at };
  });

/**
 * Username authentication stays entirely server-side: the browser receives a
 * Supabase session, never the internal email used to resolve the username.
 */
export const signInAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: usernameSchema, password: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    // Slow down password guessing: 10 attempts per address+username per 10 minutes.
    const request = getRequest();
    const { clientAddress, rateLimit } = await import("@/lib/rate-limit.server");
    const attemptKey = `${request ? clientAddress(request) : "unknown"}:${normalizedUsername(data.username)}`;
    if (!rateLimit(`admin-signin:${attemptKey}`, 10, 10 * 60_000).ok) {
      throw new Error("Too many sign-in attempts. Please wait a few minutes and try again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { passwordGrant } = await import("@/lib/admin-auth.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id, username")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();
    if (profileError || !profile) throw invalidCredentials();

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      profile.user_id,
    );
    const email = userData.user?.email;
    if (userError || !email) throw invalidCredentials();

    // Password grant on a separate anon client. Signing in on supabaseAdmin would
    // attach the user JWT to the service-role singleton and RLS would block the
    // user_roles insert ("new row violates row-level security policy").
    const { data: authData, error: authError } = await passwordGrant(email, data.password);
    if (authError || !authData.session || !authData.user) {
      if (authError?.message && /confirm|verify/i.test(authError.message)) {
        throw new Error("EMAIL_NOT_VERIFIED: Verify the admin email before signing in.");
      }
      throw invalidCredentials();
    }
    if (!isVerifiedAdminAccount(authData.user.email, authData.user.email_confirmed_at)) {
      throw new Error("EMAIL_NOT_VERIFIED: Verify the admin email before signing in.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.user_id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) throw roleError;

    return { session: authData.session, username: profile.username };
  });

export const resendAdminVerification = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: usernameSchema, adminEmail: adminEmailSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!isAuthorizedAdminEmail(data.adminEmail)) {
      throw new Error(`Use ${OWNER_EMAIL} — that is the authorised admin email.`);
    }
    const acceptedEmail = OWNER_EMAIL;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();
    if (!profile) throw new Error("We could not verify those admin details.");
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: acceptedEmail,
      options: { emailRedirectTo: (await adminLinkRedirect("/admin-login")) || undefined },
    });
    if (error) throw new Error("Could not resend the verification email.");
    return { ok: true };
  });

/**
 * Password recovery, step 1: send a reset link to the authorised inbox.
 *
 * The response is deliberately identical whether or not the username exists,
 * so this endpoint cannot be used to discover admin accounts. Only Supabase
 * Auth can issue the recovery token, so the caller must be able to read the
 * owner inbox before the password can ever change.
 */
export const requestAdminPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ username: usernameSchema }).parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const { clientAddress, rateLimit } = await import("@/lib/rate-limit.server");
    const ip = request ? clientAddress(request) : "unknown";
    const limit = rateLimit(`admin-reset:${ip}`, 5, 15 * 60_000);
    if (!limit.ok) {
      throw new Error("Too many reset requests. Please wait a few minutes and try again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPasswordAuthClient } = await import("@/lib/admin-auth.server");

    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();

    if (!profile) return { ok: true };

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const email = userData.user?.email;
    if (!email || !isAuthorizedAdminEmail(email)) return { ok: true };

    const redirectTo = await adminLinkRedirect("/admin-reset-password");
    const auth = createPasswordAuthClient();
    const { error } = await auth.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) {
      console.error("[admin-reset] could not send recovery email", error.message);
    }
    // Same response in every case: the endpoint must not reveal which usernames exist.
    return { ok: true };
  });

/**
 * Password recovery, step 2: set the new password from a recovery session.
 *
 * The reset page can only obtain a session from the emailed recovery token
 * (the admin client never persists sessions), so a valid session here is proof
 * that someone read the authorised inbox. The account is then re-checked
 * against the authorised+verified email rules before Auth is updated.
 */
export const completeAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ password: passwordSchema }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    const user = userData.user;
    if (userError || !user || !isVerifiedAdminAccount(user.email, user.email_confirmed_at)) {
      throw new Error(
        "This reset link cannot be used for that account. Please request a new link.",
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) {
      throw new Error(
        "This reset link cannot be used for that account. Please request a new link.",
      );
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) {
      throw new Error("Could not update the password. Please request a new reset link.");
    }

    return { ok: true };
  });

// Returns the current session's role and username. Email is intentionally not returned.
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw roleError;
    const { data: profile } = await context.supabase
      .from("admin_profiles")
      .select("username")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isAdmin: Boolean(role), username: profile?.username ?? null };
  });

// Existing admin CRUD (unchanged)
const idSchema = z.object({ id: z.string().uuid() });
const announcementInput = z.object({
  message: z.string().trim().min(1).max(500),
  is_published: z.boolean(),
  publish_at: z.string().datetime(),
});
const noticeInput = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  is_published: z.boolean(),
  publish_at: z.string().datetime(),
});

async function requireAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const listAllAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("publish_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => announcementInput.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => announcementInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("announcements")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => idSchema.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listAllNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("notices")
      .select("*")
      .order("publish_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => noticeInput.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase
      .from("notices")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => noticeInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("notices")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => idSchema.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("notices").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
