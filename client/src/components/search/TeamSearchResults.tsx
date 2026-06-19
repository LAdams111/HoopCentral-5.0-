import { Link } from "react-router-dom";
import type { TeamSummary } from "@/lib/api";
import { teamLogoUrl } from "@/lib/constants";
import { getLeagueDisplay } from "@/lib/leagues";
import { publicLeagueSlugForRoster, teamRosterPath } from "@/lib/team-search";

export function TeamSearchResults({
  teams,
  compact = false,
}: {
  teams: TeamSummary[];
  compact?: boolean;
}) {
  if (teams.length === 0) return null;

  return (
    <div className={compact ? "mb-6" : "mb-8"}>
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {teams.length} team{teams.length !== 1 ? "s" : ""} found
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const leagueSlug = publicLeagueSlugForRoster(team.league.slug);
          const leagueMeta = getLeagueDisplay(leagueSlug, team.league.name);

          return (
            <Link
              key={`${team.league.slug}-${team.id}`}
              to={teamRosterPath(team)}
              className="hover-elevate flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3 backdrop-blur-sm transition-all hover:border-primary/40"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <img
                  src={teamLogoUrl(team.name, {
                    leagueSlug,
                    abbreviation: team.abbreviation,
                    slug: team.slug,
                    variant: "primary",
                  })}
                  alt={team.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{team.name}</div>
                <div className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {leagueMeta.display} • {team.abbreviation}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
