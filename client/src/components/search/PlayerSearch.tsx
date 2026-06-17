import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, type PlayerCard } from "@/lib/api";
import { resolvePlayerHeadshot, onHeadshotError } from "@/lib/headshot";

export function PlayerSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [] } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => getPlayers(debounced),
    enabled: debounced.length >= 2,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToPlayer = (player: PlayerCard) => {
    setOpen(false);
    setQuery("");
    navigate(`/players/${player.id}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[0]) goToPlayer(results[0]);
    else if (query.trim()) navigate(`/players?q=${encodeURIComponent(query.trim())}`);
  };

  const showDropdown = open && debounced.length >= 2;

  return (
    <div
      ref={ref}
      className="group relative z-[100] mx-auto max-w-md animate-fade-in-up delay-300"
    >
      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players or teams..."
          className="flex h-9 w-full rounded-full border-2 border-black bg-white/5 px-3 py-7 pl-12 pr-12 text-base ring-offset-background transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
        />
        <button
          type="submit"
          className="hover-elevate active-elevate-2 absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--primary-border)] bg-primary p-0 text-primary-foreground shadow-xs"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <Dropdown results={results} onSelect={goToPlayer} />
        </>
      )}
    </div>
  );
}

function Dropdown({
  results,
  onSelect,
}: {
  results: PlayerCard[];
  onSelect: (p: PlayerCard) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="py-2">
        {results.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No players found.</p>
        ) : (
          results.slice(0, 8).map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelect(player)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover-elevate"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full border border-border">
                <img
                  src={resolvePlayerHeadshot(player.headshotUrl)}
                  alt={player.name}
                  className="h-full w-full object-cover object-top"
                  onError={onHeadshotError}
                />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-foreground transition-colors group-hover:text-primary">
                  {player.name}
                </p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {player.team} • #{player.jerseyNumber}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
