import { describe, expect, test } from "bun:test";
import { createProjectThreadManifest } from "./project-thread-lifecycle";
import { evaluateProjectThreadResumeEvidence } from "./project-thread-resume-evidence";
import type { FrozenDeckContext } from "./deck-context";

describe("project thread resume evidence", () => {
  test("accepts a completed App Server resume turn after project restart", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [planWorker()],
    });

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_plan_live",
        previousTurnId: "turn_plan_context",
        resumedTurnId: "turn_plan_resume_after_restart",
        completed: true,
        resumedAfterProcessRestart: true,
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:context",
        approvedArtifactIds: ["brief_001", "research_001", "plan_001", "design_001", "layout_001"],
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.resumedThread.stage).toBe("plan");
    expect(result.resumedTurnId).toBe("turn_plan_resume_after_restart");
  });

  test("blocks resume evidence that is stale, incomplete, or not from a restarted process", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [planWorker()],
    });

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_unknown",
        previousTurnId: "turn_same",
        resumedTurnId: "turn_same",
        completed: false,
        resumedAfterProcessRestart: false,
        deckContextId: "deckctx_old",
        deckContextHash: "sha256:old",
        approvedArtifactIds: ["brief_001"],
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "resume_thread_not_in_manifest",
      "resume_context_mismatch",
      "resume_context_hash_mismatch",
      "resume_artifact_bundle_mismatch",
      "resume_turn_not_completed",
      "resume_reused_existing_turn",
      "resume_not_after_restart",
    ]);
  });

  test("requires explicit previous and resumed turn ids", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [planWorker()],
    });

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_plan_live",
        previousTurnId: " ",
        resumedTurnId: "",
        completed: true,
        resumedAfterProcessRestart: true,
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:context",
        approvedArtifactIds: ["brief_001", "research_001", "plan_001", "design_001", "layout_001"],
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_resume_previous_turn",
      "missing_resume_next_turn",
    ]);
  });

  test("requires resumed worker turns to be live Codex production evidence", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [planWorker()],
    });

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_plan_live",
        previousTurnId: "turn_plan_context",
        resumedTurnId: "turn_plan_resume_after_restart",
        completed: true,
        resumedAfterProcessRestart: true,
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:context",
        approvedArtifactIds: ["brief_001", "research_001", "plan_001", "design_001", "layout_001"],
        providerKind: "mock",
        authMode: "none",
        executionMode: "development",
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "resume_non_codex_turn",
      "resume_non_codex_session_auth",
      "resume_non_production_turn",
    ]);
  });

  test("blocks live resume evidence when the persisted manifest cannot recover", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [planWorker()],
    });
    const staleManifest = { ...manifest, deckContextHash: "sha256:stale" };

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest: staleManifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_plan_live",
        previousTurnId: "turn_plan_context",
        resumedTurnId: "turn_plan_resume_after_restart",
        completed: true,
        resumedAfterProcessRestart: true,
        deckContextId: "deckctx_001",
        deckContextHash: "sha256:context",
        approvedArtifactIds: ["brief_001", "research_001", "plan_001", "design_001", "layout_001"],
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["restart_recovery_blocked"]);
  });
});

function planWorker() {
  return {
    stage: "plan" as const,
    threadId: "thread_plan_live",
    lastCompletedTurnId: "turn_plan_context",
  };
}

function contextFixture(): FrozenDeckContext {
  return {
    deckContextId: "deckctx_001",
    projectId: "project_001",
    approvedArtifacts: {
      briefId: "brief_001",
      researchPackId: "research_001",
      deckPlanId: "plan_001",
      designSystemId: "design_001",
      layoutPrototypeId: "layout_001",
    },
    approvedHashes: {
      briefHash: "sha256:brief",
      researchHash: "sha256:research",
      deckPlanHash: "sha256:plan",
      designHash: "sha256:design",
      layoutHash: "sha256:layout",
    },
    hash: "sha256:context",
    createdAt: 1_000,
    locked: true,
    slideCount: 5,
    layout: {
      layoutPrototypeId: "layout_001",
      slides: [],
    },
  };
}
