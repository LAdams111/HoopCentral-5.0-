import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  label: string;
  value: number;
  detail?: string;
};

export function StatTrendChart({
  title,
  season,
  color,
  data,
  loading = false,
}: {
  title: string;
  season: string;
  color: string;
  data: ChartPoint[];
  loading?: boolean;
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
            {season} · Each game
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-xs text-muted-foreground">
          {loading ? "Loading games…" : "No game log for this season"}
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
                interval={data.length > 16 ? Math.ceil(data.length / 8) - 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as ChartPoint | undefined;
                  if (!point) return null;
                  return (
                    <div
                      style={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "hsl(var(--foreground))",
                        padding: "8px 10px",
                      }}
                    >
                      <div>Game {point.label}</div>
                      {point.detail ? <div>{point.detail}</div> : null}
                      <div>
                        {point.value} {title.toLowerCase()}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name={title}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ r: 2, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const GAME_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatGameDate(iso: string | null): string {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  const monthLabel = GAME_MONTHS[Number(month) - 1];
  if (!monthLabel || !day) return iso;
  return `${monthLabel} ${Number(day)}`;
}

/** One point per game, in the order the logs were played. */
export function gameLogStatSeries(
  games: Array<{ date: string | null; opponent: string; pts: number | null; ast: number | null }>,
  stat: "pts" | "ast",
): ChartPoint[] {
  return games.map((game, index) => {
    const detail = [formatGameDate(game.date), game.opponent].filter(Boolean).join(" · ");
    return {
      label: String(index + 1),
      value: game[stat] ?? 0,
      ...(detail ? { detail } : {}),
    };
  });
}
