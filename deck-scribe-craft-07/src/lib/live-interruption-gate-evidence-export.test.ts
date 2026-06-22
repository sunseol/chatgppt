import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { writeLiveInterruptionGateEvidenceExport } from "./live-interruption-gate-evidence-export";
import {
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionScenarioEvidence,
  type LiveInterruptionScenarioId,
} from "./live-interruption-matrix";

describe("live interruption gate evidence export", () => {
  test("persists recovery approval and export gate JSON for interrupted artifacts", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionGateEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "interrupted_artifact_gate_run_001",
      liveJobId: "live_job_interrupted_artifact_gate_001",
      exportedAt: 1_789_962_000,
      completedArtifactIdsBefore: ["img_001", "img_002"],
      completedArtifactIdsAfter: ["img_001", "img_002"],
      interruptedArtifactIds: ["partial_artifact_003"],
      approvalDeniedArtifactIds: ["partial_artifact_003"],
      exportDeniedArtifactIds: ["partial_artifact_003"],
      approvableArtifactIds: [],
      exportableArtifactIds: [],
    });

    // Then
    expect(result.kind).toBe("written");
    if (result.kind !== "written") throw new Error("Expected written evidence.");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_live/live-evidence/df243-interrupted-artifact-gate-recovery-snapshot-interrupted_artifact_gate_run_001.json",
      "projects/project_live/live-evidence/df243-interrupted-artifact-gate-approval-interrupted_artifact_gate_run_001.json",
      "projects/project_live/live-evidence/df243-interrupted-artifact-gate-export-interrupted_artifact_gate_run_001.json",
    ]);
    expect(stringContent(writes[1]).includes('"gate": "approval"')).toBe(true);
    expect(stringContent(writes[2]).includes('"gate": "export"')).toBe(true);
    expect(result.scenario.approvalGateChecked).toBe(true);
    expect(result.scenario.exportGateChecked).toBe(true);
    expect(
      evaluateLiveInterruptionMatrix({
        reportPath: "docs/live-interruption-matrix.md",
        scenarios: completeScenariosWith(result.scenario),
      }),
    ).toEqual({ kind: "ready" });
  });

  test("blocks export when an interrupted artifact remains approvable", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await writeLiveInterruptionGateEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_live",
      jobId: "interrupted_artifact_gate_run_002",
      liveJobId: "live_job_interrupted_artifact_gate_002",
      exportedAt: 1_789_962_100,
      completedArtifactIdsBefore: ["img_001"],
      completedArtifactIdsAfter: ["img_001"],
      interruptedArtifactIds: ["partial_artifact_003"],
      approvalDeniedArtifactIds: ["partial_artifact_003"],
      exportDeniedArtifactIds: ["partial_artifact_003"],
      approvableArtifactIds: ["partial_artifact_003"],
      exportableArtifactIds: [],
    });

    // Then
    expect(result).toEqual({
      kind: "blocked",
      issues: ["interrupted_artifact_approvable"],
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
  gateScenario: LiveInterruptionScenarioEvidence,
): readonly LiveInterruptionScenarioEvidence[] {
  return [
    scenario("text_turn_shutdown"),
    scenario("fetch_shutdown"),
    scenario("image_partial_resume", {
      jobStatusAfterRestart: "interrupted",
      recoverySnapshotPath:
        "projects/project_live/live-evidence/df243-image-partial-resume-recovery-snapshot-run-001.json",
      pendingImageArtifactIds: ["img_003"],
      resumedArtifactIds: ["img_003"],
    }),
    scenario("cancel_job", {
      jobStatusAfterRestart: "cancelled",
      recoverySnapshotPath:
        "projects/project_live/live-evidence/df243-cancel-job-recovery-snapshot-run-001.json",
      cancelSignalEvidencePath:
        "projects/project_live/live-evidence/df243-cancel-job-cancel-signal-run-001.json",
      cancelSignalJobId: "live_job_cancel_job",
    }),
    gateScenario,
  ];
}

function scenario(
  id: Exclude<LiveInterruptionScenarioId, "interrupted_artifact_gate">,
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart:
      id === "image_partial_resume" ? "interrupted" : id === "cancel_job" ? "cancelled" : "failed",
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
    interruptedArtifactIds: [],
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
