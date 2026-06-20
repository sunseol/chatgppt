import { describe, expect, test } from "bun:test";
import type { LayoutIR } from "./layout-ir";
import { evaluateLiveTextPipelineCutover } from "./live-text-pipeline-cutover";
import {
  completePipelineFixtures,
  completePipelineInput,
  liveCodexProvenance,
} from "./live-text-pipeline-cutover-test-fixtures";

describe("live text pipeline repair evidence", () => {
  test("blocks schema repair attempts that do not prove fresh live repair turns", () => {
    const fixtures = completePipelineFixtures();
    const invalidLayout: LayoutIR = { ...fixtures.layoutIr, id: "" };

    const result = evaluateLiveTextPipelineCutover({
      ...completePipelineInput(fixtures),
      layoutIr: {
        artifact: invalidLayout,
        provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
        deckContextId: "deckctx_214",
      },
      repairAttempts: [
        { stage: "layout_ir", turnId: "turn_layout", issues: ["Invalid layout id."] },
        { stage: "layout_ir", turnId: "", issues: ["Still invalid layout id."] },
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => String(issue.code));
    expect(issueCodes.includes("invalid_repair_turn_evidence")).toBe(true);
  });
});
