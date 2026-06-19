import { describe, expect, test } from "bun:test";
import {
  LIVE_P0_TICKET_IDS,
  evaluateLiveInitialReleaseGate,
  type LiveReleaseGateInput,
} from "./live-release-gate";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live initial release gate", () => {
  test("passes only when all live release evidence is present", () => {
    const result = evaluateLiveInitialReleaseGate(readyInput());

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.passedBenchmarkCount).toBe(4);
    expect(result.decisionDocumentPath).toBe("docs/live-release-decision.md");
  });

  test("blocks release on mock P0s, package contamination, benchmark shortfall, and critical risk", () => {
    const input = readyInput();
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      p0Tickets: input.p0Tickets.map((ticket) =>
        ticket.id === "DF-213" ? { ...ticket, status: "verified_mock" } : ticket,
      ),
      productionPackage: {
        mockExecutionPathDisabled: false,
        fixtureFree: false,
        contentScanPassed: false,
      },
      liveBenchmarks: input.liveBenchmarks.map((benchmark) =>
        benchmark.id === "image_intro" ? { ...benchmark, status: "failed" } : benchmark,
      ),
      criticalDefectCount: 1,
      unresolvedP1Risks: [{ id: "P1-1", category: "source_error", summary: "citation mismatch" }],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "p0_not_live_verified",
      "production_mock_enabled",
      "production_package_contaminated",
      "live_benchmark_shortfall",
      "critical_defects_open",
      "p1_release_blocker",
    ]);
  });

  test("requires the release decision and known limits to be recorded in the decision doc", () => {
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      releaseDecision: {
        documentPath: "docs/release-notes.md",
        decision: "blocked",
        decisionRecorded: false,
        knownLimitsRecorded: false,
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "missing_release_decision",
      "release_decision_blocked",
      "missing_known_limits",
    ]);
  });

  test("blocks lookalike release decision document paths", () => {
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      releaseDecision: {
        documentPath: "release-evidence/live-release-decision.md",
        decision: "approved",
        decisionRecorded: true,
        knownLimitsRecorded: true,
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["missing_release_decision"]);
  });

  test("counts only distinct passed benchmarks without failure domains", () => {
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      liveBenchmarks: [
        { id: "korean_business", status: "passed", failureDomain: "none" },
        { id: "market_research", status: "passed", failureDomain: "none" },
        { id: "chart_report", status: "passed", failureDomain: "none" },
        { id: "chart_report", status: "passed", failureDomain: "none" },
        { id: "image_intro", status: "passed", failureDomain: "image" },
      ],
    });

    expect(result.kind).toBe("blocked");
    expect(result.passedBenchmarkCount).toBe(3);
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["live_benchmark_shortfall"]);
  });

  test("requires the five named DF-242 benchmark scenarios", () => {
    // Given
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      liveBenchmarks: [
        { id: "ad_hoc_business", status: "passed", failureDomain: "none" },
        { id: "ad_hoc_research", status: "passed", failureDomain: "none" },
        { id: "ad_hoc_chart", status: "passed", failureDomain: "none" },
        { id: "ad_hoc_image", status: "passed", failureDomain: "none" },
        { id: "ad_hoc_revision", status: "passed", failureDomain: "none" },
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    expect(result.passedBenchmarkCount).toBe(0);
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["live_benchmark_shortfall"]);
  });

  test("blocks release without Golden Path lineage evidence", () => {
    // Given
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      goldenPathLineage: [],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_lineage_missing"]);
  });

  test("blocks invalid critical defect counters", () => {
    // Given
    const result = evaluateLiveInitialReleaseGate({
      ...readyInput(),
      criticalDefectCount: -1,
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "invalid_critical_defect_count",
    ]);
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
    goldenPathLineage: [
      createProviderArtifactProvenance({
        artifactId: "live_export",
        executionMode: "production",
        providerKind: "codex",
        authMode: "codex_session",
        modelOrRuntime: "codex-cli 0.139.0",
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
