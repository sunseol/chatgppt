import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportStage } from "./ExportStage";
import { ReadyExportPanel } from "./ExportStagePanels";
import type { DeckProject } from "@/lib/deck-types";
import type { FinalExportGateWarning } from "@/lib/final-export-gate";
import { mockBrief, mockPlan, mockResearch } from "@/lib/mock-ai";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import { buildProjectExportPackage } from "@/lib/project-export";

describe("export stage", () => {
  test("renders PNG and redacted project export actions", () => {
    const markup = renderToStaticMarkup(<ExportStage project={exportProjectFixture()} />);

    expect(markup.includes("PNG 01")).toBe(true);
    expect(markup.includes("SVG 01")).toBe(true);
    expect(markup.includes("편집용 SVG 01")).toBe(true);
    expect(markup.includes("SVG export · 데모에서 비활성화")).toBe(false);
    expect(markup.includes("PPTX 파일")).toBe(true);
    expect(markup.includes("PPTX 최종 확인")).toBe(true);
    expect(markup.includes("PPTX final check")).toBe(true);
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

  test("does not present blocked production export as visually ready", () => {
    const markup = renderToStaticMarkup(
      <ExportStage project={exportProjectFixture()} executionMode="production" />,
    );

    expect(markup.includes("검증 필요")).toBe(true);
    expect(markup.includes(">준비 완료</div>")).toBe(false);
    expect(markup.includes("내보내기 전에 확인이 필요합니다.")).toBe(true);
  });

  test("presents production export as ready only when live slide lineage is complete", () => {
    const markup = renderToStaticMarkup(
      <ExportStage project={productionExportProjectFixture()} executionMode="production" />,
    );

    expect(markup.includes("준비 완료")).toBe(true);
    expect(markup.includes("검증 필요")).toBe(false);
    expect(markup.includes("내보내기 파일이 준비되었습니다.")).toBe(true);
    expect(markup.includes("PPTX 최종 확인")).toBe(true);
    expect(markup.includes("PPTX 파일 다운로드")).toBe(true);
    expect(markup.includes("검증된 최종 PPTX 패키지")).toBe(true);
    expect(markup.includes("PPTX SHA-256")).toBe(true);
    expect(/sha256:[a-f0-9]{64}/.test(markup)).toBe(true);
    expect(markup.includes("배경 이미지")).toBe(true);
    expect(markup.includes("1개")).toBe(true);
    expect(markup.includes("## Live Slide Lineage")).toBe(true);
    expect(markup.includes("image request img_req_001")).toBe(true);
  });

  test("prioritizes PPTX proof over summary metrics on mobile widths", () => {
    const markup = renderToStaticMarkup(
      <ExportStage project={productionExportProjectFixture()} executionMode="production" />,
    );

    expect(markup.includes("grid-cols-2")).toBe(true);
    expect(markup.includes("sm:grid-cols-4")).toBe(true);
    expect(markup.includes("hidden grid-cols-2")).toBe(true);
    expect(markup.includes("lg:hidden")).toBe(true);
    expect(markup.includes("break-keep")).toBe(true);
    expect(markup.includes("px-4")).toBe(true);
    expect(markup.includes("sm:px-8")).toBe(true);
  });

  test("renders development mock export warning and watermark", () => {
    const project = exportProjectFixture();
    const exportResult = buildProjectExportPackage(project, { now: () => 456, version: 1 });
    if (exportResult.kind !== "ready") throw new Error("Expected export fixture to be ready.");
    const warnings: readonly FinalExportGateWarning[] = [
      {
        code: "development_mock_lineage",
        message:
          "Development export includes mock artifact mock_slide_1; upstream path: layout_001 -> mock_slide_1.",
        artifactId: "mock_slide_1",
        upstreamArtifactIds: ["layout_001"],
      },
    ];

    const markup = renderToStaticMarkup(
      <ReadyExportPanel
        exportPackage={exportResult.package}
        reportMd="# Report"
        project={project}
        warnings={warnings}
        developmentWatermark="MOCK MODE"
      />,
    );

    expect(markup.includes("MOCK MODE")).toBe(true);
    expect(markup.includes("개발 검증 참고")).toBe(true);
    expect(markup.includes("mock_slide_1")).toBe(true);
    expect(markup.includes("layout_001")).toBe(true);
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

function productionExportProjectFixture(): DeckProject {
  const base = exportProjectFixture();
  const livePng = encodeSolidPngDataUrl({
    width: 160,
    height: 90,
    color: { r: 12, g: 120, b: 180, a: 255 },
  });
  const liveHash = fullHash("c");
  const brief = { ...mockBrief("검증 가능한 시장 진입 전략 보고서", 1, "16:9"), id: "brief_live" };
  const researchBase = mockResearch(brief);
  const firstClaim = requireFirst(researchBase.claims, "research claim");
  const research = {
    ...researchBase,
    id: "research_live",
    approvedHash: "sha256:research_live",
  };
  const planBase = mockPlan(brief, research);
  const firstSlide = requireFirst(planBase.slides, "plan slide");
  const plan = {
    ...planBase,
    id: "plan_live",
    approvedHash: "sha256:plan_live",
    slides: [{ ...firstSlide, number: 1, evidence: [firstClaim.id] }],
  };
  const artifact = {
    providerId: "openaiImage" as const,
    slideNumber: 1,
    aspectRatio: "16:9" as const,
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: "projects/project_001/layouts/slide_001.png",
      mode: "composition-reference" as const,
    },
    imageDataUrl: livePng,
    prompt: {
      id: "slide_generation" as const,
      version: "v1",
      hash: "sha256:prompt",
    },
    request: {
      model: "gpt-image-2" as const,
      requestId: "img_req_001",
    },
    generatedAt: 456,
  };
  const imageProvenance = {
    artifactId: "project_001_image_slide_001_v1",
    executionMode: "production" as const,
    providerKind: "openaiImage" as const,
    authMode: "api_key" as const,
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@v1",
    durationMs: 1_000,
    inputArtifactIds: ["sha256:prompt", "projects/project_001/layouts/slide_001.png"],
    fixture: false,
    requestId: "img_req_001",
  };
  return {
    ...base,
    brief,
    research,
    plan,
    liveTextArtifacts: [
      {
        artifactId: "plan_live_001",
        projectId: "project_001",
        artifactType: "deck_plan",
        version: 1,
        hash: "sha256:plan_live",
        path: "projects/project_001/plans/plan_live_001.json",
        createdAt: 456,
        turnId: "turn_plan_001",
        threadId: "thread_project_001",
      },
    ],
    liveSlideGeneration: {
      version: 1,
      generatedAt: 456,
      artifacts: [artifact],
      storedArtifacts: [
        {
          binary: {
            artifactId: "project_001_image_slide_001_v1",
            path: "projects/project_001/slides/images/slide_001.v1.png",
            hash: liveHash,
            bytes: 72,
            createdAt: 456,
          },
          metadata: {
            path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
            providerId: "openaiImage",
            slideNumber: 1,
            aspectRatio: "16:9",
            canvas: artifact.canvas,
            layoutReference: artifact.layoutReference,
            prompt: artifact.prompt,
            request: {
              model: "gpt-image-2",
              requestId: "img_req_001",
            },
            generatedAt: 456,
          },
          provenance: imageProvenance,
        },
      ],
      compositions: [
        {
          slideNumber: 1,
          exportBasis: "compositor",
          canvas: artifact.canvas,
          backgroundProviderId: "openaiImage",
          backgroundArtifact: {
            artifactId: "project_001_image_slide_001_v1",
            path: "projects/project_001/slides/images/slide_001.v1.png",
            hash: liveHash,
          },
          overlayRoles: ["title"],
          overlayBounds: [],
          svg: "<svg />",
          previewPngDataUrl: livePng,
        },
      ],
      providerLineage: [imageProvenance],
    },
  };
}

function requireFirst<T>(values: readonly T[], label: string): T {
  const value = values[0];
  if (value === undefined) throw new Error(`Missing ${label}.`);
  return value;
}

function fullHash(seed: string): string {
  return `sha256:${seed.repeat(64)}`;
}
