import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_OWNER_EMAIL, isVerifiedAdminAccount, normalizeAdminUsername } from "@/lib/admin-auth-rules";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Username can use letters, numbers, dots, underscores, and hyphens.");

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);
const adminEmailSchema = z.string().trim().email("Enter a valid admin email.");

function invalidCredentials() {
  return new Error("Invalid username or password.");
}

/** Sends an Auth-managed confirmation link, returning only to this app's login page. */
export const sendAdminVerificationLink = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      email: adminEmailSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!isAdminEmail(data.email)) {
      throw new Error("Only the authorised admin email can register an administrator.");
    }
    const { createAdminOtpClient } = await import("@/lib/admin-auth.server");
    const { error } = await createAdminOtpClient().auth.signInWithOtp({
      email: ADMIN_OWNER_EMAIL,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: new URL("/admin-login?admin-verify=signup", getRequestUrl()).toString(),
      },
    });
    if (error) throw new Error("Could not send the verification email. Please wait a moment and try again.");
    return { ok: true };
  });

/**
 * Assigns the admin role only to the owner identity after email OTP has
 * produced the current authenticated session.
 */
export const finishAdminRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ username: usernameSchema, password: passwordSchema }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: authData, error: authError } = await context.supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== context.userId || !isVerifiedAdminAccount(authData.user.email, authData.user.email_confirmed_at)) {
      throw new Error("Verify the authorised email before finishing admin registration.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.password });
    if (passwordError) throw new Error("Could not set the admin password. Please verify the code again and retry.");
    const normalized = normalizeAdminUsername(data.username);
    const { error: profileError } = await supabaseAdmin.from("admin_profiles").upsert({
      user_id: context.userId,
      username: data.username.trim(),
      normalized_username: normalized,
    }, { onConflict: "user_id" });
    if (profileError) {
      if (profileError.code === "23505") throw new Error("That username is already registered.");
      throw new Error("Could not save the admin username. Please try again.");
    }
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: context.userId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    if (roleError) throw new Error("Could not finish admin access setup. Please try again.");
    return { ok: true };
  });

/** Updates the owner password only inside the email-verified Auth session. */
export const finishAdminRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ username: usernameSchema, password: passwordSchema }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizeAdminUsername(data.username))
      .maybeSingle();
    if (profileError || !profile || profile.user_id !== context.userId) {
      throw new Error("The recovery code does not match this admin username.");
    }
    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== context.userId || !isVerifiedAdminAccount(userData.user.email, userData.user.email_confirmed_at)) {
      throw new Error("Verify the authorised email before updating this password.");
    }
    const { error } = await context.supabase.auth.updateUser({ password: data.password });
    if (error) throw new Error("Could not update the admin password. Please try again.");
    return { ok: true };
  });

/** Username-to-owner identity lookup never returns the Auth email to the UI. */
export const signInAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: usernameSchema, password: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id, username")
      .eq("normalized_username", normalizeAdminUsername(data.username))
      .maybeSingle();
    if (profileError || !profile) throw invalidCredentials();

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (userError || !isVerifiedAdminAccount(userData.user?.email, userData.user?.email_confirmed_at)) throw invalidCredentials();

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: ADMIN_OWNER_EMAIL,
      password: data.password,
    });
    if (authError || !authData.session || !authData.user || !isVerifiedAdminAccount(authData.user.email, authData.user.email_confirmed_at)) throw invalidCredentials();

    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) throw invalidCredentials();

    return { session: authData.session, username: profile.username };
  });

/** Sends a native Auth password-recovery link only for the existing owner identity. */
export const requestAdminRecoveryLink = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      username: usernameSchema,
      adminEmail: adminEmailSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizeAdminUsername(data.username))
      .maybeSingle();
    if (isAdminEmail(data.adminEmail) && profile) {
      const { data: authData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
      if (!userError && isVerifiedAdminAccount(authData.user?.email, authData.user?.email_confirmed_at)) {
        const { createAdminOtpClient } = await import("@/lib/admin-auth.server");
        await createAdminOtpClient().auth.resetPasswordForEmail(ADMIN_OWNER_EMAIL, {
          redirectTo: new URL("/admin-login?admin-verify=recovery", getRequestUrl()).toString(),
        });
      }
    }
    // Avoid revealing whether either submitted value matched the admin account.
    return { ok: true };
  });

function isAdminEmail(value: string) {
  return value.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}

// Returns the current session's role and username. Email is intentionally not returned.
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: user, error: userError } = await context.supabase.auth.getUser();
    if (userError || !user.user || !isVerifiedAdminAccount(user.user.email, user.user.email_confirmed_at)) {
      return { isAdmin: false, username: null };
    }
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

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const listAllAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("announcements").select("*").order("publish_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => announcementInput.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase.from("announcements").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => announcementInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase.from("announcements").update(patch).eq("id", id).select().single();
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
    const { data, error } = await context.supabase.from("notices").select("*").order("publish_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => noticeInput.parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase.from("notices").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const updateNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => noticeInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase.from("notices").update(patch).eq("id", id).select().single();
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


