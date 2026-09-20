import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getClassOfCounts } from "@/lib/api";

export function Classes() {
  const { data: yearCounts = [], isLoading, error } = useQuery({
    queryKey: ["class-of-counts"],
    queryFn: getClassOfCounts,
  });

  const years = useMemo(
    () => [...yearCounts.map((row) => row.year)].sort((a, b) => b - a),
    [yearCounts],
  );

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse bg-muted/40" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            Unable to load class data.
          </div>
        ) : years.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No graduation class data available yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border bg-muted/25 px-5 py-3 md:px-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Select a graduation year
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {years.map((year) => {
                const suffix = String(year).slice(-2);
                const isRecent = year >= 2015;
                return (
                  <Link
                    key={year}
                    to={`/classes/${year}`}
                    className={`hover-elevate group flex min-h-[5.5rem] flex-col items-center justify-center px-2 py-6 transition-colors md:min-h-[6.5rem] md:py-8 ${
                      isRecent ? "bg-card hover:bg-primary/[0.06]" : "bg-card/80 hover:bg-card"
                    }`}
                  >
                    <span className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.35em] text-primary/80 md:text-[11px]">
                      &apos;{suffix}
                    </span>
                    <span className="font-display text-4xl font-bold tabular-nums leading-none tracking-tighter text-foreground transition-colors group-hover:text-primary md:text-5xl">
                      {year}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
