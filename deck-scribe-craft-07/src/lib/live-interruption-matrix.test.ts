import { describe, expect, test } from "bun:test";
import {
  LIVE_INTERRUPTION_SCENARIOS,
  evaluateLiveInterruptionMatrix,
  formatLiveInterruptionMatrixSummary,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

describe("live interruption matrix", () => {
  test("passes when interrupted jobs recover safely and preserve completed artifacts", () => {
    // Given
    const matrix = completeMatrix();

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes the interruption matrix for the release evidence report", () => {
    // Given
    const matrix = completeMatrix();

    // When
    const summary = formatLiveInterruptionMatrixSummary(matrix);

    // Then
    expect(summary.includes("DF-243 Live Interruption Matrix")).toBe(true);
    expect(summary.includes("text_turn_shutdown: failed")).toBe(true);
    expect(summary.includes("image_partial_resume: interrupted")).toBe(true);
    expect(summary.includes("docs/live-interruption-matrix.md")).toBe(true);
  });

  test("blocks unsafe restart, resume, cancellation, and artifact approval states", () => {
    // Given
    const matrix = completeMatrix({
      reportPath: "",
      scenarios: [
        scenario("text_turn_shutdown", {
          jobStatusAfterRestart: "running",
          completedArtifactIdsBefore: ["brief_live_001"],
          completedArtifactIdsAfter: [],
        }),
        scenario("image_partial_resume", {
          pendingImageArtifactIds: ["img_003", "img_004"],
          resumedArtifactIds: ["img_002"],
        }),
        scenario("cancel_job", {
          jobStatusAfterRestart: "running",
          cancelledJobStillRunning: true,
        }),
        scenario("interrupted_artifact_gate", {
          interruptedArtifactIds: ["partial_plan"],
          approvableArtifactIds: ["partial_plan"],
          exportableArtifactIds: ["partial_plan"],
        }),
      ],
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_interruption_scenario",
      "unsafe_recovered_job_state",
      "completed_artifact_lost",
      "unsafe_partial_image_resume",
      "cancelled_job_still_running",
      "interrupted_artifact_approvable",
      "missing_interruption_report",
    ]);
  });

  test("blocks cancelled jobs that complete after cancellation", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "cancel_job"
          ? scenario(id, {
              jobStatusAfterRestart: "succeeded",
              cancelledJobStillRunning: false,
              completedArtifactIdsBefore: [],
              completedArtifactIdsAfter: ["cancelled_job_output"],
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
      "cancelled_job_completed_after_cancel",
    ]);
    expect(result.issues[0]?.refs).toEqual(["cancelled_job_output"]);
  });

  test("blocks cancellation records without persisted cancel signal evidence", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "cancel_job"
          ? scenario(id, {
              cancellationRecorded: true,
              cancelSignalEvidencePath: "",
            })
          : scenario(id),
      ),
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_cancel_signal_evidence"]);
  });

  test("blocks synthetic interruption evidence without live job snapshots", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        scenario(id, {
          liveJobId: id === "fetch_shutdown" ? "mock_fetch_job" : "",
          recoverySnapshotPath: "",
          recoverySnapshotScope: id === "cancel_job" ? "protocol_probe" : "transient",
          cancellationRecorded: id !== "cancel_job",
        }),
      ),
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_live_job_evidence",
      "missing_recovery_snapshot",
      "missing_app_cancel_snapshot",
      "missing_cancel_signal_evidence",
    ]);
  });

  test("blocks fixture and test interruption evidence masquerading as live jobs", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        scenario(id, {
          liveJobId: id === "fetch_shutdown" ? "test_fetch_job" : `fixture_job_${id}`,
          recoverySnapshotPath:
            id === "cancel_job" ? "recovery/fake-cancel.json" : `fixtures/${id}.json`,
        }),
      ),
    });

    // When
    const result = evaluateLiveInterruptionMatrix(matrix);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_live_job_evidence",
      "missing_recovery_snapshot",
    ]);
  });

  test("blocks interrupted artifact gate evidence that did not exercise approval and export gates", () => {
    // Given
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "interrupted_artifact_gate"
          ? scenario(id, {
              approvalGateChecked: false,
              exportGateChecked: false,
              approvableArtifactIds: [],
              exportableArtifactIds: [],
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
    pendingImageArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    resumedArtifactIds: id === "image_partial_resume" ? ["img_003", "img_004"] : [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: ["partial_plan"],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    exportGateChecked: true,
    ...patch,
  };
}
