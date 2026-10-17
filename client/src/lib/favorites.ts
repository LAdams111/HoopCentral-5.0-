import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export type FavoritePlayer = {
  id: number;
  name: string;
  headshotUrl: string;
};

export type FavoriteTeam = {
  slug: string;
  name: string;
  leagueSlug?: string;
  abbreviation?: string;
};

type FavoriteLists = {
  players: FavoritePlayer[];
  teams: FavoriteTeam[];
};

const emptyLists: FavoriteLists = { players: [], teams: [] };

async function loadFavorites(token: string, refresh: () => Promise<string | null>): Promise<FavoriteLists> {
  const load = (access: string) =>
    fetch("/api/favorites", {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
  let response = await load(token);
  if (response.status === 401) {
    const next = await refresh();
    if (next) response = await load(next);
  }
  if (!response.ok) throw new Error("Could not load favorites");
  const body = (await response.json()) as Partial<FavoriteLists>;
  return {
    players: Array.isArray(body.players) ? body.players : [],
    teams: Array.isArray(body.teams) ? body.teams : [],
  };
}

async function postFavorite(
  token: string,
  refresh: () => Promise<string | null>,
  body: Record<string, unknown>,
): Promise<boolean> {
  const send = (access: string) =>
    fetch("/api/favorites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  let response = await send(token);
  if (response.status === 401) {
    const next = await refresh();
    if (next) response = await send(next);
  }
  if (!response.ok) throw new Error("Could not update favorite");
  const saved = (await response.json()) as { favorited?: boolean };
  return saved.favorited === true;
}

export function useFavorites() {
  const { session, refreshAccessToken } = useAuth();
  const userId = session?.user.id ?? null;
  const token = session?.access_token ?? "";
  const queryClient = useQueryClient();
  const queryKey = ["favorites", userId] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId && token),
    queryFn: () => loadFavorites(token, refreshAccessToken),
  });

  const lists = userId ? (query.data ?? emptyLists) : emptyLists;

  const togglePlayer = async (player: FavoritePlayer) => {
    if (!userId || !token) return false;
    const current = queryClient.getQueryData<FavoriteLists>(queryKey) ?? emptyLists;
    const exists = current.players.some((item) => item.id === player.id);
    const next = {
      ...current,
      players: exists ? current.players.filter((item) => item.id !== player.id) : [player, ...current.players],
    };
    queryClient.setQueryData(queryKey, next);
    try {
      const favorited = await postFavorite(token, refreshAccessToken, {
        kind: "player",
        playerId: player.id,
      });
      await queryClient.invalidateQueries({ queryKey });
      return favorited;
    } catch {
      queryClient.setQueryData(queryKey, current);
      return exists;
    }
  };

  const toggleTeam = async (team: FavoriteTeam) => {
    if (!userId || !token) return false;
    const current = queryClient.getQueryData<FavoriteLists>(queryKey) ?? emptyLists;
    const key = `${team.leagueSlug ?? ""}:${team.slug}`;
    const exists = current.teams.some((item) => `${item.leagueSlug ?? ""}:${item.slug}` === key);
    const next = {
      ...current,
      teams: exists
        ? current.teams.filter((item) => `${item.leagueSlug ?? ""}:${item.slug}` !== key)
        : [team, ...current.teams],
    };
    queryClient.setQueryData(queryKey, next);
    try {
      const favorited = await postFavorite(token, refreshAccessToken, {
        kind: "team",
        slug: team.slug,
        leagueSlug: team.leagueSlug ?? "",
      });
      await queryClient.invalidateQueries({ queryKey });
      return favorited;
    } catch {
      queryClient.setQueryData(queryKey, current);
      return exists;
    }
  };

  return {
    players: lists.players,
    teams: lists.teams,
    isLoading: Boolean(userId) && query.isLoading,
    togglePlayer,
    toggleTeam,
  };
}
