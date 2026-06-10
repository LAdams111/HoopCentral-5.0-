import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DEFAULT_HEADSHOT, nbaTeamLogoUrl, seasonLabelToUrlYear } from "@/lib/constants";
import { getTeamRoster, getTeamSeasons } from "@/lib/api";

export function Roster() {
  const { team = "", season = "" } = useParams<{ team: string; season: string }>();
  const navigate = useNavigate();
  const decodedTeam = decodeURIComponent(team);

  const { data: roster, isLoading, error } = useQuery({
    queryKey: ["team-roster", team, season],
    queryFn: () => getTeamRoster(decodedTeam, season),
    enabled: Boolean(team && season),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["team-seasons", team],
    queryFn: () => getTeamSeasons(decodedTeam),
    enabled: Boolean(team),
  });

  const seasonLabel = roster?.seasonLabel ?? season;
  const teamName = roster?.team.name ?? decodedTeam;
  const players = roster?.players ?? [];

  const handleSeasonChange = (nextSeason: string) => {
    navigate(
      `/roster/${encodeURIComponent(decodedTeam)}/${seasonLabelToUrlYear(nextSeason)}`,
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-foreground">Roster Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          This team or season is not in the database yet.
        </p>
        <Link
          to="/leagues/NBA"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Back to Leagues
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <Link
            to="/leagues/NBA"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-6">
              <img
                src={nbaTeamLogoUrl(teamName, "primary")}
                alt={teamName}
                className="h-20 w-20 object-contain"
              />
              <div>
                <h1 className="font-display text-4xl font-bold uppercase tracking-tighter md:text-6xl">
                  {teamName}
                </h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Team Roster
                </p>
              </div>
            </div>

            {seasons.length > 0 && (
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="season-select"
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  Select Season
                </label>
                <select
                  id="season-select"
                  value={seasonLabel}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="rounded-md border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {seasons.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              {seasonLabel} Season Roster
            </h2>
            <span className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {players.length} Active
            </span>
          </div>
        </div>

        {players.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
            {players.map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-lg"
              >
                <div className="mb-3 h-16 w-16 overflow-hidden rounded-full bg-muted">
                  <img
                    src={player.headshotUrl || DEFAULT_HEADSHOT}
                    alt={player.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_HEADSHOT;
                    }}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="font-display text-sm font-bold uppercase leading-tight tracking-tight transition-colors group-hover:text-primary">
                  {player.name}
                </div>
                <div className="mt-1 font-mono text-sm text-primary">
                  #{player.jerseyNumber || "—"}
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary">
                  View Profile
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl uppercase text-muted-foreground">
              No players on this roster yet
            </p>
            {seasons.length > 1 && (
              <p className="font-mono text-sm text-muted-foreground">
                Try selecting a different season above
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
