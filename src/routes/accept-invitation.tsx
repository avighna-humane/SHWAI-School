import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { acceptInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/accept-invitation")({ component: AcceptInvitation });

function AcceptInvitation() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => acceptInvitation({ data: { token, name, password, privacyVersion: "v1" } }),
    onSuccess: () => {
      setMessage("Invitation accepted. Opening your school workspace…");
      setTimeout(() => void navigate({ to: "/app" }), 700);
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
            School invitation
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Activate your SHWAI account
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your invitation determines the school, role, and linked student/teacher/parent record.
            Do not share the invitation token.
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
            <Label htmlFor="invitation-token">Invitation token</Label>
            <Input
              id="invitation-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              minLength={20}
              autoComplete="one-time-code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password">Create password</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={12}
            />
          </div>
          {message ? (
            <p role="status" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              {message}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Activating…" : "Accept invitation"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-semibold text-primary hover:underline" to="/login">
            Already active? Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
