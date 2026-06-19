import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkFailureDomain,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark failure domains", () => {
  test("blocks failed benchmark evidence with an unsupported failure domain", () => {
    // Given
    const bundle = completeBundle({
      runs: [
        run("korean_business", "passed"),
        run("market_research", "passed"),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed", "billing" as LiveBenchmarkFailureDomain),
      ],
    });

    // When
    const result = evaluateLiveBenchmarkEvidence(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_failure_domain"]);
  });
});

function completeBundle(
  patch: Partial<LiveBenchmarkEvidenceBundle> = {},
): LiveBenchmarkEvidenceBundle {
  return {
    reportPath: "docs/live-benchmark-report.md",
    packageArchiveSha256: PACKAGE_SHA,
    runs: LIVE_BENCHMARK_IDS.map((id) => run(id, "passed")),
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
      goldenPathReportPath: `reports/${id}/live_e2e_report.md`,
      exportArtifactId: `export_${id}`,
      screenshotCount: 10,
      screenshotPaths: screenshotPaths(id),
      sourceCount: 3,
      sourceArtifactIds: [`${id}_src_1`, `${id}_src_2`, `${id}_src_3`],
      imageArtifactCount: 5,
      liveImageArtifactIds: Array.from({ length: 5 }, (_, index) => `${id}_image_${index + 1}`),
      liveImageRequestIds: Array.from({ length: 5 }, (_, index) => `${id}_req_${index + 1}`),
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/step_${index + 1}.png`);
}
