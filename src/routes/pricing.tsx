import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_COMPARISON, PLANS } from "@/config/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "SHWAI Pricing — Starter, Professional & Enterprise AI" },
      { name: "description", content: "Compare SHWAI plans: Starter (₹25–50), Professional (₹75–100) and Enterprise AI (₹150–250) per student per year." },
      { property: "og:title", content: "SHWAI Pricing & Plan Comparison" },
      { property: "og:description", content: "Feature-by-feature comparison across Starter, Professional and Enterprise AI plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto size-4 text-success" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not included" />;
  return <span className="text-xs">{value}</span>;
}

function Pricing() {
  const groups = [...new Set(FEATURE_COMPARISON.map((r) => r.group))];
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">SH</div>
          <span className="text-sm font-bold tracking-tight">SHWAI</span>
        </Link>
        <Button asChild size="sm">
          <Link to="/app">Open demo</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <h1 className="text-3xl font-extrabold tracking-tight">Plans & pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Indicative pricing per student per year, billed annually in INR. This demo does not connect to a payment
          provider.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article key={p.id} className={`surface-panel flex flex-col p-6 ${p.highlight ? "ring-2 ring-primary" : ""}`}>
              {p.highlight ? (
                <span className="mb-3 w-fit rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Most schools start here
                </span>
              ) : null}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="text-xs text-muted-foreground">{p.versions}</p>
              <p className="mt-4 text-3xl font-extrabold text-numeric">
                ₹{p.priceMin}–{p.priceMax}
              </p>
              <p className="text-xs text-muted-foreground">{p.priceUnit}</p>
              <p className="mt-4 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.includes.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={p.highlight ? "default" : "outline"}>
                <Link to="/app/subscription">Manage in app</Link>
              </Button>
            </article>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-bold tracking-tight">Feature comparison</h2>
        <div className="mt-4 overflow-x-auto scrollbar-slim">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className="sticky left-0 z-10 bg-background px-3 py-2 font-semibold">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-center font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <>
                  <tr key={g}>
                    <td colSpan={4} className="bg-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g}
                    </td>
                  </tr>
                  {FEATURE_COMPARISON.filter((r) => r.group === g).map((r) => (
                    <tr key={r.feature} className="border-b border-border">
                      <td className="sticky left-0 z-10 bg-background px-3 py-2.5">{r.feature}</td>
                      <td className="px-3 py-2.5 text-center"><Cell value={r.starter} /></td>
                      <td className="px-3 py-2.5 text-center"><Cell value={r.professional} /></td>
                      <td className="px-3 py-2.5 text-center"><Cell value={r.enterprise} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
