export const PACKAGED_LIVE_EVIDENCE_TICKET_IDS = [
  "DF-205",
  "DF-233",
  "DF-235",
  "DF-241",
  "DF-242",
  "DF-243",
  "DF-244",
  "DF-245",
  "DF-246",
  "DF-247",
] as const;

export type PackagedLiveEvidenceTicketId = (typeof PACKAGED_LIVE_EVIDENCE_TICKET_IDS)[number];

export type PackagedLiveEvidenceEntryStatus = "ready" | "blocked";

export type PackagedLiveEvidenceEntry = {
  readonly ticketId: PackagedLiveEvidenceTicketId;
  readonly issueNumber: number;
  readonly status: PackagedLiveEvidenceEntryStatus;
  readonly validationKind: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly artifactPath: string;
  readonly artifactSha256: string;
};

export type PackagedLiveEvidenceIndex = {
  readonly path: string;
  readonly packageArchiveSha256: string;
  readonly generatedAt: string;
  readonly entries: readonly PackagedLiveEvidenceEntry[];
};

export type PackagedLiveEvidenceIndexIssueCode =
  | "missing_packaged_live_index_path"
  | "missing_packaged_live_package_hash"
  | "invalid_packaged_live_generated_at"
  | "missing_packaged_live_ticket"
  | "duplicate_packaged_live_ticket"
  | "packaged_live_ticket_issue_mismatch"
  | "invalid_packaged_live_artifact_path"
  | "noncanonical_packaged_live_artifact_path"
  | "packaged_live_ticket_path_mismatch"
  | "duplicate_packaged_live_artifact_path"
  | "packaged_live_artifact_package_mismatch"
  | "invalid_packaged_live_artifact_hash"
  | "packaged_live_ready_validation_blocked"
  | "packaged_live_ticket_blocked"
  | "packaged_live_release_ready_before_upstream";

export type PackagedLiveEvidenceIndexIssue = {
  readonly code: PackagedLiveEvidenceIndexIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type PackagedLiveEvidenceIndexResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly PackagedLiveEvidenceIndexIssue[] };

export const PACKAGED_LIVE_EVIDENCE_ISSUE_NUMBERS = {
  "DF-205": 131,
  "DF-233": 147,
  "DF-235": 149,
  "DF-241": 151,
  "DF-242": 152,
  "DF-243": 153,
  "DF-244": 154,
  "DF-245": 155,
  "DF-246": 156,
  "DF-247": 157,
} satisfies Record<PackagedLiveEvidenceTicketId, number>;
