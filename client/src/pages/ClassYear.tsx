import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getPlayersByClassOf } from "@/lib/api";

const MIN_CLASS_YEAR = 1950;
const MAX_CLASS_YEAR = 2040;

export function ClassYear() {
  const { year = "" } = useParams<{ year: string }>();
  const classYear = Number(year);
  const isValidYear =
    Number.isInteger(classYear) && classYear >= MIN_CLASS_YEAR && classYear <= MAX_CLASS_YEAR;

  const { data, isLoading, error } = useQuery({
    queryKey: ["class-of", classYear],
    queryFn: () => getPlayersByClassOf(classYear),
    enabled: isValidYear,
  });

  const players = data?.players ?? [];
  const totalCount = data?.totalCount ?? 0;

  if (!isValidYear) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid graduation class year.</p>
        <BackButton fallback="/classes" className="mt-4 text-primary hover:underline" label="Back to Classes" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <BackButton fallback="/classes" label="Back to Classes" />

        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
              High school class
            </div>
            <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
              Class of {classYear}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Top 50 most viewed players in the Class of {classYear}
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
            Unable to load players for this class.
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center text-muted-foreground">
            No players found for Class of {classYear}.
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
