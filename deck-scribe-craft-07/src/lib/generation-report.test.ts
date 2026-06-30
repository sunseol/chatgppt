import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createAuditLogEvent } from "./audit-log";
import { buildGenerationReport } from "./generation-report";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("generation report", () => {
  test("includes slide lineage across plan, sources, design, layout, layers, and export", () => {
    const report = buildGenerationReport(reportProjectFixture());

    expect(report.includes("[A/government]")).toBe(true);
    expect(report.includes("Plan: plan_001 slide 1")).toBe(true);
    expect(report.includes("Sources: src_001")).toBe(true);
    expect(report.includes("Datasets: dataset_001")).toBe(true);
    expect(report.includes("Design: design_001 · sha256:design")).toBe(true);
    expect(report.includes("Layout: layout_001 slide 1 title · PNG yes")).toBe(true);
    expect(report.includes("Editable layers: 1/1")).toBe(true);
    expect(report.includes("Generated slide: v3 approved · note: 제목 수정 반영")).toBe(true);
    expect(report.includes("Export: project_001_export_v1 · sha256:export")).toBe(true);
    expect(report.includes("projects/project_001/exports/export.v1.json")).toBe(true);
    expect(report.includes("projects/project_001/exports/pptx/project_001.pptx")).toBe(true);
  });

  test("surfaces validation failures, fact-check issues, and uncertain claims", () => {
    const report = buildGenerationReport(reportProjectFixture());

    expect(report.includes("Layout validation: failed")).toBe(true);
    expect(report.includes("safe-margin-breach")).toBe(true);
    expect(report.includes("Fact check: 1 fatal")).toBe(true);
    expect(report.includes("claim_uncertain")).toBe(true);
    expect(report.includes("시장 수치 가정")).toBe(true);
    expect(report.includes("불확실 항목: 표본 수 미확정")).toBe(true);
  });

  test("references redacted audit log events with trace and lineage", () => {
    const report = buildGenerationReport(reportProjectFixture(), undefined, [
      createAuditLogEvent({
        eventId: "evt_export_001",
        eventType: "export.completed",
        traceId: "trace_export_001",
        timestamp: 2_000,
        stage: "export",
        message: "exported with token=abc123def456",
        artifactLineage: {
          artifactId: "project_001_export_v1",
          artifactHash: "sha256:export",
          artifactType: "export",
          upstreamArtifactIds: ["layout_001", "slide_1_v3"],
        },
      }),
    ]);

    expect(report.includes("## 11. 감사 로그")).toBe(true);
    expect(report.includes("evt_export_001")).toBe(true);
    expect(report.includes("trace_export_001")).toBe(true);
    expect(report.includes("project_001_export_v1")).toBe(true);
    expect(report.includes("layout_001, slide_1_v3")).toBe(true);
    expect(report.includes("token=[redacted]")).toBe(true);
    expect(report.includes("abc123def456")).toBe(false);
  });

  test("lists provider provenance including turn id, request id, prompt version, and fixture flag", () => {
    const report = buildGenerationReport(
      reportProjectFixture(),
      undefined,
      [],
      [
        createProviderArtifactProvenance({
          artifactId: "plan_live_001",
          executionMode: "production",
          providerKind: "codex",
          authMode: "codex_session",
          modelOrRuntime: "codex-app-server 1.0.0",
          promptVersion: "deck_plan@v1",
          durationMs: 1_200,
          inputArtifactIds: ["research_001"],
          turnId: "turn_001",
          threadId: "thread_001",
          fixture: false,
        }),
        createProviderArtifactProvenance({
          artifactId: "slide_image_001",
          executionMode: "production",
          providerKind: "openaiImage",
          authMode: "api_key",
          modelOrRuntime: "gpt-image-2",
          promptVersion: "slide_generation@v1",
          durationMs: 2_400,
          inputArtifactIds: ["layout_001"],
          requestId: "img_req_001",
          fixture: false,
        }),
      ],
    );

    expect(report.includes("## 12. Provider Provenance")).toBe(true);
    expect(report.includes("plan_live_001 · codex · production · codex_session")).toBe(true);
    expect(report.includes("turn turn_001 · thread thread_001")).toBe(true);
    expect(report.includes("slide_image_001 · openaiImage · production · api_key")).toBe(true);
    expect(report.includes("request img_req_001")).toBe(true);
    expect(report.includes("fixture no")).toBe(true);
  });

  test("includes live slide lineage when production export evidence is supplied", () => {
    const report = buildGenerationReport(
      reportProjectFixture(),
      undefined,
      [],
      [],
      [
        {
          slideNumber: 1,
          sourceIds: ["src_001"],
          textArtifactId: "plan_live_001",
          textProviderKind: "codex",
          textTurnId: "turn_plan_001",
          textThreadId: "thread_project_001",
          imageArtifactId: "project_001_image_slide_001_v1",
          imageProviderKind: "openaiImage",
          imageRequestId: "img_req_001",
          promptVersion: "slide_generation@v1",
          fixture: false,
          compositorHash: fullHash("b"),
          exportedPngHash: fullHash("b"),
          projectFileContent: '{"project":"project_001"}',
        },
      ],
    );

    expect(report.includes("## Live Slide Lineage")).toBe(true);
    expect(report.includes("sources src_001")).toBe(true);
    expect(report.includes("text turn turn_plan_001")).toBe(true);
    expect(report.includes("image request img_req_001")).toBe(true);
  });
});

