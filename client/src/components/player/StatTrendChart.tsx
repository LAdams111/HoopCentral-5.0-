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
    <div className="h-[200px] w-full rounded-xl border border-white/5 bg-card/30 p-2 md:h-[300px] md:p-4">
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <h4 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground md:text-sm">
          {title}
        </h4>
        <div className="flex items-center gap-1 md:gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-[9px] text-muted-foreground md:text-xs">
            {season} · Per Game
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-xs text-muted-foreground">
          No chart data
        </div>
      ) : (
        <div className="h-[85%] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "hsl(var(--foreground))",
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
export function buildPerGameTrend(avg: number, games = 74): ChartPoint[] {
  if (!avg || Number.isNaN(avg)) return [];

  const points: ChartPoint[] = [];
  for (let i = 1; i <= games; i += 2) {
    const wave = Math.sin(i * 0.85) * avg * 0.22;
    const drift = (i - games / 2) * 0.03;
    const value = Math.max(0, Number((avg + wave + drift).toFixed(1)));
    points.push({ label: String(i), value });
  }
  return points;
}
