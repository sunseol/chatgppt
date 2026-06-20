import { describe, expect, test } from "bun:test";
import {
  LIVE_P0_TICKET_IDS,
  evaluateLiveInitialReleaseGate,
  type LiveReleaseGateInput,
} from "./live-release-gate";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live initial release gate final export evidence", () => {
  test("blocks placeholder final export artifact ids in Golden Path lineage", () => {
    // Given
    const result = evaluateLiveInitialReleaseGate(
      readyInputWithFinalExport("placeholder_export_artifact"),
    );

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_export_missing"]);
    expect(result.blockers[0]?.refs).toEqual(["placeholder_export_artifact"]);
  });
});

function readyInputWithFinalExport(finalExportArtifactId: string): LiveReleaseGateInput {
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
    goldenPathFinalExportArtifactId: finalExportArtifactId,
    goldenPathLineage: [
      createProviderArtifactProvenance({
        artifactId: finalExportArtifactId,
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
    criticalDefectCount: 0,
    unresolvedP1Risks: [],
    releaseDecision: {
      documentPath: "docs/live-release-decision.md",
      decision: "approved",
      decisionRecorded: true,
      knownLimitsRecorded: true,
    },
  };
}
