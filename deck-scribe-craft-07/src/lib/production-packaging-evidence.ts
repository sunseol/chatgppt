import { hasNonSyntheticEvidencePath } from "./live-evidence-path";
import {
  productionPackagingPayloadIssues,
  type ProductionPackagingEvidencePayloads,
} from "./production-packaging-evidence-payload";
import {
  CLEAN_MACHINE_STEPS,
  cleanMachineAccountEvidencePathIssues,
  cleanMachineStepEvidencePathIssues,
  cleanMachineStepIssues,
  countDistinctCleanMachineSteps,
  type CleanMachineStep,
  type CleanMachineStepEvidencePaths,
} from "./production-packaging-clean-machine";
import {
  macosReleaseTrustIssues,
  macosReleaseTrustLabel,
  type NativeMacosReleaseTrust,
} from "./production-packaging-release-trust";

const DRY_RUN_PACKAGE_MARKER = "dry-run";
const TRANSIENT_ARTIFACT_PATH_SEGMENTS = ["tmp", "temp", "observer", "observers"] as const;

export { CLEAN_MACHINE_STEPS };
export type { CleanMachineStep, CleanMachineStepEvidencePaths };
export type {
  NativeMacosReleaseTrust,
  NativeMacosSignature,
} from "./production-packaging-release-trust";

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
  readonly nativeMacosReleaseTrust: NativeMacosReleaseTrust;
  readonly productionMode: boolean;
  readonly contentScan: PackageContentScan;
  readonly cleanMachineSteps: readonly CleanMachineStep[];
  readonly cleanMachineStepEvidencePaths?: CleanMachineStepEvidencePaths;
  readonly cleanMachineAccountEvidencePath?: string;
  readonly evidencePayloads?: ProductionPackagingEvidencePayloads;
  readonly runtimeAbsenceRemediationShown: boolean;
  readonly runbookPath: string;
};

export type ProductionPackagingIssueCode =
  | "missing_production_package"
  | "missing_package_hash"
  | "missing_native_macos_bundle"
  | "missing_developer_id_signature"
  | "missing_release_trust_evidence"
  | "missing_notarization"
  | "missing_gatekeeper_acceptance"
  | "package_not_production_mode"
  | "package_content_contaminated"
  | "invalid_clean_machine_step"
  | "duplicate_clean_machine_step"
  | "missing_clean_machine_step"
  | "missing_clean_machine_step_evidence"
  | "missing_clean_machine_account_evidence"
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
  const baseIssues = [
    ...packageIssues(evidence),
    ...macosReleaseTrustIssues(evidence.nativeMacosReleaseTrust),
    ...contentScanIssues(evidence.contentScan),
    ...cleanMachineStepIssues(evidence.cleanMachineSteps),
    ...cleanMachineStepEvidencePathIssues(evidence.cleanMachineStepEvidencePaths),
    ...cleanMachineAccountEvidencePathIssues(evidence.cleanMachineAccountEvidencePath),
    ...runtimeRemediationIssues(evidence.runtimeAbsenceRemediationShown),
    ...runbookIssues(evidence.runbookPath),
  ];
  const issues = [...baseIssues, ...productionPackagingPayloadIssues(evidence, baseIssues)];
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
    `macOS release trust: ${macosReleaseTrustLabel(evidence.nativeMacosReleaseTrust)}`,
    `Mode: ${evidence.productionMode ? "production" : "non-production"}`,
    `content scan: ${contentScanIssues(evidence.contentScan).length === 0 ? "passed" : "blocked"}`,
    `clean-machine steps: ${countDistinctCleanMachineSteps(evidence.cleanMachineSteps)}/${CLEAN_MACHINE_STEPS.length}`,
    `runtime absence remediation: ${evidence.runtimeAbsenceRemediationShown ? "present" : "missing"}`,
    `Runbook: ${evidence.runbookPath || "missing"}`,
  ].join("\n");
}

function packageIssues(evidence: ProductionPackagingEvidence): readonly ProductionPackagingIssue[] {
  return [
    ...(hasProductionArtifactPath(evidence.packagePath, [".tgz", ".zip"])
      ? []
      : [
          issue(
            "missing_production_package",
            "Production mode package artifact must cite a persisted non-local archive path.",
            [evidence.packagePath || "missing"],
          ),
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
    ...(evidence.productionMode && !isDryRunPackagePath(evidence.packagePath)
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
  return hasNonSyntheticEvidencePath(runbookPath, [".md"]) &&
    runbookPath === "docs/production-clean-machine-runbook.md"
    ? []
    : [
        issue("missing_clean_machine_runbook", "Clean-machine installation runbook is required.", [
          runbookPath || "missing",
        ]),
      ];
}

function hasNativeMacosBundle(evidence: ProductionPackagingEvidence): boolean {
  return (
    hasProductionArtifactPath(evidence.nativeMacosBundlePath, [".dmg", ".app"]) &&
    isSha256(evidence.nativeMacosBundleSha256)
  );
}

const isSha256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);

function hasProductionArtifactPath(value: string, allowedExtensions: readonly string[]): boolean {
  return (
    hasNonSyntheticEvidencePath(value, allowedExtensions) && !hasTransientArtifactPathSegment(value)
  );
}

function hasTransientArtifactPathSegment(value: string): boolean {
  const segments = value.toLowerCase().split(/[/\\]+/);
  return TRANSIENT_ARTIFACT_PATH_SEGMENTS.some((segment) => segments.includes(segment));
}

function isDryRunPackagePath(value: string): boolean {
  return value.toLowerCase().includes(DRY_RUN_PACKAGE_MARKER);
}

function issue(
  code: ProductionPackagingIssueCode,
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
