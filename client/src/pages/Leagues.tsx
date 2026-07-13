import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { getFeaturedLeagues, searchLeagues } from "@/lib/api";
import { enrichLeague } from "@/lib/leagues";
import { LeagueCard } from "@/components/leagues/LeagueCard";

export function Leagues() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = debounced.length >= 2;

  const { data: featured = [], isLoading: featuredLoading, error: featuredError } = useQuery({
    queryKey: ["leagues", "featured"],
    queryFn: getFeaturedLeagues,
    enabled: !searching,
  });

  const { data: searchResults = [], isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ["leagues", "search", debounced],
    queryFn: () => searchLeagues(debounced, 50),
    enabled: searching,
  });

  const isLoading = searching ? searchLoading : featuredLoading;
  const error = searching ? searchError : featuredError;
  const leagues = searching ? searchResults : featured;
  const displayLeagues = leagues.map(enrichLeague);

  if (isLoading && displayLeagues.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Failed to load leagues.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 md:mb-12">
        <h1 className="mb-2 font-display text-3xl font-bold md:mb-4 md:text-5xl">
          Leagues
        </h1>
        <p className="text-sm text-muted-foreground md:text-lg">
          Browse top leagues or search for others from player career data.
        </p>
      </div>

      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search leagues..."
          className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary md:text-base"
        />
      </div>

      {!searching && (
        <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Top leagues
        </p>
      )}

      {searching && displayLeagues.length === 0 && !searchLoading && (
        <p className="text-sm text-muted-foreground">No leagues found for &ldquo;{debounced}&rdquo;.</p>
      )}

      <div className="space-y-3 md:space-y-6">
        {displayLeagues.map((league) => (
          <LeagueCard key={league.slug} league={league} />
        ))}
      </div>

      {!searching && (
        <p className="mt-8 text-sm text-muted-foreground">
          Use the search bar above to find other leagues from around the world.
        </p>
      )}
    </div>
  );
}
