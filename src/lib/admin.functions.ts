import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "baloindia2015@gmail.com";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Username can use letters, numbers, dots, underscores, and hyphens.");

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);
const adminEmailSchema = z.string().trim().email("Enter a valid admin email.");

function normalizedUsername(value: string) {
  return value.trim().toLowerCase();
}

function invalidCredentials() {
  return new Error("Invalid username or password.");
}

/**
 * Public server boundary for registration. The Auth identity and profile are
 * created on the server so the internal Auth email never reaches the browser.
 * The admin role is deliberately not granted until a verified login.
 */
export const registerAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      username: usernameSchema,
      password: passwordSchema,
      adminEmail: adminEmailSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const acceptedEmail = "baloindia2015@gmail.com";
    if (data.adminEmail.trim().toLowerCase() !== acceptedEmail) {
      throw new Error("Only the authorised admin email can register an administrator.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalized = normalizedUsername(data.username);
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from("admin_profiles")
      .select("id")
      .eq("normalized_username", normalized)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;
    if (existingProfile) throw new Error("That username is already registered.");

    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: acceptedEmail,
      password: data.password,
      options: { emailRedirectTo: "" },
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id, username")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();
    if (profileError || !profile) throw invalidCredentials();

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const email = userData.user?.email;
    if (userError || !email) throw invalidCredentials();

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (authError || !authData.session || !authData.user) {
      if (authError?.message && /confirm|verify/i.test(authError.message)) {
        throw new Error("EMAIL_NOT_VERIFIED: Verify the admin email before signing in.");
      }
      throw invalidCredentials();
    }
    if (!authData.user.email_confirmed_at) {
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
    const acceptedEmail = "baloindia2015@gmail.com";
    if (data.adminEmail.trim().toLowerCase() !== acceptedEmail) {
      throw new Error("Only the authorised admin email can be verified.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();
    if (!profile) throw new Error("We could not verify those admin details.");
    const { error } = await supabaseAdmin.auth.resend({ type: "signup", email: acceptedEmail });
    if (error) throw new Error("Could not resend the verification email.");
    return { ok: true };
  });

/**
 * Recovery is verified by the username-to-Auth identity mapping and the
 * authorised admin email. The password is written only through Auth's admin
 * API; it is never stored or returned by this application.
 */
export const recoverAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      username: usernameSchema,
      adminEmail: adminEmailSchema,
      password: passwordSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const acceptedEmail = "baloindia2015@gmail.com";
    if (data.adminEmail.trim().toLowerCase() !== acceptedEmail) {
      throw new Error("We could not verify those admin details.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("admin_profiles")
      .select("user_id")
      .eq("normalized_username", normalizedUsername(data.username))
      .maybeSingle();
    if (!profile) throw new Error("We could not verify those admin details.");

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (userError || userData.user?.email?.toLowerCase() !== acceptedEmail) {
      throw new Error("We could not verify those admin details.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, { password: data.password });
    if (error) throw new Error("Could not update the admin password.");
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

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

// Only the school owner account may approve/reject/revoke admins.
async function requireOwner(ctx: { claims: unknown }) {
  const email = (ctx.claims as { email?: string })?.email?.toLowerCase() ?? "";
  if (email !== OWNER_EMAIL) throw new Error("Forbidden: owner only");
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

// -----------------------------------------------------------------------------
// Admin approval flow — owner approves inside the dashboard. No email service.
// -----------------------------------------------------------------------------

// The signed-in, email-verified user asks the owner for admin access.
export const requestAdminApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const c = claims as { email?: string; email_confirmed_at?: string | null };
    const email = c?.email ?? null;
    if (!email) throw new Error("Missing email on account");
    if (!c?.email_confirmed_at) {
      throw new Error("Please verify your email first, then request admin approval.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (role) return { status: "approved" as const, alreadyAdmin: true };

    const { data: pending } = await supabaseAdmin
      .from("admin_approval_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) return { status: "pending" as const, alreadyAdmin: false };

    const { error } = await supabaseAdmin.from("admin_approval_requests").insert({
      user_id: userId,
      email,
      status: "pending",
    });
    if (error) throw error;
    return { status: "pending" as const, alreadyAdmin: false };
  });

// Requester polls this to see whether the owner has approved them yet.
export const getMyApprovalRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admin_approval_requests")
      .select("id, status, created_at, reviewed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

// Owner-only: list every approval request.
export const listApprovalRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_approval_requests")
      .select("id, user_id, email, status, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

// Owner-only: approve or reject a request. Approving grants the admin role.
export const reviewApprovalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("admin_approval_requests")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!req) throw new Error("Request not found");

    const { error: updErr } = await supabaseAdmin
      .from("admin_approval_requests")
      .update({
        status: data.decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", req.id);
    if (updErr) throw updErr;

    if (data.decision === "approved") {
      const { data: existing } = await supabaseAdmin
        .from("user_roles").select("id").eq("user_id", req.user_id).eq("role", "admin").maybeSingle();
      if (!existing) {
        const { error: insErr } = await supabaseAdmin
          .from("user_roles").insert({ user_id: req.user_id, role: "admin" });
        if (insErr) throw insErr;
      }
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", req.user_id).eq("role", "admin");
    }
    return { ok: true };
  });

// Owner-only: revoke an existing admin.
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await requireOwner(context);
    if (data.userId === context.userId) throw new Error("You cannot revoke your own access.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw error;
    return { ok: true };
  });

