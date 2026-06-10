import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { getPlayers } from "@/lib/api";

export function Classes() {
  const { data: players = [] } = useQuery({
    queryKey: ["all-players-classes"],
    queryFn: () => getPlayers(),
  });

  const yearCounts = players.reduce<Record<number, number>>((acc, p) => {
    if (!p.birthDate) return acc;
    const year = new Date(p.birthDate).getFullYear();
    acc[year] = (acc[year] ?? 0) + 1;
    return acc;
  }, {});

  const years = Object.keys(yearCounts)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
              Birth <span className="text-primary">Year</span>
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Browse players by birth year
            </p>
          </div>
        </div>

        {years.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No birth year data available yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {years.map((year) => (
              <Link
                key={year}
                to={`/players?q=`}
                className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-5 py-4 transition-all hover:border-primary/50 hover:bg-card"
              >
                <span className="font-display text-3xl text-foreground">{year}</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {yearCounts[year]} players
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
