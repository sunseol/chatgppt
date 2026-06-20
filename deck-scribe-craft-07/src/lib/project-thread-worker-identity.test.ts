import { describe, expect, test } from "bun:test";
import type { FrozenDeckContext } from "./deck-context";
import {
  createProjectThreadManifest,
  validateProjectThreadManifest,
} from "./project-thread-lifecycle";

describe("project thread worker identity", () => {
  test("blocks blank duplicate and coordinator-reused worker thread ids", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "research",
          threadId: " ",
          lastCompletedTurnId: "turn_research_001",
        },
        {
          stage: "plan",
          threadId: "thread_shared_worker",
          lastCompletedTurnId: "turn_plan_001",
        },
        {
          stage: "design",
          threadId: "thread_shared_worker",
          lastCompletedTurnId: "turn_design_001",
        },
        {
          stage: "layout",
          threadId: " thread_coordinator_001 ",
          lastCompletedTurnId: "turn_layout_001",
        },
      ],
    });

    const validation = validateProjectThreadManifest(manifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest has duplicate worker thread id thread_shared_worker.",
      "Worker thread for research is missing a thread id.",
      "Worker thread thread_coordinator_001 reuses the coordinator thread id.",
      "Worker thread thread_coordinator_001 has a non-canonical thread id.",
    ]);
  });

  test("blocks non-canonical coordinator worker and turn ids", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: " thread_coordinator_001 ",
      workers: [
        {
          stage: "research",
          threadId: " thread_research_001 ",
          lastCompletedTurnId: " turn_research_001 ",
        },
      ],
    });

    const validation = validateProjectThreadManifest(manifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest coordinator thread id is not canonical.",
      "Worker thread thread_research_001 has a non-canonical thread id.",
      "Worker thread thread_research_001 has a non-canonical last completed turn id.",
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
