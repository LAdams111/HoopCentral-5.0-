import { nameToSlug } from "../utils/slug.js";
import {
  LNB_PRO_A_DISPLAY_NAMES,
  LNB_PRO_A_TEAM_SLUG_ALIASES,
} from "./lnb-pro-a-teams.js";
import { buildCcaaCanonicalTeamConfig } from "./ccaa-teams.js";
import { buildUsportsCanonicalTeamConfig } from "./usports-teams.js";

export interface CanonicalLeagueTeamConfig {
  /** slug -> canonical slug */
  slugAliases: Readonly<Record<string, string>>;
  /** canonical slug -> display label */
  displayNames: Readonly<Record<string, string>>;
}

function config(
  franchises: Array<{ name: string; display: string; aliases?: string[] }>,
): CanonicalLeagueTeamConfig {
  const slugAliases: Record<string, string> = {};
  const displayNames: Record<string, string> = {};

  for (const franchise of franchises) {
    const canonical = nameToSlug(franchise.name);
    displayNames[canonical] = franchise.display;
    slugAliases[canonical] = canonical;
    for (const alias of franchise.aliases ?? []) {
      slugAliases[alias.toLowerCase()] = canonical;
    }
  }

  return { slugAliases, displayNames };
}

export const ACB_TEAM_CONFIG = config([
  { name: "Real Madrid", display: "Real Madrid", aliases: ["real-madrid-teka"] },
  { name: "FC Barcelona", display: "Barça", aliases: ["fc-barcelona-lassa", "fc-barcelona-banca-catalana", "f-c-barcelona"] },
  { name: "Valencia Basket", display: "Valencia", aliases: ["pamesa-valencia"] },
  {
    name: "Cazoo Baskonia Vitoria-Gasteiz",
    display: "Baskonia",
    aliases: ["tau-ceramica-vitoria", "laboral-kutxa-vitoria", "taugres-vitoria"],
  },
  {
    name: "Universidad Catolica de Murcia CB",
    display: "UCAM Murcia",
    aliases: ["ucam-murcia-cb"],
  },
  {
    name: "Club Joventut Badalona",
    display: "Joventut",
    aliases: ["dkv-joventut-badalona"],
  },
  {
    name: "Surne Bilbao Basket",
    display: "Bilbao Basket",
    aliases: ["retabet-bilbao-basket"],
  },
  {
    name: "Iberostar Tenerife CB Canarias",
    display: "La Laguna Tenerife",
    aliases: ["cb-canarias", "la-laguna-tenerife"],
  },
  { name: "Unicaja Malaga", display: "Unicaja", aliases: ["unicaja-malaga"] },
  { name: "BAXI Manresa", display: "Manresa", aliases: ["baxi-manresa", "tdk-manresa"] },
  { name: "Leche Rio Breogan Lugo", display: "Río Breogán", aliases: ["leche-rio-breogan-lugo", "cb-breogan-lugo"] },
  {
    name: "Basquet Girona",
    display: "Bàsquet Girona",
    aliases: ["valvi-girona", "casademont-girona"],
  },
  {
    name: "San Pablo Inmobiliaria Miraflores Burgos",
    display: "San Pablo Burgos",
    aliases: ["san-pablo-burgos", "longevida-san-pablo-burgos"],
  },
  { name: "Hiopos Forca Lleida", display: "Hiopos Lleida", aliases: ["hiopos-lleida", "forca-lleida"] },
  {
    name: "Casademont Zaragoza",
    display: "Zaragoza",
    aliases: ["cai-zaragoza", "basket-zaragoza"],
  },
  { name: "MoraBanc Andorra", display: "Andorra", aliases: ["morabanc-andorra"] },
  {
    name: "Herbalife Gran Canaria",
    display: "Gran Canaria",
    aliases: ["cb-gran-canaria-las-palmas", "dreamland-gran-canaria"],
  },
  {
    name: "Coviran Granada",
    display: "Granada",
    aliases: ["cb-granada"],
  },
]);

