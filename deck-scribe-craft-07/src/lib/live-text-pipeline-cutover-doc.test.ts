import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const TEXT_PIPELINE_CUTOVER_DOC = new URL(
  "../../docs/live-text-pipeline-cutover.md",
  import.meta.url,
);

describe("live text pipeline cutover documentation", () => {
  test("records the live text pipeline cutover contract", () => {
    const text = readFileSync(TEXT_PIPELINE_CUTOVER_DOC, "utf8");

    expect(text.includes("DF-214")).toBe(true);
    expect(text.includes("DesignSystemSchema")).toBe(true);
    expect(text.includes("LayoutIRSchema")).toBe(true);
    expect(text.includes("invalid_repair_turn_evidence")).toBe(true);
    expect(text.includes("schema_repair_exhausted")).toBe(true);
    expect(text.includes("shared_live_turn")).toBe(true);
    expect(text.includes("shared_live_artifact")).toBe(true);
    expect(text.includes("noncanonical_text_pipeline_input_identity")).toBe(true);
    expect(text.includes("text_pipeline_prompt_version_mismatch")).toBe(true);
    expect(text.includes("deck_plan_desktop@v1")).toBe(true);
    expect(text.includes("layout_ir_desktop@v1")).toBe(true);
    expect(text.includes("non-session Codex auth")).toBe(true);
  });
});
