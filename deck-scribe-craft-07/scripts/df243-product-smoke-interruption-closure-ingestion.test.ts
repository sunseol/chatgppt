import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { produceDf243InterruptionClosureEvidence } from "./df243-interruption-closure-evidence-producer";
import { parseDf243InterruptionMatrixJson } from "./df243-interruption-closure-evidence-schema";
import {
  buildDf243InterruptionClosureInputFromProductSmokes,
  parseDf243CancelProductSmokeSummaryJson,
  parseDf243ResumeGateProductSmokeSummaryJson,
} from "./df243-product-smoke-interruption-closure-ingestion";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";
const CANCEL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/summary.json";
const RESUME_GATE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622/summary.json";
const MATRIX_CANDIDATE_PATH =
  "docs/live-evidence/release/df243-product-smoke-interruption-matrix-candidate-20260622.json";

describe("DF-243 product smoke interruption closure ingestion", () => {
  test("builds an honestly blocked closure candidate from real product smoke artifacts", () => {
    // Given
    const cancelSummary = parseDf243CancelProductSmokeSummaryJson(
      readFileSync(CANCEL_SUMMARY_PATH, "utf8"),
    );
    const resumeGateSummary = parseDf243ResumeGateProductSmokeSummaryJson(
      readFileSync(RESUME_GATE_SUMMARY_PATH, "utf8"),
    );

    // When
    const input = buildDf243InterruptionClosureInputFromProductSmokes({
      packageArchiveSha256: PACKAGE_SHA,
      matrixEvidencePath: MATRIX_CANDIDATE_PATH,
      cancelSummary,
      cancelMatrix: parseDf243InterruptionMatrixJson(
        readFileSync(cancelSummary.matrixPath, "utf8"),
      ),
      resumeGateSummary,
      resumeGateMatrix: parseDf243InterruptionMatrixJson(
        readFileSync(resumeGateSummary.matrixPath, "utf8"),
      ),
    });
    const evidence = produceDf243InterruptionClosureEvidence(input);

    // Then
    expect(input.matrixEvidencePath).toBe(MATRIX_CANDIDATE_PATH);
    expect(evidence.status).toBe("blocked");
    expect(evidence.closure.status).toBe("ready_for_close");
    expect(evidence.closure.requiredArtifacts).toEqual({
      imagePartialResumeEvidencePath: resumeGateSummary.imageResume.recoverySnapshotPath,
      appCancelSnapshotPath: cancelSummary.recoverySnapshotPath,
      cancelSignalEvidencePath: cancelSummary.cancelSignalEvidencePath,
      approvalGateEvidencePath: resumeGateSummary.interruptedGate.approvalGateEvidencePath,
      exportGateEvidencePath: resumeGateSummary.interruptedGate.exportGateEvidencePath,
    });
    expect(evidence.result).toEqual({
      kind: "blocked",
      issues: [
        {
          code: "interruption_closure_artifact_outside_evidence_bundle",
          message:
            "DF-243 closure artifacts must live under docs/live-evidence so packaged QA evidence is reviewable.",
          refs: [
            "imagePartialResumeEvidencePath",
            "appCancelSnapshotPath",
            "cancelSignalEvidencePath",
            "approvalGateEvidencePath",
            "exportGateEvidencePath",
          ],
        },
      ],
    });
  });
});
