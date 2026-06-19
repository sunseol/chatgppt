import { describe, expect, test } from "bun:test";
import { evaluateLiveTextPipelineCutover } from "./live-text-pipeline-cutover";
import {
  completePipelineFixtures,
  completePipelineInput,
  liveCodexProvenance,
} from "./live-text-pipeline-cutover-test-fixtures";

describe("live text pipeline artifact identity", () => {
  test("blocks design artifacts that pad a reused deck plan artifact and turn id", () => {
    const fixtures = completePipelineFixtures();
    const input = completePipelineInput(fixtures);
    const planArtifactId = input.deckPlan.provenance.artifactId;
    const planTurnId = input.deckPlan.provenance.turnId ?? "turn_plan";

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      designSystem: {
        ...input.designSystem,
        provenance: liveCodexProvenance(
          ` ${planArtifactId} `,
          ` ${planTurnId} `,
          "design_system@v1",
          [planArtifactId],
        ),
      },
      layoutIr: {
        ...input.layoutIr,
        provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
          planArtifactId,
          ` ${planArtifactId} `,
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "shared_live_turn",
      "shared_live_artifact",
    ]);
  });
});
