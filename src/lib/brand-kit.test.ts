import { describe, expect, test } from "bun:test";
import type { DesignSystem } from "./deck-types";
import {
  BrandKitParseError,
  applyBrandKitToDesignSystem,
  inspectBrandKit,
  parseBrandKit,
} from "./brand-kit";

describe("brand kit", () => {
  test("parses a raw brand kit payload and emits font warnings", () => {
    const brandKit = parseBrandKit({
      id: "brand_001",
      name: "Acme Capital",
      logos: [
        {
          id: "logo_primary",
          variant: "primary",
          mimeType: "image/svg+xml",
          path: "logos/acme-primary.svg",
        },
      ],
      fonts: [
        {
          family: "Acme Sans Display",
          role: "title",
          license: "unknown",
          embeddable: false,
          formats: ["otf"],
        },
        {
          family: "Acme Sans Text",
          role: "body",
          license: "licensed",
          embeddable: true,
          formats: ["woff2"],
        },
      ],
      colors: [
        { id: "brand_primary", target: "primary", hex: "#0B3A6E" },
        { id: "brand_accent", target: "accent", hex: "#FF6A13" },
      ],
      guidance: ["Use the primary mark only on light backgrounds."],
    });

    expect(brandKit.name).toBe("Acme Capital");
    expect(brandKit.colors.map((token) => token.target)).toEqual(["primary", "accent"]);
    expect(inspectBrandKit(brandKit).map((warning) => warning.code)).toEqual([
      "font-license-review",
      "font-embedding-review",
    ]);
  });

  test("applies brand tokens and guidance onto an existing design system", () => {
    const merged = applyBrandKitToDesignSystem(baseDesignSystem(), parseBrandKit(validBrandKit()));

    expect(merged.design.colors.primary).toBe("#0B3A6E");
    expect(merged.design.colors.accent).toBe("#FF6A13");
    expect(merged.design.typography.title.style).toBe("Acme Sans Display");
    expect(merged.design.typography.body.style).toBe("Acme Sans Text");
    expect(
      merged.design.componentRules.some((rule) =>
        rule.includes("Use the primary mark only on light backgrounds."),
      ),
    ).toBe(true);
    expect(merged.design.visualLanguage.includes("Acme Capital")).toBe(true);
    expect(merged.warnings.length).toBe(2);
  });

  test("rejects invalid color tokens during parsing", () => {
    expect(() =>
      parseBrandKit({
        ...validBrandKit(),
        colors: [{ id: "brand_primary", target: "primary", hex: "navy" }],
      }),
    ).toThrow(BrandKitParseError);
  });
});

function validBrandKit() {
  return {
    id: "brand_001",
    name: "Acme Capital",
    logos: [
      {
        id: "logo_primary",
        variant: "primary",
        mimeType: "image/svg+xml",
        path: "logos/acme-primary.svg",
      },
    ],
    fonts: [
      {
        family: "Acme Sans Display",
        role: "title",
        license: "unknown",
        embeddable: false,
        formats: ["otf"],
      },
      {
        family: "Acme Sans Text",
        role: "body",
        license: "licensed",
        embeddable: true,
        formats: ["woff2"],
      },
    ],
    colors: [
      { id: "brand_primary", target: "primary", hex: "#0B3A6E" },
      { id: "brand_accent", target: "accent", hex: "#FF6A13" },
    ],
    guidance: ["Use the primary mark only on light backgrounds."],
  };
}

function baseDesignSystem(): DesignSystem {
  return {
    id: "design_001",
    canvas: {
      ratio: "16:9",
      w: 1600,
      h: 900,
      safeMargin: { x: 96, y: 72 },
    },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#111111",
      textSecondary: "#555555",
      primary: "#204060",
      secondary: "#8AA4BF",
      accent: "#E0A100",
    },
    typography: {
      titleStyle: "Founders Grotesk",
      bodyStyle: "Pretendard",
      title: { style: "Founders Grotesk", minPx: 56, maxPx: 84 },
      body: { style: "Pretendard", minPx: 28, maxPx: 38 },
      caption: { style: "Pretendard", minPx: 18, maxPx: 24 },
      number: { style: "Founders Grotesk", minPx: 36, maxPx: 72 },
    },
    layoutRules: ["Keep a consistent title origin."],
    componentRules: ["Charts use approved datasets only."],
    visualLanguage: "Editorial consulting",
    negativeRules: ["Do not invent chart values."],
  };
}
