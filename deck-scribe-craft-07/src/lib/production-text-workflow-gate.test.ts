import { describe, expect, test } from "bun:test";
import type { DeckProject, InterviewBrief, ResearchPack, StepKey } from "./deck-types";
import { liveApprovedResearchPackFixture } from "./live-research-approval-test-fixtures";
import { createProductionTextWorkflowGate } from "./production-text-workflow-gate";

describe("production text workflow gate", () => {
  test("exposes the live interview workflow when the app server bridge is missing", () => {
    // Given
    const project = projectFixture();

    // When
    const gate = createProductionTextWorkflowGate({
      project,
      step: "interview",
      appServerBridge: "missing",
    });

    // Then
    if (gate.kind !== "blocked") throw new Error("Expected blocked interview gate.");
    expect(gate.workflow).toBe("interview");
    expect(gate.requiredStages).toEqual(["questions", "brief"]);
    expect(gate.issues.map((issue) => issue.code)).toEqual(["app_server_bridge_missing"]);
  });

  test("blocks the text pipeline until upstream live artifacts exist", () => {
    // Given
    const project = projectFixture();

    // When
    const gate = createProductionTextWorkflowGate({
      project,
      step: "layout",
      appServerBridge: "available",
    });

    // Then
    if (gate.kind !== "blocked") throw new Error("Expected blocked text pipeline gate.");
    expect(gate.workflow).toBe("text_pipeline");
    expect(gate.requiredStages).toEqual(["deck_plan", "design_system", "layout_ir"]);
    expect(gate.issues.map((issue) => issue.code)).toEqual([
      "missing_live_brief",
      "missing_approved_research",
    ]);
  });

  test("marks the text pipeline ready when prerequisites and bridge are available", () => {
    // Given
    const project = projectFixture({
      brief: briefFixture(),
      research: liveApprovedResearchPackFixture(),
      stage: "PLANNING",
    });

    // When
    const gate = createProductionTextWorkflowGate({
      project,
      step: "plan",
      appServerBridge: "available",
    });

    // Then
    if (gate.kind !== "ready") throw new Error("Expected ready text pipeline gate.");
    expect(gate.workflow).toBe("text_pipeline");
    expect(gate.requiredStages).toEqual(["deck_plan", "design_system", "layout_ir"]);
    expect(gate.patchTargets).toEqual(["plan", "design", "layout"]);
  });

  test("blocks the text pipeline when Research has a nonblank but unapproved handoff hash", () => {
    // Given
    const project = projectFixture({
      brief: briefFixture(),
      research: researchFixture(),
      stage: "PLANNING",
    });

    // When
    const gate = createProductionTextWorkflowGate({
      project,
      step: "plan",
      appServerBridge: "available",
    });

    // Then
    if (gate.kind !== "blocked") throw new Error("Expected blocked text pipeline gate.");
    expect(gate.issues.map((issue) => issue.code)).toEqual(["missing_approved_research"]);
  });

  test("does not render a text workflow gate for non-text production steps", () => {
    // Given
    const project = projectFixture();

    // When
    const gate = createProductionTextWorkflowGate({
      project,
      step: "research",
      appServerBridge: "missing",
    });

    // Then
    expect(gate.kind).toBe("not_applicable");
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_live_text_gate",
    name: "Live Text Gate",
    initialPrompt: "임원 보고 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PROJECT_CREATED",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_live_gate",
    goal: "분기 성과 공유",
    audience: "임원",
    desiredOutcome: "예산 승인",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["정확한"],
    mustInclude: ["핵심 지표"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["의사결정 가능"],
    openQuestions: [],
    approvedHash: "hash_brief_live",
  };
}

function researchFixture(): ResearchPack {
  return {
    id: "research_live_gate",
    sources: [],
    claims: [],
    datasets: [],
    charts: [],
    approvedHash: "hash_research_live",
    factCheckReport: {
      summary: "Ready for planning.",
      generatedAt: 1_789_300_010,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}
