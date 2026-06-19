import { describe, expect, test } from "bun:test";
import { evaluateLiveTextSmokeGate, type LiveTextSmokeArtifact } from "./live-text-smoke-gate";
import type { LiveTextProductionStage } from "./live-text-production-workflow";
import {
  createProviderArtifactProvenance,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

const REQUIRED_STAGES = [
  "questions",
  "brief",
  "deck_plan",
  "design_system",
  "layout_ir",
] as const satisfies readonly LiveTextProductionStage[];

describe("live text smoke gate", () => {
  test("accepts a complete live Codex-only text path with resume turn evidence", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) => liveArtifact(stage)),
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

    expect(result.kind).toBe("ready");
    expect(result.aiArtifactsWithoutTurnId).toBe(0);
    if (result.kind !== "ready") return;
    expect(result.completedStages).toEqual(REQUIRED_STAGES);
    expect(result.provenanceLineage.map((item) => item.providerKind)).toEqual([
      "codex",
      "codex",
      "codex",
      "codex",
      "codex",
    ]);
  });

  test("blocks mock, fixture, and missing-turn text artifacts", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: [
        liveArtifact("questions", {
          providerKind: "mock",
          authMode: "none",
          fixture: true,
          turnId: undefined,
          threadId: undefined,
        }),
        ...REQUIRED_STAGES.filter((stage) => stage !== "questions").map((stage) =>
          liveArtifact(stage),
        ),
      ],
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
    expect(result.aiArtifactsWithoutTurnId).toBe(1);
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("non_codex_text_artifact")).toBe(true);
    expect(issueCodes.includes("fixture_lineage_contamination")).toBe(true);
    expect(issueCodes.includes("text_artifact_missing_turn_id")).toBe(true);
  });

  test("requires a completed post-resume next turn after a produced text artifact", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) => liveArtifact(stage)),
      resumeEvidence: {
        threadId: "thread_live_text",
        previousTurnId: "turn_missing_from_lineage",
        nextTurnId: "",
        completed: false,
        providerKind: "codex",
        authMode: "codex_session",
        executionMode: "production",
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("resume_turn_not_completed")).toBe(true);
    expect(issueCodes.includes("missing_resume_next_turn")).toBe(true);
    expect(issueCodes.includes("resume_previous_turn_not_in_lineage")).toBe(true);
  });

  test("requires the post-resume next turn to be live Codex production", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) => liveArtifact(stage)),
      resumeEvidence: {
        threadId: "thread_live_text",
        previousTurnId: "turn_layout_ir",
        nextTurnId: "turn_resume_after_layout",
        completed: true,
        providerKind: "mock",
        authMode: "none",
        executionMode: "development",
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("resume_non_codex_turn")).toBe(true);
    expect(issueCodes.includes("resume_non_codex_session_auth")).toBe(true);
    expect(issueCodes.includes("resume_non_production_turn")).toBe(true);
  });

  test("blocks disconnected live text path lineage", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) =>
        liveArtifact(
          stage,
          stage === "brief" || stage === "layout_ir" ? { inputArtifactIds: [] } : {},
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
    expect(
      result.issues.map((issue) => issue.code).includes("disconnected_text_stage_lineage"),
    ).toBe(true);
  });

  test("reports non-session Codex artifact auth once", () => {
    const result = evaluateLiveTextSmokeGate({
      artifacts: REQUIRED_STAGES.map((stage) =>
        liveArtifact(stage, stage === "deck_plan" ? { authMode: "none" } : {}),
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
    const authIssueCount = result.issues.filter(
      (issue) => issue.code === "non_codex_session_auth",
    ).length;
    expect(authIssueCount).toBe(1);
  });
});

type ProvenanceOverrides = {
  readonly providerKind?: ProviderArtifactProvenance["providerKind"];
  readonly authMode?: ProviderArtifactProvenance["authMode"];
  readonly executionMode?: ProviderArtifactProvenance["executionMode"];
  readonly fixture?: boolean;
  readonly turnId?: string;
  readonly threadId?: string;
  readonly inputArtifactIds?: readonly string[];
};

function liveArtifact(
  stage: LiveTextProductionStage,
  overrides: ProvenanceOverrides = {},
): LiveTextSmokeArtifact {
  return {
    stage,
    provenance: createProviderArtifactProvenance({
      artifactId: `${stage}_artifact`,
      executionMode: overrides.executionMode ?? "production",
      providerKind: overrides.providerKind ?? "codex",
      authMode: overrides.authMode ?? "codex_session",
      modelOrRuntime: "codex-app-server 0.141.0",
      promptVersion: promptVersionForStage(stage),
      durationMs: 2_400,
      inputArtifactIds: overrides.inputArtifactIds ?? defaultInputArtifactIds(stage),
      fixture: overrides.fixture ?? false,
      ...(overrides.threadId === undefined ? {} : { threadId: overrides.threadId }),
      ...(overrides.turnId === undefined ? {} : { turnId: overrides.turnId }),
      ...(overrides.threadId === undefined && overrides.providerKind !== "mock"
        ? { threadId: "thread_live_text" }
        : {}),
      ...(overrides.turnId === undefined && overrides.providerKind !== "mock"
        ? { turnId: `turn_${stage}` }
        : {}),
    }),
  };
}

function promptVersionForStage(stage: LiveTextProductionStage): string {
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
