import { ScanSearch } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { PlayerStat } from "@/lib/api";
import { formatGamesPlayed } from "@/lib/api";
import { rosterPath, displayTeamName } from "@/lib/constants";
import {
  getDemoGameLogForSeason,
  hasDemoGameLogForSeason,
  isLebronGameLogDemoPlayer,
} from "@/lib/lebronGameLogsDemo";
import { SeasonGameLogModal } from "./SeasonGameLogModal";

type SeasonHistoryTableProps = {
  stats: PlayerStat[];
  player?: { name: string; slug?: string | null };
};

export function SeasonHistoryTable({ stats, player }: SeasonHistoryTableProps) {
  const demoEnabled = player ? isLebronGameLogDemoPlayer(player) : false;
  const [gameLogSeason, setGameLogSeason] = useState<{
    season: string;
    team: string;
  } | null>(null);

  if (stats.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-6">
          <h3 className="font-display text-2xl">Season History</h3>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          No season history available.
        </div>
      </section>
    );
  }

  const modalGames =
    gameLogSeason && demoEnabled ? getDemoGameLogForSeason(gameLogSeason.season) : [];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-6">
          <h3 className="font-display text-2xl">Season History</h3>
          {demoEnabled ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Demo: use{" "}
              <ScanSearch className="inline h-3.5 w-3.5 align-text-bottom text-primary" /> on{" "}
              2023-24 and 2024-25 to preview game-by-game logs.
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted font-mono text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Season</th>
                <th className="px-6 py-4 font-medium">League</th>
                <th className="px-6 py-4 font-medium">Team</th>
                <th className="px-6 py-4 font-medium">GP</th>
                <th className="px-6 py-4 font-medium text-primary">PTS</th>
                <th className="px-6 py-4 font-medium">REB</th>
                <th className="px-6 py-4 font-medium text-accent">AST</th>
                <th className="px-6 py-4 font-medium">BLK</th>
                <th className="px-6 py-4 font-medium">STL</th>
                <th className="px-6 py-4 font-medium text-primary">FG%</th>
                {demoEnabled ? (
                  <th className="px-4 py-4 font-medium text-right">Log</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((stat) => {
                const showGameLog =
                  demoEnabled && hasDemoGameLogForSeason(stat.season);
                return (
                  <tr key={stat.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-4 font-mono font-medium">{stat.season}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-muted-foreground">
                      <Link
                        to={`/leagues/${stat.leagueSlug}`}
                        className="text-primary hover:underline"
                      >
                        {stat.league}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <Link
                        to={rosterPath(stat.teamSlug, stat.season, stat.leagueSlug)}
                        className="whitespace-nowrap text-primary hover:underline"
                      >
                        {displayTeamName(stat.team, {
                          leagueSlug: stat.leagueSlug,
                          slug: stat.teamSlug,
                        })}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-base text-muted-foreground">
                      {formatGamesPlayed(stat.games_played)}
                    </td>
                    <td className="px-6 py-4 text-base font-bold text-foreground">
                      {stat.pts_per_g}
                    </td>
                    <td className="px-6 py-4 text-base text-muted-foreground">
                      {stat.trb_per_g}
                    </td>
                    <td className="px-6 py-4 text-base text-muted-foreground">
                      {stat.ast_per_g}
                    </td>
                    <td className="px-6 py-4 text-base text-muted-foreground">
                      {stat.blk_per_g}
                    </td>
                    <td className="px-6 py-4 text-base text-muted-foreground">
                      {stat.stl_per_g}
                    </td>
                    <td className="px-6 py-4 text-base text-accent">{stat.fg_pct}</td>
                    {demoEnabled ? (
                      <td className="px-4 py-4 text-right">
                        {showGameLog ? (
                          <button
                            type="button"
                            title="Inspect game log (demo)"
                            aria-label={`Inspect game log for ${stat.season}`}
                            onClick={() =>
                              setGameLogSeason({
                                season: stat.season,
                                team: displayTeamName(stat.team, {
                                  leagueSlug: stat.leagueSlug,
                                  slug: stat.teamSlug,
                                }),
                              })
                            }
                            className="hover-elevate inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <ScanSearch className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Inspect</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {gameLogSeason ? (
        <SeasonGameLogModal
          open={modalGames.length > 0}
          onClose={() => setGameLogSeason(null)}
          seasonLabel={gameLogSeason.season}
          teamName={gameLogSeason.team}
          games={modalGames}
        />
      ) : null}
    </>
  );
}
