import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";
import {
  PACKAGED_LIVE_EVIDENCE_ISSUE_NUMBERS,
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  type PackagedLiveEvidenceEntry,
  type PackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceIndexIssue,
  type PackagedLiveEvidenceIndexIssueCode,
  type PackagedLiveEvidenceIndexResult,
  type PackagedLiveEvidenceTicketId,
} from "./packaged-live-evidence-index-contract";

export * from "./packaged-live-evidence-index-contract";

export function evaluatePackagedLiveEvidenceIndex(
  index: PackagedLiveEvidenceIndex,
): PackagedLiveEvidenceIndexResult {
  const issues = [
    ...indexIdentityIssues(index),
    ...ticketCoverageIssues(index.entries),
    ...entryIssues(index.entries),
    ...releaseDependencyIssues(index.entries),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatPackagedLiveEvidenceIndexSummary(index: PackagedLiveEvidenceIndex): string {
  const readyCount = index.entries.filter(
    (entry) => entry.status === "ready" && entry.validationKind === "ready",
  ).length;
  return [
    "# Packaged Live Evidence Index",
    `Index: ${index.path || "missing"}`,
    `Package hash: ${index.packageArchiveSha256 || "missing"}`,
    `Generated at: ${index.generatedAt || "missing"}`,
    `Ready tickets: ${readyCount} of ${PACKAGED_LIVE_EVIDENCE_TICKET_IDS.length}`,
    ...PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) => {
      const entry = index.entries.find((item) => item.ticketId === ticketId);
      return `${ticketId}: ${entry?.status ?? "missing"}`;
    }),
  ].join("\n");
}

function indexIdentityIssues(
  index: PackagedLiveEvidenceIndex,
): readonly PackagedLiveEvidenceIndexIssue[] {
  return [
    ...(isLiveEvidenceJsonPath(index.path) &&
    index.path.endsWith("/packaged-live-evidence-index.json")
      ? []
      : [
          issue(
            "missing_packaged_live_index_path",
            "Packaged Live evidence index must be persisted as committed JSON evidence.",
            [index.path || "missing"],
          ),
        ]),
    ...(isSha256(index.packageArchiveSha256)
      ? []
      : [
          issue(
            "missing_packaged_live_package_hash",
            "Packaged Live evidence index must name the package archive SHA-256 digest.",
            [index.packageArchiveSha256 || "missing"],
          ),
        ]),
    ...(Number.isNaN(Date.parse(index.generatedAt))
      ? [
          issue(
            "invalid_packaged_live_generated_at",
            "Packaged Live evidence index generatedAt must be a parseable timestamp.",
            [index.generatedAt || "missing"],
          ),
        ]
      : []),
  ];
}

function ticketCoverageIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  const present = new Set(entries.map((entry) => entry.ticketId));
  const missing = PACKAGED_LIVE_EVIDENCE_TICKET_IDS.filter((ticketId) => !present.has(ticketId));
  const duplicate = duplicateTickets(entries);
  return [
    ...(missing.length === 0
      ? []
      : [
          issue(
            "missing_packaged_live_ticket",
            "Packaged Live evidence index must include every release evidence ticket.",
            missing,
          ),
        ]),
    ...(duplicate.length === 0
      ? []
      : [
          issue(
            "duplicate_packaged_live_ticket",
            "Packaged Live evidence index must include each ticket only once.",
            duplicate,
          ),
        ]),
  ];
}

function entryIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  return [
    ...entries.flatMap(issueNumberIssues),
    ...entries.flatMap(artifactPathIssues),
    ...duplicatePathIssues(entries),
    ...entries.flatMap(artifactHashIssues),
    ...entries.flatMap(readyValidationIssues),
  ];
}

function issueNumberIssues(
  entry: PackagedLiveEvidenceEntry,
): readonly PackagedLiveEvidenceIndexIssue[] {
  return entry.issueNumber === PACKAGED_LIVE_EVIDENCE_ISSUE_NUMBERS[entry.ticketId]
    ? []
    : [
        issue(
          "packaged_live_ticket_issue_mismatch",
          "Packaged Live evidence entry must cite the GitHub issue that owns the ticket.",
          [`${entry.ticketId}:#${entry.issueNumber}`],
        ),
      ];
}

function artifactPathIssues(
  entry: PackagedLiveEvidenceEntry,
): readonly PackagedLiveEvidenceIndexIssue[] {
  const trimmed = entry.artifactPath.trim();
  return [
    ...(isLiveEvidenceJsonPath(entry.artifactPath)
      ? []
      : [
          issue(
            "invalid_packaged_live_artifact_path",
            "Packaged Live evidence entries must point at committed non-synthetic JSON evidence.",
            [entry.artifactPath || "missing"],
          ),
        ]),
    ...(trimmed === entry.artifactPath
      ? []
      : [
          issue(
            "noncanonical_packaged_live_artifact_path",
            "Packaged Live evidence artifact paths must not rely on boundary whitespace.",
            [entry.ticketId],
          ),
        ]),
    ...(artifactPathNamesTicket(trimmed, entry.ticketId)
      ? []
      : [
          issue(
            "packaged_live_ticket_path_mismatch",
            "Packaged Live evidence artifact path must name the ticket it proves.",
            [entry.ticketId, trimmed || "missing"],
          ),
        ]),
  ];
}

function artifactPathNamesTicket(path: string, ticketId: PackagedLiveEvidenceTicketId): boolean {
  const normalizedPath = path.toLowerCase();
  const dashed = ticketId.toLowerCase();
  const compact = dashed.replace("-", "");
  return normalizedPath.includes(dashed) || normalizedPath.includes(compact);
}

function artifactHashIssues(
  entry: PackagedLiveEvidenceEntry,
): readonly PackagedLiveEvidenceIndexIssue[] {
  return isSha256(entry.artifactSha256)
    ? []
    : [
        issue(
          "invalid_packaged_live_artifact_hash",
          "Packaged Live evidence entries must carry a SHA-256 digest for review.",
          [entry.ticketId],
        ),
      ];
}

function readyValidationIssues(
  entry: PackagedLiveEvidenceEntry,
): readonly PackagedLiveEvidenceIndexIssue[] {
  return entry.status === "ready" && entry.validationKind !== "ready"
    ? [
        issue(
          "packaged_live_ready_validation_blocked",
          "Packaged Live evidence entry cannot be ready while its validator is blocked.",
          [entry.ticketId],
        ),
      ]
    : [];
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

function duplicateTickets(entries: readonly PackagedLiveEvidenceEntry[]): readonly string[] {
  return duplicateValues(entries.map((entry) => entry.ticketId));
}

function duplicatePathIssues(
  entries: readonly PackagedLiveEvidenceEntry[],
): readonly PackagedLiveEvidenceIndexIssue[] {
  const duplicates = duplicateValues(entries.map((entry) => entry.artifactPath.trim()));
  return duplicates.length === 0
    ? []
    : [
        issue(
          "duplicate_packaged_live_artifact_path",
          "Packaged Live evidence entries must not share one artifact path.",
          duplicates,
        ),
      ];
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter((entry) => entry[1] > 1).map((entry) => entry[0]);
}

function isLiveEvidenceJsonPath(value: string): boolean {
  return hasNonSyntheticJsonEvidencePath(value) && value.trim().startsWith("docs/live-evidence/");
}

const isSha256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);

function issue(
  code: PackagedLiveEvidenceIndexIssueCode,
  message: string,
  refs: readonly string[],
): PackagedLiveEvidenceIndexIssue {
  return { code, message, refs };
}
