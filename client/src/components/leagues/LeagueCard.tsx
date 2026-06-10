import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LeagueCardData } from "@/lib/leagues";

export function LeagueCard({ league }: { league: LeagueCardData }) {
  return (
    <Link
      to={`/leagues/${league.slug}`}
      className="hover-elevate block overflow-hidden rounded-xl border border-border transition-all hover:border-primary/50"
    >
      <div className="flex flex-row items-center gap-3 p-3 md:gap-6 md:p-6">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center md:h-20 md:w-20">
          {league.logoUrl ? (
            <img
              src={league.logoUrl}
              alt={league.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary md:h-16 md:w-16 md:text-2xl">
              {league.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-primary md:mb-1 md:text-xs">
            {league.tier}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="truncate font-display text-lg md:text-3xl">{league.name}</h2>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground md:h-5 md:w-5" />
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground md:mt-2 md:line-clamp-none md:text-sm">
            {league.description}
          </p>
        </div>

        <div className="hidden flex-shrink-0 rounded-xl border border-border bg-muted px-4 py-2 md:block">
          {league.regions.length > 0 ? (
            <>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Region
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {league.regions.map((region) => (
                  <img
                    key={region}
                    src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${region}.svg`}
                    alt={region}
                    title={region}
                    className="h-5 w-7 rounded-sm border border-border/50 object-cover"
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Teams
              </div>
              <div className="font-display text-lg font-bold">{league.teamCount}</div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
