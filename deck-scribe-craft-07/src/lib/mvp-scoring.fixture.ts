import type { DeckProject } from "./deck-types";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";
import type { MvpBenchmarkScoreInput } from "./mvp-scoring";

export function completeBenchmark(benchmarkId = "seed_complete"): MvpBenchmarkScoreInput {
  return {
    benchmarkId,
    project: completeProject(),
    layoutReport: {
      status: "passed",
      thresholds: {
        requiredRenderSuccessRate: 1,
        maxOverflowSlideRate: 0.05,
        maxSafeMarginBreachRate: 0.05,
      },
      summary: {
        slideCount: 1,
        renderedSlideCount: 1,
        renderSuccessRate: 1,
        overflowSlideCount: 0,
        overflowSlideRate: 0,
        safeMarginBreachSlideCount: 0,
        safeMarginBreachRate: 0,
        metadataOmissionCount: 0,
      },
      issues: [],
    },
    imageQaReports: [passedImageQa()],
    editabilityScore: {
      qualityLevel: "level2",
      titleEditableRate: 1,
      bodyEditableRate: 1,
      passed: true,
    },
    generationReportMarkdown: [
      "# Generation Report",
      "## 9. 사용된 프롬프트 버전",
      "## 10. Export 패키지",
      "- Export: project_001_export_v1",
    ].join("\n"),
  };
}

export function completeProject(): DeckProject {
  return {
    id: "project_001",
    name: "MVP Score",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "EXPORT_READY",
    createdAt: 1,
    updatedAt: 2,
    brief: {
      id: "brief_001",
      goal: "Pitch",
      audience: "VC",
      desiredOutcome: "Meeting",
      slideCount: 1,
      aspectRatio: "16:9",
      language: "ko",
      tone: ["clear"],
      mustInclude: ["problem"],
      mustAvoid: ["unsupported claims"],
      successCriteria: ["clear message"],
      openQuestions: [],
      approvedHash: "sha256:brief",
    },
    research: {
      id: "research_001",
      sources: [
        {
          id: "src_001",
          title: "Source",
          publisher: "Example",
          year: 2026,
          grade: "A",
          sourceType: "research",
          usePolicy: "priority",
          url: "https://example.com",
        },
      ],
      claims: [],
      datasets: [],
      charts: [],
      factCheckReport: {
        summary: "passed",
        generatedAt: 2,
        fatalIssueCount: 0,
        issues: [],
        uncertainItems: [],
      },
      approvedHash: "sha256:research",
    },
    plan: {
      id: "plan_001",
      markdown: "# Plan",
      slides: [
        {
          number: 1,
          title: "Problem",
          role: "intro",
          coreMessage: "Problem exists",
          visualType: "card",
          evidence: ["src_001"],
          editableElements: ["title"],
        },
      ],
      approvedHash: "sha256:plan",
    },
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
          layoutPngDataUrl: "data:image/png;base64,AAAA",
          domLayers: [],
        },
      ],
      approvedHash: "sha256:layout",
    },
    slides: [{ number: 1, version: 1, status: "approved", imageDescriptor: "ready" }],
    layers: [
      {
        slideNumber: 1,
        layers: [
          {
            id: "title_1",
            type: "text",
            role: "title",
            text: "Problem",
            bounds: { x: 96, y: 96, w: 400, h: 80 },
            editable: true,
          },
        ],
      },
    ],
    exportPackage: {
      artifactId: "project_001_export_v1",
      artifactHash: "sha256:export",
      artifactPath: "projects/project_001/exports/export.v1.json",
      createdAt: 3,
      pngCount: 1,
      svgCount: 1,
      hybridSvgCount: 1,
      pptxFilePath: "projects/project_001/exports/pptx/project_001.pptx",
      pptxBackgroundImageCount: 0,
      projectFilePath: "projects/project_001/exports/project_001.deckforge.json",
    },
    invalidated: {},
    approvalLog: [
      { stage: "editor", at: 2, hash: "sha256:editor" },
      { stage: "export", at: 3, hash: "sha256:export" },
    ],
  };
}

function passedImageQa(): GeneratedSlideQaReport {
  return {
    status: "passed",
    metrics: {
      sourceLessNumberCount: 0,
      unreadableTextLayerCount: 0,
      structureMismatchRate: 0,
    },
    issues: [],
  };
}
