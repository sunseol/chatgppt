import {
  LIVE_P0_TICKET_IDS,
  type LiveReleaseDecisionEvidence,
  type LiveReleaseGateInput,
} from "./live-release-gate";
import { createProviderArtifactProvenance } from "./provider-provenance";

export type LiveReleaseDecisionPayloadFixture = {
  readonly kind: "live_release_decision";
  readonly documentPath: string;
  readonly decision: LiveReleaseDecisionEvidence["decision"];
  readonly decisionRecorded: boolean;
  readonly knownLimitsRecorded: boolean;
  readonly capturedAt: string;
};

export function readyLiveReleaseGateInput(): LiveReleaseGateInput {
  const releaseDecision = {
    documentPath: "docs/live-release-decision.md",
    decision: "approved",
    decisionRecorded: true,
    knownLimitsRecorded: true,
  } satisfies LiveReleaseDecisionEvidence;
  return {
    p0Tickets: LIVE_P0_TICKET_IDS.map((id) => ({ id, status: "verified_live" })),
    productionPackage: {
      mockExecutionPathDisabled: true,
      fixtureFree: true,
      contentScanPassed: true,
    },
    liveBenchmarks: [
      { id: "korean_business", status: "passed", failureDomain: "none" },
      { id: "market_research", status: "passed", failureDomain: "none" },
      { id: "chart_report", status: "passed", failureDomain: "none" },
      { id: "image_intro", status: "passed", failureDomain: "none" },
      { id: "revision_regeneration", status: "failed", failureDomain: "editor" },
    ],
    goldenPathFinalExportArtifactId: "live_export_001",
    goldenPathLineage: [
      createProviderArtifactProvenance({
        artifactId: "live_export_001",
        executionMode: "production",
        providerKind: "codex",
        authMode: "codex_session",
        modelOrRuntime: "codex-cli 0.141.0",
        promptVersion: "final_report@v1",
        durationMs: 500,
        inputArtifactIds: ["live_slide_1"],
        turnId: "turn_final",
        threadId: "thread_project",
        fixture: false,
      }),
    ],
    packagedLiveEvidenceIndex: { kind: "ready" },
    criticalDefectCount: 0,
    unresolvedP1Risks: [],
    releaseDecision: {
      ...releaseDecision,
      decisionPayload: releaseDecisionPayload(releaseDecision),
    },
  };
}

export function releaseDecisionPayload(
  decision: LiveReleaseDecisionEvidence,
): LiveReleaseDecisionPayloadFixture {
  return {
    kind: "live_release_decision",
    documentPath: decision.documentPath,
    decision: decision.decision,
    decisionRecorded: decision.decisionRecorded,
    knownLimitsRecorded: decision.knownLimitsRecorded,
    capturedAt: "2026-06-21T22:05:00Z",
  };
}
