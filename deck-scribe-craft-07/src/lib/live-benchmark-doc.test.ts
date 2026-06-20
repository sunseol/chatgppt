import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const BENCHMARK_DOC = new URL("../../docs/live-benchmark-report.md", import.meta.url);

describe("live benchmark documentation", () => {
  test("records regenerated image evidence requirements", () => {
    const benchmark = readFileSync(BENCHMARK_DOC, "utf8");

    expect(benchmark.includes("output_bundle_evidence_count_mismatch")).toBe(true);
    expect(benchmark.includes("unknown_benchmark_scenario")).toBe(true);
    expect(benchmark.includes("output_bundle_synthetic_artifact_reference")).toBe(true);
    expect(benchmark.includes("template`, `sample`, `example`, or `placeholder")).toBe(true);
    expect(benchmark.includes("matching evidence counts")).toBe(true);
    expect(benchmark.includes("output_bundle_regeneration_image_missing")).toBe(true);
    expect(
      benchmark.includes("one separate approved non-synthetic regenerated live image artifact id"),
    ).toBe(true);
    expect(benchmark.includes("initial five-image floor")).toBe(true);
  });
});
