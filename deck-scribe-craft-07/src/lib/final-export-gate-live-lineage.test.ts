import { describe, expect, test } from "bun:test";
import type { DeckProject, ProjectExportSummary } from "./deck-types";
import { evaluateFinalExportGate } from "./final-export-gate";
import {
  formatLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("final export gate live report lineage", () => {
  test("blocks production export without slide-level live report lineage", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_live_report_lineage"]);
  });

  test("blocks production export when live report lineage is incomplete", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage: [{ ...liveReportLineageFixture(), imageRequestId: undefined }],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_image_request"]);
    expect(result.issues[0]?.slideNumber).toBe(1);
  });

  test("blocks production export when live report lineage omits project slides", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture({ slideCount: 2 }),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage: [liveReportLineageFixture()],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_slide_lineage"]);
    expect(result.issues[0]?.slideNumber).toBe(2);
  });

  test("blocks production export when live report lineage reuses image request evidence", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture({ slideCount: 2 }),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage: [
        liveReportLineageFixture(),
        {
          ...liveReportLineageFixture(),
          slideNumber: 2,
          textArtifactId: "text_artifact_002",
          textTurnId: "turn_text_002",
          imageArtifactId: "project_001_image_slide_002_v1",
        },
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_image_request"]);
  });

  test("blocks production export when live report lineage references missing provider artifacts", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage: [
        {
          ...liveReportLineageFixture(),
          textArtifactId: "text_artifact_unlinked",
          imageArtifactId: "project_001_image_slide_001_v9",
        },
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_text_provider_lineage",
      "missing_image_provider_lineage",
    ]);
  });

  test("blocks production export when live report lineage disagrees with provider metadata", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage: [
        {
          ...liveReportLineageFixture(),
          textTurnId: "turn_text_unlinked",
          imageRequestId: "img_req_unlinked",
        },
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "text_provider_lineage_mismatch",
      "image_provider_lineage_mismatch",
    ]);
  });

  test("allows production final export when provider and slide report lineage are complete", () => {
    const liveReportLineage = [liveReportLineageFixture()];
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(formatLiveGenerationReportLineage(liveReportLineage)),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage,
    });

    expect(result.kind).toBe("ready");
  });

  test("blocks production export when the export artifact hash is not a full digest", () => {
    // Given
    const liveReportLineage = [liveReportLineageFixture()];

    // When
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: { ...exportSummaryFixture(), artifactHash: "sha256:export" },
      reportMarkdown: reportFixture(formatLiveGenerationReportLineage(liveReportLineage)),
      executionMode: "production",
      lineage: providerLineageFixture(),
      liveReportLineage,
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_export_artifact_hash"]);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "project_001",
    name: "Gate Fixture",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "FINAL_REPORTING",
    createdAt: 1_000,
    updatedAt: 2_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function exportSummaryFixture(): ProjectExportSummary {
  return {
    artifactId: "project_001_export_v1",
    artifactHash: fullHash(),
    artifactPath: "projects/project_001/exports/export.v1.json",
    createdAt: 2_000,
    pngCount: 1,
    svgCount: 1,
    hybridSvgCount: 1,
    projectFilePath: "projects/project_001/exports/project_001.deckforge.json",
  };
}

function reportFixture(liveLineageSection?: string): string {
  return [
    "# Generation Report — Gate Fixture",
    "",
    "## 9. 사용된 프롬프트 버전",
    "",
    "## 10. Export 패키지",
    `- Export: project_001_export_v1 · ${fullHash()}`,
    ...(liveLineageSection ? ["", liveLineageSection] : []),
  ].join("\n");
}

function providerLineageFixture() {
  return [
    createProviderArtifactProvenance({
      artifactId: "text_artifact_001",
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: "codex-app-server",
      promptVersion: "deck_plan@v1",
      durationMs: 1200,
      inputArtifactIds: ["research_001"],
      fixture: false,
      turnId: "turn_text_001",
      threadId: "thread_project_001",
    }),
    createProviderArtifactProvenance({
      artifactId: "project_001_image_slide_001_v1",
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_generation@v1",
      durationMs: 2000,
      inputArtifactIds: ["layout_001"],
      fixture: false,
      requestId: "img_req_001",
    }),
  ];
}

function liveReportLineageFixture(): LiveSlideReportLineage {
  return {
    slideNumber: 1,
    sourceIds: ["src_001"],
    textArtifactId: "text_artifact_001",
    textProviderKind: "codex",
    textTurnId: "turn_text_001",
    textThreadId: "thread_project_001",
    textPromptVersion: "deck_plan@v1",
    imageArtifactId: "project_001_image_slide_001_v1",
    imageProviderKind: "openaiImage",
    imageRequestId: "img_req_001",
    promptVersion: "slide_generation@v1",
    fixture: false,
    compositorHash: fullHash(),
    exportedPngHash: fullHash(),
    projectFileContent: '{"project":"project_001"}',
  };
}

function fullHash(): string {
  return `sha256:${"c".repeat(64)}`;
}
