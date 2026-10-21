import { useQuery } from "@tanstack/react-query";
import { Activity, Target, Trophy } from "lucide-react";
import { useMemo } from "react";
import { getPlayerGameLogs, type PlayerGameLogEntry, type PlayerStat } from "@/lib/api";
import { formatPosition } from "@/lib/position";
import { StatTrendChart, gameLogStatSeries, type ChartPoint } from "./StatTrendChart";

function seasonGames(games: PlayerGameLogEntry[]): PlayerGameLogEntry[] {
  const regular = games.filter((game) => !game.playoffs);
  return regular.length > 0 ? regular : games;
}

function isCenter(position: string | null | undefined): boolean {
  return formatPosition(position).split("/")[0] === "C";
}

function seasonAverageSeries(stats: PlayerStat[], stat: "pts_per_g" | "ast_per_g" | "trb_per_g"): ChartPoint[] {
  return [...stats]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map((row) => {
      const value = Number(row[stat]);
      return {
        label: row.season.slice(2),
        value: Number.isFinite(value) ? value : 0,
        detail: [row.season, row.team].filter(Boolean).join(" · "),
      };
    });
}

export function RecentSeasonPanel({
  stats,
  playerId,
  position,
  gameLogSeasons,
  gameLogSeasonLeagues,
}: {
  stats: PlayerStat[];
  playerId?: number;
  position?: string | null;
  gameLogSeasons?: string[];
  gameLogSeasonLeagues?: { season: string; leagueSlug: string }[];
}) {
  const recent = stats[0];
  const chartTargets = useMemo(() => {
    const pairs = [...(gameLogSeasonLeagues ?? [])].sort((a, b) => {
      const bySeason = b.season.localeCompare(a.season);
      if (bySeason !== 0) return bySeason;
      if (recent?.leagueSlug && a.leagueSlug === recent.leagueSlug) return -1;
      if (recent?.leagueSlug && b.leagueSlug === recent.leagueSlug) return 1;
      return a.leagueSlug.localeCompare(b.leagueSlug);
    });
    if (pairs.length > 0) return pairs;
    return [...(gameLogSeasons ?? [])]
      .sort((a, b) => b.localeCompare(a))
      .map((season) => ({ season, leagueSlug: recent?.leagueSlug ?? "" }));
  }, [gameLogSeasonLeagues, gameLogSeasons, recent?.leagueSlug]);
  const primary = chartTargets[0];
  const secondary = chartTargets[1];

  const primaryLogs = useQuery({
    queryKey: ["player-game-logs", playerId, primary?.season, primary?.leagueSlug],
    queryFn: () => getPlayerGameLogs(playerId!, primary!.season, primary!.leagueSlug || undefined),
    enabled: Boolean(playerId && primary),
  });
  const primaryGames = seasonGames(primaryLogs.data?.games ?? []);
  const primaryEmpty = primaryLogs.isSuccess && primaryGames.length === 0;
  const secondaryLogs = useQuery({
    queryKey: ["player-game-logs", playerId, secondary?.season, secondary?.leagueSlug],
    queryFn: () => getPlayerGameLogs(playerId!, secondary!.season, secondary!.leagueSlug || undefined),
    enabled: Boolean(playerId && secondary && primaryEmpty),
  });

  const usingSecondary = primaryEmpty && seasonGames(secondaryLogs.data?.games ?? []).length > 0;
  const games = usingSecondary ? seasonGames(secondaryLogs.data?.games ?? []) : primaryGames;
  const chartSeason = (usingSecondary ? secondary?.season : primary?.season) ?? recent?.season ?? null;
  const chartLoading = primaryLogs.isLoading || (primaryEmpty && secondaryLogs.isLoading);
  const usingSeasonAverages = !chartLoading && games.length === 0 && stats.length > 0;
  const center = isCenter(position);
  const secondTitle = center ? "Rebounds" : "Assists";
  const points = games.length > 0 ? gameLogStatSeries(games, "pts") : usingSeasonAverages ? seasonAverageSeries(stats, "pts_per_g") : [];
  const secondSeries = games.length > 0
    ? gameLogStatSeries(games, center ? "reb" : "ast")
    : usingSeasonAverages
      ? seasonAverageSeries(stats, center ? "trb_per_g" : "ast_per_g")
      : [];
  const chartLabel = usingSeasonAverages ? "Career" : chartSeason ?? "—";
  const pointLabel = usingSeasonAverages ? "Each season" : "Each game";

  if (!recent) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <section className="h-full rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 border-b border-border pb-2 font-display text-2xl">
              Most Recent Season
            </h3>
            <p className="text-sm text-muted-foreground">
              No recent season statistics available.
            </p>
          </section>
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 md:gap-6">
            <StatTrendChart title="Points" season="—" color="hsl(var(--primary))" data={[]} />
            <StatTrendChart title={secondTitle} season="—" color="hsl(var(--accent))" data={[]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <section className="h-full rounded-2xl border border-border bg-card p-6 shadow-xl">
          <h3 className="mb-4 border-b border-border pb-2 font-display text-2xl">
            Most Recent Season ({recent.season})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <Target className="mx-auto mb-2 h-6 w-6 text-primary opacity-80" />
              <div className="font-display text-4xl">{recent.pts_per_g}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                PPG
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <Activity className="mx-auto mb-2 h-6 w-6 text-accent opacity-80" />
              <div className="font-display text-4xl">{recent.ast_per_g}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                APG
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-border bg-background p-4 text-center">
              <Trophy className="mx-auto mb-2 h-6 w-6 text-yellow-500 opacity-80" />
              <div className="font-display text-4xl">{recent.trb_per_g}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                RPG
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-2 md:gap-6">
          <StatTrendChart
            title="Points"
            season={chartLabel}
            color="hsl(var(--primary))"
            data={points}
            loading={chartLoading}
            pointLabel={pointLabel}
          />
          <StatTrendChart
            title={secondTitle}
            season={chartLabel}
            color="hsl(var(--accent))"
            data={secondSeries}
            loading={chartLoading}
            pointLabel={pointLabel}
          />
        </div>
      </div>
    </div>
  );
}
