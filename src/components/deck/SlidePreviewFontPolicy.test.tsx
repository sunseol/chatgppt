import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { FONT_POLICY } from "@/lib/font-policy";
import type { DesignSystem, GeneratedSlide, SlideSpec } from "@/lib/deck-types";

describe("slide preview font policy", () => {
  test("renders Korean text with shared fallback font families", () => {
    const markup = renderToStaticMarkup(
      <SlidePreview design={designSystem()} spec={slideSpec()} slide={generatedSlide()} />,
    );

    expect(markup.includes(htmlAttributeValue(FONT_POLICY.sansFamily))).toBe(true);
    expect(markup.includes(htmlAttributeValue(FONT_POLICY.serifFamily))).toBe(true);
    expect(markup.includes(htmlAttributeValue(FONT_POLICY.monoFamily))).toBe(true);
    expect(markup.includes("letter-spacing:0em")).toBe(true);
    expect(markup.includes("디자인 시스템이 한글을 안정적으로 렌더링한다")).toBe(true);
  });
});

function generatedSlide(): GeneratedSlide {
  return {
    number: 1,
    version: 1,
    status: "ready",
    imageDescriptor: "font-policy",
  };
}

function htmlAttributeValue(value: string): string {
  return value.replaceAll('"', "&quot;");
}

function slideSpec(): SlideSpec {
  return {
    number: 1,
    title: "한글 제목 렌더링",
    role: "Title",
    coreMessage: "디자인 시스템이 한글을 안정적으로 렌더링한다",
    visualType: "Hero",
    evidence: [],
    editableElements: ["제목", "본문"],
  };
}

function designSystem(): DesignSystem {
  return {
    id: "ds_font",
    canvas: { ratio: "16:9", w: 1920, h: 1080, safeMargin: { x: 96, y: 72 } },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#111111",
      textSecondary: "#555555",
      primary: "#1F4E79",
      secondary: "#8AA4BF",
      accent: "#FFB000",
    },
    typography: {
      titleStyle: "korean-safe title",
      bodyStyle: "korean-safe body",
      title: { style: "korean-safe title", minPx: 56, maxPx: 84 },
      body: { style: "korean-safe body", minPx: 28, maxPx: 38 },
      caption: { style: "korean-safe caption", minPx: 18, maxPx: 24 },
      number: { style: "tabular", minPx: 40, maxPx: 72 },
    },
    layoutRules: ["title top-left"],
    componentRules: ["cards use 8px radius"],
    visualLanguage: "Korean-safe preview",
    negativeRules: ["do not use tiny unreadable text"],
  };
}
