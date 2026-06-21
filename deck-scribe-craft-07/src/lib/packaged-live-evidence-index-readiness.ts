import type {
  PackagedLiveEvidenceEntry,
  PackagedLiveEvidenceIndexIssue,
  PackagedLiveEvidenceIndexIssueCode,
} from "./packaged-live-evidence-index-contract";

export function packagedLiveEvidenceReadinessIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  return [...blockedEntryIssues(entries), ...releaseDependencyIssues(entries)];
}

function blockedEntryIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  const blocked = entries
    .filter((entry) => entry.status !== "ready" || entry.validationKind !== "ready")
    .map((entry) => entry.ticketId);
  return blocked.length === 0
    ? []
    : [
        issue(
          "packaged_live_ticket_blocked",
          "Packaged Live evidence index cannot be ready while any ticket entry is blocked.",
          blocked,
        ),
      ];
}

function releaseDependencyIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  const releaseEntry = entries.find((entry) => entry.ticketId === "DF-247");
  if (releaseEntry?.status !== "ready") return [];
  const blockedUpstream = entries
    .filter((entry) => entry.ticketId !== "DF-247")
    .filter((entry) => entry.status !== "ready" || entry.validationKind !== "ready")
    .map((entry) => entry.ticketId);
  return blockedUpstream.length === 0
    ? []
    : [
        issue(
          "packaged_live_release_ready_before_upstream",
          "DF-247 release evidence cannot be ready while upstream packaged evidence is blocked.",
          blockedUpstream,
        ),
      ];
}

function issue(
  code: PackagedLiveEvidenceIndexIssueCode,
  message: string,
  refs: readonly string[],
): PackagedLiveEvidenceIndexIssue {
  return { code, message, refs };
}
