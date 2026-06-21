import {
  liveGoldenPathIssue,
  type LiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EIssue,
} from "./live-golden-path-e2e-contract";

export function restartIssues(bundle: LiveGoldenPathE2EBundle): readonly LiveGoldenPathE2EIssue[] {
  const reopenedAt = bundle.restartReopen.reopenedAt.trim();
  const reopenedTimestamp = Date.parse(reopenedAt);
  const signedAt = bundle.reportSignature.signedAt.trim();
  const signedTimestamp = Date.parse(signedAt);
  const signatureTimestampReady = signedAt.length > 0 && Number.isFinite(signedTimestamp);
  const restartReady =
    bundle.restartReopen.projectId === bundle.projectId &&
    reopenedAt.length > 0 &&
    Number.isFinite(reopenedTimestamp) &&
    (!signatureTimestampReady || reopenedTimestamp >= signedTimestamp) &&
    bundle.restartReopen.exportArtifactId === bundle.finalExportArtifactId;
  return restartReady
    ? []
    : [
        liveGoldenPathIssue(
          "missing_restart_reopen_evidence",
          "Project must reopen after restart with a timestamp and the same final export artifact.",
          [bundle.restartReopen.projectId, bundle.restartReopen.exportArtifactId],
        ),
      ];
}
