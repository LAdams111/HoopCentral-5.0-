import type { PlayerStat } from "@/lib/api";

export function SeasonHistoryTable({ stats }: { stats: PlayerStat[] }) {
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

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="border-b border-border p-6">
        <h3 className="font-display text-2xl">Season History</h3>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stats.map((stat) => (
              <tr key={stat.id} className="transition-colors hover:bg-muted/50">
                <td className="px-6 py-4 font-mono font-medium">{stat.season}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-muted-foreground">
                  {stat.league}
                </td>
                <td className="px-6 py-4 font-mono">
                  <span className="whitespace-nowrap text-primary">{stat.team}</span>
                </td>
                <td className="px-6 py-4 text-base text-muted-foreground">
                  {stat.games_played ?? "—"}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
