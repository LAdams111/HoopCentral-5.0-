import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Flag, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CareerHistoryTable } from "@/components/player/CareerHistoryTable";
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
  const headshot = player.headshotUrl || undefined;
  const jerseyLabel =
    player.jerseyNumber > 0 ? `#${player.jerseyNumber}` : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero — matches reference hoop-central-production */}
      <div className="relative min-h-[auto] overflow-hidden border-b border-border pb-6 md:min-h-[60vh] md:pb-12">
        <div className="absolute inset-0 z-10 bg-background/60" />
        {headshot && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center opacity-10 grayscale"
            style={{ backgroundImage: `url("${headshot}")` }}
          />
        )}

        <div className="container relative z-20 mx-auto flex h-full flex-col justify-between px-4 py-8">
          <Link
            to="/players"
            className="hover-elevate active-elevate-2 mb-4 inline-flex w-fit items-center justify-center gap-2 rounded-full border [border-color:var(--button-outline)] px-3 text-xs font-medium shadow-xs min-h-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-12">
            <div className="relative z-30 mt-4 shrink-0 md:mb-[-160px] md:mt-0 md:-translate-y-[120px]">
              <div className="h-36 w-36 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-2xl md:h-64 md:w-64">
                {headshot ? (
                  <img
                    src={headshot}
                    alt={player.name}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-24 w-24 text-muted-foreground/30 md:h-32 md:w-32"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )}
              </div>
              {jerseyLabel && (
                <div className="absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-lg border-4 border-background bg-primary font-display text-2xl font-bold text-white shadow-lg md:-right-4 md:-top-4 md:h-16 md:w-16 md:text-3xl">
                  {jerseyLabel}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center justify-end pb-4 pt-2 md:items-start md:pb-8 md:pt-0">
              <div className="mb-4 flex w-full flex-col items-center justify-between gap-4 md:mb-6 md:flex-row md:items-end">
                <div className="text-center md:text-left">
                  <h3 className="mb-1 font-mono text-sm uppercase tracking-widest text-primary md:text-lg">
                    {player.team}
                  </h3>
                  <h1 className="font-display text-4xl font-bold leading-[0.85] tracking-tighter text-foreground md:text-8xl">
                    {player.name}
                  </h1>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className={`hover-elevate active-elevate-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      isFavorite
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <Flag className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                    <span className="font-display font-bold uppercase tracking-tight">
                      Favorite
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 md:items-start md:gap-6">
                <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-foreground/60 md:justify-start md:gap-4 md:text-sm">
                  {player.position && (
                    <div className="inline-flex items-center whitespace-nowrap rounded-md border border-border px-4 py-1 text-xs font-semibold text-foreground shadow-xs [border-color:var(--badge-outline)]">
                      {player.position.split(",")[0]?.trim()}
                    </div>
                  )}
                  {player.height && (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
                      <span className="font-bold text-primary">HT</span>
                      {player.height}
                    </div>
                  )}
                  {player.weight && (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
                      <span className="font-bold text-primary">WT</span>
                      {player.weight}
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
                      <span className="font-bold text-primary">AGE</span>
                      {age}
                    </div>
                  )}
                  {player.birthDate && (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
                      <span className="font-bold text-primary">DOB</span>
                      {formatBirthDate(player.birthDate)}
                    </div>
                  )}
                </div>

                {player.hometown && (
                  <div className="flex w-fit items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="mb-2 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-primary/70">
                        Hometown
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground">
                        {player.hometown}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats area */}
      <div className="container mx-auto mt-16 px-4">
        <div className="grid grid-cols-1 gap-8">
          <div className="-mb-4 flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-fit items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3 text-muted-foreground shadow-sm">
                <Eye className="h-6 w-6 text-primary" />
                <span className="font-display text-2xl font-bold uppercase tracking-wider">
                  <span className="text-black dark:text-white">
                    {player.profileViews.toLocaleString()}
                  </span>
                  <span className="ml-3">Profile Views</span>
                </span>
              </div>
            </div>
          </div>

          <RecentSeasonPanel stats={sortedStats} />

          <CareerHistoryTable career={player.career} />

          <SeasonHistoryTable stats={sortedStats} />

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border p-6">
              <h3 className="font-display text-2xl">Awards &amp; Achievements</h3>
            </div>
            <div className="p-6">
              {player.awards.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {player.awards.map((award, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary"
                    >
                      {award.awardName}
                      {award.season ? ` · ${award.season}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-muted-foreground">
                  <Trophy className="mb-4 h-12 w-12 opacity-20" />
                  <p className="font-display text-xl uppercase tracking-wider">
                    No awards recorded yet
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
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
