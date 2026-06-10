import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { DEFAULT_HEADSHOT, nbaTeamLogoUrl } from "@/lib/constants";

const FAVORITES_KEY = "hoopcentral-favorites";
const TEAM_FAVORITES_KEY = "team_favorites";

function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function getTeamFavorites(): string[] {
  try {
    const raw = localStorage.getItem(TEAM_FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function FavoritesStrip({ players }: { players: PlayerCardType[] }) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [teamFavorites, setTeamFavorites] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setFavoriteIds(getFavoriteIds());
    setTeamFavorites(getTeamFavorites());
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY || e.key === TEAM_FAVORITES_KEY) refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const favoritePlayers = players.filter((p) => favoriteIds.includes(p.id));
  const hasFavorites = favoritePlayers.length > 0 || teamFavorites.length > 0;

  return (
    <section className="overflow-hidden border-y border-border bg-background py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-shrink-0 items-center gap-2 border-r border-border pr-6">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold uppercase tracking-tight md:text-xl">
              Your Favorites
            </span>
          </div>

          <div className="flex items-center gap-4">
            {teamFavorites.map((team) => (
              <Link
                key={team}
                to={`/players?q=${encodeURIComponent(team)}`}
                className="group relative flex-shrink-0"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-white p-1.5 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary">
                  <img
                    src={nbaTeamLogoUrl(team)}
                    alt={team}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}

            {hasFavorites ? (
              favoritePlayers.map((player) => (
                <Link
                  key={player.id}
                  to={`/players/${player.id}`}
                  className="group relative flex-shrink-0"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-border shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary">
                    <img
                      src={player.headshotUrl || DEFAULT_HEADSHOT}
                      alt={player.name}
                      className="h-full w-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_HEADSHOT;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))
            ) : teamFavorites.length === 0 ? (
              <div className="flex items-center -space-x-4 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-12 rounded-full border-2 border-dashed border-border bg-muted"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
