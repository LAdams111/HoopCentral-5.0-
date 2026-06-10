import type { PlayerStat } from "@/lib/api";

export function StatsTable({ stats }: { stats: PlayerStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="rounded-xl border border-border/50 bg-card/30 p-8 text-center text-muted-foreground">
        No season statistics available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-4 py-3 font-display text-xs tracking-wider text-muted-foreground">Season</th>
            <th className="px-4 py-3 font-display text-xs tracking-wider text-muted-foreground">Team</th>
            <th className="px-4 py-3 font-display text-xs tracking-wider text-muted-foreground">League</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">GP</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">PPG</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">RPG</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">APG</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">SPG</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">BPG</th>
            <th className="px-4 py-3 text-right font-display text-xs tracking-wider text-muted-foreground">FG%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {stats.map((stat) => (
            <tr key={stat.id} className="transition-colors hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-foreground">{stat.season}</td>
              <td className="px-4 py-3 text-muted-foreground">{stat.team}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {stat.league}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.games_played ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-primary">{stat.pts_per_g}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.trb_per_g}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.ast_per_g}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.stl_per_g}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.blk_per_g}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{stat.fg_pct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
