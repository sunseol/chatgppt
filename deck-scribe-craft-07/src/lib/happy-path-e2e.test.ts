import { describe, expect, test } from "bun:test";
import { runMockHappyPathE2e } from "./happy-path-e2e";
import type { Stage, StepKey } from "./deck-types";

describe("mock happy path E2E", () => {
  test("runs project creation through final export and report", async () => {
    const result = await runMockHappyPathE2e({
      now: fixedClock(1_800_000_000_000),
      projectId: "p_happy_path",
    });

    expect(result.project.stage).toBe("EXPORT_READY");
    expect(result.finalChecks).toEqual({
      workflowComplete: true,
      artifactsCreated: true,
      exportReady: true,
      reportReady: true,
    });
    for (const stage of requiredStages()) {
      expect(result.visitedStages.includes(stage)).toBe(true);
    }
  });

  test("records approval artifacts for all approval gates", async () => {
    const result = await runMockHappyPathE2e({
      now: fixedClock(1_800_000_100_000),
      projectId: "p_approval_artifacts",
    });
    const approvalStages = result.project.approvalLog.map((entry) => entry.stage);

    for (const step of requiredApprovalSteps()) {
      expect(approvalStages.includes(step)).toBe(true);
    }
    expect(result.artifacts.length >= requiredApprovalSteps().length + 1).toBe(true);
    expect(result.artifacts.every((artifact) => artifact.path.startsWith("projects/"))).toBe(true);
  });

  test("produces final export files and report content", async () => {
    const result = await runMockHappyPathE2e({
      now: fixedClock(1_800_000_200_000),
      projectId: "p_final_outputs",
    });
    const slideCount = result.project.slideCount;

    expect(result.exportPackage.pngFiles.length).toBe(slideCount);
    expect(result.exportPackage.svgFiles.length).toBe(slideCount);
    expect(result.exportPackage.hybridSvgFiles.length).toBe(slideCount);
    expect(result.exportPackage.pptxExport.kind).toBe("ready");
    if (result.exportPackage.pptxExport.kind !== "ready") return;
    expect(result.exportPackage.pptxExport.file.filename.endsWith(".pptx")).toBe(true);
    expect(result.exportPackage.projectFile.content.includes("sk-")).toBe(false);
    expect(result.generationReport.includes("# Generation Report")).toBe(true);
    expect(result.generationReport.includes("## 10. Export 패키지")).toBe(true);
    expect(result.reportArtifact.type).toBe("report");
  });
});

function fixedClock(start: number): () => number {
  let tick = 0;
  return () => {
    tick += 1;
    return start + tick;
  };
}

function requiredStages(): readonly Stage[] {
  return [
    "PROJECT_CREATED",
    "INTERVIEWING",
    "INTERVIEW_APPROVAL_PENDING",
    "RESEARCHING",
    "RESEARCH_APPROVAL_PENDING",
    "PLANNING",
    "PLAN_APPROVAL_PENDING",
    "DESIGNING",
    "DESIGN_APPROVAL_PENDING",
    "PROTOTYPING_LAYOUT",
    "LAYOUT_APPROVAL_PENDING",
    "GENERATING_SLIDES",
    "SLIDE_REVIEW_PENDING",
    "VECTORIZE_PENDING",
    "VECTORIZING",
    "EDITABLE_REVIEW_PENDING",
    "EDITOR",
    "FINAL_REPORTING",
    "EXPORT_READY",
  ];
}

function requiredApprovalSteps(): readonly StepKey[] {
  return ["interview", "research", "plan", "design", "layout", "review", "vectorize", "editor"];
}
