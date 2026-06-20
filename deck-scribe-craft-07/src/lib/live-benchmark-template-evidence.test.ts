import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark template evidence", () => {
  test("blocks observer template paths and artifact ids in passed benchmark bundles", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: LIVE_BENCHMARK_IDS.map((id) =>
        id === "korean_business"
          ? withTemplateEvidence(run(id, "passed"))
          : run(id, id === "revision_regeneration" ? "failed" : "passed"),
      ),
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_output_bundle",
      "output_bundle_report_missing",
      "output_bundle_synthetic_artifact_reference",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });
});

function run(id: LiveBenchmarkId, status: "passed" | "failed"): LiveBenchmarkRun {
  return {
    id,
    status,
    failureDomain: status === "passed" ? "none" : "editor",
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
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/step_${index + 1}.png`);
}

function withTemplateEvidence(run: LiveBenchmarkRun): LiveBenchmarkRun {
  return {
    ...run,
    outputBundlePath: "bundles/template/korean_business.zip",
    outputBundle: {
      ...run.outputBundle,
      path: "bundles/template/korean_business.zip",
      reportPath: "reports/sample/korean_business.md",
      goldenPathReportPath: "golden-path/example/korean_business/live_e2e_report.md",
      exportArtifactId: "placeholder_export_artifact",
      screenshotPaths: screenshotPaths("placeholder/korean_business"),
      sourceArtifactIds: [
        "korean_business_template_source_1",
        "korean_business_source_2",
        "korean_business_source_3",
      ],
      liveImageArtifactIds: [
        "korean_business_sample_image_1",
        "korean_business_image_2",
        "korean_business_image_3",
        "korean_business_image_4",
        "korean_business_image_5",
        "korean_business_image_regenerated",
      ],
      regeneratedLiveImageArtifactIds: ["korean_business_image_regenerated"],
      liveImageRequestIds: [
        "korean_business_example_request_1",
        "korean_business_request_2",
        "korean_business_request_3",
        "korean_business_request_4",
        "korean_business_request_5",
      ],
    },
  };
}
