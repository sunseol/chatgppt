import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption scenario uniqueness", () => {
  test("blocks duplicate interruption scenario rows even when job evidence is distinct", () => {
    const matrix = completeMatrix({
      scenarios: [
        ...LIVE_INTERRUPTION_SCENARIOS.map((id) => scenario(id)),
        scenario("fetch_shutdown", {
          liveJobId: "live_job_fetch_shutdown_duplicate",
          recoverySnapshotPath: "recovery/fetch-shutdown-duplicate.json",
        }),
      ],
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_interruption_scenario"]);
    expect(result.issues[0]?.refs).toEqual(["fetch_shutdown"]);
  });

  test("blocks unknown interruption scenario rows from satisfying the matrix", () => {
    const matrix = completeMatrix({
      scenarios: [
        ...LIVE_INTERRUPTION_SCENARIOS.map((id) => scenario(id)),
        scenario("rogue_restart_probe", {
          liveJobId: "live_job_rogue_restart_probe",
          recoverySnapshotPath: "recovery/rogue-restart-probe.json",
        }),
      ],
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["unknown_interruption_scenario"]);
    expect(result.issues[0]?.refs).toEqual(["rogue_restart_probe"]);
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
  id: string,
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
