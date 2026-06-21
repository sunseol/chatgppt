import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkFailureDomain,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark scenario path evidence", () => {
  test("blocks passed benchmark bundles that borrow another scenario's report paths", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        withBorrowedScenarioPaths(run("korean_business", "passed"), "market_research"),
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
      "output_bundle_scenario_evidence_mismatch",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "korean_business:reports/market_research/borrowed.md",
      "korean_business:golden-path/market_research/borrowed/live_e2e_report.md",
      ...LIVE_GOLDEN_PATH_E2E_STEPS.map(
        (step) => `korean_business:screenshots/market_research/borrowed/${step}.png`,
      ),
    ]);
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
  id: LiveBenchmarkId,
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

function withBorrowedScenarioPaths(
  benchmarkRun: LiveBenchmarkRun,
  borrowedScenario: LiveBenchmarkId,
): LiveBenchmarkRun {
  return {
    ...benchmarkRun,
    outputBundle: {
      ...benchmarkRun.outputBundle,
      reportPath: `reports/${borrowedScenario}/borrowed.md`,
      goldenPathReportPath: `golden-path/${borrowedScenario}/borrowed/live_e2e_report.md`,
      screenshotPaths: LIVE_GOLDEN_PATH_E2E_STEPS.map(
        (step) => `screenshots/${borrowedScenario}/borrowed/${step}.png`,
      ),
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${id}/${step}.png`);
}
