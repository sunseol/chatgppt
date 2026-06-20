import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
} from "./production-packaging-evidence";
import {
  completeProductionPackagingEvidence,
  productionCleanMachineStepEvidencePaths,
} from "./production-packaging-test-fixtures";

describe("production packaging clean-machine step evidence", () => {
  test("blocks duplicated clean-machine steps from inflating validation coverage", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineSteps: [
          "install_app",
          "codex_login",
          "codex_login",
          "image_credentials",
          "project_launch",
          "live_interview",
        ],
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_clean_machine_step"]);
    expect(result.issues[0]?.refs).toEqual(["codex_login"]);
  });

  test("summarizes distinct clean-machine steps instead of raw repeated events", () => {
    // Given
    const summary = formatProductionPackagingEvidenceSummary(
      completeProductionPackagingEvidence({
        cleanMachineSteps: [
          "install_app",
          "codex_login",
          "codex_login",
          "project_launch",
          "live_interview",
        ],
      }),
    );

    // Then
    expect(summary.includes("clean-machine steps: 4/5")).toBe(true);
  });

  test("blocks clean-machine step labels without persisted evidence paths", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineStepEvidencePaths: {},
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_step_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "install_app",
      "codex_login",
      "image_credentials",
      "project_launch",
      "live_interview",
    ]);
  });

  test("blocks clean-machine step evidence paths that reference another step", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineStepEvidencePaths: {
          ...productionCleanMachineStepEvidencePaths(),
          codex_login: "release-evidence/clean-machine/install-app.json",
        },
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_step_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual(["codex_login"]);
  });

  test("blocks one clean-machine evidence path reused for every step", () => {
    // Given
    const reusedPath =
      "release-evidence/clean-machine/install-app-codex-login-image-credentials-project-launch-live-interview.json";
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineStepEvidencePaths: {
          install_app: reusedPath,
          codex_login: reusedPath,
          image_credentials: reusedPath,
          project_launch: reusedPath,
          live_interview: reusedPath,
        },
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_step_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "install_app",
      "codex_login",
      "image_credentials",
      "project_launch",
      "live_interview",
    ]);
  });
});
