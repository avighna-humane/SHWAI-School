import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { login, register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isRegister = mode === "register";

  const mutation = useMutation({
    mutationFn: async () => {
      if (isRegister) {
        const result = await register({
          data: {
            ...form,
            termsAccepted: true,
            privacyVersion: "v1",
          },
        });
        return { kind: "register" as const, message: result.message };
      }
      await login({ data: { email: form.email, password: form.password } });
      return { kind: "login" as const };
    },
    onSuccess: (result) => {
      if (result.kind === "register") {
        setSuccess(result.message);
        return;
      }
      void navigate({ to: "/app" });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError(null);
    setSuccess(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo-mark.png" alt="SHWAI" className="size-12" />
          <div>
            <p className="text-lg font-extrabold tracking-tight">SHWAI</p>
            <p className="text-xs text-muted-foreground">School Operating System</p>
          </div>
        </div>
        <section className="surface-panel p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Secure access
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              {isRegister ? "Create your school account" : "Sign in to SHWAI"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isRegister
                ? "Registration creates the first owner membership for a new school. Email verification is required before sign-in."
                : "Your school and role are resolved from your authenticated membership."}
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setSuccess(null);
              if (isRegister && !termsAccepted) {
                setError("Accept the terms and privacy notice before creating an account.");
                return;
              }
              mutation.mutate();
            }}
          >
            {isRegister ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School name</Label>
                  <Input
                    id="schoolName"
                    value={form.schoolName}
                    onChange={(event) => update("schoolName", event.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={isRegister ? 12 : 1}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <Icons.EyeOff className="size-4" />
                  ) : (
                    <Icons.Eye className="size-4" />
                  )}
                </button>
              </div>
              {isRegister ? (
                <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
              ) : null}
            </div>
            {isRegister ? (
              <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    setError(null);
                  }}
                  className="mt-1 size-4 rounded border-input"
                />
                <span>I accept the SHWAI terms and privacy notice for this school account.</span>
              </label>
            ) : null}
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm leading-5 text-danger"
              >
                {error}
              </div>
            ) : null}
            {success ? (
              <div
                role="status"
                className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm leading-5 text-success-foreground"
              >
                {success}{" "}
                <Link className="font-semibold underline" to="/verify-email">
                  Verify email
                </Link>
              </div>
            ) : null}
            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                  {isRegister ? "Creating account…" : "Signing in…"}
                </>
              ) : isRegister ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          {!isRegister ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link className="font-semibold text-primary hover:underline" to="/forgot-password">
                Forgot your password?
              </Link>
            </p>
          ) : null}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Need a school account?"}{" "}
            <Link
              className="font-semibold text-primary hover:underline"
              to={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Sign in" : "Register"}
            </Link>
          </p>
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          Authentication requires PostgreSQL configuration. SHWAI does not accept a client-selected
          role or school as proof of access.
        </p>
      </div>
    </main>
  );
}
