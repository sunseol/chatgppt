import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "93b567bcdcc6dba485c6869f456068ceb7b4b1a8e434da7e3c91f49a5f7390e5";

describe("live benchmark export artifact uniqueness", () => {
  test("blocks passed benchmark bundles that reuse one final export artifact", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        passedRun("korean_business", "shared_export"),
        passedRun("market_research", "shared_export"),
        passedRun("chart_report", "chart_report_export"),
        passedRun("image_intro", "image_intro_export"),
        failedRun("revision_regeneration"),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "duplicate_output_bundle_artifact",
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

function passedRun(id: LiveBenchmarkRun["id"], exportArtifactId: string): LiveBenchmarkRun {
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
      exportArtifactId,
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
    },
  };
}

function failedRun(id: LiveBenchmarkRun["id"]): LiveBenchmarkRun {
  return {
    ...passedRun(id, ""),
    status: "failed",
    failureDomain: "editor",
    score: 0,
    goldenPathCompleted: false,
  };
}
