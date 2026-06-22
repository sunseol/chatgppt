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
    const matrix = completeMatrix();

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes the interruption matrix for the release evidence report", () => {
    const matrix = completeMatrix();

    const summary = formatLiveInterruptionMatrixSummary(matrix);

    expect(summary.includes("DF-243 Live Interruption Matrix")).toBe(true);
    expect(summary.includes("text_turn_shutdown: failed")).toBe(true);
    expect(summary.includes("image_partial_resume: interrupted")).toBe(true);
    expect(summary.includes("docs/live-interruption-matrix.md")).toBe(true);
  });

  test("blocks unsafe restart, resume, cancellation, and artifact approval states", () => {
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

    const result = evaluateLiveInterruptionMatrix(matrix);

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

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "cancelled_job_completed_after_cancel",
    ]);
    expect(result.issues[0]?.refs).toEqual(["cancelled_job_output"]);
  });

  test("blocks cancellation records without persisted cancel signal evidence", () => {
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

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_cancel_signal_evidence"]);
  });

  test("blocks cancel signal evidence that belongs to another live job", () => {
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "cancel_job"
          ? scenario(id, {
              liveJobId: "live_job_cancel_job",
              cancellationRecorded: true,
              cancelSignalEvidencePath: "recovery/cancel-job-signal.json",
              cancelSignalJobId: "live_job_other",
            })
          : scenario(id),
      ),
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["cancel_signal_job_mismatch"]);
    expect(result.issues[0]?.refs).toEqual(["live_job_other"]);
  });

  test("blocks cancellation records that reuse the recovery snapshot path for cancel signal evidence", () => {
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "cancel_job"
          ? scenario(id, {
              recoverySnapshotPath: "recovery/cancel-job.json",
              cancelSignalEvidencePath: "recovery/cancel-job.json",
            })
          : scenario(id),
      ),
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_cancel_evidence_path"]);
    expect(result.issues[0]?.refs).toEqual(["recovery/cancel-job.json"]);
  });

  test("blocks synthetic interruption evidence without live job snapshots", () => {
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

    const result = evaluateLiveInterruptionMatrix(matrix);

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
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        scenario(id, {
          liveJobId: id === "fetch_shutdown" ? "test_fetch_job" : `fixture_job_${id}`,
          recoverySnapshotPath:
            id === "cancel_job" ? "recovery/fake-cancel.json" : `fixtures/${id}.json`,
        }),
      ),
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_live_job_evidence",
      "missing_recovery_snapshot",
    ]);
  });

  test("blocks interruption scenarios that reuse one live job id", () => {
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        scenario(id, {
          liveJobId: "live_job_reused_across_scenarios",
          ...(id === "cancel_job" ? { cancelSignalJobId: "live_job_reused_across_scenarios" } : {}),
        }),
      ),
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_interruption_live_job"]);
    expect(result.issues[0]?.refs).toEqual(["live_job_reused_across_scenarios"]);
  });

  test("blocks interrupted artifact gate evidence that did not exercise approval and export gates", () => {
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

    const result = evaluateLiveInterruptionMatrix(matrix);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_interrupted_approval_gate_evidence",
      "missing_interrupted_export_gate_evidence",
    ]);
  });

  test("blocks interrupted artifact gate checks without persisted evidence paths", () => {
    const matrix = completeMatrix({
      scenarios: LIVE_INTERRUPTION_SCENARIOS.map((id) =>
        id === "interrupted_artifact_gate"
          ? scenario(id, {
              approvalGateEvidencePath: "",
              exportGateEvidencePath: "",
            })
          : scenario(id),
      ),
    });

    const result = evaluateLiveInterruptionMatrix(matrix);

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
