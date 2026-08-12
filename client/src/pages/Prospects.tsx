import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getProspectPlayers } from "@/lib/api";

export function Prospects() {
  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospect-players"],
    queryFn: getProspectPlayers,
  });

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
              Hottest <span className="text-primary">Prospects</span>
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Top high school and college basketball prospects
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-5 md:gap-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-xl border border-border bg-card/50" />
            ))}
          </div>
        ) : prospects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-display text-2xl text-muted-foreground">No prospects found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated prospect profiles are not available yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
            {prospects.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
