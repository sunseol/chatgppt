import { describe, expect, test } from "bun:test";
import type { FrozenDeckContext } from "./deck-context";
import { createProjectThreadManifest } from "./project-thread-lifecycle";
import { evaluateProjectThreadResumeEvidence } from "./project-thread-resume-evidence";

describe("project thread resume turn identity", () => {
  test("blocks non-canonical resumed turn ids", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_live",
      workers: [
        {
          stage: "plan",
          threadId: "thread_plan_live",
          lastCompletedTurnId: "turn_plan_context",
        },
      ],
    });

    // When
    const result = evaluateProjectThreadResumeEvidence({
      context,
      snapshot: { manifest, persistedAt: 1_789_400_000_000 },
      evidence: {
        threadId: "thread_plan_live",
        previousTurnId: "turn_plan_context",
        resumedTurnId: " turn_plan_resume_after_restart ",
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
    expect(result.issues.map((issue) => issue.code)).toEqual(["resume_next_turn_not_canonical"]);
  });
});

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
