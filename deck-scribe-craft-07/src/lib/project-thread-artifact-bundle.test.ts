import { describe, expect, test } from "bun:test";
import type { FrozenDeckContext } from "./deck-context";
import {
  createProjectThreadManifest,
  recoverProjectThreadManifest,
  validateProjectThreadManifest,
} from "./project-thread-lifecycle";

describe("project thread approved artifact bundle", () => {
  test("blocks manifests whose approved artifact bundle is blank or duplicated", () => {
    // Given
    const manifest = createProjectThreadManifest({
      context: {
        ...contextFixture(),
        approvedArtifacts: {
          ...contextFixture().approvedArtifacts,
          briefId: " ",
          designSystemId: "plan_001",
        },
      },
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "plan",
          threadId: "thread_plan_001",
          lastCompletedTurnId: "turn_plan_001",
        },
      ],
    });

    // When
    const validation = validateProjectThreadManifest(manifest);

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest has a blank approved artifact id.",
      "Project thread manifest duplicates approved artifact id plan_001.",
    ]);
  });

  test("blocks restart recovery when the current context artifact bundle is invalid", () => {
    // Given
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "layout",
          threadId: "thread_layout_001",
          lastCompletedTurnId: "turn_layout_001",
        },
      ],
    });
    const corruptedCurrentContext: FrozenDeckContext = {
      ...context,
      approvedArtifacts: {
        ...context.approvedArtifacts,
        layoutPrototypeId: "plan_001",
      },
    };

    // When
    const recovery = recoverProjectThreadManifest({
      context: corruptedCurrentContext,
      snapshot: { manifest, persistedAt: 2_000 },
    });

    // Then
    expect(recovery.kind).toBe("blocked");
    if (recovery.kind !== "blocked") return;
    expect(
      recovery.issues.includes("Current deck context duplicates approved artifact id plan_001."),
    ).toBe(true);
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
