import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { rosterPath, seasonYearToLabel, getCurrentSeasonYear, teamLogoUrl, displayTeamName } from "@/lib/constants";
import { getLeague, type LeagueTeam } from "@/lib/api";
import { getLeagueDisplay } from "@/lib/leagues";
import {
  getHighSchoolRegion,
  getHighSchoolRegions,
  groupHighSchoolTeamsByState,
  isHighSchoolLeague,
} from "@/lib/hs-league-groups";
import { HS_USA_REGION_SLUG, isKnownHsStateSlug, stateNameFromSlug } from "@/lib/hs-us-states";
import {
  getNcaaLeagueConference,
  groupNcaaLeagueTeams,
  isNcaaGroupedLeague,
  isOtherNcaaConference,
  type NcaaGroupedLeagueSlug,
} from "@/lib/ncaa-league-groups";

export function LeagueDetail() {
  const { league: leagueSlug, conference: conferenceSlug, region: regionSlug, state: stateSlug } =
    useParams<{
      league: string;
      conference?: string;
      region?: string;
      state?: string;
    }>();
  const apiSlug = leagueSlug?.trim().toLowerCase() ?? "";
  const activeConferenceSlug = conferenceSlug?.trim().toLowerCase() ?? "";
  const activeRegionSlug = regionSlug?.trim().toLowerCase() ?? "";
  const activeStateSlug = stateSlug?.trim().toLowerCase() ?? "";
  const [query, setQuery] = useState("");

  const { data: dbLeague, isLoading, error } = useQuery({
    queryKey: ["league", apiSlug],
    queryFn: () => getLeague(apiSlug),
    enabled: Boolean(apiSlug),
    retry: false,
  });

  const isHighSchool = isHighSchoolLeague(apiSlug);
  const isHsRegionList = isHighSchool && !activeRegionSlug && !activeStateSlug;
  const isHsStateList = isHighSchool && activeRegionSlug === HS_USA_REGION_SLUG && !activeStateSlug;
  const isHsStateView = isHighSchool && Boolean(activeStateSlug);

  const isNcaaGrouped = isNcaaGroupedLeague(apiSlug);
  const ncaaGroupedSlug: NcaaGroupedLeagueSlug | null = isNcaaGrouped ? apiSlug : null;
  const isConferenceList = isNcaaGrouped && !activeConferenceSlug;
  const isConferenceView = isNcaaGrouped && Boolean(activeConferenceSlug);

  const conferenceGroups = useMemo(
    () =>
      ncaaGroupedSlug
        ? groupNcaaLeagueTeams(ncaaGroupedSlug, dbLeague?.teams ?? [])
        : [],
    [ncaaGroupedSlug, dbLeague?.teams],
  );

  const hsRegions = useMemo(
    () => getHighSchoolRegions(dbLeague?.teams.length ?? 0),
    [dbLeague?.teams.length],
  );

  const hsStateGroups = useMemo(
    () => groupHighSchoolTeamsByState(dbLeague?.teams ?? []),
    [dbLeague?.teams],
  );

  const activeConferenceGroup = useMemo(
    () =>
      isConferenceView
        ? conferenceGroups.find((group) => group.conference.slug === activeConferenceSlug)
        : undefined,
    [isConferenceView, conferenceGroups, activeConferenceSlug],
  );

  const activeHsStateGroup = useMemo(
    () =>
      isHsStateView
        ? hsStateGroups.find((group) => group.state.slug === activeStateSlug)
        : undefined,
    [isHsStateView, hsStateGroups, activeStateSlug],
  );

  const activeHsRegion = useMemo(
    () => (isHsStateList ? getHighSchoolRegion(activeRegionSlug) : undefined),
    [isHsStateList, activeRegionSlug],
  );

  const visibleConferences = useMemo(() => {
    if (!isConferenceList) return [];
    const trimmed = query.trim().toLowerCase();
    const populated = conferenceGroups.filter((group) => group.teams.length > 0);
    if (!trimmed) return populated;
    return populated.filter((group) => group.conference.name.toLowerCase().includes(trimmed));
  }, [isConferenceList, conferenceGroups, query]);

  const visibleHsRegions = useMemo(() => {
    if (!isHsRegionList) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return hsRegions;
    return hsRegions.filter((group) => group.region.name.toLowerCase().includes(trimmed));
  }, [isHsRegionList, hsRegions, query]);

  const visibleHsStates = useMemo(() => {
    if (!isHsStateList) return [];
    const trimmed = query.trim().toLowerCase();
    const populated = hsStateGroups.filter((group) => group.teams.length > 0);
    if (!trimmed) return populated;
    return populated.filter((group) => group.state.name.toLowerCase().includes(trimmed));
  }, [isHsStateList, hsStateGroups, query]);

  const teams = useMemo(() => {
    if (isConferenceList || isHsRegionList || isHsStateList) return [];

    let source: LeagueTeam[] = [];
    if (isConferenceView) {
      source = activeConferenceGroup?.teams ?? [];
    } else if (isHsStateView) {
      source = activeHsStateGroup?.teams ?? [];
    } else {
      source = dbLeague?.teams ?? [];
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return source;
    return source.filter(
      (team) =>
        team.name.toLowerCase().includes(trimmed) ||
        team.abbreviation.toLowerCase().includes(trimmed),
    );
  }, [
    isConferenceList,
    isHsRegionList,
    isHsStateList,
    isConferenceView,
    isHsStateView,
    activeConferenceGroup?.teams,
    activeHsStateGroup?.teams,
    dbLeague?.teams,
    query,
  ]);

  if (!apiSlug) {
    return <LeagueNotFound />;
  }

  if (apiSlug === "ncaa") {
    return <Navigate to="/leagues/ncaa-m" replace />;
  }

  if (!isLoading && (error || !dbLeague)) {
    return <LeagueNotFound />;
  }

  if (
    isConferenceView &&
    ncaaGroupedSlug &&
    !isLoading &&
    !isOtherNcaaConference(ncaaGroupedSlug, activeConferenceSlug) &&
    !getNcaaLeagueConference(ncaaGroupedSlug, activeConferenceSlug)
  ) {
    return <ConferenceNotFound leagueSlug={apiSlug} />;
  }

  if (isConferenceView && !isLoading && !activeConferenceGroup) {
    return <ConferenceNotFound leagueSlug={apiSlug} />;
  }

  if (isHsStateList && !isLoading && !activeHsRegion) {
    return <RegionNotFound leagueSlug={apiSlug} />;
  }

  if (
    isHsStateView &&
    !isLoading &&
    activeStateSlug !== "other" &&
    !isKnownHsStateSlug(activeStateSlug)
  ) {
    return <StateNotFound leagueSlug={apiSlug} />;
  }

  if (isHsStateView && !isLoading && !activeHsStateGroup) {
    return <StateNotFound leagueSlug={apiSlug} />;
  }

  const displayMeta = dbLeague
    ? getLeagueDisplay(dbLeague.slug, dbLeague.name)
    : { display: "", tier: "", description: "", logoUrl: undefined };

  const totalTeams = dbLeague?.teams.length ?? 0;
  const currentSeasonLabel = seasonYearToLabel(getCurrentSeasonYear());
  const conferenceTitle = activeConferenceGroup?.conference.name ?? "Conference";
  const hsStateTitle = activeHsStateGroup?.state.name ?? stateNameFromSlug(activeStateSlug);
  const hsRegionTitle = activeHsRegion?.name ?? "USA";

  const pageTitle = isConferenceView
    ? conferenceTitle
    : isHsStateView
      ? hsStateTitle
      : isHsStateList
        ? hsRegionTitle
        : displayMeta.display;

  const pageSubtitle = isConferenceView
    ? `${displayMeta.display} · ${conferenceTitle}`
    : isHsStateView
      ? `${displayMeta.display} · USA · ${hsStateTitle}`
      : isHsStateList
        ? `${displayMeta.display} · USA`
        : displayMeta.description;

  const sectionTitle = isConferenceList
    ? "Conferences"
    : isConferenceView
      ? conferenceTitle
      : isHsRegionList
        ? "Regions"
        : isHsStateList
          ? "States"
          : isHsStateView
            ? hsStateTitle
            : "Teams";

  const sectionCount = isConferenceList
    ? visibleConferences.reduce((sum, group) => sum + group.teams.length, 0)
    : isHsRegionList
      ? visibleHsRegions.reduce((sum, group) => sum + group.teamCount, 0)
      : isHsStateList
        ? visibleHsStates.reduce((sum, group) => sum + group.teams.length, 0)
        : teams.length;

  const sectionTotal = isConferenceList
    ? totalTeams
    : isConferenceView
      ? (activeConferenceGroup?.teams.length ?? 0)
      : isHsRegionList
        ? totalTeams
        : isHsStateList
          ? totalTeams
          : isHsStateView
            ? (activeHsStateGroup?.teams.length ?? 0)
            : totalTeams;

  const searchPlaceholder = isConferenceList
    ? "Search conferences..."
    : isHsRegionList
      ? "Search regions..."
      : isHsStateList
        ? "Search states..."
        : "Search teams...";

  const backFallback = isConferenceView
    ? `/leagues/${apiSlug}`
    : isHsStateView
      ? `/leagues/${apiSlug}/region/${HS_USA_REGION_SLUG}`
      : isHsStateList
        ? `/leagues/${apiSlug}`
        : "/leagues";

  const backLabel = isConferenceView
    ? "Back to Conferences"
    : isHsStateView
      ? "Back to States"
      : isHsStateList
        ? "Back to Regions"
        : "Back";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <BackButton fallback={backFallback} label={backLabel} />

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
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{pageSubtitle}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              {sectionTitle}
            </h2>
            {sectionTotal > 0 && (
              <span className="font-mono text-sm text-muted-foreground">
                {sectionCount} of {sectionTotal}
              </span>
            )}
          </div>
          <div className="relative w-full sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={searchPlaceholder}
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
        ) : isConferenceList ? (
          visibleConferences.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleConferences.map((group) => (
                <DrillDownCard
                  key={group.conference.slug}
                  label={displayMeta.display}
                  title={group.conference.name}
                  count={group.teams.length}
                  countLabel="team"
                  to={`/leagues/${apiSlug}/conference/${group.conference.slug}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No conferences found" />
          )
        ) : isHsRegionList ? (
          visibleHsRegions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleHsRegions.map((group) => (
                <DrillDownCard
                  key={group.region.slug}
                  label={displayMeta.display}
                  title={group.region.name}
                  count={group.teamCount}
                  countLabel="team"
                  to={`/leagues/${apiSlug}/region/${group.region.slug}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No regions found" />
          )
        ) : isHsStateList ? (
          visibleHsStates.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleHsStates.map((group) => (
                <DrillDownCard
                  key={group.state.slug}
                  label="USA"
                  title={group.state.name}
                  count={group.teams.length}
                  countLabel="team"
                  to={`/leagues/${apiSlug}/state/${group.state.slug}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No states found" />
          )
        ) : teams.length > 0 ? (
          <TeamGrid
            teams={teams}
            leagueSlug={apiSlug}
            leagueLabel={displayMeta.display}
            seasonLabel={currentSeasonLabel}
          />
        ) : (
          <EmptyState message="No teams found in this league yet" />
        )}
      </div>
    </div>
  );
}

function DrillDownCard({
  label,
  title,
  count,
  countLabel,
  to,
}: {
  label: string;
  title: string;
  count: number;
  countLabel: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="hover-elevate rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            {label}
          </div>
          <div className="text-base font-bold leading-snug">{title}</div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {count} {count === 1 ? countLabel : `${countLabel}s`}
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

function TeamGrid({
  teams,
  leagueSlug,
  leagueLabel,
  seasonLabel,
}: {
  teams: LeagueTeam[];
  leagueSlug: string;
  leagueLabel: string;
  seasonLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {teams.map((team) => {
        const label = displayTeamName(team.name, {
          leagueSlug,
          abbreviation: team.abbreviation,
          slug: team.slug,
        });

        return (
          <Link
            key={team.slug}
            to={rosterPath(team.slug, seasonLabel, leagueSlug)}
            className="hover-elevate rounded-xl border border-border bg-card/50 p-3 backdrop-blur-sm transition-all hover:border-primary/40"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 truncate font-mono text-[10px] uppercase tracking-widest text-primary">
                  {leagueLabel}
                </div>
                <div className="truncate text-sm font-bold">{label}</div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="font-mono text-[9px] text-muted-foreground">{seasonLabel}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
              <img
                src={teamLogoUrl(team.name, {
                  leagueSlug,
                  abbreviation: team.abbreviation,
                  slug: team.slug,
                  variant: "primary",
                })}
                alt={label}
                className="h-8 w-8 flex-shrink-0 object-contain"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-border py-20 text-center">
      <p className="font-display text-2xl uppercase text-muted-foreground">{message}</p>
      <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        Teams will appear here as they are added to the database
      </p>
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

function ConferenceNotFound({ leagueSlug }: { leagueSlug: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-muted-foreground">Conference not found.</p>
      <BackButton
        fallback={`/leagues/${leagueSlug}`}
        className="mt-4 text-primary hover:underline"
        label="Back to Conferences"
      />
    </div>
  );
}

function RegionNotFound({ leagueSlug }: { leagueSlug: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-muted-foreground">Region not found.</p>
      <BackButton
        fallback={`/leagues/${leagueSlug}`}
        className="mt-4 text-primary hover:underline"
        label="Back to Regions"
      />
    </div>
  );
}

function StateNotFound({ leagueSlug }: { leagueSlug: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-muted-foreground">State not found.</p>
      <BackButton
        fallback={`/leagues/${leagueSlug}/region/${HS_USA_REGION_SLUG}`}
        className="mt-4 text-primary hover:underline"
        label="Back to States"
      />
    </div>
  );
}
