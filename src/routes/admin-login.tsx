import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setMsg({ kind: "ok", text: "Account created. If your email is admin-allowed, sign in now." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin-reset-password`,
        });
        if (error) throw error;
        setMsg({ kind: "ok", text: "Password reset email sent." });
      }
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message ?? "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
          <Lock className="size-6" />
        </div>
        <h1 className="text-2xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" && "Sign in with the admin email and password."}
          {mode === "signup" && "Create the admin account (first-time only)."}
          {mode === "reset" && "Enter the admin email to receive a password reset link."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <div className="mt-1 relative">
              <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                placeholder="admin@example.com"
              />
            </div>
          </label>
          {mode !== "reset" && (
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Password</span>
              <div className="mt-1 relative">
                <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
            </label>
          )}
          {msg && (
            <div className={`text-sm rounded-md p-3 ${msg.kind === "err" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
              {msg.text}
            </div>
          )}
          <button
            type="submit" disabled={busy}
            className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs">
          {mode === "signin" ? (
            <>
              <button onClick={() => { setMode("signup"); setMsg(null); }} className="text-primary hover:underline">Create admin account</button>
              <button onClick={() => { setMode("reset"); setMsg(null); }} className="text-primary hover:underline">Forgot password?</button>
            </>
          ) : (
            <button onClick={() => { setMode("signin"); setMsg(null); }} className="text-primary hover:underline">Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
