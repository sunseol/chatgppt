import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark scenario uniqueness", () => {
  test("blocks duplicate benchmark scenarios from counting as five Live benchmark outputs", () => {
    // Given
    const bundle = completeBundle({
      runs: [...LIVE_BENCHMARK_IDS.map((id) => run(id)), run("korean_business", "duplicate")],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_benchmark_scenario"]);
  });

  test("blocks unknown benchmark scenarios from inflating the four-of-five pass count", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        run("korean_business"),
        run("market_research"),
        run("chart_report"),
        failedRun("image_intro"),
        failedRun("revision_regeneration"),
        run("rogue_scenario" as (typeof LIVE_BENCHMARK_IDS)[number]),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.passedLiveCount).toBe(3);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "unknown_benchmark_scenario",
      "live_benchmark_shortfall",
    ]);
  });
});

function completeBundle(
  patch: Partial<LiveBenchmarkEvidenceBundle> = {},
): LiveBenchmarkEvidenceBundle {
  return {
    reportPath: "docs/live-benchmark-report.md",
    packageArchiveSha256: PACKAGE_SHA,
    runs: LIVE_BENCHMARK_IDS.map((id) => run(id)),
    ...patch,
  };
}

function run(id: (typeof LIVE_BENCHMARK_IDS)[number], pathSuffix: string = id): LiveBenchmarkRun {
  const outputBundlePath = `bundles/${id}-${pathSuffix}.zip`;
  return {
    id,
    status: "passed",
    failureDomain: "none",
    source: "live",
    score: 92,
    mockScore: 0,
    goldenPathCompleted: true,
    outputBundlePath,
    outputBundle: {
      path: outputBundlePath,
      benchmarkId: id,
      packageArchiveSha256: PACKAGE_SHA,
      reportPath: `reports/${id}.md`,
      goldenPathReportPath: `golden-path/${id}/${pathSuffix}/live_e2e_report.md`,
      exportArtifactId: `${id}_${pathSuffix}_export`,
      screenshotCount: 10,
      screenshotPaths: screenshotPaths(id, pathSuffix),
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
      liveImageRequestIds: [
        `${id}_img_req_1`,
        `${id}_img_req_2`,
        `${id}_img_req_3`,
        `${id}_img_req_4`,
        `${id}_img_req_5`,
      ],
    },
  };
}

function failedRun(id: (typeof LIVE_BENCHMARK_IDS)[number]): LiveBenchmarkRun {
  return {
    ...run(id),
    status: "failed",
    failureDomain: "editor",
    score: 0,
    goldenPathCompleted: false,
  };
}

function screenshotPaths(id: string, pathSuffix: string): readonly string[] {
  return Array.from(
    { length: 10 },
    (_, index) => `screenshots/${id}/${pathSuffix}/step_${index + 1}.png`,
  );
}
