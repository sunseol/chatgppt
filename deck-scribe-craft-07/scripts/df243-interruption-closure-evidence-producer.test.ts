import { describe, expect, test } from "bun:test";
import type {
  LiveInterruptionMatrixEvidence,
  LiveInterruptionScenarioEvidence,
} from "../src/lib/live-interruption-matrix";
import {
  parseDf243InterruptionClosureInput,
  produceDf243InterruptionClosureEvidence,
} from "./df243-interruption-closure-evidence-producer";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const CAPTURED_AT = "2026-06-22T03:45:00.000Z";

describe("DF-243 interruption closure evidence producer", () => {
  test("derives ready closure evidence from a complete packaged interruption matrix", () => {
    // Given
    const matrix = completeMatrix();

    // When
    const input = parseDf243InterruptionClosureInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
      matrixEvidencePath: "docs/live-evidence/packaged-df243-20260622/matrix.json",
      matrix,
    });
    const evidence = produceDf243InterruptionClosureEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df243-packaged-interruption-closure-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.result).toEqual({ kind: "ready" });
    expect(evidence.closure.status).toBe("ready_for_close");
    expect(evidence.closure.requiredArtifacts).toEqual({
      imagePartialResumeEvidencePath:
        "docs/live-evidence/packaged-df243-20260622/image-partial-resume.json",
      appCancelSnapshotPath: "docs/live-evidence/packaged-df243-20260622/cancel-job.json",
      cancelSignalEvidencePath: "docs/live-evidence/packaged-df243-20260622/cancel-signal.json",
      approvalGateEvidencePath:
        "docs/live-evidence/packaged-df243-20260622/interrupted-approval-gate.json",
      exportGateEvidencePath:
        "docs/live-evidence/packaged-df243-20260622/interrupted-export-gate.json",
    });
  });

  test("keeps incomplete packaged interruption evidence blocked", () => {
    // Given
    const matrix = {
      ...completeMatrix(),
      scenarios: completeMatrix().scenarios.filter((scenario) => scenario.id !== "cancel_job"),
    };

    // When
    const input = parseDf243InterruptionClosureInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
      matrixEvidencePath: "docs/live-evidence/packaged-df243-20260622/matrix.json",
      matrix,
    });
    const evidence = produceDf243InterruptionClosureEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.closure.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-243 interruption closure evidence is blocked");
    expect(evidence.result.kind).toBe("blocked");
  });

  test("rejects malformed packaged interruption closure input", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf243InterruptionClosureInput(malformedInput)).toThrow(
      "Invalid DF-243 interruption closure input",
    );
  });
});

function completeMatrix(): LiveInterruptionMatrixEvidence {
  return {
    reportPath: "docs/live-interruption-matrix.md",
    scenarios: [
      scenario("text_turn_shutdown", "failed", evidencePath("text-turn-shutdown")),
      scenario("fetch_shutdown", "failed", evidencePath("fetch-shutdown")),
      scenario("image_partial_resume", "interrupted", evidencePath("image-partial-resume"), {
        pendingImageArtifactIds: ["img_003", "img_004"],
        resumedArtifactIds: ["img_003", "img_004"],
      }),
      scenario("cancel_job", "cancelled", evidencePath("cancel-job"), {
        cancelSignalEvidencePath: evidencePath("cancel-signal"),
        cancelSignalJobId: "live_job_cancel_job",
      }),
      scenario(
        "interrupted_artifact_gate",
        "interrupted",
        evidencePath("interrupted-artifact-gate"),
        {
          approvalGateEvidencePath: evidencePath("interrupted-approval-gate"),
          exportGateEvidencePath: evidencePath("interrupted-export-gate"),
        },
      ),
    ],
  };
}

function scenario(
  id: LiveInterruptionScenarioEvidence["id"],
  jobStatusAfterRestart: LiveInterruptionScenarioEvidence["jobStatusAfterRestart"],
  recoverySnapshotPath: string,
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart,
    completedArtifactIdsBefore: ["brief_live_001", "img_001", "img_002"],
    completedArtifactIdsAfter: ["brief_live_001", "img_001", "img_002"],
    liveJobId: `live_job_${id}`,
    recoverySnapshotPath,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: id === "cancel_job",
    pendingImageArtifactIds: [],
    resumedArtifactIds: [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: id === "interrupted_artifact_gate" ? ["partial_plan"] : [],
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
  return `docs/live-evidence/packaged-df243-20260622/${name}.json`;
}