function reportProjectFixture(): DeckProject {
  const brief = { ...mockBrief("검증 가능한 시장 진입 전략 보고서", 1, "16:9"), id: "brief_001" };
  const researchBase = mockResearch(brief);
  const research = {
    ...researchBase,
    id: "research_001",
    approvedHash: "sha256:research",
    claims: [
      {
        ...researchBase.claims[0],
        id: "claim_001",
        sourceIds: ["src_001"],
        datasetIds: ["dataset_001"],
        slideCandidates: [1],
        numericEvidence: [
          {
            ...researchBase.claims[0].numericEvidence[0],
            sourceId: "src_001",
            datasetId: "dataset_001",
          },
        ],
      },
      {
        id: "claim_uncertain",
        statement: "시장 수치 가정",
        sourceIds: [],
        datasetIds: [],
        confidence: "assumption" as const,
        hasNumber: false,
        needsUserReview: true,
        status: "assumption" as const,
        slideCandidates: [1],
        numericEvidence: [],
      },
    ],
    factCheckReport: {
      summary: "Needs review",
      generatedAt: 2_000,
      fatalIssueCount: 1,
      issues: [
        {
          id: "fc_001",
          severity: "fatal" as const,
          message: "Assumption needs owner approval.",
          claimId: "claim_uncertain",
          uncertain: true,
        },
      ],
      uncertainItems: ["표본 수 미확정"],
    },
  };
  const plan = {
    ...mockPlan(brief, research),
    id: "plan_001",
    markdown: "# plan",
    approvedHash: "sha256:plan",
    slides: [
      {
        number: 1,
        title: "시장 기회",
        role: "Opportunity",
        coreMessage: "검증된 시장 근거로 진입한다.",
        visualType: "bar",
        evidence: ["claim_001", "claim_uncertain"],
        editableElements: ["title"],
      },
    ],
  };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  return {
    id: "project_001",
    name: "Report Fixture",
    initialPrompt: "검증 가능한 시장 진입 전략 보고서",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "EXPORT_READY",
    createdAt: 1_000,
    updatedAt: 2_000,
    brief: { ...brief, approvedHash: "sha256:brief" },
    research,
    plan,
    design,
    layout: {
      id: "layout_001",
      approvedHash: "sha256:layout",
      slides: [
        {
          number: 1,
          componentType: "title",
          html: "<section />",
          layoutPngDataUrl: "data:image/png;base64,AAAA",
          domLayers: [],
        },
      ],
      validationReport: {
        status: "failed",
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
          safeMarginBreachSlideCount: 1,
          safeMarginBreachRate: 1,
          metadataOmissionCount: 0,
        },
        issues: [
          {
            code: "safe-margin-breach",
            slideNumber: 1,
            message: "Slide 1 breaches safe margin.",
          },
        ],
      },
    },
    slides: [
      {
        number: 1,
        version: 3,
        status: "approved",
        imageDescriptor: "mock",
        notes: "제목 수정 반영",
      },
    ],
    layers: [
      {
        slideNumber: 1,
        layers: [
          {
            id: "title_1",
            type: "text",
            role: "title",
            text: "시장 기회",
            bounds: { x: 96, y: 120, w: 900, h: 100 },
            editable: true,
          },
        ],
      },
    ],
    exportPackage: {
      artifactId: "project_001_export_v1",
      artifactHash: "sha256:export",
      artifactPath: "projects/project_001/exports/export.v1.json",
      createdAt: 2_000,
      pngCount: 1,
      svgCount: 1,
      hybridSvgCount: 1,
      pptxFilePath: "projects/project_001/exports/pptx/project_001.pptx",
      pptxBackgroundImageCount: 0,
      projectFilePath: "projects/project_001/exports/project_001.deckforge.json",
    },
    invalidated: {},
    approvalLog: [
      {
        stage: "export",
        at: 2_000,
        hash: "sha256:export",
        artifactId: "project_001_export_v1",
        artifactVersion: 1,
        artifactType: "export",
      },
    ],
  };
}

function fullHash(seed: string): string {
  return `sha256:${seed.repeat(64)}`;
}
