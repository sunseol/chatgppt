import { describe, expect, test } from "bun:test";
import {
  AUTOMATED_TEST_SUITE_COMMAND,
  AUTOMATED_TEST_SUITE_TARGETS,
  REQUIRED_AUTOMATED_SUITE_STAGES,
  createAutomatedSuitePlan,
  formatAutomatedSuiteFailure,
} from "./automated-test-suite";

describe("automated MVP test suite manifest", () => {
  test("covers every required regression stage with concrete test files", () => {
    const stages = AUTOMATED_TEST_SUITE_TARGETS.map((target) => target.stage);

    expect(REQUIRED_AUTOMATED_SUITE_STAGES.every((stage) => stages.includes(stage))).toBe(true);
    expect(AUTOMATED_TEST_SUITE_TARGETS.every((target) => target.command === "bun test")).toBe(
      true,
    );
    expect(AUTOMATED_TEST_SUITE_TARGETS.every((target) => target.testFiles.length > 0)).toBe(true);
    expect(AUTOMATED_TEST_SUITE_TARGETS.every((target) => target.artifactId.length > 0)).toBe(true);
  });

  test("formats failures with stage and artifact id", () => {
    const target = AUTOMATED_TEST_SUITE_TARGETS[0];
    if (!target) throw new Error("Expected suite target.");

    const message = formatAutomatedSuiteFailure(target, "expected failure excerpt");

    expect(message.includes(target.stage)).toBe(true);
    expect(message.includes(target.artifactId)).toBe(true);
    expect(message.includes("expected failure excerpt")).toBe(true);
  });

  test("exposes a single mock-provider runnable command", () => {
    const plan = createAutomatedSuitePlan();

    expect(AUTOMATED_TEST_SUITE_COMMAND).toBe("bun run test:suite");
    expect(plan.mockProviderRunnable).toBe(true);
    expect(plan.command).toBe(AUTOMATED_TEST_SUITE_COMMAND);
    expect(plan.targets.length).toBe(AUTOMATED_TEST_SUITE_TARGETS.length);
  });
});
