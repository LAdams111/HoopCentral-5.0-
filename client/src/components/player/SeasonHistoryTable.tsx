import type { PlayerStat } from "@/lib/api";

export function SeasonHistoryTable({ stats }: { stats: PlayerStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
        No season history available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-5 py-3.5 font-display text-xs font-bold tracking-wider text-muted-foreground">
                SEASON
              </th>
              <th className="px-5 py-3.5 font-display text-xs font-bold tracking-wider text-muted-foreground">
                LEAGUE
              </th>
              <th className="px-5 py-3.5 font-display text-xs font-bold tracking-wider text-muted-foreground">
                TEAM
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                GP
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                PTS
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                REB
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                AST
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                BLK
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                STL
              </th>
              <th className="px-5 py-3.5 text-right font-display text-xs font-bold tracking-wider text-muted-foreground">
                FG%
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {stats.map((stat) => (
              <tr key={stat.id} className="transition-colors hover:bg-muted/30">
                <td className="px-5 py-3.5 font-medium text-foreground">{stat.season}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{stat.league}</td>
                <td className="px-5 py-3.5 font-medium text-primary">{stat.team}</td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {stat.games_played ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-base font-bold tabular-nums text-foreground">
                  {stat.pts_per_g}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {stat.trb_per_g}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-accent">
                  {stat.ast_per_g}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {stat.blk_per_g}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {stat.stl_per_g}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-primary">
                  {stat.fg_pct}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
