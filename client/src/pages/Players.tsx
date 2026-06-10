import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getPlayers } from "@/lib/api";

export function Players() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players", debouncedQuery],
    queryFn: () => getPlayers(debouncedQuery || undefined),
  });

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 md:mb-12 md:flex-row md:items-end md:gap-6">
          <div>
            <h1 className="mb-2 font-display text-4xl text-foreground md:text-6xl">
              Player <span className="text-primary">Directory</span>
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Search the complete Hoop Central database
            </p>
          </div>
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search player name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
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
        ) : players.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-card/30 py-24 text-center">
            <p className="font-display text-2xl text-muted-foreground">No players found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search term
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {players.length} player{players.length !== 1 ? "s" : ""} found
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
