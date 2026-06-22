import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption post-restart artifact evidence", () => {
  test("blocks interrupted text jobs that complete new artifacts after restart", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "text_turn_shutdown"
          ? scenario(id, {
              jobStatusAfterRestart: "failed",
              completedArtifactIdsBefore: ["brief_live_001"],
              completedArtifactIdsAfter: ["brief_live_001", "brief_live_after_restart"],
            })
          : scenario(id),
      ),
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "interrupted_job_completed_after_restart",
    ]);
    expect(result.issues[0]?.refs).toEqual(["brief_live_after_restart"]);
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
