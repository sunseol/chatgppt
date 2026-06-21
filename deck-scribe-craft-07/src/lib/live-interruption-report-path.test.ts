import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption report path evidence", () => {
  test("blocks synthetic interruption matrix report paths", () => {
    // Given
    const matrix = completeMatrix({ reportPath: "fixtures/live-interruption-matrix.md" });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_interruption_report",
    ]);
  });

  test("blocks developer-local interruption matrix report paths", () => {
    // Given
    const matrix = completeMatrix({
      reportPath: "/Users/jake/chatgppt/docs/live-interruption-matrix.md",
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_interruption_report",
    ]);
  });

  test("blocks interruption matrix reports outside the committed docs location", () => {
    // Given
    const matrix = completeMatrix({ reportPath: "tmp/live-interruption-matrix.md" });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_interruption_report",
    ]);
  });

  test("blocks developer-local interruption evidence JSON paths", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "cancel_job"
          ? scenario(id, {
              recoverySnapshotPath: "/Users/jake/chatgppt/recovery/cancel-job.json",
              cancelSignalEvidencePath: "/Users/jake/chatgppt/recovery/cancel-job-signal.json",
            })
          : id === "interrupted_artifact_gate"
            ? scenario(id, {
                approvalGateEvidencePath:
                  "/Users/jake/chatgppt/recovery/interrupted-approval-gate.json",
                exportGateEvidencePath:
                  "/Users/jake/chatgppt/recovery/interrupted-export-gate.json",
              })
            : scenario(id),
      ),
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_recovery_snapshot",
      "missing_cancel_signal_evidence",
      "missing_interrupted_approval_gate_evidence",
      "missing_interrupted_export_gate_evidence",
    ]);
  });
});

function completeMatrix(
  patch: Partial<LiveInterruptionMatrixEvidence> = {},
): LiveInterruptionMatrixEvidence {
  return {
    reportPath: "docs/live-interruption-matrix.md",
    scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) => scenario(id)),
    ...patch,
  };
}

function scenario(
  id: (typeof LIVE_INTERRUPTION_SCENARIOS)[number],
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart: id === "image_partial_resume" ? "interrupted" : "failed",
    completedArtifactIdsBefore: ["brief_live_001", "img_001", "img_002"],
    completedArtifactIdsAfter: ["brief_live_001", "img_001", "img_002"],
    liveJobId: `live_job_${id}`,
    recoverySnapshotPath: `recovery/${id}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    ...(id === "cancel_job" ? { cancelSignalEvidencePath: "recovery/cancel-job-signal.json" } : {}),
    ...(id === "cancel_job" ? { cancelSignalJobId: "live_job_cancel_job" } : {}),
    pendingImageArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    resumedArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: ["partial_plan"],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    approvalGateEvidencePath: "recovery/interrupted-approval-gate.json",
    exportGateChecked: true,
    exportGateEvidencePath: "recovery/interrupted-export-gate.json",
    ...patch,
  };
}
