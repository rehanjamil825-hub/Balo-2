import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, UserRound } from "lucide-react";
import {
  finishAdminRecovery,
  finishAdminRegistration,
  getAdminStatus,
  requestAdminRecoveryOtp,
  requestAdminRegistrationOtp,
  resendAdminVerification,
  signInAdmin,
  verifyAdminEmailOtp,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  component: AdminLoginPage,
});

type Mode = "signin" | "signup" | "reset";
type Stage = "form" | "otp" | "finish";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(getAdminStatus);
  const registerOtp = useServerFn(requestAdminRegistrationOtp);
  const recoveryOtp = useServerFn(requestAdminRecoveryOtp);
  const verifyOtp = useServerFn(verifyAdminEmailOtp);
  const finishRegistration = useServerFn(finishAdminRegistration);
  const finishRecovery = useServerFn(finishAdminRecovery);
  const signIn = useServerFn(signInAdmin);
  const resend = useServerFn(resendAdminVerification);

  const [username, setUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [stage, setStage] = useState<Stage>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  function changeMode(next: Mode) {
    setMode(next);
    setStage("form");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setMsg(null);
  }

  async function sendOtp() {
    if (!username.trim() || !adminEmail.trim()) throw new Error("Enter your username and authorised admin email.");
    if (mode === "signup" && password !== confirmPassword) throw new Error("Passwords do not match.");
    if (mode === "reset" && (password || confirmPassword)) throw new Error("Request a recovery code before choosing a new password.");
    if (mode === "signup") {
      await registerOtp({ data: { email: adminEmail } });
      setMsg({ kind: "ok", text: "A six-digit verification code was sent to the authorised email." });
    } else {
      await recoveryOtp({ data: { username, adminEmail } });
      setMsg({ kind: "ok", text: "A six-digit recovery code was sent to the authorised email." });
    }
    setStage("otp");
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(otp)) throw new Error("Enter the six-digit code from the email.");
    const result = await verifyOtp({ data: { email: adminEmail, token: otp } });
    const { error } = await supabase.auth.setSession(result.session);
    if (error) throw new Error("The verification session could not be started. Request a new code.");
    if (mode === "signup") {
      await finishRegistration({ data: { username, password } });
      const status = await checkAdmin();
      if (!status.isAdmin) throw new Error("Email verified, but admin access could not be confirmed.");
      navigate({ to: "/admin", replace: true });
      return;
    }
    setStage("finish");
    setPassword("");
    setConfirmPassword("");
    setMsg({ kind: "ok", text: "Email verified. Choose a new password." });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const result = await signIn({ data: { username, password } });
        const { error } = await supabase.auth.setSession(result.session);
        if (error) throw new Error("The sign-in session could not be started. Please try again.");
        const status = await checkAdmin();
        if (!status.isAdmin) {
          await supabase.auth.signOut();
          throw new Error("This account is not authorised for the admin dashboard.");
        }
        navigate({ to: "/admin", replace: true });
      } else if (stage === "form") {
        await sendOtp();
      } else if (stage === "otp") {
        await verifyCode();
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (mode === "reset") {
          await finishRecovery({ data: { username, password } });
          await supabase.auth.signOut();
          changeMode("signin");
          setMsg({ kind: "ok", text: "Password updated. Sign in with your username and new password." });
        }
      }
    } catch (error) {
      setMsg({ kind: "err", text: errorMessage(error, "Something went wrong. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setMsg(null);
    try {
      await resend({ data: { username, adminEmail } });
      setMsg({ kind: "ok", text: "A new verification code was sent to the authorised email." });
    } catch (error) {
      setMsg({ kind: "err", text: errorMessage(error, "Could not resend the verification code.") });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Admin sign in" : mode === "signup" ? "Create admin account" : "Recover admin access";
  const isPasswordStage = mode === "signin" || (mode === "signup" && stage === "form") || (mode === "reset" && stage === "finish");

  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-5 py-12 sm:py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8" aria-labelledby="admin-login-title">
        <div className="mb-5 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Lock className="size-5" /></div>
        <h1 id="admin-login-title" className="text-2xl font-bold text-foreground">
          {stage === "otp" ? "Check the authorised email" : stage === "finish" ? "Choose a new password" : title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {mode === "signin" && "Sign in with your admin username and password."}
          {mode === "signup" && stage === "form" && "Create an admin username and password. The approved email must be verified before access is granted."}
          {mode === "signup" && stage === "otp" && "Enter the six-digit code sent to the approved admin email to finish account setup."}
          {mode === "reset" && stage === "form" && "Enter your admin username and the approved email to request a recovery code."}
          {mode === "reset" && stage === "otp" && "Enter the six-digit recovery code sent to the approved admin email."}
          {mode === "reset" && stage === "finish" && "Your email is verified. Set a new password for the admin account."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {stage !== "finish" && (
            <label className="block">
              <span className="text-xs font-semibold text-foreground">Username</span>
              <div className="relative mt-1">
                <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" required autoComplete="username" minLength={3} maxLength={32} value={username}
                  onChange={(event) => { setUsername(event.target.value); setMsg(null); }}
                  disabled={stage === "otp"} className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm disabled:opacity-70"
                  placeholder="your username" />
              </div>
            </label>
          )}

          {(mode !== "signin" && stage !== "otp") && (
            <label className="block">
              <span className="text-xs font-semibold text-foreground">Admin email</span>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required autoComplete="email" value={adminEmail}
                  onChange={(event) => { setAdminEmail(event.target.value); setMsg(null); }}
                  disabled={stage === "finish"} className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm disabled:opacity-70"
                  placeholder="authorised admin email" />
              </div>
            </label>
          )}

          {stage === "otp" && (
            <label className="block">
              <span className="text-xs font-semibold text-foreground">Six-digit code</span>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={otp}
                onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setMsg(null); }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm tracking-[0.3em]" placeholder="000000" />
            </label>
          )}

          {isPasswordStage && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-foreground">{mode === "reset" ? "New password" : "Password"}</span>
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPassword ? "text" : "password"} required autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} maxLength={128} value={password}
                    onChange={(event) => { setPassword(event.target.value); setMsg(null); }}
                    className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-11 text-sm" placeholder="At least 8 characters" />
                  <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </label>
              {mode !== "signin" && (
                <label className="block">
                  <span className="text-xs font-semibold text-foreground">Confirm password</span>
                  <div className="relative mt-1">
                    <input type={showConfirmPassword ? "text" : "password"} required autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword}
                      onChange={(event) => { setConfirmPassword(event.target.value); setMsg(null); }}
                      className="w-full rounded-md border border-input bg-background py-2.5 pl-3 pr-11 text-sm" placeholder="Repeat your password" />
                    <Button type="button" variant="ghost" size="icon" aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </label>
              )}
            </>
          )}

          {msg && <p role="alert" className={`rounded-md p-3 text-sm ${msg.kind === "err" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-foreground"}`}>{msg.text}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : stage === "otp" ? "Verify code" : mode === "signin" ? "Sign in" : mode === "signup" ? stage === "form" ? "Send verification code" : "Create account" : stage === "form" ? "Send recovery code" : "Update password"}
          </Button>
        </form>

        {stage === "otp" && mode === "signup" && (
          <Button type="button" variant="outline" disabled={busy} onClick={resendVerification} className="mt-3 w-full">
            <RefreshCw /> Resend verification code
          </Button>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          {mode === "signin" ? (
            <>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => changeMode("signup")}>Create account</Button>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => changeMode("reset")}>Forgot password?</Button>
            </>
          ) : (
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => changeMode("signin")}>Back to sign in</Button>
          )}
          {stage !== "form" && <Button type="button" variant="link" className="h-auto p-0" onClick={() => { setStage("form"); setOtp(""); setMsg(null); }}>Change details</Button>}
        </div>
      </section>
    </main>
  );
}