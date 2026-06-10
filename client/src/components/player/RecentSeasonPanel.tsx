import { Activity, Target, Trophy } from "lucide-react";
import type { PlayerStat } from "@/lib/api";
import { StatTrendChart, buildPerGameTrend } from "./StatTrendChart";

export function RecentSeasonPanel({ stats }: { stats: PlayerStat[] }) {
  const recent = stats[0];

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
            <StatTrendChart title="Assists" season="—" color="hsl(var(--accent))" data={[]} />
          </div>
        </div>
      </div>
    );
  }

  const ppg = parseFloat(recent.pts_per_g) || 0;
  const apg = parseFloat(recent.ast_per_g) || 0;

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
            season={recent.season}
            color="hsl(var(--primary))"
            data={buildPerGameTrend(ppg)}
          />
          <StatTrendChart
            title="Assists"
            season={recent.season}
            color="hsl(var(--accent))"
            data={buildPerGameTrend(apg)}
          />
        </div>
      </div>
    </div>
  );
}
