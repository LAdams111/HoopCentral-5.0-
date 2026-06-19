import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { getCurrentSeasonYear, rosterPath, seasonYearToLabel } from "@/lib/constants";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

  const season =
    team.latestSeasonLabel ??
    seasonYearToLabel(getCurrentSeasonYear());

  return (
    <Navigate
      to={rosterPath(team.slug, season, team.league.slug === "ncaa" ? "ncaa-m" : team.league.slug)}
      replace
    />
  );
}
