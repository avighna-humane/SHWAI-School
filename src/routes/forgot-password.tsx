import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => requestPasswordReset({ data: { email } }),
    onSuccess: (result) => setMessage(result.message),
    onError: (error: Error) => setMessage(error.message),
  });
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="surface-panel w-full max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Account recovery
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your account email. For privacy, SHWAI shows the same response whether or not the
            address is registered.
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
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          {message ? (
            <p role="status" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              {message}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Requesting…" : "Email reset instructions"}
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
