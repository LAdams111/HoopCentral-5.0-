import { describe, expect, it } from "vitest";
import { filterPublicPlayerSeasonStats } from "../utils/public-season-stats.js";

describe("filterPublicPlayerSeasonStats", () => {
  it("drops 0-GP duplicate when another league has games in the same season", () => {
    const rows = filterPublicPlayerSeasonStats([
      { season: "2025-26", leagueSlug: "ccaa", games_played: 0 },
      { season: "2025-26", leagueSlug: "u-sports", games_played: 20 },
      { season: "2024-25", leagueSlug: "ccaa", games_played: 0 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.leagueSlug === "u-sports" && r.season === "2025-26")).toBe(true);
    expect(rows.some((r) => r.leagueSlug === "ccaa" && r.season === "2025-26")).toBe(false);
  });
});
