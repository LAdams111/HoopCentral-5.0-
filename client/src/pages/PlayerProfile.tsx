import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Flag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RecentSeasonPanel } from "@/components/player/RecentSeasonPanel";
import { SeasonHistoryTable } from "@/components/player/SeasonHistoryTable";
import { getPlayer, incrementProfileView } from "@/lib/api";

const FAVORITES_KEY = "hoopcentral-favorites";

function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function toggleFavorite(id: number): boolean {
  const favs = getFavorites();
  const exists = favs.includes(id);
  const next = exists ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !exists;
}

function calcAge(birthDate: string): number | null {
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

function formatBirthDate(birthDate: string): string {
  return new Date(birthDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);
  const queryClient = useQueryClient();

  const { data: player, isLoading, error } = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => getPlayer(playerId),
    enabled: !Number.isNaN(playerId),
  });

  const viewMutation = useMutation({
    mutationFn: () => incrementProfileView(playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      queryClient.invalidateQueries({ queryKey: ["all-players-home"] });
    },
  });

  useEffect(() => {
    if (!Number.isNaN(playerId)) {
      viewMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (player) {
      setIsFavorite(getFavorites().includes(player.id));
    }
  }, [player]);

  const handleFavorite = () => {
    if (!player) return;
    const nowFav = toggleFavorite(player.id);
    setIsFavorite(nowFav);
    queryClient.invalidateQueries({ queryKey: ["all-players-home"] });
  };

  const sortedStats = useMemo(
    () =>
      [...(player?.stats ?? [])].sort((a, b) => b.season.localeCompare(a.season)),
    [player?.stats],
  );

  if (Number.isNaN(playerId)) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !player) {
    return <NotFound />;
  }

  const age = player.birthDate ? calcAge(player.birthDate) : null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/players"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <section className="player-profile-hero relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <div className="h-44 w-44 overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-md sm:h-48 sm:w-48">
                  {player.headshotUrl ? (
                    <img
                      src={player.headshotUrl}
                      alt={player.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-muted/20 to-muted/50">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-24 w-24 text-muted-foreground/25"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    </div>
                  )}
                </div>
                {player.jerseyNumber > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-lg bg-primary px-2.5 py-1 font-display text-lg font-bold text-primary-foreground shadow-sm">
                    #{player.jerseyNumber}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="font-display text-sm font-bold tracking-[0.2em] text-primary">
                  {player.team.toUpperCase()}
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold leading-[0.95] tracking-wide text-foreground sm:text-5xl md:text-6xl">
                  {player.name.toUpperCase()}
                </h1>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  {player.position && (
                    <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-xs">
                      {player.position.split(",")[0]?.trim()}
                    </span>
                  )}
                  {player.height && (
                    <InfoPill label="HT" value={player.height} />
                  )}
                  {player.weight && (
                    <InfoPill label="WT" value={player.weight} />
                  )}
                  {age !== null && <InfoPill label="AGE" value={String(age)} />}
                  {player.birthDate && (
                    <InfoPill label="DOB" value={formatBirthDate(player.birthDate)} />
                  )}
                </div>

                {player.hometown && (
                  <div className="mt-5 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-left">
                    <p className="font-display text-[10px] font-bold tracking-[0.2em] text-primary">
                      HOMETOWN
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">{player.hometown}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleFavorite}
              className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-5 py-2.5 font-display text-sm tracking-wider transition-colors ${
                isFavorite
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Flag className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              FAVORITE
            </button>
          </div>
        </section>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 shadow-xs">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-display text-sm tracking-wider text-foreground">
              {player.profileViews.toLocaleString()} PROFILE VIEWS
            </span>
          </div>
        </div>

        <div className="space-y-10">
          <RecentSeasonPanel stats={sortedStats} />

          <section>
            <h2 className="mb-4 font-display text-xl font-bold tracking-wide text-foreground">
              SEASON HISTORY
            </h2>
            <SeasonHistoryTable stats={sortedStats} />
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-display text-[10px] font-bold tracking-[0.15em] text-primary">
        {label}
      </span>{" "}
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl text-foreground">Player Not Found</h1>
      <p className="mt-2 text-muted-foreground">
        This player doesn&apos;t exist in the database.
      </p>
      <Link
        to="/players"
        className="mt-6 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Browse Players
      </Link>
    </div>
  );
}
