import type { InterviewBrief } from "./deck-types";
import type { InterviewQuestionField, InterviewQuestionPlan } from "./interview-questions";
import {
  evaluateApprovalProvenanceGate,
  type ProviderArtifactProvenance,
  type ProviderProvenanceIssue,
} from "./provider-provenance";

export type LiveInterviewAnswerMap = Partial<Record<InterviewQuestionField, string>>;

export type LiveInterviewTurnArtifact<TArtifact> = {
  readonly artifact: TArtifact;
  readonly provenance: ProviderArtifactProvenance;
};

export type LiveInterviewStage = "questions" | "follow_up" | "brief";

export type LiveInterviewRecoveryAction = "retry_live_turn" | "manual_input";

export type LiveInterviewRecovery = {
  readonly stage: LiveInterviewStage;
  readonly message: string;
  readonly fixtureFallbackAllowed: false;
  readonly actions: readonly LiveInterviewRecoveryAction[];
};

export type LiveInterviewIssueCode =
  | ProviderProvenanceIssue["code"]
  | "non_codex_interview_turn"
  | "non_codex_session_auth"
  | "non_production_interview_turn"
  | "missing_brief_artifact"
  | "brief_missing_question_input"
  | "brief_reused_question_turn";

export type LiveInterviewIssue = {
  readonly code: LiveInterviewIssueCode;
  readonly message: string;
  readonly artifactId?: string;
  readonly stage?: LiveInterviewStage;
};

export type LiveInterviewNextTurn = {
  readonly capability: "interview";
  readonly promptVersion: "interview_follow_up@v1";
  readonly inputArtifactIds: readonly string[];
  readonly requiresLiveCodex: true;
};

export type LiveInterviewCutoverResult =
  | {
      readonly kind: "ready";
      readonly questionArtifactId: string;
      readonly briefArtifactId: string;
      readonly brief: InterviewBrief;
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    }
  | {
      readonly kind: "follow_up_required";
      readonly requiredFields: readonly InterviewQuestionField[];
      readonly questions: readonly string[];
      readonly nextTurn: LiveInterviewNextTurn;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterviewIssue[];
      readonly recovery: LiveInterviewRecovery;
    };

export type LiveInterviewCutoverInput = {
  readonly questionPlan: LiveInterviewTurnArtifact<InterviewQuestionPlan>;
  readonly answers: LiveInterviewAnswerMap;
  readonly brief?: LiveInterviewTurnArtifact<InterviewBrief>;
};

export function evaluateLiveInterviewCutover(
  input: LiveInterviewCutoverInput,
): LiveInterviewCutoverResult {
  const questionIssues = liveCodexProvenanceIssues("questions", [input.questionPlan.provenance]);
  if (questionIssues.length > 0) return blocked("questions", questionIssues);

  const followUp = buildFollowUpRequirement(input.questionPlan, input.answers);
  if (followUp !== undefined) return followUp;

  if (input.brief === undefined) {
    return blocked("brief", [
      {
        code: "missing_brief_artifact",
        stage: "brief",
        message: "Live interview approval requires a Codex-generated brief artifact.",
      },
    ]);
  }

  const briefIssues = liveCodexProvenanceIssues("brief", [input.brief.provenance]);
  const relationIssues = briefRelationIssues(input.questionPlan.provenance, input.brief.provenance);
  const issues = [...briefIssues, ...relationIssues];
  if (issues.length > 0) return blocked("brief", issues);

  return {
    kind: "ready",
    questionArtifactId: input.questionPlan.provenance.artifactId,
    briefArtifactId: input.brief.provenance.artifactId,
    brief: input.brief.artifact,
    provenanceLineage: [input.questionPlan.provenance, input.brief.provenance],
  };
}

