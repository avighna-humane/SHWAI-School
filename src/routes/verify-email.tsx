import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { verifyEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/verify-email")({ component: VerifyEmail });

function VerifyEmail() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => verifyEmail({ data: { token } }),
    onSuccess: () => {
      setMessage("Email verified. You can now sign in.");
      setTimeout(() => void navigate({ to: "/login" }), 900);
    },
    onError: (error: Error) => setMessage(error.message),
  });

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    if (value) setToken(value);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="surface-panel w-full max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Account verification
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the one-time token from the verification email. Tokens expire after 24 hours.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="verification-token">Verification token</Label>
            <Input
              id="verification-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              minLength={20}
              autoComplete="one-time-code"
            />
          </div>
          {message ? (
            <p role="status" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              {message}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Verifying…" : "Verify email"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-semibold text-primary hover:underline" to="/login">
            Return to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
