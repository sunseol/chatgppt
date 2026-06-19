import { scenarioEvidenceDetailIssues } from "./live-interruption-evidence-details";
import { partialImageResumeIssues } from "./live-interruption-image-resume";
import { interruptionReportPathIssues } from "./live-interruption-report-path";

export const LIVE_INTERRUPTION_SCENARIOS = [
  "text_turn_shutdown",
  "fetch_shutdown",
  "image_partial_resume",
  "cancel_job",
  "interrupted_artifact_gate",
] as const;
const LIVE_RECOVERED_JOB_STATES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "interrupted",
] as const;

export type LiveInterruptionScenarioId = (typeof LIVE_INTERRUPTION_SCENARIOS)[number];
export type LiveRecoveredJobState = (typeof LIVE_RECOVERED_JOB_STATES)[number];
export type LiveRecoverySnapshotScope = "app_storage" | "protocol_probe" | "transient";

export type LiveInterruptionScenarioEvidence = {
  readonly id: LiveInterruptionScenarioId;
  readonly jobStatusAfterRestart: LiveRecoveredJobState;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly liveJobId: string;
  readonly recoverySnapshotPath: string;
  readonly recoverySnapshotScope: LiveRecoverySnapshotScope;
  readonly cancellationRecorded: boolean;
  readonly cancelSignalEvidencePath?: string;
  readonly cancelSignalJobId?: string;
  readonly pendingImageArtifactIds: readonly string[];
  readonly resumedArtifactIds: readonly string[];
  readonly cancelledJobStillRunning: boolean;
  readonly interruptedArtifactIds: readonly string[];
  readonly approvableArtifactIds: readonly string[];
  readonly exportableArtifactIds: readonly string[];
  readonly approvalGateChecked: boolean;
  readonly approvalGateEvidencePath?: string;
  readonly exportGateChecked: boolean;
  readonly exportGateEvidencePath?: string;
};

export type LiveInterruptionMatrixEvidence = {
  readonly reportPath: string;
  readonly scenarios: readonly LiveInterruptionScenarioEvidence[];
};

export type LiveInterruptionIssueCode =
  | "missing_interruption_scenario"
  | "missing_live_job_evidence"
  | "duplicate_interruption_live_job"
  | "duplicate_recovery_snapshot"
  | "invalid_recovered_job_state"
  | "missing_recovery_snapshot"
  | "missing_app_cancel_snapshot"
  | "missing_cancel_signal_evidence"
  | "cancel_signal_job_mismatch"
  | "unsafe_recovered_job_state"
  | "completed_artifact_lost"
  | "unsafe_partial_image_resume"
  | "cancelled_job_still_running"
  | "cancelled_job_completed_after_cancel"
  | "missing_interrupted_approval_gate_evidence"
  | "missing_interrupted_export_gate_evidence"
  | "duplicate_interrupted_gate_evidence"
  | "interrupted_artifact_approvable"
  | "missing_interruption_report";

export type LiveInterruptionIssue = {
  readonly code: LiveInterruptionIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveInterruptionMatrixResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveInterruptionIssue[] };

export function evaluateLiveInterruptionMatrix(
  matrix: LiveInterruptionMatrixEvidence,
): LiveInterruptionMatrixResult {
  const issues = [
    ...missingScenarioIssues(matrix.scenarios),
    ...scenarioEvidenceDetailIssues(matrix.scenarios),
    ...invalidRecoveredStateIssues(matrix.scenarios),
    ...unsafeRecoveredStateIssues(matrix.scenarios),
    ...completedArtifactLossIssues(matrix.scenarios),
    ...partialImageResumeIssues(matrix.scenarios),
    ...cancelledJobIssues(matrix.scenarios),
    ...interruptedArtifactGateIssues(matrix.scenarios),
    ...interruptionReportPathIssues(matrix.reportPath),
  ];

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveInterruptionMatrixSummary(
  matrix: LiveInterruptionMatrixEvidence,
): string {
  return [
    "# DF-243 Live Interruption Matrix",
    `Report: ${matrix.reportPath || "missing"}`,
    ...matrix.scenarios.map((scenario) => `${scenario.id}: ${scenario.jobStatusAfterRestart}`),
  ].join("\n");
}

function missingScenarioIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const present = new Set(scenarios.map((scenario) => scenario.id));
  const missing = LIVE_INTERRUPTION_SCENARIOS.filter((id) => !present.has(id));
  return missing.length === 0
    ? []
    : [issue("missing_interruption_scenario", "Live interruption matrix is incomplete.", missing)];
}

function invalidRecoveredStateIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const validStates = new Set<string>(LIVE_RECOVERED_JOB_STATES);
  const invalid = scenarios
    .filter((scenario) => !validStates.has(scenario.jobStatusAfterRestart))
    .map((scenario) => `${scenario.id}:${scenario.jobStatusAfterRestart}`);
  return invalid.length === 0
    ? []
    : [
        issue(
          "invalid_recovered_job_state",
          "Recovered job state must match the DF-243 taxonomy.",
          invalid,
        ),
      ];
}

function unsafeRecoveredStateIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const unsafe = scenarios
    .filter(
      (scenario) =>
        (scenario.id === "text_turn_shutdown" || scenario.id === "fetch_shutdown") &&
        !isSafeInterruptedState(scenario.jobStatusAfterRestart),
    )
    .map((scenario) => scenario.id);
  return unsafe.length === 0
    ? []
    : [
        issue(
          "unsafe_recovered_job_state",
          "Interrupted text or fetch jobs must recover as interrupted, failed, or cancelled.",
          unsafe,
        ),
      ];
}

function completedArtifactLossIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const lost = scenarios.flatMap((scenario) =>
    scenario.completedArtifactIdsBefore.filter(
      (artifactId) => !scenario.completedArtifactIdsAfter.includes(artifactId),
    ),
  );
  return lost.length === 0
    ? []
    : [
        issue(
          "completed_artifact_lost",
          "Completed artifacts must survive restart recovery.",
          lost,
        ),
      ];
}

function cancelledJobIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const cancelScenario = scenarios.find((scenario) => scenario.id === "cancel_job");
  if (!cancelScenario) return [];
  return [
    ...(cancelScenario.cancelledJobStillRunning ||
    cancelScenario.jobStatusAfterRestart === "running"
      ? [
          issue("cancelled_job_still_running", "Cancelled jobs must not keep running.", [
            cancelScenario.id,
          ]),
        ]
      : []),
    ...(cancelScenario.jobStatusAfterRestart === "succeeded" ||
    cancelScenario.completedArtifactIdsAfter.some(
      (artifactId) => !cancelScenario.completedArtifactIdsBefore.includes(artifactId),
    )
      ? [
          issue(
            "cancelled_job_completed_after_cancel",
            "Cancelled jobs must not complete new artifacts after cancellation.",
            cancelScenario.completedArtifactIdsAfter.filter(
              (artifactId) => !cancelScenario.completedArtifactIdsBefore.includes(artifactId),
            ),
          ),
        ]
      : []),
  ];
}

function interruptedArtifactGateIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const refs = scenarios.flatMap((scenario) =>
    scenario.interruptedArtifactIds.filter(
      (artifactId) =>
        scenario.approvableArtifactIds.includes(artifactId) ||
        scenario.exportableArtifactIds.includes(artifactId),
    ),
  );
  return refs.length === 0
    ? []
    : [
        issue(
          "interrupted_artifact_approvable",
          "Interrupted artifacts cannot be approved or exported.",
          refs,
        ),
      ];
}

function isSafeInterruptedState(state: LiveRecoveredJobState): boolean {
  return state === "interrupted" || state === "failed" || state === "cancelled";
}

function issue(
  code: LiveInterruptionIssueCode,
  message: string,
  refs: readonly string[],
): LiveInterruptionIssue {
  return { code, message, refs };
}
