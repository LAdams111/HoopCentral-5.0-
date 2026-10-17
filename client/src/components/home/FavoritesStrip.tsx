import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Users } from "lucide-react";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { getPlayer } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { onHeadshotError, resolvePlayerHeadshot } from "@/lib/headshot";

export function FavoritesStrip() {
  const { players, teams } = useFavorites();

  const playerQueries = useQueries({
    queries: players.map((player) => ({
      queryKey: ["player", player.id],
      queryFn: () => getPlayer(player.id),
    })),
  });

  const favoritePlayers = players.map((player, index) => playerQueries[index]?.data ?? player);
  const hasFavorites = favoritePlayers.length > 0 || teams.length > 0;

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
            {teams.map((team) => (
              <Link
                key={`${team.leagueSlug ?? ""}:${team.slug}`}
                to={`/teams/${encodeURIComponent(team.slug)}`}
                className="group relative flex-shrink-0"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-white p-1.5 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary">
                  <TeamLogo
                    teamName={team.name}
                    leagueSlug={team.leagueSlug}
                    abbreviation={team.abbreviation}
                    slug={team.slug}
                    alt={team.name}
                    className="h-full w-full object-contain"
                  />
                </div>
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
                      src={resolvePlayerHeadshot(player.headshotUrl)}
                      alt={player.name}
                      className="h-full w-full object-cover object-top"
                      onError={onHeadshotError}
                    />
                  </div>
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
          </div>
        </div>
      </div>
    </section>
  );
}
