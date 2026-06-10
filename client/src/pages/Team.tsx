import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { DEFAULT_HEADSHOT, nbaTeamLogoUrl } from "@/lib/constants";
import { getTeam } from "@/lib/api";

export function Team() {
  const { slug = "" } = useParams<{ slug: string }>();

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => getTeam(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-foreground">Team Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          This team is not in the database yet.
        </p>
        <BackButton
          fallback="/leagues"
          className="mt-6 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
          label="Back to Leagues"
        />
      </div>
    );
  }

  const roster = team.roster;
  const leagueHref = `/leagues/${team.league.slug}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <BackButton fallback={leagueHref} />

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-6">
              <img
                src={nbaTeamLogoUrl(team.name, "primary")}
                alt={team.name}
                className="h-20 w-20 object-contain"
              />
              <div>
                <Link
                  to={leagueHref}
                  className="font-mono text-xs uppercase tracking-widest text-primary hover:underline"
                >
                  {team.league.name}
                </Link>
                <h1 className="font-display text-4xl font-bold uppercase tracking-tighter md:text-6xl">
                  {team.name}
                </h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {team.abbreviation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              Current Roster
            </h2>
            {team.latestSeasonLabel && (
              <span className="font-mono text-sm text-muted-foreground">
                {team.latestSeasonLabel}
              </span>
            )}
            <span className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {roster.length} {roster.length === 1 ? "Player" : "Players"}
            </span>
          </div>
        </div>

        {roster.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
            {roster.map((player) => (
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
            <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Players will appear here as they are added to the database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
