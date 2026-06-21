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
        appCancelSnapshotPath: evidencePath("cancel_job"),
        cancelSignalEvidencePath: evidencePath("cancel-job-signal"),
        approvalGateEvidencePath: evidencePath("interrupted-approval-gate"),
        exportGateEvidencePath: evidencePath("interrupted-export-gate"),
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
        imagePartialResumeEvidencePath: evidencePath("image_partial_resume"),
        appCancelSnapshotPath: evidencePath("cancel_job"),
        cancelSignalEvidencePath: evidencePath("other-cancel-signal"),
        approvalGateEvidencePath: evidencePath("interrupted-approval-gate"),
        exportGateEvidencePath: evidencePath("interrupted-export-gate"),
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

  test("blocks closure manifests that use generic recovery paths outside the evidence bundle", () => {
    // Given
    const evidence = closureEvidence({
      matrix: completeMatrix({
        scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
          scenario(id, {
            recoverySnapshotPath: `recovery/${id}.json`,
            ...(id === "cancel_job"
              ? { cancelSignalEvidencePath: "recovery/cancel-job-signal.json" }
              : {}),
            approvalGateEvidencePath: "recovery/interrupted-approval-gate.json",
            exportGateEvidencePath: "recovery/interrupted-export-gate.json",
          }),
        ),
      }),
      requiredArtifacts: {
        imagePartialResumeEvidencePath: "recovery/image_partial_resume.json",
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
      "interruption_closure_artifact_outside_evidence_bundle",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "imagePartialResumeEvidencePath",
      "appCancelSnapshotPath",
      "cancelSignalEvidencePath",
      "approvalGateEvidencePath",
      "exportGateEvidencePath",
    ]);
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
      imagePartialResumeEvidencePath: evidencePath("image_partial_resume"),
      appCancelSnapshotPath: evidencePath("cancel_job"),
      cancelSignalEvidencePath: evidencePath("cancel-job-signal"),
      approvalGateEvidencePath: evidencePath("interrupted-approval-gate"),
      exportGateEvidencePath: evidencePath("interrupted-export-gate"),
    },
    ...patch,
  };
}

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
    recoverySnapshotPath: evidencePath(id),
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    ...(id === "cancel_job" ? { cancelSignalEvidencePath: evidencePath("cancel-job-signal") } : {}),
    ...(id === "cancel_job" ? { cancelSignalJobId: "live_job_cancel_job" } : {}),
    pendingImageArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    resumedArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: ["partial_plan"],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    approvalGateEvidencePath: evidencePath("interrupted-approval-gate"),
    exportGateChecked: true,
    exportGateEvidencePath: evidencePath("interrupted-export-gate"),
    ...patch,
  };
}

function evidencePath(name: string): string {
  return `docs/live-evidence/lane-h-20260621/${name}.json`;
}
