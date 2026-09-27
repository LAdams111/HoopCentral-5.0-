/** Official Overtime Elite crests from images.overtime.tv. */
const CDN = "https://images.overtime.tv";

const CANONICAL_LOGOS: Record<string, string> = {
  "city-reapers":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/b5ef56ef-d988-47f8-acf5-a934aaaa1c17.svg`,
  "cold-hearts":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/d4decba6-c8a6-48ef-a29e-03000f0a5642.svg`,
  "yng-dreamerz":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/391e4b32-04d7-43c8-9fb4-9fd98a473f8e.webp`,
  "diamond-doves":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/badd224d-9fbd-4e2b-8d21-13e0e743393c.svg`,
  "fear-of-god":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/8b637b48-e5ba-4230-9b55-0f118a640761.svg`,
  faze: `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/c7a710f9-9047-405b-b49e-363b3af68940.svg`,
  hellstar:
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/58385a7e-ad49-4877-9b5c-a8c573f91814.svg`,
  rwe: `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/0277ae6a-a471-42d1-9b31-9a626e0d68e6.webp`,
  "blue-checks":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/86d09f9f-cbfe-4594-a8e3-b2b4157595e4.svg`,
  "jelly-fam":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/f2916aca-5207-4d15-a525-92c477273bc9.svg`,
  bruins:
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/b640103f-d1d3-4685-a8df-305fbb97ef4a.png`,
  falcons:
    `${CDN}/ote-games/09e27d54-64fb-48b2-b729-9fbeb3fd1040/84835727-36d3-4988-8df4-237f6549fea9.svg`,
  "holy-rams":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/5e2826bd-f97f-4014-88bd-50f76ffb732f.webp`,
  "rolling-loud":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/cf1919a3-010c-4247-b840-60fb3e5f77d3.webp`,
  nocta:
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/0fb19cfa-a0bf-44d7-85de-a70ca2fa5f4f.png`,
  "evangel-christian":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/b9983149-e118-4016-b1e0-1c51a08d6e94.png`,
  "winston-salem-christian":
    `${CDN}/ote-games/e3008e5d-0f63-423a-abbc-49f9bbacc2e0/a00ad910-e0d2-4200-91ed-7bc339eb14e9.png`,
};

const ALIAS_TO_CANONICAL: Record<string, string> = {
  "overtime-city-reapers": "city-reapers",
  "overtime-cold-hearts": "cold-hearts",
  "fear-of-god-athletics": "fear-of-god",
  "overtime-yng-dreamerz": "yng-dreamerz",
};

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function oteTeamLogoUrl(options?: {
  slug?: string;
  teamName?: string;
}): string | undefined {
  const raw = options?.slug?.trim().toLowerCase();
  if (raw) {
    const canonical = ALIAS_TO_CANONICAL[raw] ?? raw;
    if (CANONICAL_LOGOS[canonical]) return CANONICAL_LOGOS[canonical];
  }
  if (options?.teamName) {
    const fromName = nameToSlug(options.teamName);
    const canonical = ALIAS_TO_CANONICAL[fromName] ?? fromName;
    if (CANONICAL_LOGOS[canonical]) return CANONICAL_LOGOS[canonical];
  }
  return undefined;
}
