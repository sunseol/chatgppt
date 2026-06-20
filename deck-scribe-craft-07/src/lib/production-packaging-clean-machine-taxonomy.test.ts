import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";
import { completeProductionPackagingEvidence } from "./production-packaging-test-fixtures";

describe("production packaging clean-machine taxonomy", () => {
  test("blocks unsupported runtime clean-machine steps", () => {
    // Given: runtime evidence includes all required steps plus an unsupported step label.
    const evidence = runtimeEvidence({
      ...completeEvidence(),
      cleanMachineSteps: [
        "install_app",
        "codex_login",
        "image_credentials",
        "project_launch",
        "live_interview",
        "fixture_clean_machine_step",
      ],
    });

    // When / Then: unsupported clean-machine labels cannot pass as release evidence.
    const result = evaluateProductionPackagingEvidence(evidence);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_clean_machine_step"]);
    expect(result.issues[0]?.refs).toEqual(["fixture_clean_machine_step"]);
  });

  test("summarizes only valid clean-machine steps", () => {
    // Given: an unsupported step attempts to replace the missing live interview step.
    const evidence = runtimeEvidence({
      ...completeEvidence(),
      cleanMachineSteps: [
        "install_app",
        "codex_login",
        "image_credentials",
        "project_launch",
        "fixture_clean_machine_step",
      ],
    });

    // When / Then: summary coverage does not count unsupported step names.
    const summary = formatProductionPackagingEvidenceSummary(evidence);

    expect(summary.includes("clean-machine steps: 4/5")).toBe(true);
  });
});

function runtimeEvidence(value: object): ProductionPackagingEvidence {
  return JSON.parse(JSON.stringify(value));
}

const completeEvidence = completeProductionPackagingEvidence;
