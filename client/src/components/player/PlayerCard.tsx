import { Eye, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlayerCard as PlayerCardType } from "@/lib/api";

export function PlayerCard({ player }: { player: PlayerCardType }) {
  return (
    <Link
      to={`/players/${player.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/30">
        {player.headshotUrl ? (
          <img
            src={player.headshotUrl}
            alt={player.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-t from-card to-muted/20">
            <span className="font-display text-6xl font-bold text-foreground/10">
              {player.jerseyNumber || "#"}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {player.team}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        {player.jerseyNumber > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
            #{player.jerseyNumber}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-xl leading-tight text-foreground transition-colors group-hover:text-primary">
          {player.name}
        </h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">{player.position}</p>
        <p className="text-sm font-medium text-foreground/80">{player.team}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {player.hometown || "—"}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {player.profileViews.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
