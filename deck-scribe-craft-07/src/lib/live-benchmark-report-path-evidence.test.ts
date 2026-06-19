import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "1724e22d62f8c011779ddaf5ae98297c1637dae48143dd884a40107630f9b0aa";

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
    Pick<LiveBenchmarkRun["outputBundle"], "reportPath" | "goldenPathReportPath">
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
      sourceCount: 3,
      sourceArtifactIds: [`${id}_source_1`, `${id}_source_2`, `${id}_source_3`],
      imageArtifactCount: 5,
      liveImageArtifactIds: [
        `${id}_image_1`,
        `${id}_image_2`,
        `${id}_image_3`,
        `${id}_image_4`,
        `${id}_image_5`,
      ],
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
      sourceCount: 0,
      sourceArtifactIds: [],
      imageArtifactCount: 0,
      liveImageArtifactIds: [],
      liveImageRequestIds: [],
    },
  };
}
