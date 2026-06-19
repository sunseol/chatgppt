import { describe, expect, test } from "bun:test";
import { evaluateLiveTextSmokeGate, type LiveTextSmokeArtifact } from "./live-text-smoke-gate";
import type { LiveTextProductionStage } from "./live-text-production-workflow";
import { createProviderArtifactProvenance } from "./provider-provenance";

const REQUIRED_STAGES = [
  "questions",
  "brief",
  "deck_plan",
  "design_system",
  "layout_ir",
] as const satisfies readonly LiveTextProductionStage[];

describe("live text smoke resume identity", () => {
  test("blocks padded post-resume turn reuse from the text artifact lineage", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) => liveArtifact(stage)),
      resumeEvidence: {
        threadId: "thread_live_text",
        previousTurnId: "turn_layout_ir",
        nextTurnId: " turn_layout_ir ",
        completed: true,
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("resume_reused_existing_turn")).toBe(
      true,
    );
  });
});

function liveArtifact(stage: LiveTextProductionStage): LiveTextSmokeArtifact {
  return {
    stage,
    provenance: createProviderArtifactProvenance({
      artifactId: `${stage}_artifact`,
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: "codex-app-server 0.141.0",
      promptVersion: promptVersionFor(stage),
      durationMs: 2_400,
      inputArtifactIds: defaultInputArtifactIds(stage),
      fixture: false,
      threadId: "thread_live_text",
      turnId: `turn_${stage}`,
    }),
  };
}

function promptVersionFor(stage: LiveTextProductionStage): string {
  switch (stage) {
    case "questions":
      return "interview_questions_desktop@v1";
    case "brief":
      return "interview_brief@v1";
    case "deck_plan":
      return "deck_plan_desktop@v1";
    case "design_system":
      return "design_system_desktop@v1";
    case "layout_ir":
      return "layout_ir_desktop@v1";
  }
}

function defaultInputArtifactIds(stage: LiveTextProductionStage): readonly string[] {
  switch (stage) {
    case "questions":
      return [];
    case "brief":
      return ["questions_artifact"];
    case "deck_plan":
      return ["brief_artifact"];
    case "design_system":
      return ["deck_plan_artifact"];
    case "layout_ir":
      return ["deck_plan_artifact", "design_system_artifact"];
  }
}
