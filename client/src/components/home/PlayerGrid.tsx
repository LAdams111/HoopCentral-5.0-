import { ArrowRight } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@/lib/api";
import { PlayerCard } from "@/components/player/PlayerCard";
import { ButtonLink } from "@/components/ui/Button";

interface PlayerGridProps {
  title: string;
  titleAccent: string;
  subtitle: string;
  players: PlayerCardType[];
  loading?: boolean;
  actionLabel?: string;
  actionHref?: string;
  actionVariant?: "ghost" | "outline";
  variant?: "default" | "muted";
  emptyMessage?: string;
  showMobileCta?: boolean;
}

export function PlayerGrid({
  title,
  titleAccent,
  subtitle,
  players,
  loading,
  actionLabel = "View All Players",
  actionHref,
  actionVariant = "outline",
  variant = "default",
  emptyMessage = "No players to display.",
  showMobileCta = false,
}: PlayerGridProps) {
  const sectionClass =
    variant === "muted"
      ? "relative overflow-hidden border-t border-border bg-muted py-24"
      : "relative overflow-hidden bg-background py-24";

  return (
    <section className={sectionClass}>
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="mb-2 font-display text-5xl font-bold text-foreground md:text-6xl">
              {title}{" "}
              <span
                className={
                  variant === "default" ? "text-glow text-primary" : "text-primary"
                }
              >
                {titleAccent}
              </span>
            </h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          {actionHref && (
            <ButtonLink
              to={actionHref}
              variant={actionVariant}
              className="hidden gap-2 md:inline-flex"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-5 md:gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-xl border border-border bg-card/50"
              />
            ))}
            <div className="aspect-[3/4] animate-pulse rounded-xl border border-border bg-card/50 md:hidden" />
          </div>
        ) : players.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-6 md:hidden">
              {players.slice(0, 6).map((player) => (
                <PlayerCard key={player.id} player={player} compact />
              ))}
            </div>
            <div className="hidden gap-6 md:grid md:grid-cols-5 md:gap-8">
              {players.slice(0, 5).map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </>
        )}

        {showMobileCta && actionHref && (
          <div className="mt-12 text-center md:hidden">
            <ButtonLink to={actionHref} variant="outline" className="w-full">
              View Draft
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
