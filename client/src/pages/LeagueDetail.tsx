import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function LeagueDetail() {
  const { league } = useParams<{ league: string }>();

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="container mx-auto px-4">
        <Link
          to="/leagues"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leagues
        </Link>
        <h1 className="mb-4 font-display text-4xl text-foreground md:text-6xl">
          {(league ?? "").toUpperCase()}
        </h1>
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/30 p-12 text-center text-muted-foreground">
          League rosters and seasons coming in the next phase. Data will be fed by league scrapers.
        </p>
      </div>
    </div>
  );
}
