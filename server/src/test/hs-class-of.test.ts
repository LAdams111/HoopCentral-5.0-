import { describe, expect, it } from "vitest";
import { inferHsClassOfFromBirthDate } from "../utils/hs-class-of.js";

describe("hs-class-of", () => {
  it("maps LeBron birth date to Class of 2003", () => {
    expect(inferHsClassOfFromBirthDate("1984-12-30")).toBe(2003);
  });
});
