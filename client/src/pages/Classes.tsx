import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { getClassOfCounts } from "@/lib/api";

export function Classes() {
  const { data: yearCounts = [], isLoading, error } = useQuery({
    queryKey: ["class-of-counts"],
    queryFn: getClassOfCounts,
  });

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex items-center gap-4">
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
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-border bg-card/50"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            Unable to load class data.
          </div>
        ) : yearCounts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No graduation class data available yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {yearCounts.map(({ year }) => (
              <Link
                key={year}
                to={`/classes/${year}`}
                className="flex items-center justify-center rounded-xl border border-border bg-card/50 px-5 py-4 transition-all hover:border-primary/50 hover:bg-card"
              >
                <span className="font-display text-3xl text-foreground md:text-4xl">{year}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
