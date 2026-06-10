import { useQuery } from "@tanstack/react-query";
import { FavoritesStrip } from "@/components/home/FavoritesStrip";
import { Hero } from "@/components/home/Hero";
import { PlayerGrid } from "@/components/home/PlayerGrid";
import { StatCounters } from "@/components/home/StatCounters";
import {
  getFeaturedPlayers,
  getPlayerCount,
  getPlayers,
  getSeasonCount,
  getTeamCount,
} from "@/lib/api";

const FAVORITES_KEY = "hoopcentral-favorites";

function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function Home() {
  const { data: playerCount } = useQuery({
    queryKey: ["player-count"],
    queryFn: getPlayerCount,
  });
  const { data: teamCount } = useQuery({
    queryKey: ["team-count"],
    queryFn: getTeamCount,
  });
  const { data: seasonCount } = useQuery({
    queryKey: ["season-count"],
    queryFn: getSeasonCount,
  });
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-players"],
    queryFn: getFeaturedPlayers,
  });
  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ["all-players-home"],
    queryFn: () => getPlayers(),
  });

  const mostViewed = [...allPlayers]
    .sort((a, b) => b.profileViews - a.profileViews)
    .slice(0, 5);

  const favoriteIds = getFavoriteIds();
  const favorites = allPlayers.filter((p) => favoriteIds.includes(p.id));

  return (
    <>
      <Hero />
      <StatCounters
        players={playerCount?.count ?? allPlayers.length}
        teams={teamCount?.count ?? 0}
        seasons={seasonCount?.count ?? 0}
      />
      <FavoritesStrip players={favorites} />
      <PlayerGrid
        title="Most"
        titleAccent="Viewed"
        subtitle="Trending athletes this week"
        players={mostViewed}
        loading={playersLoading}
        actionLabel="Explore Trends"
        actionHref="/players"
        actionVariant="ghost"
        variant="default"
      />
      <PlayerGrid
        title="Featured"
        titleAccent="Athletes"
        subtitle="Top performers from the current season"
        players={featured}
        loading={featuredLoading}
        variant="muted"
      />
    </>
  );
}
