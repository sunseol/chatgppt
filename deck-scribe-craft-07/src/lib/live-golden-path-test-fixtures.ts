import { createProviderArtifactProvenance } from "./provider-provenance";

export function goldenPathTextLineage() {
  return [
    textArtifact("live_interview", "turn_interview"),
    textArtifact("live_research", "turn_research"),
    textArtifact("live_deck_plan", "turn_plan"),
    textArtifact("live_design_system", "turn_design"),
    textArtifact("live_layout_ir", "turn_layout"),
  ];
}

function textArtifact(stage: string, turnId: string) {
  return createProviderArtifactProvenance({
    artifactId: stage,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion: `${stage}@v1`,
    durationMs: 1_000,
    inputArtifactIds: ["approved_live_context"],
    fixture: false,
    turnId,
    threadId: "thread_golden_path",
  });
}
