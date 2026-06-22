import { describe, expect, test } from "bun:test";
import { evaluateLiveManualQaEvidence } from "./live-manual-qa-evidence";
import { completeLiveManualQaEvidence as completeEvidence } from "./live-manual-qa-test-fixtures";

describe("live manual QA duration evidence", () => {
  test("blocks zero-duration sessions from satisfying observed manual QA", () => {
    // Given
    const evidence = completeEvidence({ sessionDurationMs: 0 });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["setup_over_time"]);
  });
});
