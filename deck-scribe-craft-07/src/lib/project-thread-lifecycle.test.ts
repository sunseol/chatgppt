import { describe, expect, test } from "bun:test";
import {
  createProjectThreadManifest,
  findStaleLiveContextJobs,
  recoverProjectThreadManifest,
  validateProjectThreadManifest,
  type LiveContextJobSnapshot,
} from "./project-thread-lifecycle";
import type { FrozenDeckContext } from "./deck-context";

describe("project thread lifecycle", () => {
  test("creates one coordinator thread manifest backed by approved artifact ids", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "research",
          threadId: "thread_research_001",
          lastCompletedTurnId: "turn_research_001",
        },
        { stage: "plan", threadId: "thread_plan_001", lastCompletedTurnId: "turn_plan_001" },
      ],
    });

    expect(manifest.coordinatorThreadId).toBe("thread_coordinator_001");
    expect(manifest.deckContextId).toBe("deckctx_001");
    expect(manifest.approvedArtifactIds).toEqual([
      "brief_001",
      "research_001",
      "plan_001",
      "design_001",
      "layout_001",
    ]);
    expect(manifest.workers.every((worker) => worker.deckContextId === "deckctx_001")).toBe(true);
    expect(manifest.workers.every((worker) => worker.deckContextHash === "sha256:context")).toBe(
      true,
    );
    expect(JSON.stringify(manifest).includes("raw conversation")).toBe(false);
  });

  test("rejects worker threads that drift from the coordinator context", () => {
    const manifest = {
      ...createProjectThreadManifest({
        context: contextFixture(),
        coordinatorThreadId: "thread_coordinator_001",
        workers: [
          {
            stage: "layout",
            threadId: "thread_layout_001",
            lastCompletedTurnId: "turn_layout_001",
          },
        ],
      }),
      workers: [
        {
          stage: "layout" as const,
          threadId: "thread_layout_001",
          lastCompletedTurnId: "turn_layout_001",
          deckContextId: "deckctx_old",
          deckContextHash: "sha256:old-context",
          approvedArtifactIds: ["brief_001"],
        },
      ],
    };

    const validation = validateProjectThreadManifest(manifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Worker thread thread_layout_001 does not use the coordinator deck context.",
      "Worker thread thread_layout_001 does not use the coordinator context hash.",
      "Worker thread thread_layout_001 does not use the approved artifact bundle.",
    ]);
  });

  test("rejects manifests that make raw conversation the worker source of truth", () => {
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
    const contaminatedWorker = {
      ...manifest.workers[0],
      conversationTranscript: "long raw conversation used instead of approved artifacts",
    };
    const contaminatedManifest = {
      ...manifest,
      sourceOfTruth: "raw_conversation",
      workers: [contaminatedWorker],
    };

    const validation = validateProjectThreadManifest(contaminatedManifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest cannot use raw conversation as source of truth.",
      "Worker thread thread_plan_001 cannot persist raw conversation source material.",
    ]);
  });

  test("rejects manifests without one concrete worker thread per stage", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: " ",
      workers: [
        {
          stage: "research",
          threadId: "thread_research_001",
          lastCompletedTurnId: "turn_research_001",
        },
        {
          stage: "research",
          threadId: "thread_research_002",
          lastCompletedTurnId: "turn_research_002",
        },
      ],
    });

    const validation = validateProjectThreadManifest(manifest);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues).toEqual([
      "Project thread manifest is missing a coordinator thread id.",
      "Project thread manifest has duplicate research worker threads.",
    ]);
  });

  test("recovers persisted coordinator and worker threads after restart", () => {
    const context = contextFixture();
    const manifest = createProjectThreadManifest({
      context,
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "research",
          threadId: "thread_research_001",
          lastCompletedTurnId: "turn_research_001",
        },
        { stage: "plan", threadId: "thread_plan_001", lastCompletedTurnId: "turn_plan_001" },
      ],
    });

    const recovery = recoverProjectThreadManifest({
      context,
      snapshot: { manifest, persistedAt: 2_000 },
    });

    expect(recovery.kind).toBe("ready");
    if (recovery.kind !== "ready") return;
    expect(recovery.manifest.coordinatorThreadId).toBe("thread_coordinator_001");
    expect(recovery.resumableThreads).toEqual([
      {
        stage: "research",
        threadId: "thread_research_001",
        lastCompletedTurnId: "turn_research_001",
        deckContextId: "deckctx_001",
      },
      {
        stage: "plan",
        threadId: "thread_plan_001",
        lastCompletedTurnId: "turn_plan_001",
        deckContextId: "deckctx_001",
      },
    ]);
  });

  test("blocks restart recovery when the approved artifact context changed", () => {
    const manifest = createProjectThreadManifest({
      context: contextFixture(),
      coordinatorThreadId: "thread_coordinator_001",
      workers: [
        {
          stage: "layout",
          threadId: "thread_layout_001",
          lastCompletedTurnId: "turn_layout_001",
        },
      ],
    });
    const changedContext = {
      ...contextFixture(),
      deckContextId: "deckctx_002",
      hash: "sha256:context-v2",
      approvedArtifacts: { ...contextFixture().approvedArtifacts, deckPlanId: "plan_002" },
    };

    const recovery = recoverProjectThreadManifest({
      context: changedContext,
      snapshot: { manifest, persistedAt: 2_000 },
    });

    expect(recovery.kind).toBe("blocked");
    if (recovery.kind !== "blocked") return;
    expect(recovery.issues).toEqual([
      "Recovered coordinator thread belongs to a stale deck context.",
      "Recovered coordinator thread uses a stale context hash.",
      "Recovered approved artifact bundle does not match the current deck context.",
      "Worker thread thread_layout_001 does not use the coordinator deck context.",
      "Worker thread thread_layout_001 does not use the coordinator context hash.",
      "Worker thread thread_layout_001 does not use the approved artifact bundle.",
    ]);
  });

  test("marks active live jobs stale after upstream context invalidation", () => {
    const jobs: readonly LiveContextJobSnapshot[] = [
      {
        jobId: "job_current",
        providerId: "codex",
        deckContextId: "deckctx_002",
        status: "running",
      },
      { jobId: "job_old", providerId: "codex", deckContextId: "deckctx_001", status: "running" },
      { jobId: "job_mock", providerId: "mock", deckContextId: "deckctx_001", status: "running" },
      { jobId: "job_done", providerId: "codex", deckContextId: "deckctx_001", status: "succeeded" },
    ];

    expect(findStaleLiveContextJobs({ currentDeckContextId: "deckctx_002", jobs })).toEqual([
      "job_old",
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
