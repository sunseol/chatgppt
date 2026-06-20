import { describe, expect, test } from "bun:test";
import { evaluateLiveTextPipelineCutover } from "./live-text-pipeline-cutover";
import {
  completePipelineFixtures,
  completePipelineInput,
  liveCodexProvenance,
} from "./live-text-pipeline-cutover-test-fixtures";

describe("live text pipeline input identity", () => {
  test("blocks non-canonical handoff input artifact ids", () => {
    // Given
    const fixtures = completePipelineFixtures();
    const input = completePipelineInput(fixtures);

    // When
    const result = evaluateLiveTextPipelineCutover({
      ...input,
      designSystem: {
        ...input.designSystem,
        provenance: liveCodexProvenance("design_system_live_1", "turn_design", "design_system@v1", [
          " deck_plan_live_1 ",
        ]),
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "noncanonical_text_pipeline_input_identity",
    ]);
  });
});
