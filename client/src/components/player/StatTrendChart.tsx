import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  value: number;
};

export function StatTrendChart({
  title,
  season,
  color,
  data,
}: {
  title: string;
  season: string;
  color: string;
  data: ChartPoint[];
}) {
  const gradientId = `gradient-${title.replace(/\s/g, "-").toLowerCase()}`;

  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-xl border border-border/80 bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-xs font-bold tracking-wider text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>
            {season} · Per Game
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          No chart data
        </div>
      ) : (
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(214 32% 91%)",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Build a decorative per-game trend from a season average when game logs are unavailable. */
export function buildPerGameTrend(avg: number, games = 12): ChartPoint[] {
  if (!avg || Number.isNaN(avg)) return [];

  const points: ChartPoint[] = [];
  for (let i = 1; i <= games; i++) {
    const wave = Math.sin(i * 0.9) * avg * 0.18;
    const drift = (i - games / 2) * 0.04;
    const value = Math.max(0, Number((avg + wave + drift).toFixed(1)));
    points.push({ label: `G${i}`, value });
  }
  return points;
}
