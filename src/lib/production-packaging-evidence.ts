export const CLEAN_MACHINE_STEPS = [
  "install_app",
  "codex_login",
  "image_credentials",
  "project_launch",
  "live_interview",
] as const;

export type CleanMachineStep = (typeof CLEAN_MACHINE_STEPS)[number];

export type PackageContentScan = {
  readonly mockResourceHits: readonly string[];
  readonly fixtureHits: readonly string[];
  readonly secretHits: readonly string[];
  readonly testFileHits: readonly string[];
  readonly localPathHits: readonly string[];
};

export type ProductionPackagingEvidence = {
  readonly packagePath: string;
  readonly packageSha256: string;
  readonly nativeMacosBundlePath: string;
  readonly nativeMacosBundleSha256: string;
  readonly nativeMacosBundleVerified: boolean;
  readonly productionMode: boolean;
  readonly contentScan: PackageContentScan;
  readonly cleanMachineSteps: readonly CleanMachineStep[];
  readonly runtimeAbsenceRemediationShown: boolean;
  readonly runtimeAbsenceRemediationEvidencePath?: string;
  readonly runbookPath: string;
};

export type ProductionPackagingIssueCode =
  | "missing_production_package"
  | "missing_package_hash"
  | "missing_native_macos_bundle"
  | "native_macos_bundle_unverified"
  | "package_not_production_mode"
  | "package_content_contaminated"
  | "missing_clean_machine_step"
  | "missing_runtime_absence_remediation"
  | "missing_clean_machine_runbook";

export type ProductionPackagingIssue = {
  readonly code: ProductionPackagingIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type ProductionPackagingEvidenceResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly ProductionPackagingIssue[] };

export function evaluateProductionPackagingEvidence(
  evidence: ProductionPackagingEvidence,
): ProductionPackagingEvidenceResult {
  const issues = [
    ...packageIssues(evidence),
    ...contentScanIssues(evidence.contentScan),
    ...cleanMachineStepIssues(evidence.cleanMachineSteps),
    ...runtimeRemediationIssues(evidence.runtimeAbsenceRemediationShown),
    ...runbookIssues(evidence.runbookPath),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatProductionPackagingEvidenceSummary(
  evidence: ProductionPackagingEvidence,
): string {
  return [
    "# DF-245 Production Packaging",
    `Package: ${evidence.packagePath || "missing"}`,
    `Package hash: ${evidence.packageSha256 || "missing"}`,
    `Native macOS bundle: ${evidence.nativeMacosBundlePath || "missing"}`,
    `Native bundle QA: ${evidence.nativeMacosBundleVerified ? "passed" : "missing"}`,
    `Mode: ${evidence.productionMode ? "production" : "non-production"}`,
    `content scan: ${contentScanPassed(evidence.contentScan) ? "passed" : "blocked"}`,
    `clean-machine steps: ${evidence.cleanMachineSteps.length}/${CLEAN_MACHINE_STEPS.length}`,
    `runtime absence remediation: ${evidence.runtimeAbsenceRemediationShown ? "present" : "missing"}`,
    `Runbook: ${evidence.runbookPath || "missing"}`,
  ].join("\n");
}

function packageIssues(evidence: ProductionPackagingEvidence): readonly ProductionPackagingIssue[] {
  return [
    ...(evidence.packagePath.trim()
      ? []
      : [
          issue("missing_production_package", "Production mode package artifact is required.", [
            "dist/",
          ]),
        ]),
    ...(isSha256(evidence.packageSha256)
      ? []
      : [
          issue("missing_package_hash", "Production package SHA-256 digest is required.", [
            evidence.packageSha256 || "missing",
          ]),
        ]),
    ...(hasNativeMacosBundle(evidence)
      ? []
      : [
          issue(
            "missing_native_macos_bundle",
            "Native macOS bundle path and SHA-256 digest are required.",
            [evidence.nativeMacosBundlePath || "missing"],
          ),
        ]),
    ...(evidence.nativeMacosBundleVerified
      ? []
      : [
          issue(
            "native_macos_bundle_unverified",
            "Native macOS bundle must pass checksum, mount, codesign, content scan, and launch smoke QA.",
            [evidence.nativeMacosBundlePath || "missing"],
          ),
        ]),
    ...(evidence.productionMode
      ? []
      : [
          issue("package_not_production_mode", "Package evidence must be production mode.", [
            evidence.packagePath || "missing",
          ]),
        ]),
  ];
}

function contentScanIssues(scan: PackageContentScan): readonly ProductionPackagingIssue[] {
  const refs = [
    ...scan.mockResourceHits,
    ...scan.fixtureHits,
    ...scan.secretHits,
    ...scan.testFileHits,
    ...scan.localPathHits,
  ];
  return refs.length === 0
    ? []
    : [
        issue(
          "package_content_contaminated",
          "Package content scan must be free of mock, fixture, test, and secret hits.",
          refs,
        ),
      ];
}

function cleanMachineStepIssues(
  steps: readonly CleanMachineStep[],
): readonly ProductionPackagingIssue[] {
  const present = new Set(steps);
  const missing = CLEAN_MACHINE_STEPS.filter((step) => !present.has(step));
  return missing.length === 0
    ? []
    : [
        issue(
          "missing_clean_machine_step",
          "Clean-machine validation must cover install, auth, credentials, launch, and first live interview.",
          missing,
        ),
      ];
}

function runtimeRemediationIssues(shown: boolean): readonly ProductionPackagingIssue[] {
  return shown
    ? []
    : [
        issue(
          "missing_runtime_absence_remediation",
          "Runtime absence remediation must be visible when Codex runtime is missing.",
          ["runtime absence remediation"],
        ),
      ];
}

function runbookIssues(runbookPath: string): readonly ProductionPackagingIssue[] {
  return runbookPath.endsWith("production-clean-machine-runbook.md")
    ? []
    : [
        issue("missing_clean_machine_runbook", "Clean-machine installation runbook is required.", [
          runbookPath || "missing",
        ]),
      ];
}

function contentScanPassed(scan: PackageContentScan): boolean {
  return (
    scan.mockResourceHits.length === 0 &&
    scan.fixtureHits.length === 0 &&
    scan.secretHits.length === 0 &&
    scan.testFileHits.length === 0 &&
    scan.localPathHits.length === 0
  );
}

function hasNativeMacosBundle(evidence: ProductionPackagingEvidence): boolean {
  return (
    (evidence.nativeMacosBundlePath.endsWith(".dmg") ||
      evidence.nativeMacosBundlePath.endsWith(".app")) &&
    isSha256(evidence.nativeMacosBundleSha256)
  );
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function issue(
  code: ProductionPackagingIssueCode,
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
