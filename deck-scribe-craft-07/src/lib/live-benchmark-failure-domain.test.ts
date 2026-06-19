import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkFailureDomain,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "1724e22d62f8c011779ddaf5ae98297c1637dae48143dd884a40107630f9b0aa";

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
      sourceCount: 3,
      sourceArtifactIds: [`${id}_src_1`, `${id}_src_2`, `${id}_src_3`],
      imageArtifactCount: 5,
      liveImageArtifactIds: Array.from({ length: 5 }, (_, index) => `${id}_image_${index + 1}`),
      liveImageRequestIds: Array.from({ length: 5 }, (_, index) => `${id}_req_${index + 1}`),
    },
  };
}
