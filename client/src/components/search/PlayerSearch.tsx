import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, type PlayerCard } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface PlayerSearchProps {
  variant?: "hero" | "header";
  placeholder?: string;
}

export function PlayerSearch({
  variant = "hero",
  placeholder = "Search players or teams...",
}: PlayerSearchProps) {
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

  if (variant === "header") {
    return (
      <div ref={ref} className="relative hidden w-56 lg:block">
        <form onSubmit={onSubmit}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search player name..."
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        {open && debounced.length >= 2 && results.length > 0 && (
          <Dropdown results={results} onSelect={goToPlayer} />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative z-[100] mx-auto max-w-md animate-fade-in-up delay-300">
      <form onSubmit={onSubmit} className="group relative">
        <Search className="absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-full border-2 border-black bg-white/5 py-7 pl-12 pr-14 text-lg text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-2 top-2 rounded-full"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      {open && debounced.length >= 2 && (
        <Dropdown results={results} onSelect={goToPlayer} />
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
      {results.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No players found.</p>
      ) : (
        results.slice(0, 8).map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => onSelect(player)}
            className="flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/30"
          >
            <div>
              <p className="font-medium text-foreground">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.team}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))
      )}
    </div>
  );
}