export const NBL_TEAM_CONFIG = config([
  { name: "Adelaide 36ers", display: "Adelaide 36ers", aliases: ["adelaide-36ers"] },
  { name: "Brisbane Bullets", display: "Brisbane Bullets", aliases: ["brisbane-bullets"] },
  { name: "Cairns Taipans", display: "Cairns Taipans", aliases: ["cairns-taipans"] },
  {
    name: "Illawarra Hawks",
    display: "Illawarra Hawks",
    aliases: ["illawarra-hawks", "wollongong-hawks"],
  },
  {
    name: "Melbourne United",
    display: "Melbourne United",
    aliases: ["melbourne-united", "melbourne-tigers"],
  },
  { name: "New Zealand Breakers", display: "New Zealand Breakers", aliases: ["new-zealand-breakers"] },
  { name: "Perth Wildcats", display: "Perth Wildcats", aliases: ["perth-wildcats"] },
  {
    name: "South East Melbourne Phoenix",
    display: "SE Melbourne Phoenix",
    aliases: ["south-east-melbourne-phoenix"],
  },
  { name: "Sydney Kings", display: "Sydney Kings", aliases: ["sydney-kings"] },
  { name: "Tasmania JackJumpers", display: "Tasmania JackJumpers", aliases: ["tasmania-jackjumpers"] },
]);

export const CBA_TEAM_CONFIG = config([
  { name: "Beijing Ducks", display: "Beijing Ducks", aliases: ["shougang-beijing-ducks", "beijing-ducks"] },
  { name: "Beijing Royal Fighters", display: "Beijing Royal Fighters", aliases: ["beijing-royal-fighters", "beijing-beikong"] },
  { name: "Fujian Sturgeons", display: "Fujian Sturgeons", aliases: ["fujian-sturgeons", "fujian-sbs-xunxin", "fujian-xunxing"] },
  { name: "Guangdong Southern Tigers", display: "Guangdong Tigers", aliases: ["guangdong-southern-tigers", "guangdong-dongguan"] },
  { name: "Guangzhou Loong Lions", display: "Guangzhou Long-Lions", aliases: ["guangzhou-loong-lions", "guangzhou-long-lions"] },
  { name: "Jiangsu Dragons", display: "Jiangsu Dragons", aliases: ["jiangsu-nangang-dragons-nanjing", "jiangsu-kendia", "nanjing-monkey-king"] },
  { name: "Jilin Northeast Tigers", display: "Jilin Tigers", aliases: ["jilin-northeast-tigers"] },
  { name: "Liaoning Flying Leopards", display: "Liaoning Leopards", aliases: ["liaoning-flying-leopards"] },
  { name: "Nanjing Tongxi Monkey Kings", display: "Nanjing Monkey King", aliases: ["nanjing-tongxi-monkey-kings", "nanjing-tongxi"] },
  { name: "Ningbo Rockets", display: "Ningbo Rockets", aliases: ["ningbo-rockets"] },
  { name: "Qingdao Eagles", display: "Qingdao Eagles", aliases: ["qingdao-eagles", "qingdao-double-star-eagles", "qingdao-doublestar"] },
  { name: "Shandong Heroes", display: "Shandong Heroes", aliases: ["shandong-heroes", "shandong-flaming-bulls", "shandong-golden-stars", "shandong-g-s"] },
  { name: "Shanghai Sharks", display: "Shanghai Sharks", aliases: ["shanghai-sharks", "shanghai-dongfang-sharks"] },
  { name: "Shanxi Loongs", display: "Shanxi Loongs", aliases: ["shanxi-loongs", "shanxi-zhongyu", "shanxi-brave-dragons", "shanxi-brave"] },
  { name: "Shenzhen Leopards", display: "Shenzhen Aviators", aliases: ["shenzhen-leopards", "shenzhen-aviators"] },
  { name: "Sichuan Blue Whales", display: "Sichuan Blue Whales", aliases: ["sichuan-blue-whales"] },
  { name: "Tianjin Pioneers", display: "Tianjin Ronggang", aliases: ["tianjin-ronggang-pioneers", "tianjin-gold-lions", "tianjin-ronggang"] },
  { name: "Xinjiang Flying Tigers", display: "Xinjiang Flying Tigers", aliases: ["xinjiang-flying-tigers", "xinjiang-gyang-hui-flying-tigers", "xinjiang-guanghui"] },
  { name: "Zhejiang Guangsha Lions", display: "Zhejiang Guangsha", aliases: ["zhejiang-guangsha-lions"] },
  { name: "Zhejiang Golden Bulls", display: "Zhejiang Golden Bulls", aliases: ["zhejiang-golden-bulls", "zhejiang-wanma-cyclones", "zhejiang-chouzhou"] },
]);

