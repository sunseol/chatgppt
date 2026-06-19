import type {
  LiveInterruptionIssue,
  LiveInterruptionIssueCode,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export function scenarioEvidenceDetailIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const missingLiveJobs = scenarios
    .filter(
      (scenario) => !scenario.liveJobId.trim() || hasSyntheticEvidenceMarker(scenario.liveJobId),
    )
    .map((scenario) => scenario.id);
  const missingSnapshots = scenarios
    .filter((scenario) => !isPersistedJsonEvidencePath(scenario.recoverySnapshotPath))
    .map((scenario) => scenario.id);
  const missingAppCancelSnapshots = scenarios
    .filter(
      (scenario) =>
        scenario.id === "cancel_job" && scenario.recoverySnapshotScope !== "app_storage",
    )
    .map((scenario) => scenario.id);
  const missingCancelSignals = scenarios
    .filter(
      (scenario) =>
        scenario.id === "cancel_job" &&
        (!scenario.cancellationRecorded ||
          !isPersistedJsonEvidencePath(scenario.cancelSignalEvidencePath)),
    )
    .map((scenario) => scenario.id);
  const cancelSignalJobMismatches = scenarios
    .filter(
      (scenario) =>
        scenario.id === "cancel_job" &&
        scenario.liveJobId.trim().length > 0 &&
        !hasSyntheticEvidenceMarker(scenario.liveJobId) &&
        scenario.cancellationRecorded &&
        isPersistedJsonEvidencePath(scenario.cancelSignalEvidencePath) &&
        scenario.cancelSignalJobId !== scenario.liveJobId,
    )
    .map((scenario) => scenario.cancelSignalJobId ?? "missing");
  const missingApprovalGateChecks = scenarios
    .filter(
      (scenario) => scenario.id === "interrupted_artifact_gate" && !scenario.approvalGateChecked,
    )
    .map((scenario) => scenario.id);
  const missingExportGateChecks = scenarios
    .filter(
      (scenario) => scenario.id === "interrupted_artifact_gate" && !scenario.exportGateChecked,
    )
    .map((scenario) => scenario.id);

  return [
    ...(missingLiveJobs.length === 0
      ? []
      : [
          issue(
            "missing_live_job_evidence",
            "Each interruption scenario requires a non-mock live job id.",
            missingLiveJobs,
          ),
        ]),
    ...(missingSnapshots.length === 0
      ? []
      : [
          issue(
            "missing_recovery_snapshot",
            "Each interruption scenario requires a persisted recovery snapshot.",
            missingSnapshots,
          ),
        ]),
    ...(missingAppCancelSnapshots.length === 0
      ? []
      : [
          issue(
            "missing_app_cancel_snapshot",
            "Cancellation scenario requires an app-storage recovery snapshot.",
            missingAppCancelSnapshots,
          ),
        ]),
    ...(missingCancelSignals.length === 0
      ? []
      : [
          issue(
            "missing_cancel_signal_evidence",
            "Cancellation scenario requires persisted cancel signal evidence.",
            missingCancelSignals,
          ),
        ]),
    ...(cancelSignalJobMismatches.length === 0
      ? []
      : [
          issue(
            "cancel_signal_job_mismatch",
            "Cancellation signal evidence must target the same live job id.",
            cancelSignalJobMismatches,
          ),
        ]),
    ...(missingApprovalGateChecks.length === 0
      ? []
      : [
          issue(
            "missing_interrupted_approval_gate_evidence",
            "Interrupted artifact scenario must exercise the approval gate.",
            missingApprovalGateChecks,
          ),
        ]),
    ...(missingExportGateChecks.length === 0
      ? []
      : [
          issue(
            "missing_interrupted_export_gate_evidence",
            "Interrupted artifact scenario must exercise the export gate.",
            missingExportGateChecks,
          ),
        ]),
  ];
}

function isPersistedJsonEvidencePath(value: string | undefined): boolean {
  return value !== undefined && value.endsWith(".json") && !hasSyntheticEvidenceMarker(value);
}

function hasSyntheticEvidenceMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return ["mock", "fixture", "test", "fake"].some((marker) => normalized.includes(marker));
}

function issue(
  code: LiveInterruptionIssueCode,
  message: string,
  refs: readonly string[],
): LiveInterruptionIssue {
  return { code, message, refs };
}
