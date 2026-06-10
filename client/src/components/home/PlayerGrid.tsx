import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { PlayerCard } from "@/components/player/PlayerCard";

interface PlayerGridProps {
  title: string;
  subtitle?: string;
  players: PlayerCardType[];
  emptyMessage?: string;
}

export function PlayerGrid({ title, subtitle, players, emptyMessage }: PlayerGridProps) {
  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="font-display text-3xl text-foreground md:text-4xl">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {players.length === 0 ? (
          <p className="rounded-xl border border-border/50 bg-card/30 p-8 text-center text-muted-foreground">
            {emptyMessage ?? "No players to display."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
