import { useEffect, useState } from "react";
import { teamLogoUrl } from "@/lib/constants";
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
  const fallback = leagueLogoUrl(leagueSlug);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setFailed(false);
  }, [primary]);

  if (failed && !fallback) return null;

  return (
    <img
      src={failed ? fallback : src}
      alt={alt}
      className={className}
      data-testid="img-team-logo"
      onError={() => {
        if (!failed && fallback && fallback !== src) {
          setFailed(true);
          setSrc(fallback);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
