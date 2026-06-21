import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";
import {
  evaluateLiveInterruptionClosureEvidence,
  formatLiveInterruptionClosureEvidenceSummary,
  type LiveInterruptionClosureEvidence,
} from "./live-interruption-closure-evidence";

describe("live interruption closure evidence", () => {
  test("passes when the closure manifest matches the ready DF-243 matrix artifacts", () => {
    // Given
    const evidence = closureEvidence();

    // When
    const result = evaluateLiveInterruptionClosureEvidence(evidence);

    // Then
    expect(result).toEqual({ kind: "ready" });
    expect(formatLiveInterruptionClosureEvidenceSummary(evidence).includes("DF-243")).toBe(true);
  });

  test("blocks manifests that omit unresolved packaged-app interruption artifacts", () => {
    // Given
    const evidence = closureEvidence({
      requiredArtifacts: {
        imagePartialResumeEvidencePath: "",
        appCancelSnapshotPath: "recovery/cancel_job.json",
        cancelSignalEvidencePath: "recovery/cancel-job-signal.json",
        approvalGateEvidencePath: "recovery/interrupted-approval-gate.json",
        exportGateEvidencePath: "recovery/interrupted-export-gate.json",
      },
    });

    // When
    const result = evaluateLiveInterruptionClosureEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_interruption_closure_artifact",
      "interruption_closure_artifact_mismatch",
    ]);
    expect(result.issues[0]?.refs).toEqual(["imagePartialResumeEvidencePath"]);
  });

  test("blocks manifests whose closure paths drift from the evaluated matrix", () => {
    // Given
    const evidence = closureEvidence({
      requiredArtifacts: {
        imagePartialResumeEvidencePath: "recovery/image_partial_resume.json",
        appCancelSnapshotPath: "recovery/cancel_job.json",
        cancelSignalEvidencePath: "recovery/other-cancel-signal.json",
        approvalGateEvidencePath: "recovery/interrupted-approval-gate.json",
        exportGateEvidencePath: "recovery/interrupted-export-gate.json",
      },
    });

    // When
    const result = evaluateLiveInterruptionClosureEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "interruption_closure_artifact_mismatch",
    ]);
    expect(result.issues[0]?.refs).toEqual(["cancelSignalEvidencePath"]);
  });
});

function closureEvidence(
  patch: Partial<LiveInterruptionClosureEvidence> = {},
): LiveInterruptionClosureEvidence {
  const matrix = completeMatrix();
  return {
    issue: "#153",
    ticket: "DF-243",
    status: "ready_for_close",
    reportPath: "docs/live-interruption-matrix.md",
    matrixEvidencePath: "docs/live-evidence/df243-interruption-matrix.json",
    matrix,
    requiredArtifacts: {
      imagePartialResumeEvidencePath: "recovery/image_partial_resume.json",
      appCancelSnapshotPath: "recovery/cancel_job.json",
      cancelSignalEvidencePath: "recovery/cancel-job-signal.json",
      approvalGateEvidencePath: "recovery/interrupted-approval-gate.json",
      exportGateEvidencePath: "recovery/interrupted-export-gate.json",
    },
    ...patch,
  };
}

function completeMatrix(): LiveInterruptionMatrixEvidence {
  return {
    reportPath: "docs/live-interruption-matrix.md",
    scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) => scenario(id)),
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
