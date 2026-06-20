import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const BENCHMARK_DOC = new URL("../../docs/live-benchmark-report.md", import.meta.url);

describe("live benchmark documentation", () => {
  test("records regenerated image evidence requirements", () => {
    const benchmark = readFileSync(BENCHMARK_DOC, "utf8");

    expect(benchmark.includes("output_bundle_regeneration_image_missing")).toBe(true);
    expect(benchmark.includes("one separate approved regenerated live image artifact id")).toBe(
      true,
    );
    expect(benchmark.includes("initial five-image floor")).toBe(true);
  });
});
