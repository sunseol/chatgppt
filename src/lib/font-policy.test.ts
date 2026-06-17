import { describe, expect, test } from "bun:test";
import { FONT_POLICY } from "./font-policy";

describe("minimal Korean font policy", () => {
  test("defines Korean-safe fallback stacks without remote font URLs", () => {
    expect(FONT_POLICY.sansFamily.includes("Apple SD Gothic Neo")).toBe(true);
    expect(FONT_POLICY.sansFamily.includes("Malgun Gothic")).toBe(true);
    expect(FONT_POLICY.serifFamily.includes("Noto Serif KR")).toBe(true);
    expect(FONT_POLICY.monoFamily.includes("ui-monospace")).toBe(true);
    expect(FONT_POLICY.sansFamily.includes("http")).toBe(false);
    expect(FONT_POLICY.serifFamily.includes("http")).toBe(false);
  });

  test("keeps Korean text readable with zero letter spacing", () => {
    expect(FONT_POLICY.lineHeight.title >= 1.12).toBe(true);
    expect(FONT_POLICY.lineHeight.body >= 1.35).toBe(true);
    expect(FONT_POLICY.lineHeight.caption >= 1.25).toBe(true);
    expect(FONT_POLICY.letterSpacing).toBe("0em");
    expect(FONT_POLICY.bundledFontFiles).toEqual([]);
  });
});
