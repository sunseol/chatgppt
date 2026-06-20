import {
  benchmarkBlockers,
  distinctCleanPassedBenchmarkCount,
} from "./live-release-benchmark-gate";
import { decisionBlockers } from "./live-release-decision-gate";
import { p0Blockers } from "./live-release-p0-gate";
import type { LiveTicketEvidence } from "./live-release-p0-gate";
import {
  collectLineageContamination,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

export { LIVE_P0_TICKET_IDS } from "./live-release-p0-gate";
export type { LiveP0TicketId, LiveTicketEvidence, LiveTicketStatus } from "./live-release-p0-gate";

export type LiveBenchmarkStatus = "passed" | "failed" | "blocked";
export type LiveBenchmarkFailureDomain =
  | "none"
  | "provider"
  | "context"
  | "research"
  | "image"
  | "renderer"
  | "editor";

export type ReleaseBlockingP1Category =
  | "data_loss"
  | "security"
  | "billing_misrepresentation"
  | "source_error"
  | "other";

export type LiveBenchmarkEvidence = {
  readonly id: string;
  readonly status: LiveBenchmarkStatus;
  readonly failureDomain: LiveBenchmarkFailureDomain;
};

export type ProductionPackageEvidence = {
  readonly mockExecutionPathDisabled: boolean;
  readonly fixtureFree: boolean;
  readonly contentScanPassed: boolean;
};

export type UnresolvedP1Risk = {
  readonly id: string;
  readonly category: ReleaseBlockingP1Category;
  readonly summary: string;
};

export type LiveReleaseDecision = "approved" | "blocked";

export type LiveReleaseDecisionEvidence = {
  readonly documentPath: string;
  readonly decision: LiveReleaseDecision;
  readonly decisionRecorded: boolean;
  readonly knownLimitsRecorded: boolean;
};

export type LiveReleaseGateInput = {
  readonly p0Tickets: readonly LiveTicketEvidence[];
  readonly productionPackage: ProductionPackageEvidence;
  readonly liveBenchmarks: readonly LiveBenchmarkEvidence[];
  readonly goldenPathLineage: readonly ProviderArtifactProvenance[];
  readonly criticalDefectCount: number;
  readonly unresolvedP1Risks: readonly UnresolvedP1Risk[];
  readonly releaseDecision: LiveReleaseDecisionEvidence;
};

export type LiveReleaseBlockerCode =
  | "p0_ticket_status_conflict"
  | "p0_not_live_verified"
  | "production_mock_enabled"
  | "production_package_contaminated"
  | "live_benchmark_status_conflict"
  | "live_benchmark_shortfall"
  | "golden_path_lineage_missing"
  | "golden_path_contaminated"
  | "invalid_critical_defect_count"
  | "critical_defects_open"
  | "p1_release_blocker"
  | "missing_release_decision"
  | "release_decision_blocked"
  | "missing_known_limits";

export type LiveReleaseBlocker = {
  readonly code: LiveReleaseBlockerCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveReleaseGateResult =
  | {
      readonly kind: "ready";
      readonly passedBenchmarkCount: number;
      readonly decisionDocumentPath: string;
    }
  | {
      readonly kind: "blocked";
      readonly passedBenchmarkCount: number;
      readonly blockers: readonly LiveReleaseBlocker[];
    };

const RELEASE_BLOCKING_P1_CATEGORIES: readonly ReleaseBlockingP1Category[] = [
  "data_loss",
  "security",
  "billing_misrepresentation",
  "source_error",
];

export function evaluateLiveInitialReleaseGate(input: LiveReleaseGateInput): LiveReleaseGateResult {
  const passedBenchmarkCount = distinctCleanPassedBenchmarkCount(input.liveBenchmarks);
  const blockers = [
    ...p0Blockers(input.p0Tickets),
    ...productionPackageBlockers(input.productionPackage),
    ...benchmarkBlockers(input.liveBenchmarks, passedBenchmarkCount),
    ...lineageBlockers(input.goldenPathLineage),
    ...defectBlockers(input.criticalDefectCount),
    ...p1RiskBlockers(input.unresolvedP1Risks),
    ...decisionBlockers(input.releaseDecision),
  ];

  if (blockers.length > 0) return { kind: "blocked", passedBenchmarkCount, blockers };
  return {
    kind: "ready",
    passedBenchmarkCount,
    decisionDocumentPath: input.releaseDecision.documentPath,
  };
}

function productionPackageBlockers(
  evidence: ProductionPackageEvidence,
): readonly LiveReleaseBlocker[] {
  return [
    ...(evidence.mockExecutionPathDisabled
      ? []
      : [
          blocker(
            "production_mock_enabled",
            "Production package must disable mock execution paths.",
            ["DF-202", "DF-245"],
          ),
        ]),
    ...(evidence.fixtureFree && evidence.contentScanPassed
      ? []
      : [
          blocker(
            "production_package_contaminated",
            "Production package must pass fixture, mock, and secret scans.",
            ["DF-206", "DF-245"],
          ),
        ]),
  ];
}

function lineageBlockers(
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveReleaseBlocker[] {
  if (lineage.length === 0) {
    return [
      blocker("golden_path_lineage_missing", "Golden Path lineage evidence is required.", [
        "DF-241",
      ]),
    ];
  }
  const contamination = collectLineageContamination(lineage);
  const refs = [...contamination.mockArtifactIds, ...contamination.fixtureArtifactIds];
  return refs.length === 0
    ? []
    : [
        blocker(
          "golden_path_contaminated",
          "Golden Path lineage must contain zero mock or fixture artifacts.",
          refs,
        ),
      ];
}

function defectBlockers(criticalDefectCount: number): readonly LiveReleaseBlocker[] {
  if (!Number.isInteger(criticalDefectCount) || criticalDefectCount < 0) {
    return [
      blocker("invalid_critical_defect_count", "Critical defect count must be a valid integer.", [
        String(criticalDefectCount),
      ]),
    ];
  }
  return criticalDefectCount === 0
    ? []
    : [
        blocker("critical_defects_open", "Critical defect count must be zero.", [
          String(criticalDefectCount),
        ]),
      ];
}

function p1RiskBlockers(risks: readonly UnresolvedP1Risk[]): readonly LiveReleaseBlocker[] {
  const blocking = risks.filter(isReleaseBlockingP1Risk);
  return blocking.length === 0
    ? []
    : [
        blocker(
          "p1_release_blocker",
          "Unresolved P1 risks cannot involve data loss, security, billing, or source errors.",
          blocking.map((risk) => risk.id),
        ),
      ];
}

function isReleaseBlockingP1Risk(risk: UnresolvedP1Risk): boolean {
  return (
    RELEASE_BLOCKING_P1_CATEGORIES.includes(risk.category) ||
    summaryNamesReleaseBlockingRisk(risk.summary)
  );
}

function summaryNamesReleaseBlockingRisk(summary: string): boolean {
  const normalized = summary.toLowerCase().replace(/[_-]+/g, " ");
  return (
    normalized.includes("data loss") ||
    normalized.includes("security") ||
    normalized.includes("credential leak") ||
    normalized.includes("token leak") ||
    normalized.includes("billing") ||
    normalized.includes("payment") ||
    normalized.includes("source error") ||
    normalized.includes("source mismatch") ||
    normalized.includes("citation")
  );
}

function blocker(
  code: LiveReleaseBlockerCode,
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
