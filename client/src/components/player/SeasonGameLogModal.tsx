import { X } from "lucide-react";
import { useEffect } from "react";
import type { PlayerGameLogEntry } from "@/lib/api";
import type { DemoGameLogEntry } from "@/lib/lebronGameLogsDemo";
import { demoGameLogSourceNote } from "@/lib/lebronGameLogsDemo";

export type GameLogRow = PlayerGameLogEntry | DemoGameLogEntry;

type SeasonGameLogModalProps = {
  open: boolean;
  onClose: () => void;
  seasonLabel: string;
  teamName: string;
  games: GameLogRow[];
  demo?: boolean;
  loading?: boolean;
};

function dash(value: string | number | boolean | null | undefined): string {
  if (value === true) return "✓";
  if (value === false) return "—";
  if (value == null || value === "") return "—";
  return String(value);
}

export function SeasonGameLogModal({
  open,
  onClose,
  seasonLabel,
  teamName,
  games,
  demo = false,
  loading = false,
}: SeasonGameLogModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const regular = games.filter((g) => !g.playoffs);
  const playoffs = games.filter((g) => g.playoffs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-log-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close game log"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              {demo ? "Demo · game-by-game" : "Game-by-game"}
            </p>
            <h2 id="game-log-title" className="font-display text-2xl font-bold">
              {seasonLabel} — {teamName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading games…" : `${games.length} games`}
              {demo ? ` · ${demoGameLogSourceNote}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover-elevate rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading game log…</p>
          ) : games.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No game logs for this season yet.</p>
          ) : (
            <>
              <GameLogTable title="Regular season" games={regular} />
              {playoffs.length > 0 ? (
                <GameLogTable title="Playoffs" games={playoffs} className="border-t border-border" />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GameLogTable({
  title,
  games,
  className = "",
}: {
  title: string;
  games: GameLogRow[];
  className?: string;
}) {
  if (games.length === 0) return null;

  return (
    <div className={className}>
      <div className="sticky top-0 z-10 border-b border-border bg-muted/95 px-5 py-2 backdrop-blur sm:px-6">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {title} ({games.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 font-mono text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium sm:px-6">Date</th>
              <th className="px-2 py-3 font-medium">Opp</th>
              <th className="px-2 py-3 font-medium">Result</th>
              <th className="px-2 py-3 font-medium text-center">GS</th>
              <th className="px-2 py-3 font-medium">MIN</th>
              <th className="px-2 py-3 font-medium text-primary">PTS</th>
              <th className="px-2 py-3 font-medium">REB</th>
              <th className="px-2 py-3 font-medium">AST</th>
              <th className="px-2 py-3 font-medium">STL</th>
              <th className="px-2 py-3 font-medium">BLK</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">TOV</th>
              <th className="hidden px-2 py-3 font-medium lg:table-cell">FG</th>
              <th className="hidden px-2 py-3 font-medium lg:table-cell">3P</th>
              <th className="hidden px-2 py-3 font-medium lg:table-cell">FT</th>
              <th className="hidden px-2 py-3 font-medium xl:table-cell">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {games.map((game, index) => (
              <tr
                key={`${game.date ?? "nd"}-${game.opponent}-${game.result ?? index}`}
                className="hover:bg-muted/40"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs sm:px-6">
                  {dash(game.date)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 font-mono">
                  {game.homeAway}
                  {game.opponent}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs">
                  {dash(game.result)}
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-muted-foreground">
                  {dash(game.gs)}
                </td>
                <td className="px-2 py-2.5 font-mono">{dash(game.mp)}</td>
                <td className="px-2 py-2.5 font-bold">{dash(game.pts)}</td>
                <td className="px-2 py-2.5 text-muted-foreground">{dash(game.reb)}</td>
                <td className="px-2 py-2.5 text-muted-foreground">{dash(game.ast)}</td>
                <td className="px-2 py-2.5 text-muted-foreground">{dash(game.stl)}</td>
                <td className="px-2 py-2.5 text-muted-foreground">{dash(game.blk)}</td>
                <td className="hidden px-2 py-2.5 text-muted-foreground md:table-cell">
                  {dash(game.tov)}
                </td>
                <td className="hidden px-2 py-2.5 font-mono text-xs lg:table-cell">
                  {dash(game.fg)}
                </td>
                <td className="hidden px-2 py-2.5 font-mono text-xs lg:table-cell">
                  {dash(game.fg3)}
                </td>
                <td className="hidden px-2 py-2.5 font-mono text-xs lg:table-cell">
                  {dash(game.ft)}
                </td>
                <td className="hidden px-2 py-2.5 font-mono text-xs xl:table-cell">
                  {dash(game.plusMinus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
