import { Calendar, TrendingUp, Users, UsersRound } from "lucide-react";

interface StatCountersProps {
  players: number;
  teams: number;
  seasons: number;
}

export function StatCounters({ players, teams, seasons }: StatCountersProps) {
  const stats = [
    { label: "Active Players", value: `${players.toLocaleString()}+`, icon: Users },
    { label: "Active Scouts", value: "1.2k", icon: UsersRound },
    { label: "Seasons Tracked", value: seasons > 0 ? String(seasons) : "75", icon: Calendar },
    { label: "Teams", value: `${teams}+`, icon: TrendingUp },
  ];

  return (
    <section className="border-b border-border/40 bg-card/30 py-8 backdrop-blur-sm">
      <div className="container mx-auto grid grid-cols-2 gap-8 px-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group flex items-center justify-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
