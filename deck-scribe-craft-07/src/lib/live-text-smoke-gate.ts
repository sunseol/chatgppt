import type { LiveTextProductionStage } from "./live-text-production-workflow";
import {
  collectLiveTextSmokeIssues,
  countAiArtifactsWithoutTurnId,
} from "./live-text-smoke-gate-issues";
import type { ProviderArtifactProvenance, ProviderProvenanceIssue } from "./provider-provenance";

const REQUIRED_STAGES = [
  "questions",
  "brief",
  "deck_plan",
  "design_system",
  "layout_ir",
] as const satisfies readonly LiveTextProductionStage[];

export type LiveTextSmokeArtifact = {
  readonly stage: LiveTextProductionStage;
  readonly provenance: ProviderArtifactProvenance;
};

export type LiveTextSmokeResumeEvidence = {
  readonly threadId: string;
  readonly previousTurnId: string;
  readonly nextTurnId: string;
  readonly completed: boolean;
  readonly providerKind: ProviderArtifactProvenance["providerKind"];
  readonly authMode: ProviderArtifactProvenance["authMode"];
  readonly executionMode: ProviderArtifactProvenance["executionMode"];
};

export type LiveTextSmokeIssueCode =
  | ProviderProvenanceIssue["code"]
  | "missing_text_stage"
  | "duplicate_text_stage"
  | "non_codex_text_artifact"
  | "non_codex_session_auth"
  | "non_production_text_artifact"
  | "text_artifact_missing_turn_id"
  | "text_artifact_missing_thread_id"
  | "missing_resume_evidence"
  | "resume_turn_not_completed"
  | "missing_resume_next_turn"
  | "resume_previous_turn_not_in_lineage"
  | "resume_reused_existing_turn"
  | "resume_thread_mismatch"
  | "resume_non_codex_turn"
  | "resume_non_codex_session_auth"
  | "resume_non_production_turn";

export type LiveTextSmokeIssue = {
  readonly code: LiveTextSmokeIssueCode;
  readonly message: string;
  readonly stage?: LiveTextProductionStage;
  readonly artifactId?: string;
};

export type LiveTextSmokeGateResult =
  | {
      readonly kind: "ready";
      readonly completedStages: readonly LiveTextProductionStage[];
      readonly aiArtifactsWithoutTurnId: number;
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveTextSmokeIssue[];
      readonly aiArtifactsWithoutTurnId: number;
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    };

export function evaluateLiveTextSmokeGate(input: {
  readonly artifacts: readonly LiveTextSmokeArtifact[];
  readonly resumeEvidence?: LiveTextSmokeResumeEvidence;
}): LiveTextSmokeGateResult {
  const provenanceLineage = input.artifacts.map((artifact) => artifact.provenance);
  const issues = collectLiveTextSmokeIssues(input, provenanceLineage);
  const aiArtifactsWithoutTurnId = countAiArtifactsWithoutTurnId(input.artifacts);

  if (issues.length === 0) {
    return {
      kind: "ready",
      completedStages: REQUIRED_STAGES,
      aiArtifactsWithoutTurnId,
      provenanceLineage,
    };
  }

  return {
    kind: "blocked",
    issues,
    aiArtifactsWithoutTurnId,
    provenanceLineage,
  };
}
