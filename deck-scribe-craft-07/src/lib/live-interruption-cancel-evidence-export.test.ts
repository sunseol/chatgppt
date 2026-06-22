import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { writeLiveInterruptionCancelEvidenceExport } from "./live-interruption-cancel-evidence-export";
import {
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionScenarioEvidence,
  type LiveInterruptionScenarioId,
} from "./live-interruption-matrix";
import { readyQueueResultFixture, providerJobFixture } from "./live-image-queue-test-fixtures";
import { createPromptUsageRecord } from "./prompt-assets";
import type {
  SlideGenerationFailure,
  SlideGenerationQueueResult,
} from "./slide-generation-queue-types";

type ReadySlideGenerationQueueResult = Extract<
  SlideGenerationQueueResult,
  { readonly kind: "ready" }
>;

describe("live interruption cancel evidence export", () => {
  test("persists app-storage recovery and cancel-signal JSON for a cancelled queue job", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionCancelEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "cancel_job_run_001",
      exportedAt: 1_789_960_000,
      result: readyResultFixture({
        status: "partial_failure",
        failures: [cancelledFailure()],
        jobs: [
          providerJobFixture({
            id: "job_cancel_001",
            providerId: "codex",
            status: "cancelled",
            cancelRequested: true,
            startedAt: 1_789_959_990,
            finishedAt: 1_789_960_000,
          }),
        ],
        promptUsages: [
          createPromptUsageRecord({
            promptId: "slide_generation",
            artifactId: "bundle_cancel_001",
            jobId: "job_cancel_001",
            recordedAt: 1_789_959_980,
          }),
        ],
      }),
    });

    // Then
    expect(result.kind).toBe("written");
    if (result.kind !== "written") throw new Error("Expected written evidence.");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_live/live-evidence/df243-cancel-job-recovery-snapshot-cancel_job_run_001.json",
      "projects/project_live/live-evidence/df243-cancel-job-cancel-signal-cancel_job_run_001.json",
    ]);
    expect(result.scenario.cancelSignalJobId).toBe("job_cancel_001");
    expect(result.scenario.cancelSignalEvidencePath).toBe(writes[1]?.path);
    expect(
      evaluateLiveInterruptionMatrix({
        reportPath: "docs/live-interruption-matrix.md",
        scenarios: completeScenariosWith(result.scenario),
      }),
    ).toEqual({ kind: "ready" });
  });

  test("blocks export when the cancelled failure lacks a preserved cancel signal", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionCancelEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "cancel_job_run_002",
      exportedAt: 1_789_960_100,
      result: readyResultFixture({
        status: "partial_failure",
        failures: [cancelledFailure()],
        jobs: [
          providerJobFixture({
            id: "job_cancel_001",
            providerId: "codex",
            status: "cancelled",
            cancelRequested: false,
          }),
        ],
      }),
    });

    // Then
    expect(result).toEqual({
      kind: "blocked",
      issues: ["cancel_signal_missing"],
    });
    expect(writes).toEqual([]);
  });
});

function readyResultFixture(
  overrides: Partial<ReadySlideGenerationQueueResult>,
): ReadySlideGenerationQueueResult {
  const result = readyQueueResultFixture(overrides);
  if (result.kind === "blocked") throw new Error("Expected a ready queue result fixture.");
  return result;
}

function cancelledFailure(): SlideGenerationFailure {
  return {
    jobId: "job_cancel_001",
    bundleId: "bundle_cancel_001",
    slideNumber: 3,
    retryable: true,
    attempts: 1,
    failureKind: "cancelled",
    retryDelaysMs: [],
    errorMessage: "Slide 3 generation was cancelled.",
    userMessage: "Slide 3 was cancelled. Retry is available.",
  };
}

function completeScenariosWith(
  cancelScenario: LiveInterruptionScenarioEvidence,
): readonly LiveInterruptionScenarioEvidence[] {
  return [
    scenario("text_turn_shutdown"),
    scenario("fetch_shutdown"),
    scenario("image_partial_resume", {
      jobStatusAfterRestart: "interrupted",
      pendingImageArtifactIds: ["img_003"],
      resumedArtifactIds: ["img_003"],
    }),
    cancelScenario,
    scenario("interrupted_artifact_gate", {
      approvalGateChecked: true,
      approvalGateEvidencePath:
        "projects/project_live/live-evidence/df243-interrupted-artifact-gate-approval.json",
      exportGateChecked: true,
      exportGateEvidencePath:
        "projects/project_live/live-evidence/df243-interrupted-artifact-gate-export.json",
    }),
  ];
}

function scenario(
  id: Exclude<LiveInterruptionScenarioId, "cancel_job">,
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart: id === "image_partial_resume" ? "interrupted" : "failed",
    completedArtifactIdsBefore: [],
    completedArtifactIdsAfter: [],
    liveJobId: `live_job_${id}`,
    recoverySnapshotPath: `projects/project_live/live-evidence/df243-${id}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    pendingImageArtifactIds: [],
    resumedArtifactIds: [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: ["partial_artifact_001"],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    approvalGateEvidencePath:
      "projects/project_live/live-evidence/df243-interrupted-artifact-gate-approval-default.json",
    exportGateChecked: true,
    exportGateEvidencePath:
      "projects/project_live/live-evidence/df243-interrupted-artifact-gate-export-default.json",
    ...patch,
  };
}
