import { hasObservedInterruptionEvidencePath } from "./live-interruption-evidence-path";
import {
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionIssue,
  type LiveInterruptionMatrixEvidence,
  type LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export type LiveInterruptionClosureStatus = "ready_for_close" | "blocked";

export type LiveInterruptionClosureRequiredArtifacts = {
  readonly imagePartialResumeEvidencePath: string;
  readonly appCancelSnapshotPath: string;
  readonly cancelSignalEvidencePath: string;
  readonly approvalGateEvidencePath: string;
  readonly exportGateEvidencePath: string;
};

export type LiveInterruptionClosureEvidence = {
  readonly issue: "#153";
  readonly ticket: "DF-243";
  readonly status: LiveInterruptionClosureStatus;
  readonly reportPath: string;
  readonly matrixEvidencePath: string;
  readonly matrix: LiveInterruptionMatrixEvidence;
  readonly requiredArtifacts: LiveInterruptionClosureRequiredArtifacts;
};

export type LiveInterruptionClosureIssueCode =
  | LiveInterruptionIssue["code"]
  | "interruption_closure_not_ready"
  | "missing_interruption_matrix_evidence"
  | "interruption_matrix_report_mismatch"
  | "missing_interruption_closure_artifact"
  | "interruption_closure_artifact_mismatch";

export type LiveInterruptionClosureIssue = {
  readonly code: LiveInterruptionClosureIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveInterruptionClosureEvidenceResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveInterruptionClosureIssue[] };

export function evaluateLiveInterruptionClosureEvidence(
  evidence: LiveInterruptionClosureEvidence,
): LiveInterruptionClosureEvidenceResult {
  const matrixResult = evaluateLiveInterruptionMatrix(evidence.matrix);
  const matrixIssues = matrixResult.kind === "ready" ? [] : matrixResult.issues;
  const issues = [
    ...matrixIssues,
    ...statusIssues(evidence),
    ...matrixEvidencePathIssues(evidence),
    ...reportPathIssues(evidence),
    ...requiredArtifactPathIssues(evidence.requiredArtifacts),
    ...requiredArtifactMatchIssues(evidence),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveInterruptionClosureEvidenceSummary(
  evidence: LiveInterruptionClosureEvidence,
): string {
  return [
    "# DF-243 Live Interruption Closure Evidence",
    `Issue: ${evidence.issue}`,
    `Status: ${evidence.status}`,
    `Report: ${evidence.reportPath}`,
    `Matrix: ${evidence.matrixEvidencePath}`,
  ].join("\n");
}

function statusIssues(
  evidence: LiveInterruptionClosureEvidence,
): readonly LiveInterruptionClosureIssue[] {
  return evidence.status === "ready_for_close"
    ? []
    : [
        issue(
          "interruption_closure_not_ready",
          "DF-243 closure evidence must be explicitly ready for close.",
          [evidence.status],
        ),
      ];
}

function matrixEvidencePathIssues(
  evidence: LiveInterruptionClosureEvidence,
): readonly LiveInterruptionClosureIssue[] {
  return hasObservedInterruptionEvidencePath(evidence.matrixEvidencePath)
    ? []
    : [
        issue(
          "missing_interruption_matrix_evidence",
          "DF-243 closure evidence requires a persisted matrix JSON bundle.",
          [evidence.matrixEvidencePath || "missing"],
        ),
      ];
}

function reportPathIssues(
  evidence: LiveInterruptionClosureEvidence,
): readonly LiveInterruptionClosureIssue[] {
  return evidence.reportPath === evidence.matrix.reportPath
    ? []
    : [
        issue(
          "interruption_matrix_report_mismatch",
          "Closure manifest report path must match the evaluated matrix report path.",
          [evidence.reportPath, evidence.matrix.reportPath],
        ),
      ];
}

function requiredArtifactPathIssues(
  artifacts: LiveInterruptionClosureRequiredArtifacts,
): readonly LiveInterruptionClosureIssue[] {
  const missing = requiredArtifactEntries(artifacts)
    .filter((entry) => !hasObservedInterruptionEvidencePath(entry.value))
    .map((entry) => entry.label);
  return missing.length === 0
    ? []
    : [
        issue(
          "missing_interruption_closure_artifact",
          "DF-243 closure manifest must point at every required live artifact.",
          missing,
        ),
      ];
}

function requiredArtifactMatchIssues(
  evidence: LiveInterruptionClosureEvidence,
): readonly LiveInterruptionClosureIssue[] {
  const imageResume = scenario(evidence.matrix, "image_partial_resume");
  const cancel = scenario(evidence.matrix, "cancel_job");
  const gate = scenario(evidence.matrix, "interrupted_artifact_gate");
  const expected = [
    pair(
      "imagePartialResumeEvidencePath",
      evidence.requiredArtifacts.imagePartialResumeEvidencePath,
      imageResume?.recoverySnapshotPath,
    ),
    pair(
      "appCancelSnapshotPath",
      evidence.requiredArtifacts.appCancelSnapshotPath,
      cancel?.recoverySnapshotPath,
    ),
    pair(
      "cancelSignalEvidencePath",
      evidence.requiredArtifacts.cancelSignalEvidencePath,
      cancel?.cancelSignalEvidencePath,
    ),
    pair(
      "approvalGateEvidencePath",
      evidence.requiredArtifacts.approvalGateEvidencePath,
      gate?.approvalGateEvidencePath,
    ),
    pair(
      "exportGateEvidencePath",
      evidence.requiredArtifacts.exportGateEvidencePath,
      gate?.exportGateEvidencePath,
    ),
  ];
  const mismatches = expected
    .filter((entry) => entry.actual !== entry.expected)
    .map((entry) => entry.label);
  return mismatches.length === 0
    ? []
    : [
        issue(
          "interruption_closure_artifact_mismatch",
          "DF-243 closure artifact paths must match the evaluated scenario evidence.",
          mismatches,
        ),
      ];
}

function requiredArtifactEntries(
  artifacts: LiveInterruptionClosureRequiredArtifacts,
): readonly { readonly label: string; readonly value: string }[] {
  return [
    { label: "imagePartialResumeEvidencePath", value: artifacts.imagePartialResumeEvidencePath },
    { label: "appCancelSnapshotPath", value: artifacts.appCancelSnapshotPath },
    { label: "cancelSignalEvidencePath", value: artifacts.cancelSignalEvidencePath },
    { label: "approvalGateEvidencePath", value: artifacts.approvalGateEvidencePath },
    { label: "exportGateEvidencePath", value: artifacts.exportGateEvidencePath },
  ];
}

function scenario(
  matrix: LiveInterruptionMatrixEvidence,
  id: LiveInterruptionScenarioEvidence["id"],
): LiveInterruptionScenarioEvidence | undefined {
  return matrix.scenarios.find((item) => item.id === id);
}

function pair(
  label: string,
  actual: string,
  expected: string | undefined,
): {
  readonly label: string;
  readonly actual: string;
  readonly expected: string;
} {
  return { label, actual, expected: expected ?? "missing" };
}

function issue(
  code: LiveInterruptionClosureIssueCode,
  message: string,
  refs: readonly string[],
): LiveInterruptionClosureIssue {
  return { code, message, refs };
}
