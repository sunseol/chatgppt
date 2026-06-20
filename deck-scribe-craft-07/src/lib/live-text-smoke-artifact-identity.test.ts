import { describe, expect, test } from "bun:test";
import { evaluateLiveTextSmokeGate, type LiveTextSmokeArtifact } from "./live-text-smoke-gate";
import type { LiveTextProductionStage } from "./live-text-production-workflow";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live text smoke artifact identity", () => {
  test("blocks smoke bundles that reuse one live artifact and turn across stages", () => {
    // Given
    const artifacts: readonly LiveTextSmokeArtifact[] = [
      liveArtifact("questions", {
        artifactId: "shared_interview_artifact",
        turnId: "turn_shared_interview",
        inputArtifactIds: ["project_initial_prompt"],
      }),
      liveArtifact("brief", {
        artifactId: " shared_interview_artifact ",
        turnId: " turn_shared_interview ",
        inputArtifactIds: ["shared_interview_artifact", "answer_bundle"],
      }),
      liveArtifact("deck_plan", {
        inputArtifactIds: ["shared_interview_artifact", "research_pack_artifact"],
      }),
      liveArtifact("design_system", { inputArtifactIds: ["deck_plan_artifact"] }),
      liveArtifact("layout_ir", {
        inputArtifactIds: ["deck_plan_artifact", "design_system_artifact"],
      }),
    ];

    // When
    const result = evaluateLiveTextSmokeGate({
      artifacts,
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

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("duplicate_text_artifact_id")).toBe(true);
    expect(issueCodes.includes("duplicate_text_turn_id")).toBe(true);
  });

  test("blocks smoke bundles with non-canonical text artifact identities", () => {
    // Given
    const artifacts: readonly LiveTextSmokeArtifact[] = [
      liveArtifact("questions", {
        artifactId: " questions_artifact ",
        turnId: " turn_questions ",
        threadId: " thread_live_text ",
        inputArtifactIds: ["project_initial_prompt"],
      }),
      liveArtifact("brief", {
        inputArtifactIds: [" questions_artifact ", "answer_bundle"],
      }),
      liveArtifact("deck_plan", {
        inputArtifactIds: ["brief_artifact", "research_pack_artifact"],
      }),
      liveArtifact("design_system", { inputArtifactIds: ["deck_plan_artifact"] }),
      liveArtifact("layout_ir", {
        inputArtifactIds: ["deck_plan_artifact", "design_system_artifact"],
      }),
    ];

    // When
    const result = evaluateLiveTextSmokeGate({
      artifacts,
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

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("text_artifact_noncanonical_identity"),
    ).toBe(true);
  });
});

type LiveArtifactOverrides = {
  readonly artifactId?: string;
  readonly turnId?: string;
  readonly threadId?: string;
  readonly inputArtifactIds: readonly string[];
};

function liveArtifact(
  stage: LiveTextProductionStage,
  overrides: LiveArtifactOverrides,
): LiveTextSmokeArtifact {
  return {
    stage,
    provenance: createProviderArtifactProvenance({
      artifactId: overrides.artifactId ?? `${stage}_artifact`,
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: "codex-app-server 0.141.0",
      promptVersion: promptVersionFor(stage),
      durationMs: 2_400,
      inputArtifactIds: overrides.inputArtifactIds,
      fixture: false,
      threadId: overrides.threadId ?? "thread_live_text",
      turnId: overrides.turnId ?? `turn_${stage}`,
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
