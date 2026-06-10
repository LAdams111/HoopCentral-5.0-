import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@/lib/api";

export function FavoritesStrip({ players }: { players: PlayerCardType[] }) {
  if (players.length === 0) return null;

  return (
    <section className="border-b border-border/40 py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-shrink-0 items-center gap-2 border-r border-border pr-6">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold uppercase tracking-tight md:text-xl">
              Your Favorites
            </span>
          </div>
          <div className="flex items-center gap-4">
            {players.map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="group flex flex-shrink-0 flex-col items-center gap-1"
              >
                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-border transition-all duration-300 group-hover:border-primary">
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs font-bold text-muted-foreground">
                    {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                </div>
                <span className="max-w-[72px] truncate text-[10px] text-muted-foreground group-hover:text-primary">
                  {player.name.split(" ").pop()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
