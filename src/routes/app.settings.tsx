import { createFileRoute } from "@tanstack/react-router";
import { useAppState } from "@/app/providers/app-state";
import { LANGUAGES } from "@/data/mock/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FloatingAI } from "@/components/feedback/floating-ai";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const { locale, setLocale, offline, setOffline } = useAppState();
  return (
    <div className="relative space-y-6">
      <header>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Control centre</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">School, user, AI and data settings.</p>
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
               School profile and academic-year settings will appear here after a verified school connection is configured.
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
              <p className="text-xs text-muted-foreground">Queue attendance and marks locally, then sync.</p>
            </div>
            <Switch checked={offline} onCheckedChange={setOffline} aria-label="Toggle offline mode" />
          </div>
          <Button onClick={() => toast.success("Preferences saved")}>Save preferences</Button>
        </TabsContent>

         <TabsContent value="ai" className="surface-panel mt-4 space-y-3 p-5 sm:p-6">
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

          <TabsContent value="data" className="surface-panel mt-4 p-5 sm:p-6">
           <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
             <p className="text-sm font-semibold">No connected data controls yet</p>
             <p className="mt-1 max-w-md text-sm text-muted-foreground">
               Retention, consent, deletion, and export controls will appear here when a school data connection is configured.
             </p>
           </div>
        </TabsContent>
      </Tabs>
      <FloatingAI />
    </div>
  );
}
