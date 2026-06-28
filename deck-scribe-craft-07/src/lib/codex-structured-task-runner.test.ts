import { describe, expect, test } from "bun:test";
import {
  evaluateStructuredCodexOutput,
  type StructuredCodexParser,
} from "./codex-structured-task-runner";

type DeckPlanShape = {
  readonly title: string;
  readonly slideCount: number;
};

const parseDeckPlan: StructuredCodexParser<DeckPlanShape> = (value) => {
  if (!isRecord(value)) return { kind: "invalid", issues: ["object required"] };
  const title = value["title"];
  const slideCount = value["slideCount"];
  if (typeof title !== "string" || typeof slideCount !== "number") {
    return { kind: "invalid", issues: ["title and slideCount required"] };
  }
  return { kind: "valid", value: { title, slideCount } };
};

describe("codex structured task runner", () => {
  test("accepts only completed schema-valid output with live turn provenance", () => {
    const result = evaluateStructuredCodexOutput({
      event: {
        kind: "completed",
        payload: { title: "Live plan", slideCount: 5 },
        turnId: "turn_001",
        threadId: "thread_001",
        runtime: "codex-app-server 1.0.0",
        promptVersion: "deck_plan@v1",
        durationMs: 1_200,
        inputArtifactIds: ["research_001"],
      },
      artifactId: "plan_live_001",
      parse: parseDeckPlan,
    });

    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect(result.value.title).toBe("Live plan");
    expect(result.provenance.turnId).toBe("turn_001");
    expect(result.provenance.threadId).toBe("thread_001");
  });

  test("blocks partial output even when it contains JSON-looking text", () => {
    const result = evaluateStructuredCodexOutput({
      event: {
        kind: "partial",
        text: '{"title":"Do not approve partial text","slideCount":5}',
        turnId: "turn_partial",
        threadId: "thread_001",
      },
      artifactId: "plan_live_partial",
      parse: parseDeckPlan,
    });

    expect(result).toEqual({
      kind: "blocked",
      code: "partial_output_not_approvable",
      issues: ["Partial Codex output cannot be saved as an approval artifact."],
    });
  });

  test("blocks completed output that does not pass the declared schema", () => {
    const result = evaluateStructuredCodexOutput({
      event: {
        kind: "completed",
        payload: { title: "Missing count" },
        turnId: "turn_002",
        threadId: "thread_001",
        runtime: "codex-app-server 1.0.0",
        promptVersion: "deck_plan@v1",
        durationMs: 900,
        inputArtifactIds: ["research_001"],
      },
      artifactId: "plan_live_invalid",
      parse: parseDeckPlan,
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.code).toBe("schema_invalid");
    expect(result.issues).toEqual(["title and slideCount required"]);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
