import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlayerCard } from "@/components/player/PlayerCard";
import { TeamSearchResults } from "@/components/search/TeamSearchResults";
import {
  getDraftClass,
  getDraftYears,
  getPlayers,
  searchTeams,
} from "@/lib/api";
import { DEFAULT_HEADSHOT, teamLogoUrl } from "@/lib/constants";
import { onHeadshotError, resolvePlayerHeadshot } from "@/lib/headshot";

function DraftClassView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year");

  const { data: yearsData, isLoading: yearsLoading } = useQuery({
    queryKey: ["draft-years"],
    queryFn: getDraftYears,
    staleTime: 60 * 60 * 1000,
  });

  const selectedYear = useMemo(() => {
    const parsed = yearParam ? Number(yearParam) : NaN;
    if (Number.isInteger(parsed) && yearsData?.years.includes(parsed)) return parsed;
    return yearsData?.defaultYear ?? new Date().getFullYear();
  }, [yearParam, yearsData]);

  const { data: draftClass, isLoading: draftLoading, error } = useQuery({
    queryKey: ["draft-class", selectedYear],
    queryFn: () => getDraftClass(selectedYear),
    enabled: Boolean(yearsData),
    staleTime: 5 * 60 * 1000,
  });

  const handleYearChange = (year: number) => {
    setSearchParams({ year: String(year) }, { replace: true });
  };

  const isLoading = yearsLoading || draftLoading;

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-4xl uppercase tracking-tighter text-foreground md:text-6xl">
                Draft <span className="text-primary">Class</span>
              </h1>
              <p className="font-mono text-sm text-muted-foreground">
                NBA draft history with Hoop Central player profiles
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <label
              htmlFor="draft-year"
              className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Draft Year
            </label>
            <div className="relative">
              <select
                id="draft-year"
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                disabled={!yearsData}
                className="h-12 w-full appearance-none rounded-xl border-2 border-border bg-background px-3 py-2 pr-10 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {(yearsData?.years ?? [selectedYear]).map((year) => (
                  <option key={year} value={year} className="font-mono">
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">
            {selectedYear} <span className="text-primary">NBA Draft</span>
          </h2>
          {draftClass && (
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {draftClass.pickCount} pick{draftClass.pickCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse border-b border-border bg-card/40 last:border-b-0"
              />
            ))}
          </div>
        ) : error || !draftClass ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center">
            <p className="font-display text-2xl text-muted-foreground">
              Unable to load the {selectedYear} draft class
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card/30">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-3 font-normal">Pk</th>
                  <th className="px-3 py-3 font-normal">Player</th>
                  <th className="px-3 py-3 font-normal">Team</th>
                  <th className="px-3 py-3 font-normal">Affiliation</th>
                  <th className="px-3 py-3 font-normal">Year</th>
                  <th className="px-3 py-3 font-normal">Rd</th>
                  <th className="px-3 py-3 font-normal">Rd Pk</th>
                  <th className="px-3 py-3 font-normal">Current</th>
                </tr>
              </thead>
              <tbody>
                {draftClass.picks.map((pick) => {
                  const profile = pick.player;
                  const headshot = profile
                    ? resolvePlayerHeadshot(profile.headshotUrl)
                    : DEFAULT_HEADSHOT;
                  const name = profile?.name ?? pick.playerName;

                  return (
                    <tr
                      key={`${pick.year}-${pick.overallPick}`}
                      className="border-b border-border/80 transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-display text-xl text-primary">
                        {pick.overallPick}
                      </td>
                      <td className="px-3 py-3">
                        {profile ? (
                          <Link
                            to={`/players/${profile.id}`}
                            className="group flex items-center gap-3"
                          >
                            <img
                              src={headshot}
                              alt=""
                              className="h-10 w-10 rounded-full border border-border object-cover bg-muted"
                              onError={onHeadshotError}
                            />
                            <span className="font-medium text-foreground group-hover:text-primary">
                              {name}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3">
                            <img
                              src={DEFAULT_HEADSHOT}
                              alt=""
                              className="h-10 w-10 rounded-full border border-border object-cover bg-muted opacity-70"
                            />
                            <span className="font-medium text-foreground">{name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={teamLogoUrl(pick.draftTeamLogoName, { leagueSlug: "nba" })}
                            alt=""
                            className="h-7 w-7 object-contain"
                          />
                          <span className="text-sm text-foreground">{pick.draftTeam}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {pick.affiliation || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-muted-foreground">
                        {pick.year}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-muted-foreground">
                        {pick.round}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-muted-foreground">
                        {pick.roundPick}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {profile?.team || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DirectorySearchView({ initialQ }: { initialQ: string }) {
  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);

  useEffect(() => {
    setQuery(initialQ);
    setDebouncedQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = debouncedQuery.trim().length >= 2;

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["search-teams", debouncedQuery],
    queryFn: () => searchTeams(debouncedQuery, 12),
    enabled: hasQuery,
  });

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["players", debouncedQuery],
    queryFn: () => getPlayers(debouncedQuery || undefined),
  });

  const isLoading = hasQuery ? teamsLoading || playersLoading : playersLoading;
  const noResults = hasQuery && !isLoading && teams.length === 0 && players.length === 0;
  const showPlayers = players.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 md:mb-12 md:flex-row md:items-end md:gap-6">
          <div>
            <h1 className="mb-2 font-display text-4xl text-foreground md:text-6xl">
              Player <span className="text-primary">Search</span>
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Search players and teams across Hoop Central
            </p>
            <Link
              to="/players"
              className="mt-3 inline-block font-mono text-xs uppercase tracking-wider text-primary hover:underline"
            >
              ← Back to Draft Class
            </Link>
          </div>
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search players or teams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-white py-3 pl-12 pr-4 text-foreground shadow-sm placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl border border-border bg-card/50"
              />
            ))}
          </div>
        ) : noResults ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-24 text-center">
            <p className="font-display text-2xl text-muted-foreground">No results found</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <>
            <TeamSearchResults teams={hasQuery ? teams : []} />

            {showPlayers && (
              <>
                <p className="mb-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {players.length} player{players.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
                  {players.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Players() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";

  if (q.trim().length > 0) {
    return <DirectorySearchView initialQ={q} />;
  }

  return <DraftClassView />;
}
