import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { completeAdminPasswordReset } from "@/lib/admin.functions";
import { SCHOOL_EMAIL } from "@/lib/school-facts";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin-reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset admin password — Balo English Medium School" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid" | "done";

/**
 * Step 2 of admin password recovery.
 *
 * The page only becomes usable with the recovery token that Supabase emailed
 * to the authorised admin inbox. Without that token there is no session, and
 * the server refuses to write a new password.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const completeReset = useServerFn(completeAdminPasswordReset);

  const [phase, setPhase] = useState<Phase>("checking");
  const [detail, setDetail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const errorDescription = hash.get("error_description") || query.get("error_description");
      if (errorDescription) {
        if (!mounted) return;
        setDetail(errorDescription.replace(/\+/g, " "));
        setPhase("invalid");
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          // Do not leave the recovery token in the address bar.
          window.history.replaceState(null, "", window.location.pathname);
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (!mounted) return;
            setPhase("invalid");
            return;
          }
        }
      } catch (err) {
        if (!mounted) return;
        setDetail(err instanceof Error ? err.message : null);
        setPhase("invalid");
        return;
      }

      if (mounted) setPhase("ready");
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await completeReset({ data: { password } });
      await supabase.auth.signOut();
      setPhase("done");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the password. Please request a new reset link.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-36px)] place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-2xl font-bold">Choose a new admin password</h1>

        {phase === "checking" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking your reset link…
          </p>
        )}

        {phase === "invalid" && (
          <div className="mt-4 space-y-4">
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This reset link is missing, expired, or has already been used.
              {detail ? ` (${detail})` : ""}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask for a new link from the admin sign-in page, or email the school office at{" "}
              <a href={`mailto:${SCHOOL_EMAIL}`} className="text-primary underline">
                {SCHOOL_EMAIL}
              </a>
              .
            </p>
            <button
              onClick={() => navigate({ to: "/admin-login" })}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Back to admin sign in
            </button>
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your inbox has been verified. Set a new password of at least 8 characters.
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">New password</span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-11 text-sm"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Confirm password</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/admin-login" })}
              className="w-full text-xs text-primary hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )}

        {phase === "done" && (
          <div className="mt-4 space-y-4">
            <p className="flex items-start gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Password updated. Sign in with your username and the new password.
            </p>
            <button
              onClick={() => navigate({ to: "/admin-login" })}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Go to admin sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
