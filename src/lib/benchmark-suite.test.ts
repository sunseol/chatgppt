import { describe, expect, test } from "bun:test";
import {
  FULL_30_BENCHMARK_SUITE,
  REQUIRED_BENCHMARK_CATEGORIES,
  validateBenchmarkSuiteManifest,
} from "./benchmark-suite";

describe("full 30 benchmark suite manifest", () => {
  test("defines exactly thirty benchmark prompts", () => {
    expect(FULL_30_BENCHMARK_SUITE.benchmarks.length).toBe(30);
    expect(new Set(FULL_30_BENCHMARK_SUITE.benchmarks.map((item) => item.id)).size).toBe(30);
    expect(FULL_30_BENCHMARK_SUITE.benchmarks.every((item) => item.initialPrompt.length > 20)).toBe(
      true,
    );
  });

  test("covers every required benchmark category", () => {
    const categories = new Set(FULL_30_BENCHMARK_SUITE.benchmarks.map((item) => item.category));

    expect(REQUIRED_BENCHMARK_CATEGORIES.every((category) => categories.has(category))).toBe(true);
  });

  test("has verification points and passes the eighty percent evaluability gate", () => {
    const report = validateBenchmarkSuiteManifest(FULL_30_BENCHMARK_SUITE);

    expect(
      FULL_30_BENCHMARK_SUITE.benchmarks.every(
        (item) => item.expectedVerificationPoints.length >= 2,
      ),
    ).toBe(true);
    expect(report.benchmarkCount).toBe(30);
    expect(report.evaluableRate >= 0.8).toBe(true);
    expect(report.passed).toBe(true);
    expect(report.issues).toEqual([]);
  });
});
