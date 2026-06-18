import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  formatLiveBenchmarkEvidenceSummary,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkFailureDomain,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

describe("live benchmark evidence", () => {
  test("passes five Live benchmark scenarios when four complete the Golden Path", () => {
    // Given
    const bundle = completeBundle();

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result).toEqual({ kind: "ready", passedLiveCount: 4 });
  });

  test("summarizes the live pass count without adding mock scores", () => {
    // Given
    const bundle = completeBundle();

    // When
    const summary = formatLiveBenchmarkEvidenceSummary(bundle);

    // Then
    expect(summary.includes("DF-242 Live Benchmarks")).toBe(true);
    expect(summary.includes("Passed live benchmarks: 4 of 5")).toBe(true);
    expect(summary.includes("Mock scores counted: 0")).toBe(true);
    expect(summary.includes("revision_regeneration: failed/editor")).toBe(true);
  });

  test("blocks missing scenarios, mock scoring, unclassified failures, and missing bundles", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        {
          ...run("korean_business", "passed"),
          source: "mock",
          outputBundlePath: "bundles/korean_business.zip",
        },
        {
          ...run("market_research", "failed"),
          failureDomain: "none",
          outputBundlePath: "",
        },
        {
          ...run("image_intro", "passed"),
          goldenPathCompleted: false,
        },
        run("revision_regeneration", "blocked", "provider"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.passedLiveCount).toBe(0);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_benchmark_scenario",
      "missing_output_bundle",
      "mock_score_contamination",
      "missing_failure_domain",
      "golden_path_not_completed",
      "live_benchmark_shortfall",
    ]);
  });

  test("blocks duplicate output bundles and passed runs with failure domains", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        withOutputBundlePath(run("korean_business", "passed"), "bundles/shared.zip"),
        withOutputBundlePath(run("market_research", "passed"), "bundles/shared.zip"),
        run("chart_report", "passed", "renderer"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed", "editor"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_output_bundle",
      "passed_failure_domain_present",
    ]);
  });

  test("blocks output bundle manifests without Golden Path evidence", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        {
          ...run("korean_business", "passed"),
          outputBundlePath: "bundles/korean_business.zip",
          outputBundle: {
            path: "bundles/other.zip",
            benchmarkId: "market_research",
            reportPath: "",
            goldenPathReportPath: "reports/mock.md",
            exportArtifactId: "",
            screenshotCount: 3,
            sourceCount: 1,
            imageArtifactCount: 2,
          },
        },
        run("market_research", "passed"),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed", "editor"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_benchmark_mismatch",
      "output_bundle_report_missing",
      "output_bundle_export_missing",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });
});

function completeBundle(
  patch: Partial<LiveBenchmarkEvidenceBundle> = {},
): LiveBenchmarkEvidenceBundle {
  return {
    reportPath: "docs/live-benchmark-report.md",
    runs: [
      run("korean_business", "passed"),
      run("market_research", "passed"),
      run("chart_report", "passed"),
      run("image_intro", "passed"),
      run("revision_regeneration", "failed", "editor"),
    ],
    ...patch,
  };
}

function run(
  id: (typeof LIVE_BENCHMARK_IDS)[number],
  status: "passed" | "failed" | "blocked",
  failureDomain: LiveBenchmarkFailureDomain = status === "passed" ? "none" : "provider",
): LiveBenchmarkRun {
  return {
    id,
    status,
    failureDomain,
    source: "live",
    score: status === "passed" ? 92 : 0,
    mockScore: 0,
    goldenPathCompleted: status === "passed",
    outputBundlePath: `bundles/${id}.zip`,
    outputBundle: {
      path: `bundles/${id}.zip`,
      benchmarkId: id,
      reportPath: `reports/${id}.md`,
      goldenPathReportPath: "live_e2e_report.md",
      exportArtifactId: status === "passed" ? `${id}_export` : "",
      screenshotCount: status === "passed" ? 10 : 0,
      sourceCount: status === "passed" ? 3 : 0,
      imageArtifactCount: status === "passed" ? 5 : 0,
    },
  };
}

function withOutputBundlePath(run: LiveBenchmarkRun, path: string): LiveBenchmarkRun {
  return {
    ...run,
    outputBundlePath: path,
    outputBundle: { ...run.outputBundle, path },
  };
}
