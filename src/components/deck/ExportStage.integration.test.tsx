import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportStage } from "./ExportStage";
import type { DeckProject } from "@/lib/deck-types";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";

describe("export stage", () => {
  test("renders PNG and redacted project export actions", () => {
    const markup = renderToStaticMarkup(<ExportStage project={exportProjectFixture()} />);

    expect(markup.includes("PNG 01")).toBe(true);
    expect(markup.includes("SVG 01")).toBe(true);
    expect(markup.includes("편집용 SVG 01")).toBe(true);
    expect(markup.includes("SVG export · 데모에서 비활성화")).toBe(false);
    expect(markup.includes("PPTX 파일")).toBe(true);
    expect(markup.includes("PPTX export · 데모에서 비활성화")).toBe(false);
    expect(markup.includes("프로젝트 파일 (.json)")).toBe(true);
    expect(markup.includes("project_001_export_v1")).toBe(true);
    expect(markup.includes("sha256:")).toBe(true);
  });

  test("renders a blocked final gate for invalidated artifacts", () => {
    const markup = renderToStaticMarkup(
      <ExportStage project={{ ...exportProjectFixture(), invalidated: { layout: true } }} />,
    );

    expect(markup.includes("내보내기 전에 확인이 필요합니다.")).toBe(true);
    expect(markup.includes("layout 단계 결과를 다시 확인해야 합니다.")).toBe(true);
  });
});

function exportProjectFixture(): DeckProject {
  const png = encodeSolidPngDataUrl({
    width: 160,
    height: 90,
    color: { r: 244, g: 246, b: 248, a: 255 },
  });
  return {
    id: "project_001",
    name: "Export UI",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "EXPORT_READY",
    createdAt: 123,
    updatedAt: 456,
    design: {
      id: "design_001",
      canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
      grid: { columns: 12, gutter: 24 },
      colors: {
        background: "#ffffff",
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        primary: "#2563eb",
        secondary: "#14b8a6",
        accent: "#f97316",
      },
      typography: {
        titleStyle: "bold",
        bodyStyle: "regular",
        title: { style: "bold", minPx: 44, maxPx: 72 },
        body: { style: "regular", minPx: 24, maxPx: 34 },
        caption: { style: "regular", minPx: 14, maxPx: 18 },
        number: { style: "mono", minPx: 20, maxPx: 28 },
      },
      layoutRules: [],
      componentRules: [],
      visualLanguage: "clean",
      negativeRules: [],
      approvedHash: "sha256:design",
    },
    layout: {
      id: "layout_001",
      slides: [
        {
          number: 1,
          componentType: "title",
          html: "<section />",
          layoutPngDataUrl: png,
          domLayers: [
            {
              id: "dom_title_1",
              role: "title",
              editable: true,
              sourceIds: [],
              datasetIds: [],
              bounds: { x: 96, y: 120, w: 900, h: 120 },
            },
          ],
        },
      ],
      approvedHash: "sha256:layout",
    },
    layers: [
      {
        slideNumber: 1,
        layers: [
          {
            id: "title_1",
            type: "text",
            role: "title",
            text: "최종 제목",
            bounds: { x: 96, y: 120, w: 900, h: 120 },
            editable: true,
          },
        ],
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}
