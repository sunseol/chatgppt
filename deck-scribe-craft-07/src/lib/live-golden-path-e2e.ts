import { redactSensitiveText } from "./redaction";
import { countLiveImageArtifacts, countValidLiveSources } from "./live-golden-path-e2e-evidence";
import { liveGoldenPathIssues } from "./live-golden-path-e2e-validation";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  type LiveE2EReportSignature,
  type LiveFinalValidationBundle,
  type LiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EIssue,
  type LiveGoldenPathE2EIssueCode,
  type LiveGoldenPathE2EResult,
  type LiveGoldenPathE2EStep,
  type LiveGoldenPathSource,
  type LiveRestartReopenEvidence,
  type LiveSourceRole,
} from "./live-golden-path-e2e-contract";

export { LIVE_GOLDEN_PATH_E2E_STEPS };
export type {
  LiveE2EReportSignature,
  LiveFinalValidationBundle,
  LiveGoldenPathE2EBundle,
  LiveGoldenPathE2EIssue,
  LiveGoldenPathE2EIssueCode,
  LiveGoldenPathE2EResult,
  LiveGoldenPathE2EStep,
  LiveGoldenPathSource,
  LiveRestartReopenEvidence,
  LiveSourceRole,
};

export function evaluateLiveGoldenPathE2EBundle(
  bundle: LiveGoldenPathE2EBundle,
): LiveGoldenPathE2EResult {
  const issues = liveGoldenPathIssues(bundle);

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveGoldenPathE2ESummary(bundle: LiveGoldenPathE2EBundle): string {
  return [
    "# DF-241 Live Golden Path E2E",
    `Report: ${bundle.reportPath}`,
    `Validation bundle: ${bundle.finalValidationBundle.path || "missing"}`,
    `Screenshots: ${bundle.screenshots.length}`,
    `Recording: ${bundle.recordingPath || "missing"}`,
    `Sources: ${countValidLiveSources(bundle.sources)}`,
    `Live image artifacts: ${countLiveImageArtifacts(bundle.imageArtifacts)}`,
    "",
    redactSensitiveText(bundle.reportContent),
  ].join("\n");
}
