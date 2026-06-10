import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Eye,
  MapPin,
  Ruler,
  Star,
  Weight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatsTable } from "@/components/player/StatsTable";
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

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/players"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Players
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
              <div className="aspect-[3/4] bg-muted/30">
                {player.headshotUrl ? (
                  <img
                    src={player.headshotUrl}
                    alt={player.name}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-t from-card to-muted/20">
                    <span className="font-display text-8xl font-bold text-foreground/10">
                      {player.jerseyNumber || "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
                      {player.name}
                    </h1>
                    <p className="mt-1 text-primary">{player.team}</p>
                  </div>
                  <button
                    onClick={handleFavorite}
                    className={`rounded-lg border p-2 transition-colors ${
                      isFavorite
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                    }`}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                  </button>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{player.position}</p>

                <div className="mt-6 space-y-3 text-sm">
                  <InfoRow icon={Ruler} label="Height" value={player.height} />
                  <InfoRow icon={Weight} label="Weight" value={player.weight} />
                  <InfoRow icon={MapPin} label="Born" value={player.hometown} />
                  {player.birthDate && (
                    <InfoRow
                      icon={Calendar}
                      label="Birthday"
                      value={new Date(player.birthDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    />
                  )}
                  <InfoRow
                    icon={Eye}
                    label="Profile Views"
                    value={player.profileViews.toLocaleString()}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 lg:col-span-2">
            {player.career.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl text-foreground">Career History</h2>
                <div className="space-y-2 rounded-xl border border-border/50 bg-card/30 p-4">
                  {player.career.map((c) => (
                    <div
                      key={`${c.team}-${c.league}`}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 py-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{c.team}</p>
                        <p className="text-xs text-muted-foreground">{c.league}</p>
                      </div>
                      <p className="font-mono text-sm text-primary">
                        {c.fromSeason}
                        {c.toSeason && c.toSeason !== c.fromSeason
                          ? ` → ${c.toSeason}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 font-display text-2xl text-foreground">Season Statistics</h2>
              <StatsTable stats={player.stats} />
            </section>

            {player.awards.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl text-foreground">Awards</h2>
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
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-primary/70" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium text-foreground">{value}</span>
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
