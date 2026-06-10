import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { NBA_TEAM_IDS, nbaTeamLogoUrl } from "@/lib/constants";
import { findLeague, LEAGUE_DISPLAY } from "@/lib/leagues";

const NBA_TEAM_NAMES = Object.keys(NBA_TEAM_IDS);
const DEFAULT_SEASON = "2025-26";

export function LeagueDetail() {
  const { league: leagueSlug } = useParams<{ league: string }>();
  const league = findLeague(leagueSlug);
  const meta = league ? LEAGUE_DISPLAY[league.slug] : undefined;
  const [query, setQuery] = useState("");

  const teams = useMemo(() => {
    if (league?.slug !== "NBA") return [];
    return NBA_TEAM_NAMES.filter((name) =>
      name.toLowerCase().includes(query.trim().toLowerCase()),
    ).map((name) => ({ name, season: DEFAULT_SEASON }));
  }, [league?.slug, query]);

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">League not found.</p>
        <Link to="/leagues" className="mt-4 inline-block text-primary hover:underline">
          Back to Leagues
        </Link>
      </div>
    );
  }

  const display = meta?.display ?? league.name;
  const tier = meta?.tier ?? league.tier;
  const description = meta?.description ?? league.description;
  const logoUrl = meta?.logoUrl ?? league.logoUrl;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <Link
            to="/leagues"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={display}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-display text-3xl font-bold text-primary">
                  {display.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
                {tier}
              </div>
              <h1 className="font-display text-5xl font-bold uppercase tracking-tighter md:text-7xl">
                {display}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              Teams
            </h2>
            {teams.length > 0 && (
              <span className="font-mono text-sm text-muted-foreground">
                {teams.length} of {NBA_TEAM_NAMES.length}
              </span>
            )}
          </div>
          <div className="relative w-full sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search teams..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-card/50 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {teams.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {teams.map((team) => (
              <Link
                key={team.name}
                to={`/players?q=${encodeURIComponent(team.name)}`}
                className="rounded-xl border border-border bg-card/50 p-3 backdrop-blur-sm transition-all hover:border-primary/40"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 truncate font-mono text-[10px] uppercase tracking-widest text-primary">
                      {display}
                    </div>
                    <div className="truncate text-sm font-bold">{team.name}</div>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {team.season}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <img
                    src={nbaTeamLogoUrl(team.name, "primary")}
                    alt={team.name}
                    className="h-8 w-8 flex-shrink-0 object-contain"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl uppercase text-muted-foreground">
              No teams found in this league yet
            </p>
            <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Teams will appear here as players are added
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
