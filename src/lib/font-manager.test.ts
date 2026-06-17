import { describe, expect, test } from "bun:test";
import { FONT_POLICY } from "./font-policy";
import {
  createManagedFontPolicy,
  detectAvailableKoreanFonts,
  validateFontSurfaceConsistency,
} from "./font-manager";

describe("font manager", () => {
  test("detects locally available Korean fallback candidates", () => {
    const detected = detectAvailableKoreanFonts([
      "SF Pro",
      "Apple SD Gothic Neo",
      "Noto Sans KR",
      "Pretendard",
    ]);

    expect(detected).toEqual(["Apple SD Gothic Neo", "Noto Sans KR"]);
  });

  test("builds shared mappings for preview editor SVG and PPTX export", () => {
    const managed = createManagedFontPolicy({
      availableFontFamilies: ["Apple SD Gothic Neo", "Malgun Gothic"],
    });

    expect(managed.bundledFontFiles).toEqual([]);
    expect(managed.availableKoreanFamilies).toEqual(["Apple SD Gothic Neo", "Malgun Gothic"]);
    expect(managed.surfaceMappings.map((mapping) => mapping.surface)).toEqual([
      "html_preview",
      "editor",
      "svg_export",
      "pptx_export",
    ]);
    expect(managed.roleMappings.title.family).toBe(FONT_POLICY.serifFamily);
    expect(managed.roleMappings.body.lineHeight).toBe(FONT_POLICY.lineHeight.body);
    expect(managed.roleMappings.caption.letterSpacing).toBe("0em");
  });

  test("validates role mapping consistency across surfaces", () => {
    const managed = createManagedFontPolicy({
      availableFontFamilies: ["Apple SD Gothic Neo"],
    });

    const report = validateFontSurfaceConsistency(managed);

    expect(report.passed).toBe(true);
    expect(report.inconsistentRoles).toEqual([]);
  });
});
