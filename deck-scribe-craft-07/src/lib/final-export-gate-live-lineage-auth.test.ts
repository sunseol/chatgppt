import { describe, expect, test } from "bun:test";
import type { DeckProject, ProjectExportSummary } from "./deck-types";
import { evaluateFinalExportGate } from "./final-export-gate";
import {
  formatLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("final export gate live lineage auth", () => {
  test("blocks production export when linked text or image artifacts lack live auth", () => {
    // Given
    const liveReportLineage = [liveReportLineageFixture()];

    // When
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(formatLiveGenerationReportLineage(liveReportLineage)),
      executionMode: "production",
      lineage: unauthenticatedProviderLineageFixture(),
      liveReportLineage,
    });

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "text_provider_auth_mismatch",
      "image_provider_auth_mismatch",
    ]);
  });
});

function projectFixture(): DeckProject {
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

function reportFixture(liveLineageSection: string): string {
  return [
    "# Generation Report - Gate Fixture",
    "",
    "## 9. 사용된 프롬프트 버전",
    "",
    "## 10. Export package",
    `- Export: project_001_export_v1 · ${fullHash()}`,
    "",
    liveLineageSection,
  ].join("\n");
}

function unauthenticatedProviderLineageFixture() {
  return [
    createProviderArtifactProvenance({
      artifactId: "text_artifact_001",
      executionMode: "production",
      providerKind: "codex",
      authMode: "none",
      modelOrRuntime: "codex-app-server",
      promptVersion: "deck_plan@v1",
      durationMs: 1_200,
      inputArtifactIds: ["research_001"],
      fixture: false,
      turnId: "turn_text_001",
      threadId: "thread_project_001",
    }),
    createProviderArtifactProvenance({
      artifactId: "project_001_image_slide_001_v1",
      executionMode: "production",
      providerKind: "codex",
      authMode: "none",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_generation@v1",
      durationMs: 2_000,
      inputArtifactIds: ["layout_001"],
      fixture: false,
      turnId: "turn_image_001",
      threadId: "thread_project_001",
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
    imageProviderKind: "codex",
    imageRequestId: "turn_image_001",
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
