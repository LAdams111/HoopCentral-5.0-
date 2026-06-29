import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/lib/api";
import { groupLeaguesForDisplay } from "@/lib/leagues";
import { LeagueCard } from "@/components/leagues/LeagueCard";

export function Leagues() {
  const { data: leagues = [], isLoading, error } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { domestic, international, other } = groupLeaguesForDisplay(leagues);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Failed to load leagues.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 md:mb-12">
        <h1 className="mb-2 font-display text-3xl font-bold md:mb-4 md:text-5xl">
          Leagues
        </h1>
        <p className="text-sm text-muted-foreground md:text-lg">
          Browse leagues and explore team rosters.
        </p>
      </div>

      <div className="space-y-3 md:space-y-6">
        {domestic.map((league) => (
          <LeagueCard key={league.slug} league={league} />
        ))}
      </div>

      {international.length > 0 && (
        <>
          <div className="mb-6 mt-10 md:mb-12 md:mt-16">
            <h2 className="mb-2 font-display text-2xl font-bold md:mb-4 md:text-4xl">
              International
            </h2>
            <p className="text-sm text-muted-foreground md:text-lg">
              Professional basketball leagues from around the globe, including
              leagues discovered from player careers.
            </p>
          </div>

          <div className="space-y-3 md:space-y-6">
            {international.map((league) => (
              <LeagueCard key={league.slug} league={league} />
            ))}
          </div>
        </>
      )}

      {other.length > 0 && (
        <>
          <div className="mb-6 mt-10 md:mb-12 md:mt-16">
            <h2 className="mb-2 font-display text-2xl font-bold md:mb-4 md:text-4xl">
              Other Leagues
            </h2>
            <p className="text-sm text-muted-foreground md:text-lg">
              Additional leagues discovered from player career data.
            </p>
          </div>

          <div className="space-y-3 md:space-y-6">
            {other.map((league) => (
              <LeagueCard key={league.slug} league={league} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
