import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildGenerationReport } from "./generation-report";
import type { LiveSlideReportLineage } from "./live-generation-report-lineage";

describe("generation report live lineage", () => {
  test("appends formatted slide-level live lineage when supplied", () => {
    const report = buildGenerationReport(
      projectFixture(),
      undefined,
      [],
      [],
      [liveReportLineageFixture()],
    );

    expect(report.includes("## Live Slide Lineage")).toBe(true);
    expect(report.includes("sources src_001")).toBe(true);
    expect(report.includes("text turn turn_text_001")).toBe(true);
    expect(report.includes("image request img_req_001")).toBe(true);
    expect(report.includes("prompt slide_generation@v1")).toBe(true);
  });
});

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Report Fixture",
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

function liveReportLineageFixture(): LiveSlideReportLineage {
  return {
    slideNumber: 1,
    sourceIds: ["src_001"],
    textArtifactId: "text_artifact_001",
    textProviderKind: "codex",
    textTurnId: "turn_text_001",
    textThreadId: "thread_project_001",
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
  return `sha256:${"d".repeat(64)}`;
}