export const B_LEAGUE_TEAM_CONFIG = config([
  { name: "Alvark Tokyo", display: "Alvark Tokyo", aliases: ["toyota-alvark-tokyo", "alvark-tokyo"] },
  { name: "Chiba Jets", display: "Chiba Jets", aliases: ["chiba-jets-funabashi"] },
  { name: "Hiroshima Dragonflies", display: "Hiroshima Dragonflies", aliases: ["hiroshima-dragonflies"] },
  { name: "Ibaraki Robots", display: "Ibaraki Robots", aliases: ["ibaraki-robots"] },
  { name: "Kawasaki Brave Thunders", display: "Kawasaki Brave Thunders", aliases: ["kawasaki-brave-thunders"] },
  { name: "Kyoto Hannaryz", display: "Kyoto Hannaryz", aliases: ["kyoto-hannaryz"] },
  { name: "Levanga Hokkaido", display: "Levanga Hokkaido", aliases: ["levanga-hokkaido-sapporo", "levanga-hokkaido"] },
  { name: "Nagasaki Velca", display: "Nagasaki Velca", aliases: ["nagasaki-velca"] },
  { name: "Nagoya Diamond Dolphins", display: "Nagoya Diamond Dolphins", aliases: ["nagoya-diamond-dolphins"] },
  { name: "Niigata Albirex", display: "Niigata Albirex", aliases: ["niigata-albirex-bb", "niigata-albirex"] },
  { name: "Osaka Evessa", display: "Osaka Evessa", aliases: ["osaka-evessa"] },
  { name: "Ryukyu Golden Kings", display: "Ryukyu Golden Kings", aliases: ["ryukyu-golden-kings-okinawa", "okinawa-ryukyu-golden-kings"] },
  { name: "San-en NeoPhoenix", display: "San-en NeoPhoenix", aliases: ["san-en-neophoenix"] },
  { name: "SeaHorses Mikawa", display: "SeaHorses Mikawa", aliases: ["seahorses-mikawa", "mikawa-seahorses"] },
  { name: "Sendai 89ers", display: "Sendai 89ers", aliases: ["sendai-89ers"] },
  { name: "Shiga Lakestars", display: "Shiga Lakestars", aliases: ["shiga-lakestars"] },
  { name: "Shimane Susanoo Magic", display: "Shimane Susanoo Magic", aliases: ["shimane-susanoo-magic"] },
  { name: "Sun Rockers Shibuya", display: "Sun Rockers Shibuya", aliases: ["shibuya-sun-rockers", "sun-rockers-shibuya"] },
  { name: "Utsunomiya Brex", display: "Utsunomiya Brex", aliases: ["link-tochigi-brex", "tochigi-brex"] },
  { name: "Yokohama B-Corsairs", display: "Yokohama B-Corsairs", aliases: ["yokohama-b-corsairs"] },
  { name: "Akita Northern Happinets", display: "Akita Northern Happinets", aliases: ["akita-northern-happinets"] },
  { name: "Gunma Crane Thunders", display: "Gunma Crane Thunders", aliases: ["gunma-crane-thunders"] },
  { name: "Koshigaya Alphas", display: "Koshigaya Alphas", aliases: ["koshigaya-alphas"] },
  { name: "Saga Ballooners", display: "Saga Ballooners", aliases: ["saga-ballooners"] },
  { name: "Toyama Grouses", display: "Toyama Grouses", aliases: ["toyama-grouses"] },
  { name: "Altiri Chiba", display: "Altiri Chiba", aliases: ["altiri-chiba"] },
]);

export const BAL_TEAM_CONFIG = config([
  { name: "Al Ahly", display: "Al Ahly", aliases: ["al-ahly", "sporting-al-ahly"] },
  { name: "Al Ahly Tripoli", display: "Al Ahly Tripoli", aliases: ["al-ahly-ly", "al-ahly-tripoli"] },
  { name: "APR Rwanda", display: "RSSB Tigers", aliases: ["apr-rwanda", "apr", "rssb-tigers"] },
  { name: "ASC Ville de Dakar", display: "ASC Ville de Dakar", aliases: ["asc-ville-de-dakar", "ville-de-dakar"] },
  { name: "Club Africain", display: "Club Africain", aliases: ["club-africain"] },
  { name: "Dar City", display: "Dar City", aliases: ["dar-city"] },
  { name: "FUS Rabat", display: "FUS Rabat", aliases: ["fus-rabat"] },
  { name: "JCA Kings", display: "JCA Kings", aliases: ["jca-kings"] },
  { name: "Johannesburg Giants", display: "Johannesburg Giants", aliases: ["johannesburg-giants"] },
  { name: "Maktown Flyers", display: "Maktown Flyers", aliases: ["maktown-flyers"] },
  { name: "Nairobi City Thunder", display: "Nairobi City Thunder", aliases: ["nairobi-city-thunder"] },
  { name: "Petro de Luanda", display: "Petro de Luanda", aliases: ["petro-de-luanda", "atletico-petroleos-de-luanda"] },
]);

