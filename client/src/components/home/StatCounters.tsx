interface StatCountersProps {
  players: number;
  teams: number;
  seasons: number;
}

export function StatCounters({ players, teams, seasons }: StatCountersProps) {
  const stats = [
    { label: "Active Players", value: players },
    { label: "Teams", value: teams },
    { label: "Seasons Tracked", value: seasons },
  ];

  return (
    <section className="border-y border-border/50 bg-card/30 px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 md:gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center md:text-left">
            <p className="font-display text-3xl font-bold text-primary md:text-5xl">
              {stat.value.toLocaleString()}
              <span className="text-primary/60">+</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
