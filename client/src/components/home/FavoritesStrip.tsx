import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Users } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { DEFAULT_HEADSHOT, nbaTeamLogoUrl } from "@/lib/constants";

const FAVORITES_KEY = "hoopcentral-favorites";
const PLAYER_FAVORITES_KEY = "player_favorites";
const TEAM_FAVORITES_KEY = "team_favorites";

interface StoredFavorite {
  id: string;
  name?: string;
  headshotUrl?: string;
}

function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function getStoredPlayerFavorites(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem(PLAYER_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredFavorite[];
    return Array.isArray(parsed) ? parsed : [];
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
  const [storedFavorites, setStoredFavorites] = useState<StoredFavorite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [teamFavorites, setTeamFavorites] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setStoredFavorites(getStoredPlayerFavorites());
    setFavoriteIds(getFavoriteIds());
    setTeamFavorites(getTeamFavorites());
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === FAVORITES_KEY ||
        e.key === PLAYER_FAVORITES_KEY ||
        e.key === TEAM_FAVORITES_KEY
      ) {
        refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const resolvedFromIds = players.filter((p) => favoriteIds.includes(p.id));
  const favoritePlayers =
    storedFavorites.length > 0
      ? storedFavorites.map((fav) => {
          const match = players.find((p) => String(p.id) === String(fav.id));
          return match ?? {
            id: Number(fav.id),
            name: fav.name ?? "Player",
            headshotUrl: fav.headshotUrl ?? "",
            team: "",
            position: "",
            height: "",
            weight: "",
            jerseyNumber: 0,
            bio: null,
            profileViews: 0,
            hometown: "",
            birthDate: null,
          };
        })
      : resolvedFromIds;

  const hasFavorites = favoritePlayers.length > 0 || teamFavorites.length > 0;

  return (
    <section className="overflow-hidden border-y border-border bg-background py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-shrink-0 items-center gap-2 border-r border-border pr-6">
            <Trophy className="h-4 w-4 text-primary" />
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
            ) : (
              <div className="flex items-center -space-x-4 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-muted/50"
                  >
                    <Users className="h-4 w-4" />
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/players"
              className="group flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border transition-all hover:border-primary hover:text-primary"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
