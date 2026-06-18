export type ReleaseReadinessTarget = "internal_dry_run" | "public_macos";

export type ReleaseReadinessStatus = "ready" | "blocked";

export type ReleaseReadinessBlockerCode =
  | "missing_tauri_manifest"
  | "missing_rust_manifest"
  | "missing_dry_run_package"
  | "missing_developer_id"
  | "missing_hardened_runtime"
  | "missing_notarization"
  | "missing_gatekeeper_validation"
  | "missing_license_review";

export type ReleaseReadinessEvidence = {
  readonly hasTauriManifest: boolean;
  readonly hasRustManifest: boolean;
  readonly dryRunPackageCreated: boolean;
  readonly developerIdCertificate: boolean;
  readonly hardenedRuntime: boolean;
  readonly notarized: boolean;
  readonly gatekeeperValidated: boolean;
  readonly licenseReviewUpdated: boolean;
};

export type ReleaseReadinessBlocker = {
  readonly code: ReleaseReadinessBlockerCode;
  readonly message: string;
};

export type ReleaseReadinessAssessment = {
  readonly target: ReleaseReadinessTarget;
  readonly status: ReleaseReadinessStatus;
  readonly blockers: readonly ReleaseReadinessBlocker[];
  readonly verificationCommands: readonly string[];
};

export function assessReleaseReadiness(
  evidence: ReleaseReadinessEvidence,
): readonly ReleaseReadinessAssessment[] {
  const assessments: readonly Omit<ReleaseReadinessAssessment, "status">[] = [
    {
      target: "internal_dry_run",
      blockers: internalDryRunBlockers(evidence),
      verificationCommands: ["bun run verify", "bun run package:dry-run"],
    },
    {
      target: "public_macos",
      blockers: publicMacosBlockers(evidence),
      verificationCommands: [
        "bun run quality",
        "bun run tauri:build",
        "codesign --verify --deep --strict --verbose=2 DeckForge.app",
        "spctl --assess --type execute --verbose=4 DeckForge.app",
      ],
    },
  ];
  return assessments.map(withStatus);
}

function internalDryRunBlockers(
  evidence: ReleaseReadinessEvidence,
): readonly ReleaseReadinessBlocker[] {
  return evidence.dryRunPackageCreated
    ? []
    : [{ code: "missing_dry_run_package", message: "Run bun run package:dry-run first." }];
}

function publicMacosBlockers(
  evidence: ReleaseReadinessEvidence,
): readonly ReleaseReadinessBlocker[] {
  return [
    evidence.hasTauriManifest
      ? undefined
      : blocker("missing_tauri_manifest", "Tauri v2 app manifest is required."),
    evidence.hasRustManifest
      ? undefined
      : blocker("missing_rust_manifest", "Rust desktop package manifest is required."),
    evidence.developerIdCertificate
      ? undefined
      : blocker("missing_developer_id", "Developer ID Application certificate is required."),
    evidence.hardenedRuntime
      ? undefined
      : blocker("missing_hardened_runtime", "Hardened runtime must be enabled."),
    evidence.notarized ? undefined : blocker("missing_notarization", "Notarization must pass."),
    evidence.gatekeeperValidated
      ? undefined
      : blocker("missing_gatekeeper_validation", "Gatekeeper validation must pass."),
    evidence.licenseReviewUpdated
      ? undefined
      : blocker("missing_license_review", "DF-156 license review must include Rust crates."),
  ].filter((value): value is ReleaseReadinessBlocker => value !== undefined);
}

function blocker(code: ReleaseReadinessBlockerCode, message: string): ReleaseReadinessBlocker {
  return { code, message };
}

function withStatus(
  assessment: Omit<ReleaseReadinessAssessment, "status">,
): ReleaseReadinessAssessment {
  return {
    ...assessment,
    status: assessment.blockers.length === 0 ? "ready" : "blocked",
  };
}
