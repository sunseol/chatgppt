import { LIVE_BENCHMARK_IDS } from "../src/lib/live-benchmark-evidence";
import {
  LIVE_P0_TICKET_IDS,
  type LiveP0TicketId,
  type LiveTicketEvidence,
} from "../src/lib/live-release-gate";
import type { PackagedLiveEvidenceIndex } from "../src/lib/packaged-live-evidence-index";
import {
  parseDf247ReleaseGateEvidenceInput,
  type Df247ReleaseGateEvidenceInput,
} from "./df247-release-gate-evidence-schema";

export const CURRENT_DF247_PACKAGED_INDEX_PATH =
  "docs/live-evidence/release/packaged-live-evidence-index.json";

export const CURRENT_DF247_OPEN_P0_TICKET_IDS: readonly LiveP0TicketId[] = [
  "DF-205",
  "DF-233",
  "DF-241",
  "DF-242",
  "DF-245",
  "DF-246",
  "DF-247",
];

export type CurrentDf247EvidenceFile = {
  readonly path: string;
  readonly kind: string;
};

export type CurrentDf247EvidenceSha256Reference = CurrentDf247EvidenceFile & {
  readonly sha256: string;
};

export const CURRENT_DF247_SHA256_EVIDENCE_FILES: readonly CurrentDf247EvidenceFile[] = [
  {
    path: "docs/live-release-decision.md",
    kind: "canonical release decision",
  },
  {
    path: "docs/live-evidence/release/df205-evidence.json",
    kind: "DF-205 packaged auth and secret evidence",
  },
  {
    path: "docs/live-evidence/release/df233-evidence.json",
    kind: "DF-233 packaged queue controls evidence",
  },
  {
    path: "docs/live-evidence/release/df235-evidence.json",
    kind: "DF-235 packaged review evidence",
  },
  {
    path: "docs/live-evidence/release/df241-evidence.json",
    kind: "DF-241 Golden Path packaged evidence",
  },
  {
    path: "docs/live-evidence/release/df242-evidence.json",
    kind: "DF-242 benchmark packaged evidence",
  },
  {
    path: "docs/live-evidence/release/df243-evidence.json",
    kind: "DF-243 interruption closure evidence",
  },
  {
    path: "docs/live-evidence/release/df244-evidence.json",
    kind: "DF-244 packaged usage evidence",
  },
  {
    path: "docs/live-evidence/release/df245-evidence.json",
    kind: "DF-245 production packaging evidence",
  },
  {
    path: "docs/live-evidence/release/df246-evidence.json",
    kind: "DF-246 packaged manual QA evidence",
  },
];

export type BuildCurrentDf247ReleaseGateEvidenceInputOptions = {
  readonly capturedAt: string;
  readonly packagedLiveEvidenceIndex: PackagedLiveEvidenceIndex;
  readonly currentEvidenceSha256: readonly CurrentDf247EvidenceSha256Reference[];
};

export function buildCurrentDf247ReleaseGateEvidenceInput(
  options: BuildCurrentDf247ReleaseGateEvidenceInputOptions,
): Df247ReleaseGateEvidenceInput {
  return parseDf247ReleaseGateEvidenceInput({
    capturedAt: options.capturedAt,
    packageArchiveSha256: options.packagedLiveEvidenceIndex.packageArchiveSha256,
    packagedLiveEvidenceIndex: options.packagedLiveEvidenceIndex,
    liveReleaseGate: {
      p0Tickets: currentP0Tickets(),
      productionPackage: {
        mockExecutionPathDisabled: true,
        fixtureFree: true,
        contentScanPassed: true,
      },
      liveBenchmarks: LIVE_BENCHMARK_IDS.map((id) => ({
        id,
        status: "blocked",
        failureDomain: "context",
      })),
      goldenPathLineage: [],
      goldenPathFinalExportArtifactId: "live_export_001",
      criticalDefectCount: 0,
      unresolvedP1Risks: [],
      releaseDecision: {
        documentPath: "docs/live-release-decision.md",
        decision: "blocked",
        decisionRecorded: true,
        knownLimitsRecorded: true,
        decisionPayload: {
          kind: "live_release_decision",
          documentPath: "docs/live-release-decision.md",
          decision: "blocked",
          decisionRecorded: true,
          knownLimitsRecorded: true,
          capturedAt: options.capturedAt,
        },
      },
    },
    currentEvidence: currentEvidenceReferences(options.currentEvidenceSha256),
  });
}

function currentP0Tickets(): readonly LiveTicketEvidence[] {
  return LIVE_P0_TICKET_IDS.map((id) => ({
    id,
    status: CURRENT_DF247_OPEN_P0_TICKET_IDS.includes(id) ? "live_partial" : "verified_live",
  }));
}

function currentEvidenceReferences(
  refs: readonly CurrentDf247EvidenceSha256Reference[],
): readonly (CurrentDf247EvidenceSha256Reference | CurrentDf247EvidenceFile)[] {
  return [
    ...refs.filter((ref) => ref.path !== CURRENT_DF247_PACKAGED_INDEX_PATH),
    {
      path: CURRENT_DF247_PACKAGED_INDEX_PATH,
      kind: "shared packaged evidence index",
    },
  ];
}
