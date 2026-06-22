import { describe, expect, test } from "bun:test";
import type { FrozenDeckContext } from "./deck-context";
import {
  createProjectThreadManifest,
  validateProjectThreadManifest,
} from "./project-thread-lifecycle";

describe("project thread raw source rejection", () => {
  test("blocks nested raw conversation source metadata on worker manifests", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "plan",
          threadId: "thread_plan_001",
          lastCompletedTurnId: "turn_plan_001",
        },
      ],
    });
    const contaminatedManifest = {
      ...manifest,
      workers: [
        {
          ...manifest.workers[0],
          resumeSource: { sourceOfTruth: "raw_conversation" },
        },
      ],
    };

    const validation = validateProjectThreadManifest(contaminatedManifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Worker thread thread_plan_001 cannot persist raw conversation source material.",
    ]);
  });

  test("blocks case-insensitive raw conversation source-of-truth metadata", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "plan",
          threadId: "thread_plan_001",
          lastCompletedTurnId: "turn_plan_001",
        },
      ],
    });
    const contaminatedManifest = {
      ...manifest,
      sourceOfTruth: " RAW_CONVERSATION ",
    };

    const validation = validateProjectThreadManifest(contaminatedManifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest cannot use raw conversation as source of truth.",
    ]);
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
