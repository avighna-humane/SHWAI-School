import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { LANGUAGES } from "@/data/mock/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const { school, year, locale, setLocale, offline, setOffline, user } = useAppState();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">School, user, AI and data settings. All changes are demo-only.</p>
      </header>

      <Tabs defaultValue="school">
        <TabsList className="flex-wrap">
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="data">Data & privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="surface-panel mt-4 space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sname">School name</Label>
              <Input id="sname" defaultValue={school.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scode">School code</Label>
              <Input id="scode" defaultValue={school.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sboard">Board</Label>
              <Input id="sboard" defaultValue={school.board} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="syear">Active academic year</Label>
              <Input id="syear" defaultValue={year.label} readOnly />
            </div>
          </div>
          <Button onClick={() => toast.success("School settings saved (demo)")}>Save changes</Button>
        </TabsContent>

        <TabsContent value="user" className="surface-panel mt-4 space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uname">Display name</Label>
              <Input id="uname" defaultValue={user.name} />
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
              <p className="text-xs text-muted-foreground">Queue attendance and marks locally, then sync.</p>
            </div>
            <Switch checked={offline} onCheckedChange={setOffline} aria-label="Toggle offline mode" />
          </div>
          <Button onClick={() => toast.success("Preferences saved (demo)")}>Save preferences</Button>
        </TabsContent>

        <TabsContent value="ai" className="surface-panel mt-4 space-y-3 p-5">
          {[
            ["Restrict AI answers to school-approved sources", true],
            ["Require teacher approval before publishing AI-generated assessments", true],
            ["Allow the student tutor to give a full explanation after five hints", true],
            ["Allow model training on school data", false],
            ["Show advertising to students", false],
          ].map(([label, on]) => (
            <div key={String(label)} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <p className="text-sm">{label}</p>
              <Switch defaultChecked={Boolean(on)} aria-label={String(label)} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="data" className="surface-panel mt-4 space-y-3 p-5">
          {[
            ["Data retention", "Student records retained for 8 years after exit"],
            ["Data deletion workflow", "Two-step approval with 30-day recovery window"],
            ["Parent consent controls", "Consent required for context passport entries"],
            ["Data access requests", "3 open requests · 5 working day SLA"],
            ["Data export", "Standard CSV and JSON export available"],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Opened (demo)")}>
                Manage
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