export function createLiveInterviewProviderFailureRecovery(input: {
  readonly stage: LiveInterviewStage;
  readonly message: string;
}): LiveInterviewRecovery {
  return {
    stage: input.stage,
    message: input.message,
    fixtureFallbackAllowed: false,
    actions: ["retry_live_turn", "manual_input"],
  };
}

function buildFollowUpRequirement(
  questionPlan: LiveInterviewTurnArtifact<InterviewQuestionPlan>,
  answers: LiveInterviewAnswerMap,
): Extract<LiveInterviewCutoverResult, { readonly kind: "follow_up_required" }> | undefined {
  const missingQuestions = questionPlan.artifact.questions.filter(
    (question) => !answers[question.field]?.trim(),
  );
  const questions = [
    ...missingQuestions.map((question) => question.question),
    ...questionPlan.artifact.openQuestions,
  ];
  if (questions.length === 0) return undefined;

  return {
    kind: "follow_up_required",
    requiredFields: missingQuestions.map((question) => question.field),
    questions,
    nextTurn: {
      capability: "interview",
      promptVersion: "interview_follow_up@v1",
      inputArtifactIds: [questionPlan.provenance.artifactId],
      requiresLiveCodex: true,
    },
  };
}

function liveCodexProvenanceIssues(
  stage: LiveInterviewStage,
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveInterviewIssue[] {
  const gate = evaluateApprovalProvenanceGate(lineage);
  const gateIssues =
    gate.kind === "blocked" ? gate.issues.map((issue) => providerIssue(stage, issue)) : [];
  const modeIssues = lineage.flatMap((provenance) => [
    ...(provenance.providerKind === "codex"
      ? []
      : [
          {
            code: "non_codex_interview_turn" as const,
            artifactId: provenance.artifactId,
            stage,
            message: "Interview questions and briefs must be generated by live Codex turns.",
          },
        ]),
    ...(provenance.authMode === "codex_session"
      ? []
      : [
          {
            code: "non_codex_session_auth" as const,
            artifactId: provenance.artifactId,
            stage,
            message: "Interview questions and briefs must use the authenticated Codex session.",
          },
        ]),
    ...(provenance.executionMode === "production"
      ? []
      : [
          {
            code: "non_production_interview_turn" as const,
            artifactId: provenance.artifactId,
            stage,
            message: "Interview questions and briefs must come from production execution mode.",
          },
        ]),
  ]);

  return [...gateIssues, ...modeIssues];
}

function briefRelationIssues(
  questionProvenance: ProviderArtifactProvenance,
  briefProvenance: ProviderArtifactProvenance,
): readonly LiveInterviewIssue[] {
  return [
    ...(briefProvenance.inputArtifactIds.includes(questionProvenance.artifactId)
      ? []
      : [
          {
            code: "brief_missing_question_input" as const,
            artifactId: briefProvenance.artifactId,
            stage: "brief" as const,
            message: "The brief turn must cite the live question artifact as an input.",
          },
        ]),
    ...(briefProvenance.turnId !== questionProvenance.turnId
      ? []
      : [
          {
            code: "brief_reused_question_turn" as const,
            artifactId: briefProvenance.artifactId,
            stage: "brief" as const,
            message: "The brief must be generated by a second Codex turn after user answers.",
          },
        ]),
  ];
}

function blocked(
  stage: LiveInterviewStage,
  issues: readonly LiveInterviewIssue[],
): Extract<LiveInterviewCutoverResult, { readonly kind: "blocked" }> {
  return {
    kind: "blocked",
    issues,
    recovery: createLiveInterviewProviderFailureRecovery({
      stage,
      message: "Live interview artifact is blocked; retry the Codex turn or collect manual input.",
    }),
  };
}

function providerIssue(
  stage: LiveInterviewStage,
  issue: ProviderProvenanceIssue,
): LiveInterviewIssue {
  return {
    code: issue.code,
    message: issue.message,
    stage,
    ...(issue.artifactId === undefined ? {} : { artifactId: issue.artifactId }),
  };
}
