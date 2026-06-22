import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption image artifact identity", () => {
  test("blocks blank image artifact ids from satisfying partial resume evidence", () => {
    // Given: image partial resume evidence pads the pending and resumed sets with blanks.
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "image_partial_resume"
          ? scenario(id, {
              pendingImageArtifactIds: ["img_003", " "],
              resumedArtifactIds: ["img_003", " "],
            })
          : scenario(id),
      ),
    });

    // When / Then: the blank artifact identity is rejected as unsafe resume evidence.
    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["unsafe_partial_image_resume"]);
    expect(result.issues[0]?.refs).toEqual(["blank_image_artifact_id"]);
  });

  test("blocks duplicate image artifact ids from satisfying partial resume evidence", () => {
    // Given: one pending image is duplicated and the duplicate is used to inflate evidence.
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "image_partial_resume"
          ? scenario(id, {
              pendingImageArtifactIds: ["img_003", "img_003", "img_004"],
              resumedArtifactIds: ["img_003", "img_004", "img_004"],
            })
          : scenario(id),
      ),
    });

    // When / Then: duplicate image artifact identities cannot stand in for distinct evidence.
    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["unsafe_partial_image_resume"]);
    expect(result.issues[0]?.refs).toEqual(["img_003", "img_004"]);
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
