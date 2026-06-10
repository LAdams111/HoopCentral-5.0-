import { Activity, Target, Trophy, type LucideIcon } from "lucide-react";
import type { PlayerStat } from "@/lib/api";
import { StatTrendChart, buildPerGameTrend } from "./StatTrendChart";

const ORANGE = "hsl(24 95% 53%)";
const TEAL = "hsl(172 66% 50%)";

function StatCard({
  icon: Icon,
  value,
  label,
  iconClassName,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  iconClassName: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-xs">
      <Icon className={`mb-3 h-5 w-5 ${iconClassName}`} />
      <p className="font-display text-3xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1 font-display text-xs tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function RecentSeasonPanel({ stats }: { stats: PlayerStat[] }) {
  const recent = stats[0];

  if (!recent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-xl font-bold tracking-wide text-foreground">
          MOST RECENT SEASON
        </h2>
        <p className="mt-6 text-sm text-muted-foreground">No recent season statistics available.</p>
      </div>
    );
  }

  const ppg = parseFloat(recent.pts_per_g) || 0;
  const apg = parseFloat(recent.ast_per_g) || 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 font-display text-xl font-bold tracking-wide text-foreground">
        MOST RECENT SEASON ({recent.season})
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Target}
            value={recent.pts_per_g}
            label="PPG"
            iconClassName="text-primary"
          />
          <StatCard
            icon={Activity}
            value={recent.ast_per_g}
            label="APG"
            iconClassName="text-accent"
          />
          <div className="sm:col-span-2">
            <StatCard
              icon={Trophy}
              value={recent.trb_per_g}
              label="RPG"
              iconClassName="text-primary"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatTrendChart
            title="POINTS"
            season={recent.season}
            color={ORANGE}
            data={buildPerGameTrend(ppg)}
          />
          <StatTrendChart
            title="ASSISTS"
            season={recent.season}
            color={TEAL}
            data={buildPerGameTrend(apg)}
          />
        </div>
      </div>
    </div>
  );
}
