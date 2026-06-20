import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark image request evidence", () => {
  test("blocks passed output bundles that reuse one live image request id", () => {
    // Given
    const bundle = completeBundle({
      runs: [runWithImageRequestIds("korean_business", repeatedImageRequestIds()), ...passedRuns()],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "output_bundle_golden_path_evidence_missing",
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

function passedRuns(): readonly LiveBenchmarkRun[] {
  return [
    runWithImageRequestIds("market_research", distinctImageRequestIds("market_research")),
    runWithImageRequestIds("chart_report", distinctImageRequestIds("chart_report")),
    runWithImageRequestIds("image_intro", distinctImageRequestIds("image_intro")),
    failedRun("revision_regeneration"),
  ];
}

function runWithImageRequestIds(
  id: LiveBenchmarkRun["id"],
  liveImageRequestIds: readonly string[],
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
      liveImageRequestIds,
    },
  };
}

function failedRun(id: LiveBenchmarkRun["id"]): LiveBenchmarkRun {
  return {
    ...runWithImageRequestIds(id, []),
    status: "failed",
    failureDomain: "editor",
    score: 0,
    goldenPathCompleted: false,
    outputBundle: {
      ...runWithImageRequestIds(id, []).outputBundle,
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
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/step_${index + 1}.png`);
}

function repeatedImageRequestIds(): readonly string[] {
  return ["img_req_reused", "img_req_reused", "img_req_reused", "img_req_reused", "img_req_reused"];
}

function distinctImageRequestIds(prefix: string): readonly string[] {
  return Array.from({ length: 5 }, (_, index) => `${prefix}_img_req_${index + 1}`);
}
