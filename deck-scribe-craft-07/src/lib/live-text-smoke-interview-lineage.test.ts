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

describe("live text smoke interview lineage", () => {
  test("blocks smoke bundles that omit initial prompt and answer artifact lineage", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) =>
        liveArtifact(
          stage,
          stage === "questions"
            ? []
            : stage === "brief"
              ? ["questions_artifact"]
              : defaultInputArtifactIds(stage),
        ),
      ),
      resumeEvidence: {
        threadId: "thread_live_text",
        previousTurnId: "turn_layout_ir",
        nextTurnId: "turn_resume_after_layout",
        completed: true,
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("text_smoke_missing_initial_prompt_input")).toBe(true);
    expect(issueCodes.includes("text_smoke_missing_answer_input")).toBe(true);
  });
});

function liveArtifact(
  stage: LiveTextProductionStage,
  inputArtifactIds: readonly string[],
): LiveTextSmokeArtifact {
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
      inputArtifactIds,
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
      return ["project_initial_prompt"];
    case "brief":
      return ["questions_artifact", "questions_artifact_answers"];
    case "deck_plan":
      return ["brief_artifact"];
    case "design_system":
      return ["deck_plan_artifact"];
    case "layout_ir":
      return ["deck_plan_artifact", "design_system_artifact"];
  }
}
