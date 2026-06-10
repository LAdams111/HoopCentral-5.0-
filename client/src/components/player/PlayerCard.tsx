import { Link } from "react-router-dom";
import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { DEFAULT_HEADSHOT } from "@/lib/constants";

function formatPosition(position: string) {
  if (!position) return "PLAYER";
  const first = position.split(",")[0]?.trim();
  return first?.toUpperCase() || "PLAYER";
}

export function PlayerCard({
  player,
  compact = false,
}: {
  player: PlayerCardType;
  compact?: boolean;
}) {
  return (
    <Link to={`/players/${player.id}`} className="group block h-full">
      <div className="relative flex min-h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative aspect-[4/5] flex-shrink-0 overflow-hidden bg-muted">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
          <img
            src={player.headshotUrl || DEFAULT_HEADSHOT}
            alt={player.name}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_HEADSHOT;
            }}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute right-2 top-2 z-20 font-display text-xl font-bold text-foreground/10 transition-colors group-hover:text-primary/20 md:right-4 md:top-4 md:text-4xl">
            #{player.jerseyNumber || "—"}
          </div>
          <div className="absolute bottom-2 left-2 z-20 md:bottom-4 md:left-4">
            <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white md:px-2.5 md:text-xs">
              {formatPosition(player.position)}
            </span>
          </div>
        </div>

        <div
          className={`relative z-20 flex flex-1 flex-col justify-between ${compact ? "gap-1 p-2" : "gap-3 p-2 md:p-5"}`}
        >
          <div className="min-h-0">
            <h3
              className={`font-display leading-tight text-foreground transition-colors group-hover:text-primary ${compact ? "text-sm md:text-base" : "text-lg md:text-xl"}`}
            >
              {player.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground md:text-sm">
              {player.team}
            </p>
          </div>
          {!compact && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground md:text-xs">
              <span className="line-clamp-1">{player.hometown || "—"}</span>
              <span>{player.profileViews.toLocaleString()} views</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
