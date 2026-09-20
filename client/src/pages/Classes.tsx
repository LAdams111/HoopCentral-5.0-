import { useQuery } from "@tanstack/react-query";
import { ChevronRight, GraduationCap } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getClassOfCounts } from "@/lib/api";

function groupYearsByDecade(years: number[]): { decade: number; years: number[] }[] {
  const map = new Map<number, number[]>();
  for (const year of years) {
    const decade = Math.floor(year / 10) * 10;
    const list = map.get(decade) ?? [];
    list.push(year);
    map.set(decade, list);
  }
  return [...map.entries()]
    .map(([decade, decadeYears]) => ({
      decade,
      years: decadeYears.sort((a, b) => b - a),
    }))
    .sort((a, b) => b.decade - a.decade);
}

export function Classes() {
  const { data: yearCounts = [], isLoading, error } = useQuery({
    queryKey: ["class-of-counts"],
    queryFn: getClassOfCounts,
  });

  const decades = useMemo(
    () => groupYearsByDecade(yearCounts.map((row) => row.year)),
    [yearCounts],
  );

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-10 flex items-center gap-4 md:mb-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
              Class of
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              High school graduation years
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, section) => (
              <div
                key={section}
                className="rounded-2xl border border-border bg-muted/30 p-5 md:p-6"
              >
                <div className="mb-4 h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <div
                      key={i}
                      className="h-[4.5rem] animate-pulse rounded-xl border border-border bg-card/60"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            Unable to load class data.
          </div>
        ) : decades.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No graduation class data available yet.
          </div>
        ) : (
          <div className="space-y-8 md:space-y-10">
            {decades.map(({ decade, years }) => (
              <section
                key={decade}
                className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-muted/15 shadow-sm"
              >
                <div className="border-b border-border/80 bg-card/40 px-5 py-3 md:px-6">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    {decade}s
                  </h2>
                </div>
                <ul className="divide-y divide-border/70 px-3 py-2 md:px-4 md:py-3">
                  {years.map((year) => (
                    <li key={year}>
                      <Link
                        to={`/classes/${year}`}
                        className="hover-elevate group flex items-center justify-between gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-card/90 md:px-4 md:py-5"
                      >
                        <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-foreground md:text-5xl">
                          {year}
                        </span>
                        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary">
                          View
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
