import { nameToSlug } from "../utils/slug.js";

/** 2025-26 Betclic Elite (LNB Pro A) franchises. */
export const LNB_PRO_A_TEAMS = [
  { abbrev: "MON", name: "AS Monaco Basket" },
  { abbrev: "PAR", name: "Paris Basketball" },
  { abbrev: "NAN", name: "Nanterre 92" },
  { abbrev: "CHO", name: "Cholet Basket" },
  { abbrev: "ASV", name: "LDLC ASVEL Lyon-Villeurbanne Basket" },
  { abbrev: "STR", name: "SIG Strasbourg" },
  { abbrev: "BOU", name: "JL Bourg Basket" },
  { abbrev: "LEM", name: "Le Mans Sarthe Basket" },
  { abbrev: "CHA", name: "ES Chalon-Sur-Saone" },
  { abbrev: "NANCY", name: "Sluc Nancy Basket Pro" },
  { abbrev: "BOZ", name: "Boulazac Basket Dordogne" },
  { abbrev: "DIJ", name: "JDA Dijon Bourgogne" },
  { abbrev: "LIM", name: "Limoges CSP Elite" },
  { abbrev: "GRA", name: "BCM Gravelines Dunkerque Grand Littoral" },
  { abbrev: "STQ", name: "Saint-Quentin Basket-Ball" },
  { abbrev: "POR", name: "ESSM Le Portel Cote d'Opale" },
] as const;

/** USBasket career slug variants that map to the same franchise. */
export const LNB_PRO_A_TEAM_SLUG_ALIASES: Readonly<Record<string, string>> = {
  "as-monaco-basket": "as-monaco-basket",
  "paris-basketball": "paris-basketball",
  "nanterre-92": "nanterre-92",
  "jsf-nanterre": "nanterre-92",
  "cholet-basket": "cholet-basket",
  "ldlc-asvel-lyon-villeurbanne-basket": "ldlc-asvel-lyon-villeurbanne-basket",
  "asvel-lyon-villeurbanne-basket": "ldlc-asvel-lyon-villeurbanne-basket",
  "asvel-lyon-villeurbanne": "ldlc-asvel-lyon-villeurbanne-basket",
  "asvel-villeurbanne": "ldlc-asvel-lyon-villeurbanne-basket",
  "adecco-asvel-lyon-villeurbanne": "ldlc-asvel-lyon-villeurbanne-basket",
  "sig-strasbourg": "sig-strasbourg",
  "strasbourg-ig": "sig-strasbourg",
  "jl-bourg-basket": "jl-bourg-basket",
  "jl-bourg-en-bresse": "jl-bourg-basket",
  "mincidelice-jl-bourg-en-bresse": "jl-bourg-basket",
  "le-mans-sarthe-basket": "le-mans-sarthe-basket",
  "es-chalon-sur-saone": "es-chalon-sur-saone",
  "champagne-chalons-reims-basket": "es-chalon-sur-saone",
  "espe-chalons-en-champagne-basket-pro": "es-chalon-sur-saone",
  "sluc-nancy-basket-pro": "sluc-nancy-basket-pro",
  "boulazac-basket-dordogne": "boulazac-basket-dordogne",
  "jda-dijon-bourgogne": "jda-dijon-bourgogne",
  "limoges-csp-elite": "limoges-csp-elite",
  "csp-limoges": "limoges-csp-elite",
  "bcm-gravelines-dunkerque-grand-littoral": "bcm-gravelines-dunkerque-grand-littoral",
  "bcm-gravelines-dunkerque": "bcm-gravelines-dunkerque-grand-littoral",
  "bcm-gravelines": "bcm-gravelines-dunkerque-grand-littoral",
  "saint-quentin-basket-ball": "saint-quentin-basket-ball",
  "essm-le-portel-cote-d-opale": "essm-le-portel-cote-d-opale",
};

export const LNB_PRO_A_CANONICAL_SLUGS = new Set(
  LNB_PRO_A_TEAMS.map((team) => nameToSlug(team.name)),
);

export const LNB_PRO_A_TEAM_SLUGS = new Set(Object.keys(LNB_PRO_A_TEAM_SLUG_ALIASES));

export function isLnbProATeamSlug(slug: string): boolean {
  return LNB_PRO_A_TEAM_SLUGS.has(slug.toLowerCase());
}

export function resolveLnbProACanonicalSlug(slug: string): string | null {
  return LNB_PRO_A_TEAM_SLUG_ALIASES[slug.toLowerCase()] ?? null;
}

export const LNB_PRO_A_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "as-monaco-basket": "AS Monaco",
  "paris-basketball": "Paris Basketball",
  "nanterre-92": "Nanterre 92",
  "cholet-basket": "Cholet Basket",
  "ldlc-asvel-lyon-villeurbanne-basket": "LDLC ASVEL",
  "sig-strasbourg": "SIG Strasbourg",
  "jl-bourg-basket": "JL Bourg",
  "le-mans-sarthe-basket": "Le Mans Sarthe",
  "es-chalon-sur-saone": "Élan Chalon",
  "sluc-nancy-basket-pro": "SLUC Nancy",
  "boulazac-basket-dordogne": "Boulazac",
  "jda-dijon-bourgogne": "JDA Dijon",
  "limoges-csp-elite": "Limoges CSP",
  "bcm-gravelines-dunkerque-grand-littoral": "Gravelines-Dunkerque",
  "saint-quentin-basket-ball": "Saint-Quentin",
  "essm-le-portel-cote-d-opale": "Le Portel",
};
