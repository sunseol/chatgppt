import type {
  LiveInterruptionIssue,
  LiveInterruptionIssueCode,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";
import { hasObservedInterruptionEvidencePath } from "./live-interruption-evidence-path";
import { noncanonicalScenarioIdentityRefs } from "./live-interruption-evidence-identity";

export function scenarioEvidenceDetailIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const missingLiveJobs = scenarios
    .filter(
      (scenario) => !scenario.liveJobId.trim() || hasSyntheticEvidenceMarker(scenario.liveJobId),
    )
    .map((scenario) => scenario.id);
  const duplicateLiveJobs = duplicateLiveJobIds(scenarios);
  const duplicateSnapshots = duplicateRecoverySnapshotPaths(scenarios);
  const noncanonicalIdentities = scenarios.flatMap(noncanonicalScenarioIdentityRefs);
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
      (scenario) =>
        scenario.id === "interrupted_artifact_gate" &&
        (!scenario.approvalGateChecked ||
          !isPersistedJsonEvidencePath(scenario.approvalGateEvidencePath)),
    )
    .map((scenario) => scenario.id);
  const missingExportGateChecks = scenarios
    .filter(
      (scenario) =>
        scenario.id === "interrupted_artifact_gate" &&
        (!scenario.exportGateChecked ||
          !isPersistedJsonEvidencePath(scenario.exportGateEvidencePath)),
    )
    .map((scenario) => scenario.id);
  const duplicateInterruptedGateEvidence = scenarios
    .filter(
      (scenario) =>
        scenario.id === "interrupted_artifact_gate" &&
        isPersistedJsonEvidencePath(scenario.approvalGateEvidencePath) &&
        isPersistedJsonEvidencePath(scenario.exportGateEvidencePath) &&
        scenario.approvalGateEvidencePath?.trim() === scenario.exportGateEvidencePath?.trim(),
    )
    .map((scenario) => scenario.approvalGateEvidencePath?.trim() ?? "missing");

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
    ...(duplicateLiveJobs.length === 0
      ? []
      : [
          issue(
            "duplicate_interruption_live_job",
            "Each interruption scenario requires distinct live job evidence.",
            duplicateLiveJobs,
          ),
        ]),
    ...(duplicateSnapshots.length === 0
      ? []
      : [
          issue(
            "duplicate_recovery_snapshot",
            "Each interruption scenario requires distinct recovery snapshot evidence.",
            duplicateSnapshots,
          ),
        ]),
    ...(noncanonicalIdentities.length === 0
      ? []
      : [
          issue(
            "noncanonical_interruption_evidence_identity",
            "Interruption evidence ids and paths must be stored in canonical form.",
            noncanonicalIdentities,
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
    ...(duplicateInterruptedGateEvidence.length === 0
      ? []
      : [
          issue(
            "duplicate_interrupted_gate_evidence",
            "Interrupted artifact approval and export gates require distinct evidence paths.",
            duplicateInterruptedGateEvidence,
          ),
        ]),
  ];
}

function duplicateLiveJobIds(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly string[] {
  return duplicateValues(
    scenarios
      .map((scenario) => scenario.liveJobId.trim())
      .filter((liveJobId) => liveJobId.length > 0 && !hasSyntheticEvidenceMarker(liveJobId)),
  );
}

function duplicateRecoverySnapshotPaths(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly string[] {
  return duplicateValues(
    scenarios
      .map((scenario) => scenario.recoverySnapshotPath.trim())
      .filter((recoverySnapshotPath) => isPersistedJsonEvidencePath(recoverySnapshotPath)),
  );
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function isPersistedJsonEvidencePath(value: string | undefined): boolean {
  return hasObservedInterruptionEvidencePath(value);
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
