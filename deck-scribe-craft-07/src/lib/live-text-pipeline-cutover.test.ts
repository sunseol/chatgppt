import { describe, expect, test } from "bun:test";
import type { LayoutIR } from "./layout-ir";
import {
  createLiveTextPipelineProviderFailureRecovery,
  evaluateLiveTextPipelineCutover,
} from "./live-text-pipeline-cutover";
import {
  completePipelineFixtures,
  completePipelineInput,
  liveCodexProvenance,
} from "./live-text-pipeline-cutover-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live text pipeline cutover", () => {
  test("accepts separate live Codex plan, design, and layout turns with five-slide context consistency", () => {
    const fixtures = completePipelineFixtures();

    const result = evaluateLiveTextPipelineCutover(completePipelineInput(fixtures));

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_plan",
      "turn_design",
      "turn_layout",
    ]);
    expect(result.deckContextId).toBe("deckctx_214");
    expect(result.designSystemId).toBe(fixtures.design.id);
  });

  test("requires live repair turns for schema failures and blocks after two attempts", () => {
    const fixtures = completePipelineFixtures();
    const invalidLayout: LayoutIR = {
      ...fixtures.layoutIr,
      id: "",
    };

    const repairable = evaluateLiveTextPipelineCutover({
      ...completePipelineInput(fixtures),
      layoutIr: {
        artifact: invalidLayout,
        provenance: liveCodexProvenance("layout_ir_live_bad", "turn_layout_bad", "layout_ir@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
        deckContextId: "deckctx_214",
      },
      repairAttempts: [
        {
          stage: "layout_ir",
          turnId: "turn_layout_repair_1",
          issues: ["Invalid layout id."],
        },
      ],
    });

    expect(repairable.kind).toBe("repair_required");
    if (repairable.kind !== "repair_required") return;
    expect(repairable.stage).toBe("layout_ir");
    expect(repairable.nextTurn.attemptNumber).toBe(2);
    expect(repairable.nextTurn.maxAttempts).toBe(2);

    const exhausted = evaluateLiveTextPipelineCutover({
      ...completePipelineInput(fixtures),
      layoutIr: {
        artifact: invalidLayout,
        provenance: liveCodexProvenance("layout_ir_live_bad", "turn_layout_bad", "layout_ir@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
        deckContextId: "deckctx_214",
      },
      repairAttempts: [
        {
          stage: "layout_ir",
          turnId: "turn_layout_repair_1",
          issues: ["Invalid componentType FreeHtml."],
        },
        {
          stage: "layout_ir",
          turnId: "turn_layout_repair_2",
          issues: ["Still invalid layout id."],
        },
      ],
    });

    expect(exhausted.kind).toBe("blocked");
    if (exhausted.kind !== "blocked") return;
    expect(exhausted.issues.some((issue) => issue.code === "schema_repair_exhausted")).toBe(true);
  });

  test("blocks mock or fixture provenance without fixture fallback", () => {
    const fixtures = completePipelineFixtures();

    const result = evaluateLiveTextPipelineCutover({
      ...completePipelineInput(fixtures),
      designSystem: {
        artifact: fixtures.design,
        provenance: createProviderArtifactProvenance({
          artifactId: "design_system_mock",
          executionMode: "production",
          providerKind: "mock",
          authMode: "none",
          modelOrRuntime: "mock-provider",
          promptVersion: "design_system@v1",
          durationMs: 1,
          inputArtifactIds: ["deck_plan_live_1"],
          fixture: true,
        }),
        deckContextId: "deckctx_214",
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("mock_lineage_contamination")).toBe(true);
    expect(issueCodes.includes("fixture_lineage_contamination")).toBe(true);
    expect(result.recovery.fixtureFallbackAllowed).toBe(false);
  });

  test("blocks slide refs that do not share one deck context and design system", () => {
    const fixtures = completePipelineFixtures();
    const inconsistentRefs = fixtures.slideContextRefs.map((ref, index) =>
      index === 2 ? { ...ref, deckContextId: "deckctx_other" } : ref,
    );

    const result = evaluateLiveTextPipelineCutover({
      ...completePipelineInput(fixtures),
      slideContextRefs: inconsistentRefs,
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.some((issue) => issue.code === "deck_context_mismatch")).toBe(true);
  });

  test("provider failure recovery never offers fixture plan design or layout fallback", () => {
    const recovery = createLiveTextPipelineProviderFailureRecovery({
      stage: "deck_plan",
      message: "Codex structured output failed schema validation.",
    });

    expect(recovery.fixtureFallbackAllowed).toBe(false);
    expect(recovery.actions).toEqual(["retry_live_turn", "manual_input"]);
  });
});
