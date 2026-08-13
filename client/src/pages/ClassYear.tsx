import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getPlayersByBirthYear } from "@/lib/api";

export function ClassYear() {
  const { year = "" } = useParams<{ year: string }>();
  const birthYear = Number(year);
  // Match server: reject toddler / future years that are almost always bad source DOBs.
  const maxPlausibleYear = new Date().getFullYear() - 13;
  const isValidYear =
    Number.isInteger(birthYear) && birthYear >= 1880 && birthYear <= maxPlausibleYear;

  const { data, isLoading, error } = useQuery({
    queryKey: ["birth-year", birthYear],
    queryFn: () => getPlayersByBirthYear(birthYear),
    enabled: isValidYear,
  });

  const players = data?.players ?? [];
  const totalCount = data?.totalCount ?? 0;

  if (!isValidYear) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid birth year.</p>
        <BackButton fallback="/classes" className="mt-4 text-primary hover:underline" label="Back to Birth Year" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <BackButton fallback="/classes" label="Back to Birth Year" />

        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
              Birth Year
            </div>
            <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
              {birthYear}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Top 50 most viewed players born in {birthYear}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl border border-border bg-card/50"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            Unable to load players for this birth year.
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No players found for {birthYear}.
          </div>
        ) : (
          <>
            <p className="mb-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {totalCount > players.length
                ? `Showing top ${players.length} of ${totalCount} players`
                : `${totalCount} player${totalCount !== 1 ? "s" : ""}`}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
