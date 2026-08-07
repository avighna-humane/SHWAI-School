import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, ClipboardCheck, LineChart, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHWAI — The AI-Native School Operating System" },
      { name: "description", content: "SHWAI unifies school administration, academics, AI teaching support and predictive intelligence for Indian schools in one operating system." },
      { property: "og:title", content: "SHWAI — The AI-Native School Operating System" },
      { property: "og:description", content: "One operating system for attendance, academics, AI learning, interventions and school intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  { icon: ClipboardCheck, title: "Run the school", body: "Attendance, homework, gradebook, exams, timetable, fees, transport and admissions in one place." },
  { icon: BrainCircuit, title: "Teach with AI", body: "Lesson plans, worksheets, quizzes and report-card drafts — every output carries its evidence." },
  { icon: Sparkles, title: "Learn with guardrails", body: "A Socratic tutor that gives five progressive hints before it ever gives an answer." },
  { icon: LineChart, title: "See what is coming", body: "Early warning, learning debt, workload strain and predictions with confidence intervals." },
  { icon: WifiOff, title: "Built for India", body: "Offline attendance, shared-device kiosks, regional-language messaging and INR fee structures." },
  { icon: ShieldCheck, title: "Governed by design", body: "Consent-based context, audit logs, AI provenance and human approval on high-stakes calls." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">SH</div>
          <div>
            <p className="text-sm font-bold tracking-tight">SHWAI</p>
            <p className="text-[11px] text-muted-foreground">School Operating System</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app">
              Open demo <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative overflow-hidden border-y border-border bg-card">
        <div className="grid-faint absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-ai" aria-hidden /> Frontend demo · realistic mock data
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            The AI-native operating system for modern Indian schools
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
            Administration, academics, AI teaching support, early warning and decision intelligence — one system, six
            roles, evidence behind every recommendation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/app">
                Enter the demo <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See plans & pricing</Link>
            </Button>
          </div>
          <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[["6", "roles"], ["45+", "modules"], ["1,284", "students in demo"], ["₹25–250", "per student / year"]].map(([v, l]) => (
              <div key={l} className="surface-panel px-4 py-3">
                <dt className="text-lg font-bold text-numeric">{v}</dt>
                <dd className="text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Six layers, one system</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="surface-panel p-5">
              <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Plans</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Indicative pricing per student per year. No payment processing in this demo.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <article key={p.id} className="surface-panel flex flex-col p-6">
                <p className="text-sm font-semibold text-primary">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.versions}</p>
                <p className="mt-4 text-2xl font-bold text-numeric">
                  ₹{p.priceMin}–{p.priceMax}
                </p>
                <p className="text-xs text-muted-foreground">{p.priceUnit}</p>
                <p className="mt-4 text-sm text-muted-foreground">{p.tagline}</p>
                <Button asChild variant={p.highlight ? "default" : "outline"} className="mt-6">
                  <Link to="/pricing">Compare features</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-muted-foreground">
        SHWAI demo · frontend only · no backend, no real authentication, no payments, no live AI.
      </footer>
    </div>
  );
}
