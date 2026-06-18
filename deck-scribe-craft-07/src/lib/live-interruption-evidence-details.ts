import type {
  LiveInterruptionIssue,
  LiveInterruptionIssueCode,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export function scenarioEvidenceDetailIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const missingLiveJobs = scenarios
    .filter((scenario) => !scenario.liveJobId.trim() || scenario.liveJobId.startsWith("mock_"))
    .map((scenario) => scenario.id);
  const missingSnapshots = scenarios
    .filter((scenario) => !scenario.recoverySnapshotPath.endsWith(".json"))
    .map((scenario) => scenario.id);
  const missingCancelSignals = scenarios
    .filter((scenario) => scenario.id === "cancel_job" && !scenario.cancellationRecorded)
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
    ...(missingCancelSignals.length === 0
      ? []
      : [
          issue(
            "missing_cancel_signal_evidence",
            "Cancellation scenario requires persisted cancel signal evidence.",
            missingCancelSignals,
          ),
        ]),
  ];
}

function issue(
  code: LiveInterruptionIssueCode,
  message: string,
  refs: readonly string[],
): LiveInterruptionIssue {
  return { code, message, refs };
}
