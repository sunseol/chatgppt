import { decisionBlockers } from "./live-release-decision-gate";
import {
  collectLineageContamination,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

export const LIVE_P0_TICKET_IDS = [
  "DF-200",
  "DF-201",
  "DF-202",
  "DF-203",
  "DF-204",
  "DF-205",
  "DF-206",
  "DF-210",
  "DF-211",
  "DF-212",
  "DF-213",
  "DF-214",
  "DF-215",
  "DF-220",
  "DF-221",
  "DF-222",
  "DF-223",
  "DF-224",
  "DF-230",
  "DF-231",
  "DF-232",
  "DF-233",
  "DF-234",
  "DF-235",
  "DF-240",
  "DF-241",
  "DF-242",
  "DF-243",
  "DF-245",
  "DF-246",
  "DF-247",
] as const;

export type LiveP0TicketId = (typeof LIVE_P0_TICKET_IDS)[number];

export type LiveTicketStatus = "not_started" | "verified_mock" | "live_partial" | "verified_live";

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

export type LiveTicketEvidence = {
  readonly id: LiveP0TicketId;
  readonly status: LiveTicketStatus;
};

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
  | "p0_not_live_verified"
  | "production_mock_enabled"
  | "production_package_contaminated"
  | "live_benchmark_shortfall"
  | "golden_path_contaminated"
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
  const passedBenchmarkCount = input.liveBenchmarks.filter(
    (benchmark) => benchmark.status === "passed",
  ).length;
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

function p0Blockers(tickets: readonly LiveTicketEvidence[]): readonly LiveReleaseBlocker[] {
  const liveIds = new Set(
    tickets.filter((ticket) => ticket.status === "verified_live").map((ticket) => ticket.id),
  );
  const missing = LIVE_P0_TICKET_IDS.filter((ticketId) => !liveIds.has(ticketId));
  return missing.length === 0
    ? []
    : [
        {
          code: "p0_not_live_verified",
          message: "Every P0 Live ticket must be Verified Live before release.",
          refs: missing,
        },
      ];
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

function benchmarkBlockers(
  benchmarks: readonly LiveBenchmarkEvidence[],
  passedBenchmarkCount: number,
): readonly LiveReleaseBlocker[] {
  return benchmarks.length >= 5 && passedBenchmarkCount >= 4
    ? []
    : [
        blocker("live_benchmark_shortfall", "At least four of five Live benchmarks must pass.", [
          "DF-242",
        ]),
      ];
}

function lineageBlockers(
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveReleaseBlocker[] {
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
  return criticalDefectCount === 0
    ? []
    : [
        blocker("critical_defects_open", "Critical defect count must be zero.", [
          String(criticalDefectCount),
        ]),
      ];
}

function p1RiskBlockers(risks: readonly UnresolvedP1Risk[]): readonly LiveReleaseBlocker[] {
  const blocking = risks.filter((risk) => RELEASE_BLOCKING_P1_CATEGORIES.includes(risk.category));
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

function blocker(
  code: LiveReleaseBlockerCode,
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
