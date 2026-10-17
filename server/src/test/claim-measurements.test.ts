import { describe, expect, it } from "vitest";
import { parseClaimPosition, parseHeightCm, parseWeightKg } from "../utils/claim-measurements.js";

describe("claim measurements", () => {
  it("reads slider height and weight", () => {
    expect(parseHeightCm(`6'10"`)).toBe(Math.round(82 * 2.54));
    expect(parseHeightCm("6'10")).toBe(Math.round(82 * 2.54));
    expect(parseWeightKg("249 lbs")).toBe(Math.round(249 / 2.20462));
  });

  it("reads a position code", () => {
    expect(parseClaimPosition("sf")).toBe("SF");
    expect(parseClaimPosition("G/F")).toBe("G/F");
    expect(parseClaimPosition("coach")).toBeNull();
  });
});
