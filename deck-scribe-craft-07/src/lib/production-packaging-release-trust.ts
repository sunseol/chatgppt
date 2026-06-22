import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";
import type { ProductionPackagingIssue } from "./production-packaging-evidence";

export type NativeMacosSignature = "developer_id" | "adhoc" | "unsigned";

export type NativeMacosReleaseTrust = {
  readonly signature: NativeMacosSignature;
  readonly teamIdentifier: string;
  readonly notarized: boolean;
  readonly stapled: boolean;
  readonly gatekeeperAccepted: boolean;
  readonly releaseTrustEvidencePath?: string;
};

const RELEASE_TRUST_EVIDENCE_PATH_MARKERS = [
  "release-trust",
  "codesign",
  "notarytool",
  "stapler",
  "spctl",
] as const;

export function macosReleaseTrustIssues(
  trust: NativeMacosReleaseTrust,
): readonly ProductionPackagingIssue[] {
  const teamIdentifier = trust.teamIdentifier;
  return [
    ...(trust.signature === "developer_id" && isCanonicalDeveloperTeamIdentifier(teamIdentifier)
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

export function macosReleaseTrustLabel(trust: NativeMacosReleaseTrust): string {
  return [
    trust.signature,
    trust.teamIdentifier.trim() || "missing-team",
    trust.notarized ? "notarized" : "not-notarized",
    trust.stapled ? "stapled" : "not-stapled",
    trust.gatekeeperAccepted ? "gatekeeper-accepted" : "gatekeeper-blocked",
  ].join(" | ");
}

const isDeveloperTeamIdentifier = (value: string): boolean => /^[A-Z0-9]{10}$/.test(value);

function isCanonicalDeveloperTeamIdentifier(value: string): boolean {
  return value.trim() === value && isDeveloperTeamIdentifier(value);
}

function hasReleaseTrustEvidencePath(value: string | undefined): boolean {
  if (value === undefined || value.trim() !== value) return false;
  const normalized = value?.toLowerCase() ?? "";
  return (
    hasNonSyntheticJsonEvidencePath(value) &&
    RELEASE_TRUST_EVIDENCE_PATH_MARKERS.every((marker) => normalized.includes(marker))
  );
}

function issue(
  code: ProductionPackagingIssue["code"],
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
