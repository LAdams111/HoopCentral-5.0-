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

const thCell =
  "font-medium max-md:px-1.5 max-md:py-2 max-md:text-[9px] max-md:leading-tight md:px-6 md:py-4";
const tdCell =
  "max-md:px-1.5 max-md:py-2 max-md:text-[10px] max-md:leading-snug md:px-6 md:py-4 md:text-base";
const statCell = `${tdCell} max-md:whitespace-nowrap`;

/** Last word on line 2 for long names (e.g. Houston / Rockets). */
function stackTeamName(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed.includes(" ") || trimmed.length <= 16) {
    return [trimmed];
  }
  const splitAt = trimmed.lastIndexOf(" ");
  return [trimmed.slice(0, splitAt), trimmed.slice(splitAt + 1)];
}

function TeamNameCell({ label, to }: { label: string; to: string }) {
  const stacked = stackTeamName(label);
  return (
    <Link to={to} className="text-primary hover:underline" title={label}>
      <span className="hidden md:inline">{label}</span>
      <span className="flex flex-col gap-0 leading-[1.2] md:hidden">
        {stacked.map((line, index) => (
          <span
            key={`${line}-${index}`}
            className={index === 1 ? "font-medium text-primary/85" : "font-medium"}
          >
            {line}
          </span>
        ))}
      </span>
    </Link>
  );
}

export function SeasonHistoryTable({ stats, player }: SeasonHistoryTableProps) {
  const demoEnabled = player ? isLebronGameLogDemoPlayer(player) : false;
  const [gameLogSeason, setGameLogSeason] = useState<{
    season: string;
    team: string;
  } | null>(null);

  if (stats.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-4 md:p-6">
          <h3 className="font-display text-xl md:text-2xl">Season History</h3>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground md:p-6">
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
        <div className="border-b border-border p-4 md:p-6">
          <h3 className="font-display text-xl md:text-2xl">Season History</h3>
          {demoEnabled ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Demo: use{" "}
              <ScanSearch className="inline h-3.5 w-3.5 align-text-bottom text-primary" /> on{" "}
              2023-24 and 2024-25 to preview game-by-game logs.
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto max-md:-mx-1 max-md:px-1">
          <table className="w-full min-w-full text-left max-md:min-w-[36rem] max-md:text-[10px] md:table-auto md:text-sm">
            <colgroup className="md:hidden">
              <col className="w-[3.25rem]" />
              <col className="w-[3.5rem]" />
              <col className="w-[5.75rem]" />
              <col className="w-[1.85rem]" />
              <col className="w-[1.85rem]" />
              <col className="w-[1.85rem]" />
              <col className="w-[1.85rem]" />
              <col className="w-[1.75rem]" />
              <col className="w-[1.75rem]" />
              <col className="w-[2rem]" />
              {demoEnabled ? <col className="w-[2rem]" /> : null}
            </colgroup>
            <thead className="bg-muted font-mono uppercase text-muted-foreground">
              <tr>
                <th className={thCell}>
                  <span className="md:hidden">Szn</span>
                  <span className="hidden md:inline">Season</span>
                </th>
                <th className={thCell}>
                  <span className="md:hidden">Lg</span>
                  <span className="hidden md:inline">League</span>
                </th>
                <th className={`${thCell} max-md:min-w-[5.75rem]`}>
                  <span className="md:hidden">Tm</span>
                  <span className="hidden md:inline">Team</span>
                </th>
                <th className={thCell}>GP</th>
                <th className={`${thCell} text-primary`}>
                  <span className="md:hidden">P</span>
                  <span className="hidden md:inline">PTS</span>
                </th>
                <th className={thCell}>
                  <span className="md:hidden">R</span>
                  <span className="hidden md:inline">REB</span>
                </th>
                <th className={`${thCell} text-accent`}>
                  <span className="md:hidden">A</span>
                  <span className="hidden md:inline">AST</span>
                </th>
                <th className={thCell}>
                  <span className="md:hidden">B</span>
                  <span className="hidden md:inline">BLK</span>
                </th>
                <th className={thCell}>
                  <span className="md:hidden">S</span>
                  <span className="hidden md:inline">STL</span>
                </th>
                <th className={`${thCell} text-primary`}>
                  <span className="md:hidden">FG</span>
                  <span className="hidden md:inline">FG%</span>
                </th>
                {demoEnabled ? (
                  <th className={`${thCell} text-right md:px-4`}>Log</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((stat) => {
                const showGameLog =
                  demoEnabled && hasDemoGameLogForSeason(stat.season);
                const teamLabel = displayTeamName(stat.team, {
                  leagueSlug: stat.leagueSlug,
                  slug: stat.teamSlug,
                });
                return (
                  <tr key={stat.id} className="transition-colors hover:bg-muted/50">
                    <td className={`${tdCell} font-mono font-medium tabular-nums`}>
                      {stat.season}
                    </td>
                    <td className={`${tdCell} font-mono text-muted-foreground`}>
                      <Link
                        to={`/leagues/${stat.leagueSlug}`}
                        className="block truncate text-primary hover:underline max-md:max-w-full"
                        title={stat.league}
                      >
                        {stat.league}
                      </Link>
                    </td>
                    <td className={`${tdCell} max-md:align-top max-md:whitespace-normal font-mono`}>
                      <TeamNameCell
                        label={teamLabel}
                        to={rosterPath(stat.teamSlug, stat.season, stat.leagueSlug)}
                      />
                    </td>
                    <td className={`${statCell} tabular-nums text-muted-foreground md:text-base`}>
                      {formatGamesPlayed(stat.games_played)}
                    </td>
                    <td className={`${statCell} font-bold tabular-nums text-foreground md:font-bold`}>
                      {stat.pts_per_g}
                    </td>
                    <td className={`${statCell} tabular-nums text-muted-foreground`}>
                      {stat.trb_per_g}
                    </td>
                    <td className={`${statCell} tabular-nums text-muted-foreground`}>
                      {stat.ast_per_g}
                    </td>
                    <td className={`${statCell} tabular-nums text-muted-foreground`}>
                      {stat.blk_per_g}
                    </td>
                    <td className={`${statCell} tabular-nums text-muted-foreground`}>
                      {stat.stl_per_g}
                    </td>
                    <td className={`${statCell} tabular-nums text-accent`}>{stat.fg_pct}</td>
                    {demoEnabled ? (
                      <td className="max-md:px-0.5 max-md:py-1 md:px-4 md:py-4 text-right">
                        {showGameLog ? (
                          <button
                            type="button"
                            title="Inspect game log (demo)"
                            aria-label={`Inspect game log for ${stat.season}`}
                            onClick={() =>
                              setGameLogSeason({
                                season: stat.season,
                                team: teamLabel,
                              })
                            }
                            className="hover-elevate inline-flex items-center justify-center rounded-md border border-border bg-muted/50 p-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary md:gap-1 md:rounded-lg md:px-2.5 md:py-1.5 md:text-xs md:font-medium"
                          >
                            <ScanSearch className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            <span className="hidden sm:inline">Inspect</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 md:text-xs">—</span>
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
