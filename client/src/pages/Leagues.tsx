import { DOMESTIC_LEAGUES, INTERNATIONAL_LEAGUES } from "@/lib/leagues";
import { LeagueCard } from "@/components/leagues/LeagueCard";

export function Leagues() {
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
        {DOMESTIC_LEAGUES.map((league) => (
          <LeagueCard key={league.slug} league={league} />
        ))}
      </div>

      <div className="mb-6 mt-10 md:mb-12 md:mt-16">
        <h2 className="mb-2 font-display text-2xl font-bold md:mb-4 md:text-4xl">
          International
        </h2>
        <p className="text-sm text-muted-foreground md:text-lg">
          Professional basketball leagues from around the globe.
        </p>
      </div>

      <div className="space-y-3 md:space-y-6">
        {INTERNATIONAL_LEAGUES.map((league) => (
          <LeagueCard key={league.slug} league={league} />
        ))}
      </div>
    </div>
  );
}