export const OTE_TEAM_CONFIG = config([
  { name: "Overtime Elite City Reapers", display: "City Reapers", aliases: ["overtime-city-reapers", "city-reapers"] },
  { name: "Overtime Elite Cold Hearts", display: "Cold Hearts", aliases: ["overtime-cold-hearts"] },
  { name: "Overtime YNG Dreamerz", display: "YNG Dreamerz", aliases: ["overtime-yng-dreamerz"] },
  { name: "Diamond Doves", display: "Diamond Doves", aliases: ["diamond-doves"] },
  { name: "Blue Checks", display: "Blue Checks", aliases: ["blue-checks"] },
  { name: "RWE", display: "RWE", aliases: ["rwe"] },
  { name: "Fear of God Athletics", display: "Fear of God Athletics", aliases: ["fear-of-god-athletics"] },
  { name: "Jelly Fam", display: "Jelly Fam", aliases: ["jelly-fam"] },
]);

export const CANONICAL_LEAGUE_TEAM_CONFIG: Readonly<Record<string, CanonicalLeagueTeamConfig>> = {
  "lnb-pro-a": {
    slugAliases: LNB_PRO_A_TEAM_SLUG_ALIASES,
    displayNames: LNB_PRO_A_DISPLAY_NAMES,
  },
  "u-sports": buildUsportsCanonicalTeamConfig(),
  ccaa: buildCcaaCanonicalTeamConfig(),
  acb: ACB_TEAM_CONFIG,
  nbl: NBL_TEAM_CONFIG,
  cba: CBA_TEAM_CONFIG,
  "b-league": B_LEAGUE_TEAM_CONFIG,
  bal: BAL_TEAM_CONFIG,
  ote: OTE_TEAM_CONFIG,
};

export function hasCanonicalTeamAllowlist(leagueSlug: string): boolean {
  return leagueSlug in CANONICAL_LEAGUE_TEAM_CONFIG;
}

export function getCanonicalTeamSlugs(leagueSlug: string): ReadonlySet<string> | null {
  const config = CANONICAL_LEAGUE_TEAM_CONFIG[leagueSlug];
  if (!config) return null;
  return new Set(Object.keys(config.slugAliases));
}

export function resolveCanonicalTeamSlug(leagueSlug: string, slug: string): string | null {
  const config = CANONICAL_LEAGUE_TEAM_CONFIG[leagueSlug];
  if (!config) return null;
  return config.slugAliases[slug.toLowerCase()] ?? null;
}

export function getCanonicalTeamDisplayName(leagueSlug: string, canonicalSlug: string): string {
  const config = CANONICAL_LEAGUE_TEAM_CONFIG[leagueSlug];
  return config?.displayNames[canonicalSlug] ?? canonicalSlug;
}

export function dedupeCanonicalLeagueTeams<T extends { id: number; slug: string; name: string }>(
  leagueSlug: string,
  teams: T[],
  playerCounts: Map<number, number>,
): T[] {
  const config = CANONICAL_LEAGUE_TEAM_CONFIG[leagueSlug];
  if (!config) return teams;

  const canonicalSlugs = new Set(Object.values(config.slugAliases));
  const byCanonical = new Map<string, T>();

  for (const team of teams) {
    const canonical = config.slugAliases[team.slug.toLowerCase()];
    if (!canonical) continue;

    const existing = byCanonical.get(canonical);
    if (!existing) {
      byCanonical.set(canonical, team);
      continue;
    }

    const existingIsCanonical = existing.slug.toLowerCase() === canonical;
    const teamIsCanonical = team.slug.toLowerCase() === canonical;
    if (teamIsCanonical && !existingIsCanonical) {
      byCanonical.set(canonical, team);
      continue;
    }
    if (existingIsCanonical && !teamIsCanonical) {
      continue;
    }

    const existingCount = playerCounts.get(existing.id) ?? 0;
    const teamCount = playerCounts.get(team.id) ?? 0;
    const preferTeam =
      teamCount > existingCount ||
      (teamCount === existingCount && canonicalSlugs.has(team.slug));

    if (preferTeam) {
      byCanonical.set(canonical, team);
    }
  }

  return [...byCanonical.values()].sort((a, b) => {
    const aCanonical = config.slugAliases[a.slug.toLowerCase()] ?? "";
    const bCanonical = config.slugAliases[b.slug.toLowerCase()] ?? "";
    const aName = config.displayNames[aCanonical] ?? a.name;
    const bName = config.displayNames[bCanonical] ?? b.name;
    return aName.localeCompare(bName);
  });
}
