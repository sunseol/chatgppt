import { describe, expect, test } from "bun:test";
import { writeLiveImageQueueEvidenceExport } from "./live-image-queue-evidence-export";
import { createPromptUsageRecord } from "./prompt-assets";
import type { SlideGenerationQueueResult } from "./slide-generation-queue";

describe("live image queue restart-resume evidence export", () => {
  test("blocks DF-233 queue evidence when restart-resume evidence is missing", async () => {
    // Given / When
    const stored = await writeLiveImageQueueEvidenceExport({
      store: { write: async () => undefined },
      projectId: "project_001",
      jobId: "job_generate_resumed",
      exportedAt: 1_789_941_001,
      result: resumedQueueResult(),
      storedImageArtifactPaths: [
        "projects/project_001/slides/images/slide_001.v1.png",
        "projects/project_001/slides/images/slide_002.v1.png",
      ],
    });

    // Then
    expect(stored.evidence.validation.kind).toBe("blocked");
    if (stored.evidence.validation.kind !== "blocked") {
      throw new Error("Expected resumed queue evidence without restart proof to block.");
    }
    expect(stored.evidence.validation.issues.map((issue) => issue.code)).toEqual([
      "missing_restart_resume_evidence",
    ]);
  });

  test("blocks restart-resume evidence with a noncanonical recovery snapshot path", async () => {
    // Given / When
    const stored = await writeLiveImageQueueEvidenceExport({
      store: { write: async () => undefined },
      projectId: "project_001",
      jobId: "job_generate_resumed",
      exportedAt: 1_789_941_101,
      result: resumedQueueResult(),
      storedImageArtifactPaths: [
        "projects/project_001/slides/images/slide_001.v1.png",
        "projects/project_001/slides/images/slide_002.v1.png",
      ],
      restartResumeEvidence: restartResumeEvidence({
        recoverySnapshotPath:
          " projects/project_001/live-evidence/df243-image-partial-resume-recovery-snapshot-job.json ",
      }),
    });

    // Then
    expect(stored.evidence.validation.kind).toBe("blocked");
    if (stored.evidence.validation.kind !== "blocked") {
      throw new Error("Expected noncanonical restart proof to block.");
    }
    expect(stored.evidence.validation.issues.map((issue) => issue.code)).toEqual([
      "invalid_restart_resume_evidence",
    ]);
  });

  test("persists restart-resume evidence when proof matches the resumed queue", async () => {
    // Given / When
    const stored = await writeLiveImageQueueEvidenceExport({
      store: { write: async () => undefined },
      projectId: "project_001",
      jobId: "job_generate_resumed",
      exportedAt: 1_789_941_201,
      result: resumedQueueResult(),
      storedImageArtifactPaths: [
        "projects/project_001/slides/images/slide_001.v1.png",
        "projects/project_001/slides/images/slide_002.v1.png",
      ],
      restartResumeEvidence: restartResumeEvidence(),
    });

    // Then
    expect(stored.evidence.validation).toEqual({ kind: "ready" });
    expect(stored.evidence.restartResumeEvidence?.liveJobId).toBe("live_job_resume");
  });
});

function resumedQueueResult(): Extract<SlideGenerationQueueResult, { readonly kind: "ready" }> {
  return {
    kind: "ready",
    status: "succeeded",
    context: {
      deckContextId: "deckctx_001",
      deckContextHash: "sha256:deck",
      designSystemId: "design_001",
      designTokenHash: "sha256:design",
      layoutPrototypeId: "layout_001",
      slideCount: 2,
    },
    slides: [
      {
        number: 1,
        version: 1,
        status: "ready",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
      },
      {
        number: 2,
        version: 1,
        status: "ready",
        imageDescriptor: "codex|16:9|slide_02_layout.png|slide_generation@v1",
      },
    ],
    failures: [],
    jobs: [
      {
        id: "slide_job_2",
        providerId: "codex",
        capability: "imageGeneration",
        description: "Generate slide 2",
        status: "succeeded",
        createdAt: 1_789_941_000,
        startedAt: 1_789_941_001,
        finishedAt: 1_789_941_010,
        attempt: 1,
        cancelRequested: false,
      },
    ],
    promptUsages: [
      createPromptUsageRecord({
        promptId: "slide_generation",
        artifactId: "bundle_slide_002",
        jobId: "slide_job_2",
        recordedAt: 1_789_941_000,
      }),
    ],
    retryProvenance: [],
    concurrency: {
      requestedMaxParallel: 3,
      effectiveMaxParallel: 1,
      observedMaxRunning: 1,
    },
    progress: { completed: 2, failed: 0, total: 2, percent: 100 },
  };
}

function restartResumeEvidence(
  patch: {
    readonly recoverySnapshotPath?: string;
  } = {},
) {
  return {
    recoverySnapshotPath:
      patch.recoverySnapshotPath ??
      "projects/project_001/live-evidence/df243-image-partial-resume-recovery-snapshot-job.json",
    liveJobId: "live_job_resume",
    completedArtifactIdsBefore: ["slide_001_v1"],
    completedArtifactIdsAfter: ["slide_001_v1", "slide_002_v1"],
    pendingImageArtifactIds: ["slide_002_v1"],
    resumedArtifactIds: ["slide_002_v1"],
  };
}
