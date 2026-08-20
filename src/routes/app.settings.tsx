import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState } from "@/app/providers/app-state";
import { changePassword, listSessions, revokeSession } from "@/actions/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  regenerateMfaRecoveryCodes,
} from "@/actions/mfa";
import { LANGUAGES } from "@/data/mock/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function MfaPanel() {
  const statusQuery = useQuery({
    queryKey: ["mfa-status"],
    queryFn: () => getMfaStatus(),
    retry: false,
  });
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    otpauthUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const beginMutation = useMutation({
    mutationFn: () => beginMfaEnrollment(),
    onSuccess: (result) => setEnrollment(result),
    onError: (error: Error) => toast.error(error.message),
  });
  const confirmMutation = useMutation({
    mutationFn: () => confirmMfaEnrollment({ data: { code } }),
    onSuccess: async () => {
      setEnrollment(null);
      setCode("");
      await statusQuery.refetch();
      toast.success("MFA enabled");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const disableMutation = useMutation({
    mutationFn: () => disableMfa({ data: { password } }),
    onSuccess: async () => {
      setPassword("");
      await statusQuery.refetch();
      toast.success("MFA disabled");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const recoveryMutation = useMutation({
    mutationFn: () => regenerateMfaRecoveryCodes({ data: { password } }),
    onSuccess: (result) => {
      setPassword("");
      setEnrollment({ secret: "", otpauthUrl: "", recoveryCodes: result.recoveryCodes });
      toast.success("New recovery codes generated; store them securely");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const enabled = Boolean(statusQuery.data?.enabled);
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-semibold">Authenticator MFA</p>
        <p className="text-xs text-muted-foreground">
          {enabled ? "Enabled for this account." : "Not enabled for this account."}
        </p>
      </div>
      {!enabled && !enrollment ? (
        <Button
          variant="outline"
          onClick={() => beginMutation.mutate()}
          disabled={beginMutation.isPending}
        >
          Begin enrollment
        </Button>
      ) : null}
      {enrollment ? (
        <div className="space-y-3 rounded-md bg-muted/40 p-3 text-xs">
          {enrollment.secret ? (
            <>
              <p>
                Enter this secret in an authenticator app:{" "}
                <code className="break-all">{enrollment.secret}</code>
              </p>
              <p className="break-all text-muted-foreground">
                Provisioning URI: {enrollment.otpauthUrl}
              </p>
            </>
          ) : null}
          <p className="font-semibold">
            Store these recovery codes securely. Each code works once.
          </p>
          <code className="block whitespace-pre-wrap rounded bg-background p-2">
            {enrollment.recoveryCodes.join("\\n")}
          </code>
          {!enabled ? (
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || code.length !== 6}
              >
                Confirm
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {enabled ? (
        <div className="space-y-2">
          <Label htmlFor="mfa-password">Current password for security changes</Label>
          <Input
            id="mfa-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => recoveryMutation.mutate()}
              disabled={recoveryMutation.isPending || !password}
            >
              Regenerate recovery codes
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending || !password}
            >
              Disable MFA
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PasswordAndSessionsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: () => listSessions(),
    retry: false,
  });
  const changeMutation = useMutation({
    mutationFn: () => changePassword({ data: { currentPassword, newPassword } }),
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      await sessionsQuery.refetch();
      toast.success("Password changed; other sessions were revoked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSession({ data: { id } }),
    onSuccess: () => void sessionsQuery.refetch(),
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-semibold">Password and active sessions</p>
        <p className="text-xs text-muted-foreground">
          Changing the password revokes all other sessions and rotates this session.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          type="password"
          placeholder="New password (12+ characters)"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={12}
        />
      </div>
      <Button
        variant="outline"
        onClick={() => changeMutation.mutate()}
        disabled={changeMutation.isPending || !currentPassword || newPassword.length < 12}
      >
        Change password
      </Button>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active sessions
        </p>
        {sessionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sessions…</p>
        ) : sessionsQuery.data?.length ? (
          sessionsQuery.data.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-xs"
            >
              <span>
                Last active {new Date(session.last_seen_at).toLocaleString()} · expires{" "}
                {new Date(session.expires_at).toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revokeMutation.mutate(session.id)}
                disabled={revokeMutation.isPending}
              >
                Revoke
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        )}
      </div>
    </div>
  );
}

function Settings() {
  const { locale, setLocale, offline, setOffline } = useAppState();
  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Control centre
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          School, user, AI and data settings. All changes are demo-only.
        </p>
      </header>

      <Tabs defaultValue="school">
        <TabsList className="flex-wrap rounded-xl bg-card p-1 shadow-sm">
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="data">Data & privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="surface-panel mt-4 p-5 sm:p-6">
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold">No school connected yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              School profile and academic-year settings will appear here after a verified school
              connection is configured.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="user" className="surface-panel mt-4 space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uname">Display name</Label>
              <Input id="uname" placeholder="Not connected" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ulang">Language preference</Label>
              <select
                id="ulang"
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.native}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Offline & low-data mode</p>
              <p className="text-xs text-muted-foreground">
                Queue attendance and marks locally, then sync.
              </p>
            </div>
            <Switch
              checked={offline}
              onCheckedChange={setOffline}
              aria-label="Toggle offline mode"
            />
          </div>
          <Button onClick={() => toast.success("Preferences saved locally")}>
            Save preferences
          </Button>
          <MfaPanel />
          <PasswordAndSessionsPanel />
        </TabsContent>

        <TabsContent value="ai" className="surface-panel mt-4 space-y-3 p-5 sm:p-6">
          {[
            ["Restrict AI answers to school-approved sources", true],
            ["Require teacher approval before publishing AI-generated assessments", true],
            ["Allow the student tutor to give a full explanation after five hints", true],
            ["Allow model training on school data", false],
            ["Show advertising to students", false],
          ].map(([label, on]) => (
            <div
              key={String(label)}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <p className="text-sm">{label}</p>
              <Switch defaultChecked={Boolean(on)} aria-label={String(label)} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="data" className="surface-panel mt-4 p-5 sm:p-6">
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold">No connected data controls yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Retention, consent, deletion, and export controls will appear here when a school data
              connection is configured.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      <FloatingAI />
    </div>
  );
}
