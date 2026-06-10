import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";

const LEAGUES = [
  { slug: "nba", name: "NBA", description: "National Basketball Association" },
  { slug: "wnba", name: "WNBA", description: "Women's National Basketball Association" },
  { slug: "gleague", name: "G League", description: "NBA G League" },
  { slug: "ncaa", name: "NCAA", description: "College Basketball" },
  { slug: "euroleague", name: "EuroLeague", description: "European Basketball" },
];

export function Leagues() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
            Leagues
          </h1>
          <p className="text-sm text-muted-foreground md:text-lg">
            Browse leagues and explore team rosters.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {LEAGUES.map((league) => (
            <Link
              key={league.slug}
              to={`/leagues/${league.slug}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card/50 p-6 transition-all hover:border-primary/50 hover:bg-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-foreground group-hover:text-primary">
                    {league.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{league.description}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
