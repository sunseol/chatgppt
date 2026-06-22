import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark report path evidence", () => {
  test("blocks synthetic scenario and Golden Path report paths", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        passedRun("korean_business", {
          reportPath: "fixtures/korean_business-report.md",
          goldenPathReportPath: "fixtures/live_e2e_report.md",
        }),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "output_bundle_report_missing",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });

  test("blocks developer-local benchmark report paths", () => {
    const bundle = completeBundle({
      reportPath: "/Users/jake/chatgppt/reports/live-benchmark-report.md",
      runs: [
        passedRun("korean_business", {
          reportPath: "/Users/jake/chatgppt/reports/korean_business.md",
          goldenPathReportPath: "/Users/jake/chatgppt/reports/live_e2e_report.md",
        }),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    const result = evaluateLiveBenchmarkEvidence(bundle);

    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "output_bundle_report_missing",
      "output_bundle_golden_path_evidence_missing",
      "missing_live_benchmark_report",
    ]);
  });

  test("blocks benchmark report paths that only become valid after trimming", () => {
    // Given
    const bundle = completeBundle({
      reportPath: " docs/live-benchmark-report.md ",
      runs: [
        passedRun("korean_business"),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_live_benchmark_report",
    ]);
  });

  test("blocks benchmark report paths outside the committed docs location", () => {
    // Given
    const bundle = completeBundle({
      reportPath: "tmp/live-benchmark-report.md",
      runs: [
        passedRun("korean_business"),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_live_benchmark_report",
    ]);
  });

  test("blocks scenario report paths that only become valid after trimming", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        passedRun("korean_business", { reportPath: " reports/korean_business.md " }),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "output_bundle_report_missing",
    ]);
  });

  test("blocks final export artifact ids that only become valid after trimming", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        passedRun("korean_business", { exportArtifactId: " korean_business_export " }),
        passedRun("market_research"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "output_bundle_export_missing",
    ]);
  });
});

function completeBundle(patch: Partial<LiveBenchmarkEvidenceBundle>): LiveBenchmarkEvidenceBundle {
  return {
    reportPath: "docs/live-benchmark-report.md",
    packageArchiveSha256: PACKAGE_SHA,
    runs: [],
    ...patch,
  };
}

function passedRun(
  id: LiveBenchmarkRun["id"],
  paths: Partial<
    Pick<
      LiveBenchmarkRun["outputBundle"],
      "reportPath" | "goldenPathReportPath" | "exportArtifactId"
    >
  > = {},
): LiveBenchmarkRun {
  return {
    id,
    status: "passed",
    failureDomain: "none",
    source: "live",
    score: 92,
    mockScore: 0,
    goldenPathCompleted: true,
    outputBundlePath: `bundles/${id}.zip`,
    outputBundle: {
      path: `bundles/${id}.zip`,
      benchmarkId: id,
      packageArchiveSha256: PACKAGE_SHA,
      reportPath: `reports/${id}.md`,
      goldenPathReportPath: `golden-path/${id}/live_e2e_report.md`,
      exportArtifactId: `${id}_export`,
      screenshotCount: 10,
      screenshotPaths: screenshotPaths(id),
      sourceCount: 3,
      sourceArtifactIds: [`${id}_source_1`, `${id}_source_2`, `${id}_source_3`],
      imageArtifactCount: 6,
      liveImageArtifactIds: [
        `${id}_image_1`,
        `${id}_image_2`,
        `${id}_image_3`,
        `${id}_image_4`,
        `${id}_image_5`,
        `${id}_image_regenerated`,
      ],
      regeneratedLiveImageArtifactIds: [`${id}_image_regenerated`],
      liveImageRequestIds: Array.from({ length: 5 }, (_, index) => `${id}_img_req_${index + 1}`),
      ...paths,
    },
  };
}

function failedRun(id: LiveBenchmarkRun["id"]): LiveBenchmarkRun {
  return {
    ...passedRun(id),
    status: "failed",
    failureDomain: "editor",
    score: 0,
    goldenPathCompleted: false,
    outputBundle: {
      ...passedRun(id).outputBundle,
      exportArtifactId: "",
      screenshotCount: 0,
      screenshotPaths: [],
      sourceCount: 0,
      sourceArtifactIds: [],
      imageArtifactCount: 0,
      liveImageArtifactIds: [],
      liveImageRequestIds: [],
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${id}/${step}.png`);
}
