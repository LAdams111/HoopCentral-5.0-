import { describe, expect, it } from "vitest";
import {
  isHiddenOsbaTrilliumAliasSlug,
  resolveOsbaTrilliumCanonicalSlug,
  resolveOsbaTrilliumSlugVariants,
} from "../utils/osba-trillium-team-aliases.js";

describe("osba-trillium-team-aliases", () => {
  it("resolves known alias slugs to canonical", () => {
    expect(resolveOsbaTrilliumCanonicalSlug("king-heights-ca-on")).toBe(
      "king-heights-academy-ca-on",
    );
    expect(resolveOsbaTrilliumSlugVariants("king-heights-ca-on").sort()).toEqual(
      ["king-heights-academy-ca-on", "king-heights-ca-on"].sort(),
    );
  });

  it("does not alias separate Brampton squads", () => {
    expect(resolveOsbaTrilliumCanonicalSlug("brampton-city-prep-nationals-ca-on")).toBe(
      "brampton-city-prep-nationals-ca-on",
    );
    expect(isHiddenOsbaTrilliumAliasSlug("brampton-city-prep-provincial-ca-on")).toBe(false);
  });
});
