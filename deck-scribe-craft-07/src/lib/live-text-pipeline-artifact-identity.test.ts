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
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("shared_live_turn")).toBe(true);
    expect(issueCodes.includes("shared_live_artifact")).toBe(true);
  });

  test("blocks otherwise distinct artifacts with non-canonical persisted identities", () => {
    const fixtures = completePipelineFixtures();
    const input = completePipelineInput(fixtures);

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      designSystem: {
        ...input.designSystem,
        provenance: liveCodexProvenance(
          " design_system_live_1 ",
          " turn_design ",
          "design_system@v1",
          ["deck_plan_live_1"],
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("noncanonical_text_pipeline_identity"),
    ).toBe(true);
  });

  test("blocks approved brief and research inputs that reuse one artifact id", () => {
    const fixtures = completePipelineFixtures();
    const input = completePipelineInput(fixtures);
    const reusedUpstreamArtifactId = input.approvedBriefArtifactId;

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      approvedResearchPackArtifactId: ` ${reusedUpstreamArtifactId} `,
      deckPlan: {
        ...input.deckPlan,
        provenance: liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan@v1", [
          reusedUpstreamArtifactId,
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "noncanonical_text_pipeline_input_identity",
      "shared_brief_research_input",
    ]);
  });
});
