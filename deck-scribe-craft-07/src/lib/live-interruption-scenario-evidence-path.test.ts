import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption scenario evidence paths", () => {
  test("blocks recovery snapshots that do not identify their interruption scenario", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "image_partial_resume"
          ? scenario(id, {
              recoverySnapshotPath: "docs/live-evidence/lane-h-20260621/text-turn-shutdown.json",
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
      "interruption_evidence_path_scenario_mismatch",
    ]);
    expect(result.issues[0]?.refs).toEqual(["image_partial_resume:recoverySnapshotPath"]);
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
    recoverySnapshotPath: `docs/live-evidence/lane-h-20260621/${id}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    ...(id === "cancel_job"
      ? { cancelSignalEvidencePath: "docs/live-evidence/lane-h-20260621/cancel-job-signal.json" }
      : {}),
    ...(id === "cancel_job" ? { cancelSignalJobId: "live_job_cancel_job" } : {}),
    pendingImageArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    resumedArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: ["partial_plan"],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    approvalGateEvidencePath: "docs/live-evidence/lane-h-20260621/interrupted-approval-gate.json",
    exportGateChecked: true,
    exportGateEvidencePath: "docs/live-evidence/lane-h-20260621/interrupted-export-gate.json",
    ...patch,
  };
}
