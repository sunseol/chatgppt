import { describe, expect, test } from "bun:test";
import { evaluateLiveManualQaEvidence } from "./live-manual-qa-evidence";
import { completeLiveManualQaEvidence as completeEvidence } from "./live-manual-qa-test-fixtures";

describe("live manual QA slide actions", () => {
  test("blocks placeholder slide ids as regeneration or title edit evidence", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: ["placeholder-slide"],
      editedTitleSlideIds: ["template-title-slide"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_slide_regeneration",
      "missing_title_edit",
      "invalid_manual_qa_slide_action",
    ]);
  });

  test("blocks non-canonical slide ids as regeneration or title edit evidence", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: [" slide-3 "],
      editedTitleSlideIds: [" slide-3 "],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_slide_regeneration",
      "missing_title_edit",
      "invalid_manual_qa_slide_action",
    ]);
  });

  test("blocks contaminated slide action ids even when another action id is valid", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: ["slide-3", "placeholder-slide"],
      editedTitleSlideIds: ["slide-3", "template-title-slide"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_manual_qa_slide_action"]);
  });

  test("blocks non-canonical slide ids that are not slide-number references", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: ["1", "slide_", "slide-foo"],
      editedTitleSlideIds: ["-3", "abc", "0"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_slide_regeneration",
      "missing_title_edit",
      "invalid_manual_qa_slide_action",
    ]);
  });
});
