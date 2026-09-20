import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatSeasonHeading,
  generateSeasonLabels,
  normalizeSeasonKey,
  teamLogoUrl,
  displayTeamName,
} from "@/lib/constants";
import { onHeadshotError, resolvePlayerHeadshot } from "@/lib/headshot";
import { getTeamRecord, getTeamRoster } from "@/lib/api";

function TeamRecordHeader({ record }: { record: { wins: number; losses: number } | null | undefined }) {
  if (record != null) {
    return (
      <p
        className="mt-2 flex items-center gap-2 font-display text-2xl font-bold tracking-tight"
        data-testid="team-record-header"
      >
        <span className="text-primary">{record.wins}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-muted-foreground">{record.losses}</span>
        <span className="ml-1 font-mono text-sm font-normal uppercase tracking-widest text-muted-foreground">
          W-L
        </span>
      </p>
    );
  }

  return (
    <p
      className="mt-2 flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-muted-foreground"
      data-testid="team-record-header"
    >
      <span>0</span>
      <span>-</span>
      <span>0</span>
      <span className="ml-1 font-mono text-sm font-normal uppercase tracking-widest">
        W-L
      </span>
    </p>
  );
}

function TeamRecordInline({ record }: { record: { wins: number; losses: number } | null | undefined }) {
  if (record != null) {
    return (
      <div className="flex items-center gap-3" data-testid="team-record">
        <span className="font-display text-2xl font-bold tracking-tight">
          <span className="text-primary">{record.wins}</span>
          <span className="mx-1 text-muted-foreground">-</span>
          <span className="text-muted-foreground">{record.losses}</span>
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          W-L
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 text-muted-foreground"
      data-testid="team-record"
    >
      <span className="font-display text-2xl font-bold tracking-tight">0-0</span>
      <span className="font-mono text-xs uppercase tracking-widest">W-L</span>
    </div>
  );
}

export function Roster() {
  const { team = "", season = "" } = useParams<{ team: string; season: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedTeam = decodeURIComponent(team);
  const decodedSeason = decodeURIComponent(season);
  const seasonLabel = normalizeSeasonKey(decodedSeason);
  const seasonLabels = generateSeasonLabels();

  const leagueSlug = new URLSearchParams(location.search).get("league") ?? undefined;

  useEffect(() => {
    if (!team || !season || decodedSeason === seasonLabel) return;
    const leagueQuery = leagueSlug ? `?league=${encodeURIComponent(leagueSlug)}` : "";
    navigate(
      `/roster/${encodeURIComponent(decodedTeam)}/${encodeURIComponent(seasonLabel)}${leagueQuery}`,
      { replace: true },
    );
  }, [team, season, decodedTeam, decodedSeason, seasonLabel, leagueSlug, navigate]);

  const {
    data: roster,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["team-roster", team, seasonLabel, leagueSlug],
    queryFn: () => getTeamRoster(decodedTeam, seasonLabel, leagueSlug ?? undefined),
    enabled: Boolean(team && season),
  });

  const { data: record } = useQuery({
    queryKey: ["team-record", team, seasonLabel, leagueSlug],
    queryFn: () => getTeamRecord(decodedTeam, seasonLabel, leagueSlug ?? undefined),
    enabled: Boolean(team && season),
  });

  const teamName = roster?.team.name ?? decodedTeam;
  const teamDisplayName = displayTeamName(teamName, {
    leagueSlug,
    abbreviation: roster?.team.abbreviation,
    slug: roster?.team.slug,
  });
  const players = roster?.players ?? [];

  const handleBack = () => {
    const previous = (location.state as { from?: string } | null)?.from;
    if (previous && !previous.startsWith("/roster/")) {
      navigate(previous);
      return;
    }
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/leagues/NBA");
  };

  const handleSeasonChange = (nextSeason: string) => {
    const leagueQuery = leagueSlug ? `?league=${encodeURIComponent(leagueSlug)}` : "";
    navigate(
      `/roster/${encodeURIComponent(decodedTeam)}/${encodeURIComponent(nextSeason)}${leagueQuery}`,
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="border-b border-border bg-muted py-12">
          <div className="container mx-auto px-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-8 rounded-full"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 inline h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
        <div className="container mx-auto mt-12 flex flex-col items-center justify-center px-4 py-24">
          <p className="mb-4 font-display text-xl text-muted-foreground">
            Unable to load roster. The server may be unavailable.
          </p>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-roster">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted py-12">
        <div className="container mx-auto px-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-8 rounded-full"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 inline h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center">
                <img
                  src={teamLogoUrl(teamName, {
                    leagueSlug: leagueSlug ?? undefined,
                    abbreviation: roster?.team.abbreviation,
                    slug: roster?.team.slug,
                    variant: "primary",
                  })}
                  alt={`${teamDisplayName} logo`}
                  className="max-h-full max-w-full object-contain"
                  data-testid="img-team-logo"
                />
              </div>
              <div>
                <h1
                  className="font-display text-5xl font-bold uppercase tracking-tighter md:text-7xl"
                  data-testid="text-team-name"
                >
                  {teamDisplayName}
                </h1>
                <p className="font-mono text-xl uppercase tracking-widest text-muted-foreground">
                  Team Roster
                </p>
                <TeamRecordHeader record={record} />
              </div>
            </div>

            <div className="flex min-w-[200px] flex-col gap-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
                <Calendar className="h-3 w-3" />
                <span>Select Season</span>
              </div>
              <div className="relative">
                <select
                  value={seasonLabel}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border-2 border-border bg-background px-3 py-2 pr-10 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="select-season"
                >
                  {seasonLabels.map((label) => (
                    <option
                      key={label}
                      value={label}
                      className="font-mono"
                      data-testid={`option-season-${label}`}
                    >
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="font-display text-3xl font-bold uppercase tracking-tight"
              data-testid="text-season-heading"
            >
              {formatSeasonHeading(seasonLabel)} Season Roster
            </h2>
            {players.length > 0 && (
              <Badge className="font-mono text-[10px] uppercase tracking-widest">
                {players.length} Active
              </Badge>
            )}
          </div>
          <TeamRecordInline record={record} />
        </div>

        {players.length > 0 ? (
          <div
            className="grid grid-cols-3 gap-3 md:flex md:flex-wrap md:justify-center md:gap-8"
            data-testid="roster-players-grid"
          >
            {players.map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="group w-full md:w-auto"
                data-testid={`link-player-${player.id}`}
              >
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-transparent p-2 transition-all duration-300 md:gap-4 md:p-6 md:hover:border-border md:hover:bg-muted">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border shadow-md transition-all duration-300 md:h-32 md:w-32 md:border-4 md:group-hover:scale-105 md:group-hover:border-primary">
                    <img
                      src={resolvePlayerHeadshot(player.headshotUrl)}
                      alt={player.name}
                      loading="lazy"
                      onError={onHeadshotError}
                      className="h-full w-full object-cover object-top"
                      data-testid={`img-player-${player.id}`}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                    <span
                      className="text-center font-display text-[10px] font-bold uppercase leading-tight transition-colors group-hover:text-primary md:text-xl md:leading-none"
                      data-testid={`text-player-name-${player.id}`}
                    >
                      {player.name}
                    </span>
                    <span
                      className="font-display text-sm font-bold text-primary md:text-2xl"
                      data-testid={`text-player-jersey-${player.id}`}
                    >
                      #{player.jerseyNumber || "—"}
                    </span>
                    <span className="mt-0.5 hidden font-mono text-xs uppercase tracking-widest text-muted-foreground md:mt-1 md:block">
                      View Profile
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl uppercase text-muted-foreground">
              No players on this roster yet
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              Try selecting a different season above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
