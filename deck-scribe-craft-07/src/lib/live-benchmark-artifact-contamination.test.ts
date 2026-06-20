import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark artifact contamination", () => {
  test("blocks synthetic artifact and request ids in passed benchmark bundles", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withSyntheticRefs(run("korean_business", "passed")),
        run("market_research", "passed"),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_synthetic_artifact_reference",
    ]);
  });
});

function run(id: LiveBenchmarkRun["id"], status: "passed" | "failed"): LiveBenchmarkRun {
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
          ? Array.from({ length: 5 }, (_, index) => `${id}_request_${index + 1}`)
          : [],
    },
  };
}

function withSyntheticRefs(run: LiveBenchmarkRun): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: {
      ...run.outputBundle,
      sourceArtifactIds: ["mock_source_1", "korean_business_source_2", "korean_business_source_3"],
      liveImageArtifactIds: [
        "fixture_image_1",
        "korean_business_image_2",
        "korean_business_image_3",
        "korean_business_image_4",
        "korean_business_image_5",
        "korean_business_image_regenerated",
      ],
      regeneratedLiveImageArtifactIds: ["korean_business_image_regenerated"],
      liveImageRequestIds: [
        "fake_request_1",
        "korean_business_request_2",
        "korean_business_request_3",
        "korean_business_request_4",
        "korean_business_request_5",
      ],
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/step_${index + 1}.png`);
}
