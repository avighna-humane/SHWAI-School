import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ActivityRow {
  id: string;
  name: string;
  viewed: boolean;
  firstViewedAt: string | null;
  /** Optional extra column rendered after "First viewed" (e.g. submission status). */
  extra?: { label: string; status: "submitted" | "late" | "pending" | "none" };
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "viewed", label: "Viewed" },
  { id: "not-viewed", label: "Not viewed" },
  { id: "submitted", label: "Submitted" },
  { id: "not-submitted", label: "Not submitted" },
  { id: "late", label: "Late" },
] as const;

export function ActivityTable({ rows, showSubmissions }: { rows: ActivityRow[]; showSubmissions?: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    return rows
      .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "viewed") return r.viewed;
        if (filter === "not-viewed") return !r.viewed;
        if (filter === "submitted") return r.extra?.status === "submitted" || r.extra?.status === "late";
        if (filter === "not-submitted") return r.extra?.status === "pending" || r.extra?.status === "none";
        if (filter === "late") return r.extra?.status === "late";
        return true;
      });
  }, [rows, query, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="flex-wrap rounded-xl bg-muted p-1">
            {FILTERS.filter((f) => showSubmissions || (f.id !== "submitted" && f.id !== "not-submitted" && f.id !== "late")).map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full max-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name…" className="h-8 pl-8 text-xs" />
        </div>
      </div>
      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Viewed</TableHead>
              <TableHead>First viewed</TableHead>
              {showSubmissions ? <TableHead>Submission</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSubmissions ? 4 : 3} className="py-8 text-center text-sm text-muted-foreground">
                  No matching records.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-[11px]",
                        r.viewed ? "border-success/30 bg-success-soft text-success" : "border-border text-muted-foreground",
                      )}
                    >
                      {r.viewed ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.firstViewedAt)}</TableCell>
                  {showSubmissions ? (
                    <TableCell>
                      {r.extra ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[11px]",
                            r.extra.status === "late"
                              ? "border-warning/30 bg-warning-soft text-warning"
                              : r.extra.status === "submitted"
                                ? "border-success/30 bg-success-soft text-success"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          {r.extra.label}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
