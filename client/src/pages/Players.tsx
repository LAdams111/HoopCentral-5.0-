import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getPlayers } from "@/lib/api";

export function Players() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players", debouncedQuery],
    queryFn: () => getPlayers(debouncedQuery || undefined),
  });

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl text-foreground md:text-5xl">Players</h1>
          <p className="mt-2 text-muted-foreground">
            Search the Hoop Central player database
          </p>
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by player name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-card/50 py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl bg-muted/30"
              />
            ))}
          </div>
        ) : players.length === 0 ? (
          <p className="rounded-xl border border-border/50 bg-card/30 p-12 text-center text-muted-foreground">
            No players found matching &ldquo;{debouncedQuery}&rdquo;
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {players.length} player{players.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
