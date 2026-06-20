import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, searchTeams, type PlayerCard, type TeamSummary } from "@/lib/api";
import { resolvePlayerHeadshot, onHeadshotError } from "@/lib/headshot";
import { getLeagueDisplay } from "@/lib/leagues";
import { teamLogoUrl, displayTeamName } from "@/lib/constants";
import { publicLeagueSlugForRoster, teamRosterPath } from "@/lib/team-search";

export function PlayerSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length >= 2;

  const { data: playerResults = [] } = useQuery({
    queryKey: ["search-players", debounced],
    queryFn: () => getPlayers(debounced, undefined, 5),
    enabled,
  });

  const { data: teamResults = [] } = useQuery({
    queryKey: ["search-teams", debounced],
    queryFn: () => searchTeams(debounced, 3),
    enabled,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToPlayer = (player: PlayerCard) => {
    setOpen(false);
    setQuery("");
    navigate(`/players/${player.id}`);
  };

  const goToTeam = (team: TeamSummary) => {
    setOpen(false);
    setQuery("");
    navigate(teamRosterPath(team));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerResults[0]) {
      goToPlayer(playerResults[0]);
      return;
    }
    if (teamResults[0]) {
      goToTeam(teamResults[0]);
      return;
    }
    if (query.trim()) navigate(`/players?q=${encodeURIComponent(query.trim())}`);
  };

  const showDropdown = open && enabled;
  const hasResults = teamResults.length > 0 || playerResults.length > 0;

  return (
    <div
      ref={ref}
      className="group/search relative z-[100] mx-auto max-w-md animate-fade-in-up delay-300"
    >
      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players or teams..."
          className="flex h-9 w-full rounded-full border-2 border-black bg-white/5 px-3 py-7 pl-12 pr-12 text-base ring-offset-background transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
        />
        <button
          type="submit"
          className="hover-elevate active-elevate-2 absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--primary-border)] bg-primary p-0 text-primary-foreground shadow-xs"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <SearchDropdown
            teams={teamResults}
            players={playerResults}
            hasResults={hasResults}
            onSelectTeam={goToTeam}
            onSelectPlayer={goToPlayer}
          />
        </>
      )}
    </div>
  );
}

function SearchDropdown({
  teams,
  players,
  hasResults,
  onSelectTeam,
  onSelectPlayer,
}: {
  teams: TeamSummary[];
  players: PlayerCard[];
  hasResults: boolean;
  onSelectTeam: (team: TeamSummary) => void;
  onSelectPlayer: (player: PlayerCard) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(24rem,70vh)] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
      <div className="py-2">
        {!hasResults ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No results found.</p>
        ) : (
          <>
            {players.length > 0 && (
              <div className="mb-1">
                <p className="px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Players
                </p>
                {players.map((player) => (
                  <PlayerSearchRow key={player.id} player={player} onSelect={onSelectPlayer} />
                ))}
              </div>
            )}
            {teams.length > 0 && (
              <div>
                <p className="px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Teams
                </p>
                {teams.map((team) => (
                  <TeamSearchRow key={`${team.league.slug}-${team.id}`} team={team} onSelect={onSelectTeam} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TeamSearchRow({
  team,
  onSelect,
}: {
  team: TeamSummary;
  onSelect: (team: TeamSummary) => void;
}) {
  const leagueSlug = publicLeagueSlugForRoster(team.league.slug);
  const leagueMeta = getLeagueDisplay(leagueSlug, team.league.name);
  const label = displayTeamName(team.name, {
    leagueSlug,
    abbreviation: team.abbreviation,
    slug: team.slug,
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(team)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover-elevate"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <img
          src={teamLogoUrl(team.name, {
            leagueSlug,
            abbreviation: team.abbreviation,
            slug: team.slug,
            variant: "primary",
          })}
          alt={label}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold text-foreground transition-colors group-hover:text-primary">
          {label}
        </p>
        <p className="truncate font-mono text-xs uppercase text-muted-foreground">
          {leagueMeta.display} • {team.abbreviation}
        </p>
      </div>
    </button>
  );
}

function PlayerSearchRow({
  player,
  onSelect,
}: {
  player: PlayerCard;
  onSelect: (player: PlayerCard) => void;
}) {
  const teamLabel = displayTeamName(player.team, { slug: player.teamSlug ?? undefined });

  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover-elevate"
    >
      <div className="h-8 w-8 overflow-hidden rounded-full border border-border">
        <img
          src={resolvePlayerHeadshot(player.headshotUrl)}
          alt={player.name}
          className="h-full w-full object-cover object-top"
          onError={onHeadshotError}
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
          {player.name}
        </p>
        <p className="-mt-0.5 truncate font-mono uppercase leading-tight text-muted-foreground">
          {teamLabel && <span className="text-[10px]">{teamLabel}</span>}
          {teamLabel && player.jerseyNumber && (
            <span className="text-[10px]"> • </span>
          )}
          {player.jerseyNumber && (
            <span className="text-xs">#{player.jerseyNumber}</span>
          )}
        </p>
      </div>
    </button>
  );
}
