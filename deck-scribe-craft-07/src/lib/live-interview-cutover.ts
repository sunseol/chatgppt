import type { InterviewBrief } from "./deck-types";
import type { InterviewQuestionField, InterviewQuestionPlan } from "./interview-questions";
import {
  briefRelationIssues,
  liveCodexProvenanceIssues,
  questionRelationIssues,
} from "./live-interview-provenance";
import type { ProviderArtifactProvenance, ProviderProvenanceIssue } from "./provider-provenance";

export type LiveInterviewAnswerMap = Partial<Record<InterviewQuestionField, string>>;

export type LiveInterviewTurnArtifact<TArtifact> = {
  readonly artifact: TArtifact;
  readonly provenance: ProviderArtifactProvenance;
};

export type LiveInterviewStage = "questions" | "follow_up" | "brief";

export type LiveInterviewRecovery = {
  readonly stage: LiveInterviewStage;
  readonly message: string;
  readonly fixtureFallbackAllowed: false;
  readonly actions: readonly ("retry_live_turn" | "manual_input")[];
};

export type LiveInterviewIssueCode =
  | ProviderProvenanceIssue["code"]
  | "non_codex_interview_turn"
  | "non_production_interview_turn"
  | "question_missing_project_input"
  | "missing_brief_artifact"
  | "brief_missing_question_input"
  | "brief_missing_answer_input"
  | "brief_reused_question_answer"
  | "brief_reused_question_turn"
  | "brief_reused_question_artifact"
  | "interview_prompt_version_mismatch";

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
  readonly questionInputArtifactId: string;
  readonly questionPlan: LiveInterviewTurnArtifact<InterviewQuestionPlan>;
  readonly answers: LiveInterviewAnswerMap;
  readonly answerArtifactId?: string;
  readonly brief?: LiveInterviewTurnArtifact<InterviewBrief>;
};

export function evaluateLiveInterviewCutover(
  input: LiveInterviewCutoverInput,
): LiveInterviewCutoverResult {
  const questionIssues = [
    ...liveCodexProvenanceIssues("questions", [input.questionPlan.provenance]),
    ...questionRelationIssues(input.questionPlan.provenance, input.questionInputArtifactId),
  ];
  if (questionIssues.length > 0) return blocked("questions", questionIssues);

  const answerArtifactId = resolveAnswerArtifactId(input);
  const followUp = buildFollowUpRequirement(input.questionPlan, input.answers, answerArtifactId);
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
  const relationIssues = briefRelationIssues(
    input.questionPlan.provenance,
    input.brief.provenance,
    answerArtifactId,
  );
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

export function liveInterviewAnswerArtifactId(questionArtifactId: string): string {
  return `${questionArtifactId}_answers`;
}

function buildFollowUpRequirement(
  questionPlan: LiveInterviewTurnArtifact<InterviewQuestionPlan>,
  answers: LiveInterviewAnswerMap,
  answerArtifactId: string,
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
      inputArtifactIds: [questionPlan.provenance.artifactId, answerArtifactId],
      requiresLiveCodex: true,
    },
  };
}

function resolveAnswerArtifactId(input: LiveInterviewCutoverInput): string {
  return (
    input.answerArtifactId?.trim() ||
    liveInterviewAnswerArtifactId(input.questionPlan.provenance.artifactId)
  );
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
