import { describe, expect, it } from "vitest";
import { fromMinorUnits, percent, toMinorUnits } from "../utils/money.js";

describe("money", () => {
  it("converts THB without float drift", () => {
    expect(toMinorUnits(20.2)).toBe(2020);
    expect(fromMinorUnits(2020)).toBe(20.2);
    expect(percent(90, 100)).toBe(90);
  });
});
