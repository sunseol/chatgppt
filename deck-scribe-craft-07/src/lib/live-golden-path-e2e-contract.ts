import type { ProviderArtifactProvenance } from "./provider-provenance";

export const LIVE_GOLDEN_PATH_E2E_STEPS = [
  "login",
  "live_interview",
  "live_research",
  "live_deck_plan",
  "live_design_system",
  "live_layout_ir",
  "live_image_generation",
  "live_slide_regeneration",
  "title_edit",
  "export",
] as const;

export type LiveGoldenPathE2EStep = (typeof LIVE_GOLDEN_PATH_E2E_STEPS)[number];

export type LiveSourceRole = "official" | "primary" | "supporting";

export type LiveGoldenPathSource = {
  readonly url: string;
  readonly role: LiveSourceRole;
  readonly artifactId: string;
};

export type LiveE2EReportSignature = Readonly<Record<"signer" | "signedAt" | "digest", string>>;

type RestartReopenKey = "projectId" | "reopenedAt" | "exportArtifactId";
export type LiveRestartReopenEvidence = Readonly<Record<RestartReopenKey, string>>;

export type LiveFinalValidationBundle = {
  readonly path: string;
  readonly finalExportArtifactId: string;
  readonly reportDigest: string;
  readonly screenshotPaths: readonly string[];
  readonly recordingPath: string;
  readonly sourceArtifactIds: readonly string[];
  readonly imageArtifactIds: readonly string[];
};

export type LiveGoldenPathE2EBundle = {
  readonly projectId: string;
  readonly finalExportArtifactId: string;
  readonly completedSteps: readonly LiveGoldenPathE2EStep[];
  readonly reportPath: string;
  readonly reportContent: string;
  readonly reportSignature: LiveE2EReportSignature;
  readonly screenshots: readonly string[];
  readonly recordingPath: string;
  readonly finalValidationBundle: LiveFinalValidationBundle;
  readonly restartReopen: LiveRestartReopenEvidence;
  readonly sources: readonly LiveGoldenPathSource[];
  readonly lineage: readonly ProviderArtifactProvenance[];
  readonly imageArtifacts: readonly ProviderArtifactProvenance[];
};

export type LiveGoldenPathE2EIssueCode =
  | "missing_e2e_step"
  | "e2e_step_order_mismatch"
  | "unsigned_live_e2e_report"
  | "report_digest_mismatch"
  | "insufficient_step_evidence"
  | "missing_step_screenshot"
  | "missing_validation_bundle"
  | "validation_bundle_export_mismatch"
  | "validation_bundle_report_digest_mismatch"
  | "validation_bundle_missing_screenshot"
  | "validation_bundle_missing_recording"
  | "validation_bundle_missing_source"
  | "validation_bundle_missing_image_artifact"
  | "validation_bundle_duplicate_reference"
  | "mock_lineage_contamination"
  | "fixture_lineage_contamination"
  | "duplicate_live_source"
  | "insufficient_live_sources"
  | "missing_primary_source"
  | "duplicate_live_image_artifact"
  | "duplicate_live_image_request"
  | "insufficient_live_image_artifacts"
  | "missing_regenerated_live_image_artifact"
  | "missing_restart_reopen_evidence"
  | "secret_leak";

export type LiveGoldenPathE2EIssue = {
  readonly code: LiveGoldenPathE2EIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveGoldenPathE2EResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveGoldenPathE2EIssue[] };

export function liveGoldenPathIssue(
  code: LiveGoldenPathE2EIssueCode,
  message: string,
  refs: readonly string[],
): LiveGoldenPathE2EIssue {
  return { code, message, refs };
}
