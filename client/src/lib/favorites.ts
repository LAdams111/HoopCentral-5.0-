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

const PLAYERS_KEY = "hoopcentral-user-player-favorites";
const TEAMS_KEY = "hoopcentral-user-team-favorites";
const LEGACY_IDS_KEY = "hoopcentral-favorites";
const LEGACY_PLAYERS_KEY = "player_favorites";
const CHANGE_EVENT = "hoopcentral-favorites-changed";

function readMap<T>(key: string): Record<string, T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function legacyPlayers(): FavoritePlayer[] {
  const byId = new Map<number, FavoritePlayer>();
  try {
    const raw = localStorage.getItem(LEGACY_PLAYERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || typeof item !== "object" || !("id" in item)) continue;
        const id = Number((item as { id: unknown }).id);
        if (!Number.isInteger(id)) continue;
        const name = "name" in item && typeof (item as { name?: unknown }).name === "string"
          ? (item as { name: string }).name
          : "Player";
        const headshotUrl = "headshotUrl" in item && typeof (item as { headshotUrl?: unknown }).headshotUrl === "string"
          ? (item as { headshotUrl: string }).headshotUrl
          : "";
        byId.set(id, { id, name, headshotUrl });
      }
    }
  } catch {
    /* ignore broken legacy favorites */
  }
  try {
    const raw = localStorage.getItem(LEGACY_IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const idValue of parsed) {
        const id = Number(idValue);
        if (Number.isInteger(id) && !byId.has(id)) {
          byId.set(id, { id, name: "Player", headshotUrl: "" });
        }
      }
    }
  } catch {
    /* ignore broken legacy favorites */
  }
  return [...byId.values()];
}

export function readPlayerFavorites(userId: string): FavoritePlayer[] {
  const stored = readMap<FavoritePlayer[]>(PLAYERS_KEY);
  if (stored && Array.isArray(stored[userId])) return stored[userId];
  const seeded = legacyPlayers();
  const next = { ...(stored ?? {}), [userId]: seeded };
  writeMap(PLAYERS_KEY, next);
  return seeded;
}

export function readTeamFavorites(userId: string): FavoriteTeam[] {
  const stored = readMap<FavoriteTeam[]>(TEAMS_KEY);
  if (stored && Array.isArray(stored[userId])) return stored[userId];
  return [];
}

export function isPlayerFavorite(userId: string, playerId: number): boolean {
  return readPlayerFavorites(userId).some((player) => player.id === playerId);
}

export function isTeamFavorite(userId: string, team: Pick<FavoriteTeam, "slug" | "leagueSlug">): boolean {
  const key = teamKey(team);
  return readTeamFavorites(userId).some((item) => teamKey(item) === key);
}

export function togglePlayerFavorite(userId: string, player: FavoritePlayer): boolean {
  const current = readPlayerFavorites(userId);
  const exists = current.some((item) => item.id === player.id);
  const next = exists ? current.filter((item) => item.id !== player.id) : [player, ...current];
  const stored = readMap<FavoritePlayer[]>(PLAYERS_KEY) ?? {};
  writeMap(PLAYERS_KEY, { ...stored, [userId]: next });
  return !exists;
}

export function toggleTeamFavorite(userId: string, team: FavoriteTeam): boolean {
  const current = readTeamFavorites(userId);
  const key = teamKey(team);
  const exists = current.some((item) => teamKey(item) === key);
  const next = exists ? current.filter((item) => teamKey(item) !== key) : [team, ...current];
  const stored = readMap<FavoriteTeam[]>(TEAMS_KEY) ?? {};
  writeMap(TEAMS_KEY, { ...stored, [userId]: next });
  return !exists;
}

export function subscribeFavorites(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function teamKey(team: Pick<FavoriteTeam, "slug" | "leagueSlug">): string {
  return `${team.leagueSlug ?? ""}:${team.slug}`;
}
