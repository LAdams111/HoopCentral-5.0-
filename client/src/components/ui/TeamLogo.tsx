import { useEffect, useState } from "react";
import { MISSING_TEAM_LOGO, teamLogoUrl } from "@/lib/constants";
import { leagueLogoUrl } from "@/lib/leagues";

type TeamLogoProps = {
  teamName: string;
  leagueSlug?: string;
  abbreviation?: string;
  slug?: string;
  variant?: "global" | "primary";
  alt: string;
  className?: string;
};

export function TeamLogo({
  teamName,
  leagueSlug,
  abbreviation,
  slug,
  variant = "primary",
  alt,
  className = "max-h-full max-w-full object-contain",
}: TeamLogoProps) {
  const primary = teamLogoUrl(teamName, { leagueSlug, abbreviation, slug, variant });
  const leagueFallback = leagueLogoUrl(leagueSlug);
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(primary);
  }, [primary]);

  return (
    <img
      src={src || MISSING_TEAM_LOGO}
      alt={alt}
      className={className}
      data-testid="img-team-logo"
      onError={() => {
        setSrc((current) => {
          if (
            leagueFallback &&
            current !== leagueFallback &&
            leagueFallback !== MISSING_TEAM_LOGO
          ) {
            return leagueFallback;
          }
          return MISSING_TEAM_LOGO;
        });
      }}
    />
  );
}
