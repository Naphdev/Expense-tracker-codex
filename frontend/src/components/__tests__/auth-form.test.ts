import { describe, expect, it } from "vitest";
import { formatTHB } from "@/lib/money";

describe("money formatting", () => {
  it("formats Thai Baht", () => {
    expect(formatTHB(25000, "th")).toContain("25,000");
  });
});

describe("theme class", () => {
  it("toggles dark class", () => {
    document.documentElement.classList.add("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    document.documentElement.classList.remove("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
