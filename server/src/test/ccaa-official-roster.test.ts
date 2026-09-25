import { describe, expect, it } from "vitest";
import { ccaaOfficialSlugVariants } from "../data/ccaa-teams.js";
import {
  filterCcaaOfficialRoster,
  getCcaaOfficialRosterNames,
  matchCcaaOfficialRosterName,
  normalizeCcaaRosterName,
} from "../data/ccaa-official-rosters.js";

describe("ccaa official roster display", () => {
  it("normalizes curly apostrophes and accents", () => {
    expect(normalizeCcaaRosterName("D’andre Battise")).toBe("dandre battise");
    expect(normalizeCcaaRosterName("D'andre Battise")).toBe("dandre battise");
    expect(normalizeCcaaRosterName("Cégep")).toBe("cegep");
  });

  it("keeps only official Capilano 2025-26 names", () => {
    const names = getCcaaOfficialRosterNames("capilano", "2025-26");
    expect(names).toHaveLength(14);

    const filtered = filterCcaaOfficialRoster(
      [
        { name: "Kash Lang" },
        { name: "SQshFi GhisRBa" },
        { name: "Ahmad Athman" },
        { name: "Zach Klim" },
      ],
      "capilano",
      "2025-26",
    );
    expect(filtered.map((row) => row.name)).toEqual(["Kash Lang", "Zach Klim"]);
  });

  it("matches last-first RSEQ names and last-name-only official rows", () => {
    expect(
      matchCcaaOfficialRosterName("Charles Ringuette", ["Ringuette Charles"]),
    ).toBe("Ringuette Charles");
    expect(
      matchCcaaOfficialRosterName("Keysean Dumont", ["Dumont"], true),
    ).toBe("Dumont");
    expect(
      matchCcaaOfficialRosterName("Keysean Dumont", ["Dumont"], false),
    ).toBeNull();
  });

  it("collapses last-first and last-name-only duplicates in official lineups", () => {
    expect(getCcaaOfficialRosterNames("jean-de-breb", "2025-26")).not.toContain(
      "Ringuette Charles",
    );
    expect(getCcaaOfficialRosterNames("edouard-montp", "2025-26")).not.toContain("Dumont");
    expect(getCcaaOfficialRosterNames("edouard-montp", "2025-26")).toContain("Keysean Dumont");
  });

  it("keeps the official identity when leftover names collide", () => {
    const filtered = filterCcaaOfficialRoster(
      [
        { name: "Hamza Mahdi", official: false },
        { name: "Hamza Mahdi", official: true },
      ],
      "red-deer",
      "2025-26",
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.official).toBe(true);
  });

  it("resolves alias slugs to the official lineup", () => {
    expect(ccaaOfficialSlugVariants("alb-augustana")).toContain("uofa-augustana");
    expect(getCcaaOfficialRosterNames("alb-augustana", "2025-26")?.length).toBe(
      getCcaaOfficialRosterNames("uofa-augustana", "2025-26")?.length,
    );
  });

  it("does not filter seasons without an official lineup", () => {
    const leftover = [{ name: "SQshFi GhisRBa" }, { name: "Kash Lang" }];
    expect(filterCcaaOfficialRoster(leftover, "capilano", "2024-25")).toEqual(leftover);
    expect(filterCcaaOfficialRoster(leftover, "red-river-college", "2025-26")).toEqual(
      leftover,
    );
  });
});
