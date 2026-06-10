import type { CareerEntry } from "@/lib/api";

export function CareerTimeline({ career }: { career: CareerEntry[] }) {
  if (career.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-6">
          <h3 className="font-display text-2xl">Career History</h3>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          No career history available.
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="border-b border-border p-6">
        <h3 className="font-display text-2xl">Career History</h3>
      </div>
      <div className="divide-y divide-border">
        {career.map((entry) => (
          <div
            key={`${entry.team}-${entry.league}`}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div>
              <p className="font-medium text-primary">{entry.team}</p>
              <p className="font-mono text-sm text-muted-foreground">{entry.league}</p>
            </div>
            <p className="font-mono text-sm text-foreground">
              {entry.fromSeason}
              {entry.toSeason && entry.toSeason !== entry.fromSeason
                ? ` → ${entry.toSeason}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
