import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkFailureDomain,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { formatLiveBenchmarkEvidenceSummary } from "./live-benchmark-evidence-summary";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

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
            packageArchiveSha256: PACKAGE_SHA,
            reportPath: "",
            goldenPathReportPath: "reports/mock.md",
            exportArtifactId: "",
            screenshotCount: 3,
            sourceCount: 1,
            sourceArtifactIds: ["source_1"],
            imageArtifactCount: 2,
            liveImageArtifactIds: ["image_1", "image_2"],
            liveImageRequestIds: ["img_req_1", "img_req_2"],
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
      "output_bundle_evidence_count_mismatch",
      "output_bundle_report_missing",
      "output_bundle_export_missing",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });

  test("blocks passed benchmark bundles with duplicated source or image artifacts", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        {
          ...run("korean_business", "passed"),
          outputBundle: {
            ...run("korean_business", "passed").outputBundle,
            sourceArtifactIds: ["source_a", "source_a", "source_b"],
            liveImageArtifactIds: ["image_a", "image_a", "image_b", "image_c", "image_d"],
            liveImageRequestIds: ["img_req_1", "img_req_2", "img_req_3", "img_req_4", "img_req_5"],
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
      "output_bundle_evidence_count_mismatch",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });

  test("blocks benchmark bundles from a different package candidate", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        {
          ...run("korean_business", "passed"),
          outputBundle: {
            ...run("korean_business", "passed").outputBundle,
            packageArchiveSha256: "old-package-sha",
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
    expect(result.issues.map((issue) => issue.code)).toEqual(["output_bundle_package_mismatch"]);
  });

  test("blocks package hashes that only match after case normalization", () => {
    // Given
    const upperCasePackageSha = PACKAGE_SHA.toUpperCase();
    const bundle = completeBundle({
      packageArchiveSha256: upperCasePackageSha,
      runs: completeBundle().runs.map((item) => withPackageSha(item, upperCasePackageSha)),
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_benchmark_package_hash"]);
  });
});

function completeBundle(
  patch: Partial<LiveBenchmarkEvidenceBundle> = {},
): LiveBenchmarkEvidenceBundle {
  return {
    reportPath: "docs/live-benchmark-report.md",
    packageArchiveSha256: PACKAGE_SHA,
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
      packageArchiveSha256: PACKAGE_SHA,
      reportPath: `reports/${id}.md`,
      goldenPathReportPath: `golden-path/${id}/live_e2e_report.md`,
      exportArtifactId: status === "passed" ? `${id}_export` : "",
      screenshotCount: status === "passed" ? 10 : 0,
      screenshotPaths: status === "passed" ? screenshotPaths(id) : [],
      sourceCount: status === "passed" ? 3 : 0,
      sourceArtifactIds:
        status === "passed" ? [`${id}_source_1`, `${id}_source_2`, `${id}_source_3`] : [],
      imageArtifactCount: status === "passed" ? 6 : 0,
      liveImageArtifactIds:
        status === "passed"
          ? [
              `${id}_image_1`,
              `${id}_image_2`,
              `${id}_image_3`,
              `${id}_image_4`,
              `${id}_image_5`,
              `${id}_image_regenerated`,
            ]
          : [],
      regeneratedLiveImageArtifactIds: status === "passed" ? [`${id}_image_regenerated`] : [],
      liveImageRequestIds:
        status === "passed"
          ? Array.from({ length: 5 }, (_, index) => `${id}_img_req_${index + 1}`)
          : [],
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${id}/${step}.png`);
}

function withOutputBundlePath(run: LiveBenchmarkRun, path: string): LiveBenchmarkRun {
  return {
    ...run,
    outputBundlePath: path,
    outputBundle: { ...run.outputBundle, path },
  };
}

function withPackageSha(run: LiveBenchmarkRun, packageArchiveSha256: string): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: { ...run.outputBundle, packageArchiveSha256 },
  };
}
