import { hasNonSyntheticEvidencePath, hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";
import {
  CLEAN_MACHINE_STEPS,
  cleanMachineStepIssues,
  countDistinctCleanMachineSteps,
  type CleanMachineStep,
} from "./production-packaging-clean-machine";

export { CLEAN_MACHINE_STEPS };
export type { CleanMachineStep };

export type PackageContentScan = {
  readonly mockResourceHits: readonly string[];
  readonly fixtureHits: readonly string[];
  readonly secretHits: readonly string[];
  readonly testFileHits: readonly string[];
  readonly localPathHits: readonly string[];
};

export type NativeMacosSignature = "developer_id" | "adhoc" | "unsigned";

export type NativeMacosReleaseTrust = {
  readonly signature: NativeMacosSignature;
  readonly teamIdentifier: string;
  readonly notarized: boolean;
  readonly stapled: boolean;
  readonly gatekeeperAccepted: boolean;
  readonly releaseTrustEvidencePath?: string;
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
  | "duplicate_clean_machine_step"
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
    ...macosReleaseTrustIssues(evidence.nativeMacosReleaseTrust),
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
    ...(hasNonSyntheticEvidencePath(evidence.packagePath, [".tgz", ".zip"])
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
    ...(evidence.productionMode
      ? []
      : [
          issue("package_not_production_mode", "Package evidence must be production mode.", [
            evidence.packagePath || "missing",
          ]),
        ]),
  ];
}

function macosReleaseTrustIssues(
  trust: NativeMacosReleaseTrust,
): readonly ProductionPackagingIssue[] {
  const teamIdentifier = trust.teamIdentifier.trim();
  return [
    ...(trust.signature === "developer_id" && isDeveloperTeamIdentifier(teamIdentifier)
      ? []
      : [
          issue(
            "missing_developer_id_signature",
            "Native macOS release must be signed with a Developer ID team identity.",
            [trust.signature, teamIdentifier || "missing_team_identifier"],
          ),
        ]),
    ...(trust.notarized && trust.stapled
      ? []
      : [
          issue("missing_notarization", "Native macOS release must be notarized and stapled.", [
            trust.notarized ? "notarized" : "not_notarized",
            trust.stapled ? "stapled" : "not_stapled",
          ]),
        ]),
    ...(trust.gatekeeperAccepted
      ? []
      : [
          issue(
            "missing_gatekeeper_acceptance",
            "Native macOS release must pass Gatekeeper assessment.",
            ["spctl"],
          ),
        ]),
    ...(hasReleaseTrustEvidencePath(trust.releaseTrustEvidencePath)
      ? []
      : [
          issue(
            "missing_release_trust_evidence",
            "Native macOS release trust must cite persisted codesign, notarization, stapling, and Gatekeeper evidence.",
            [trust.releaseTrustEvidencePath || "missing"],
          ),
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

function macosReleaseTrustLabel(trust: NativeMacosReleaseTrust): string {
  return [
    trust.signature,
    trust.teamIdentifier.trim() || "missing-team",
    trust.notarized ? "notarized" : "not-notarized",
    trust.stapled ? "stapled" : "not-stapled",
    trust.gatekeeperAccepted ? "gatekeeper-accepted" : "gatekeeper-blocked",
  ].join(" | ");
}

function hasNativeMacosBundle(evidence: ProductionPackagingEvidence): boolean {
  return (
    hasNonSyntheticEvidencePath(evidence.nativeMacosBundlePath, [".dmg", ".app"]) &&
    isSha256(evidence.nativeMacosBundleSha256)
  );
}

const isSha256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);

const isDeveloperTeamIdentifier = (value: string): boolean => /^[A-Z0-9]{10}$/.test(value);

function hasReleaseTrustEvidencePath(value: string | undefined): boolean {
  const normalized = value?.toLowerCase() ?? "";
  return hasNonSyntheticJsonEvidencePath(value) && normalized.includes("release-trust");
}

function issue(
  code: ProductionPackagingIssueCode,
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
