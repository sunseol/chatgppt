import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "613194526b1517077df98c20581a84e30f44cb9c540e3f0c8a296ffbde11f158";

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
