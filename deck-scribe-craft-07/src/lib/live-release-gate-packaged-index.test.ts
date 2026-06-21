import { describe, expect, test } from "bun:test";
import {
  LIVE_P0_TICKET_IDS,
  evaluateLiveInitialReleaseGate,
  type LiveReleaseGateInput,
} from "./live-release-gate";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live initial release gate packaged evidence index", () => {
  test("blocks release when the packaged live evidence index is not ready", () => {
    // Given
    const input = readyInput();
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      packagedLiveEvidenceIndex: {
        kind: "blocked",
        issues: [
          {
            code: "packaged_live_release_ready_before_upstream",
            message:
              "DF-247 release evidence cannot be ready while upstream packaged evidence is blocked.",
            refs: ["DF-241", "DF-242", "DF-243"],
          },
        ],
      },
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "packaged_live_release_ready_before_upstream",
    ]);
    expect(result.blockers[0]?.refs).toEqual(["DF-241", "DF-242", "DF-243"]);
  });
});

function readyInput(): LiveReleaseGateInput {
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
      documentPath: "docs/live-release-decision.md",
      decision: "approved",
      decisionRecorded: true,
      knownLimitsRecorded: true,
    },
  };
}
