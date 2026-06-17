import { Link } from "react-router-dom";
import { Ruler, Weight } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { resolvePlayerHeadshot, onHeadshotError } from "@/lib/headshot";
import { formatPositionLabel } from "@/lib/position";

function formatName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return <span className="font-bold">{name}</span>;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")} <span className="font-bold">{last}</span>
    </>
  );
}

function formatWeight(weight: string) {
  if (!weight || weight === "—") return "—";
  return weight.toLowerCase().endsWith(" lbs") ? weight : `${weight} lbs`;
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
      <div className="relative flex min-h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative aspect-[4/5] flex-shrink-0 overflow-hidden bg-muted">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
          <img
            src={resolvePlayerHeadshot(player.headshotUrl)}
            alt={player.name}
            loading="lazy"
            onError={onHeadshotError}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute right-2 top-2 z-20 font-display text-xl font-bold text-foreground/5 transition-colors group-hover:text-primary/10 md:right-4 md:top-4 md:text-4xl">
            #{player.jerseyNumber || "—"}
          </div>
          <div className="absolute bottom-2 left-2 z-20 md:bottom-4 md:left-4">
            <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white md:px-2.5 md:text-xs">
              {formatPositionLabel(player.position)}
            </span>
          </div>
        </div>

        <div
          className={`relative z-20 flex flex-1 flex-col justify-between ${compact ? "gap-1 p-2" : "gap-1 p-2 md:gap-3 md:p-5"}`}
        >
          <div className="min-h-0">
            <div className="mb-0.5 truncate font-mono text-[8px] uppercase tracking-widest text-primary md:mb-1 md:text-[10px]">
              {player.team}
            </div>
            <h3
              className={`font-display leading-tight text-foreground transition-colors group-hover:text-primary ${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-sm md:text-2xl"}`}
            >
              {formatName(player.name)}
            </h3>
          </div>
          {!compact && (
            <div className="mt-auto hidden items-center gap-3 overflow-hidden whitespace-nowrap border-t border-border pt-3 font-mono text-[10px] text-muted-foreground md:flex">
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <Ruler className="h-3 w-3 text-primary" />
                <span>{player.height}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <Weight className="h-3 w-3 text-primary" />
                <span>{formatWeight(player.weight)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
