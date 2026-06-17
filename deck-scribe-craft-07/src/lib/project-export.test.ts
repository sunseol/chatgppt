import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { buildProjectExportPackage, createProjectExportPatch } from "./project-export";

describe("PNG and project export package", () => {
  test("builds PNG files from approved layout PNGs and a redacted project file", () => {
    const project = exportProjectFixture();

    const result = buildProjectExportPackage(project, { now: () => 456, version: 2 });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.package.artifact.id).toBe("project_001_export_v2");
    expect(result.package.artifact.path).toBe("projects/project_001/exports/export.v2.json");
    expect(result.package.artifact.hash.startsWith("sha256:")).toBe(true);
    expect(result.package.pngFiles[0]?.filename).toBe("slide_01.png");
    expect(result.package.pngFiles[0]?.path).toBe("projects/project_001/exports/png/slide_01.png");
    expect(result.package.pngFiles[0]?.dataUrl).toBe(project.layout?.slides[0]?.layoutPngDataUrl);
    expect(result.package.svgFiles[0]?.filename).toBe("slide_01.svg");
    expect(result.package.svgFiles[0]?.path).toBe("projects/project_001/exports/svg/slide_01.svg");
    expect(result.package.svgFiles[0]?.content.includes('data-editable-svg="1"')).toBe(true);
    expect(result.package.svgFiles[0]?.content.includes('data-source-layer-id="dom_title_1"')).toBe(
      true,
    );
    expect(
      result.package.svgFiles[0]?.content.includes(
        'data-source-layer-id="png2svg.visual_region.slide_1_panel"',
      ),
    ).toBe(true);
    expect(result.package.svgFiles[0]?.content.includes("figma-import")).toBe(false);
    expect(result.package.svgFiles[0]?.similarity.passed).toBe(true);
    expect(result.package.manifest.svgFiles[0]?.path).toBe(
      "projects/project_001/exports/svg/slide_01.svg",
    );
    expect(result.package.hybridSvgFiles[0]?.filename).toBe("slide_01.hybrid.svg");
    expect(result.package.hybridSvgFiles[0]?.path).toBe(
      "projects/project_001/exports/svg/hybrid/slide_01.hybrid.svg",
    );
    expect(result.package.hybridSvgFiles[0]?.source).toBe("hybrid_compatibility_svg");
    expect(result.package.hybridSvgFiles[0]?.path === result.package.svgFiles[0]?.path).toBe(false);
    expect(
      result.package.hybridSvgFiles[0]?.content.includes('data-export-mode="hybrid-safe"'),
    ).toBe(true);
    expect(result.package.hybridSvgFiles[0]?.content.includes('data-locked="true"')).toBe(true);
    expect(
      result.package.hybridSvgFiles[0]?.content.includes('data-extension-type="vector_region"'),
    ).toBe(true);
    expect(
      result.package.hybridSvgFiles[0]?.content.includes(
        'data-source-layer-id="png2svg.visual_region.slide_1_panel"',
      ),
    ).toBe(true);
    expect(result.package.hybridSvgFiles[0]?.similarity.passed).toBe(true);
    expect(result.package.manifest.hybridSvgFiles[0]?.path).toBe(
      "projects/project_001/exports/svg/hybrid/slide_01.hybrid.svg",
    );
    expect(result.package.projectFile.content.includes("sk-live-secret123")).toBe(false);
    expect(result.package.projectFile.content.includes("Bearer codex.session.secret")).toBe(false);
    expect(result.package.projectFile.content.includes("/Users/jake/.codex/auth.json")).toBe(false);
    expect(result.package.projectFile.content.includes("[redacted]")).toBe(true);
    expect(result.package.secretScan.passed).toBe(true);
    expect(result.package.summary.artifactHash).toBe(result.package.artifact.hash);
    expect(result.package.summary.svgCount).toBe(1);
    expect(result.package.summary.hybridSvgCount).toBe(1);
    expect(result.package.pptxExport.kind).toBe("ready");
    if (result.package.pptxExport.kind !== "ready") return;
    expect(result.package.pptxExport.file.filename).toBe("project_001.pptx");
    expect(result.package.pptxExport.file.mime).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(
      result.package.pptxExport.file.dataUrl.startsWith(
        "data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,",
      ),
    ).toBe(true);
    expect(result.package.pptxExport.file.editableTextCount).toBe(1);
    expect(result.package.pptxExport.file.editableShapeCount).toBe(1);
    expect(result.package.pptxExport.fallbacks.map((fallback) => fallback.layerId)).toEqual([
      "chart_1",
    ]);
    expect(result.package.manifest.pptxFile?.path).toBe(
      "projects/project_001/exports/pptx/project_001.pptx",
    );
  });

  test("stores the export artifact summary in a project patch", () => {
    const project = exportProjectFixture();
    const result = buildProjectExportPackage(project, { now: () => 456, version: 1 });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const patch = createProjectExportPatch({ project, exportPackage: result.package });
    const lastApproval = patch.approvalLog[patch.approvalLog.length - 1];

    expect(patch.stage).toBe("EXPORT_READY");
    expect(patch.exportPackage?.artifactId).toBe("project_001_export_v1");
    expect(lastApproval?.stage).toBe("export");
    expect(lastApproval?.artifactId).toBe("project_001_export_v1");
    expect(lastApproval?.hash).toBe(result.package.artifact.hash);
  });

  test("blocks export when a slide is missing its approved layout PNG", () => {
    const base = exportProjectFixture();
    if (!base.layout) throw new Error("Expected layout fixture.");
    const project = {
      ...base,
      layout: {
        ...base.layout,
        slides: [
          {
            number: 1,
            componentType: "title",
            html: "<section />",
            domLayers: [],
          },
        ],
      },
    };

    const result = buildProjectExportPackage(project, { now: () => 456 });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues[0]?.code).toBe("missing_layout_png");
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
    name: "Export Fixture",
    initialPrompt:
      "OPENAI_API_KEY=sk-live-secret123 Authorization: Bearer codex.session.secret Codex auth /Users/jake/.codex/auth.json",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "FINAL_REPORTING",
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
          {
            id: "editable_png2svg_visual_region_slide_1_panel",
            type: "shape",
            role: "visual",
            bounds: { x: 320, y: 320, w: 240, h: 120 },
            editable: true,
          },
          {
            id: "chart_1",
            type: "chart",
            role: "chart",
            bounds: { x: 720, y: 320, w: 360, h: 240 },
            editable: true,
          },
        ],
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}
