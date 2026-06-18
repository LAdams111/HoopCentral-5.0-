import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { rosterPath, seasonYearToLabel, getCurrentSeasonYear, teamLogoUrl } from "@/lib/constants";
import { getLeague } from "@/lib/api";
import { getLeagueDisplay } from "@/lib/leagues";

export function LeagueDetail() {
  const { league: leagueSlug } = useParams<{ league: string }>();
  const apiSlug = leagueSlug?.trim().toLowerCase() ?? "";
  const [query, setQuery] = useState("");

  const { data: dbLeague, isLoading, error } = useQuery({
    queryKey: ["league", apiSlug],
    queryFn: () => getLeague(apiSlug),
    enabled: Boolean(apiSlug),
    retry: false,
  });

  const teams = useMemo(() => {
    const source = dbLeague?.teams ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return source;
    return source.filter(
      (team) =>
        team.name.toLowerCase().includes(trimmed) ||
        team.abbreviation.toLowerCase().includes(trimmed),
    );
  }, [dbLeague?.teams, query]);

  if (!apiSlug) {
    return <LeagueNotFound />;
  }

  if (apiSlug === "ncaa") {
    return <Navigate to="/leagues/ncaa-m" replace />;
  }

  if (!isLoading && (error || !dbLeague)) {
    return <LeagueNotFound />;
  }

  const displayMeta = dbLeague
    ? getLeagueDisplay(dbLeague.slug, dbLeague.name)
    : { display: "", tier: "", description: "", logoUrl: undefined };

  const totalTeams = dbLeague?.teams.length ?? 0;
  const currentSeasonLabel = seasonYearToLabel(getCurrentSeasonYear());

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <BackButton fallback="/leagues" />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center">
                {displayMeta.logoUrl ? (
                  <img
                    src={displayMeta.logoUrl}
                    alt={displayMeta.display}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-display text-3xl font-bold text-primary">
                    {displayMeta.display.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
                  {displayMeta.tier}
                </div>
                <h1 className="font-display text-5xl font-bold uppercase tracking-tighter md:text-7xl">
                  {displayMeta.display}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {displayMeta.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              Teams
            </h2>
            {totalTeams > 0 && (
              <span className="font-mono text-sm text-muted-foreground">
                {teams.length} of {totalTeams}
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {teams.map((team) => (
              <Link
                key={team.slug}
                to={rosterPath(team.name, currentSeasonLabel, apiSlug)}
                className="hover-elevate rounded-xl border border-border bg-card/50 p-3 backdrop-blur-sm transition-all hover:border-primary/40"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 truncate font-mono text-[10px] uppercase tracking-widest text-primary">
                      {displayMeta.display}
                    </div>
                    <div className="truncate text-sm font-bold">{team.name}</div>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {currentSeasonLabel}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <img
                    src={teamLogoUrl(team.name, {
                      leagueSlug: apiSlug,
                      abbreviation: team.abbreviation,
                      slug: team.slug,
                      variant: "primary",
                    })}
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
              Teams will appear here as they are added to the database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LeagueNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-muted-foreground">League not found.</p>
      <BackButton
        fallback="/leagues"
        className="mt-4 text-primary hover:underline"
        label="Back to Leagues"
      />
    </div>
  );
}
