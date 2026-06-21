import { describe, expect, test } from "bun:test";
import { evaluateProductionPackagingEvidence } from "./production-packaging-evidence";
import { completeProductionPackagingEvidence } from "./production-packaging-test-fixtures";

describe("production packaging clean-machine account evidence", () => {
  test("blocks clean-machine steps without persisted clean macOS account evidence", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineAccountEvidencePath: undefined,
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_account_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual(["missing"]);
  });

  test("blocks developer-local clean-machine account evidence paths", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineAccountEvidencePath:
          "/Users/jake/chatgppt/release-evidence/clean-machine/macos-account.json",
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_account_evidence",
    ]);
  });

  test("blocks generic account evidence that does not identify clean-machine macOS account proof", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineAccountEvidencePath: "release-evidence/clean-machine/account.json",
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_account_evidence",
    ]);
  });

  test("blocks clean-machine account evidence paths that rely on boundary whitespace", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        cleanMachineAccountEvidencePath:
          " release-evidence/clean-machine/clean-macos-account.json ",
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_account_evidence",
    ]);
  });
});
