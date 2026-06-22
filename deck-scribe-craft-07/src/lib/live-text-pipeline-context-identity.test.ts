import { describe, expect, test } from "bun:test";
import { evaluateLiveTextPipelineCutover } from "./live-text-pipeline-cutover";
import {
  completePipelineFixtures,
  completePipelineInput,
} from "./live-text-pipeline-cutover-test-fixtures";

describe("live text pipeline context identity", () => {
  test("blocks shared deck context ids that are only canonical after trimming", () => {
    // Given
    const fixtures = completePipelineFixtures();
    const input = completePipelineInput(fixtures);
    const paddedDeckContextId = ` ${input.deckContextId} `;

    // When
    const result = evaluateLiveTextPipelineCutover({
      ...input,
      deckContextId: paddedDeckContextId,
      deckPlan: { ...input.deckPlan, deckContextId: paddedDeckContextId },
      designSystem: { ...input.designSystem, deckContextId: paddedDeckContextId },
      layoutIr: { ...input.layoutIr, deckContextId: paddedDeckContextId },
      slideContextRefs: input.slideContextRefs.map((ref) => ({
        ...ref,
        deckContextId: paddedDeckContextId,
      })),
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("deck_context_mismatch")).toBe(true);
  });
});
