import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { writeLiveInterruptionImageResumeEvidenceExport } from "./live-interruption-image-resume-evidence-export";
import {
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionScenarioEvidence,
  type LiveInterruptionScenarioId,
} from "./live-interruption-matrix";

describe("live interruption image resume evidence export", () => {
  test("persists app-storage recovery JSON for pending image artifacts resumed after restart", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionImageResumeEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "image_partial_resume_run_001",
      liveJobId: "live_job_image_partial_resume_001",
      exportedAt: 1_789_961_000,
      completedArtifactIdsBefore: ["img_001", "img_002"],
      completedArtifactIdsAfter: ["img_001", "img_002"],
      pendingImageArtifactIds: ["img_003", "img_004"],
      resumedArtifactIds: ["img_003", "img_004"],
    });

    // Then
    expect(result.kind).toBe("written");
    if (result.kind !== "written") throw new Error("Expected written evidence.");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_live/live-evidence/df243-image-partial-resume-recovery-snapshot-image_partial_resume_run_001.json",
    ]);
    expect(stringContent(writes[0]).includes('"scenarioId": "image_partial_resume"')).toBe(true);
    expect(result.scenario.pendingImageArtifactIds).toEqual(["img_003", "img_004"]);
    expect(result.scenario.resumedArtifactIds).toEqual(["img_003", "img_004"]);
    expect(
      evaluateLiveInterruptionMatrix({
        reportPath: "docs/live-interruption-matrix.md",
        scenarios: completeScenariosWith(result.scenario),
      }),
    ).toEqual({ kind: "ready" });
  });

  test("blocks export when a resumed image was not pending before restart", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionImageResumeEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "image_partial_resume_run_002",
      liveJobId: "live_job_image_partial_resume_002",
      exportedAt: 1_789_961_100,
      completedArtifactIdsBefore: ["img_001"],
      completedArtifactIdsAfter: ["img_001"],
      pendingImageArtifactIds: ["img_003"],
      resumedArtifactIds: ["img_003", "img_untracked"],
    });

    // Then
    expect(result).toEqual({
      kind: "blocked",
      issues: ["resumed_image_not_pending"],
    });
    expect(writes).toEqual([]);
  });
});

function stringContent(write: ImageArtifactStoreWrite | undefined): string {
  if (write === undefined) throw new Error("Expected an evidence write.");
  if (typeof write.content !== "string") throw new Error("Expected JSON string content.");
  return write.content;
}

function completeScenariosWith(
  imageScenario: LiveInterruptionScenarioEvidence,
): readonly LiveInterruptionScenarioEvidence[] {
  return [
    scenario("text_turn_shutdown"),
    scenario("fetch_shutdown"),
    imageScenario,
    scenario("cancel_job", {
      jobStatusAfterRestart: "cancelled",
      recoverySnapshotPath:
        "projects/project_live/live-evidence/df243-cancel-job-recovery-snapshot-run-001.json",
      cancelSignalEvidencePath:
        "projects/project_live/live-evidence/df243-cancel-job-cancel-signal-run-001.json",
      cancelSignalJobId: "live_job_cancel_job",
    }),
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
  id: Exclude<LiveInterruptionScenarioId, "image_partial_resume">,
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart: id === "cancel_job" ? "cancelled" : "failed",
    completedArtifactIdsBefore: ["img_001", "img_002"],
    completedArtifactIdsAfter: ["img_001", "img_002"],
    liveJobId: `live_job_${id}`,
    recoverySnapshotPath: `projects/project_live/live-evidence/df243-${id}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    ...(id === "cancel_job"
      ? { cancelSignalEvidencePath: "projects/project_live/live-evidence/df243-cancel-job.json" }
      : {}),
    ...(id === "cancel_job" ? { cancelSignalJobId: "live_job_cancel_job" } : {}),
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
