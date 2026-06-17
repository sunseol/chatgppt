import type { DeckProject, InterviewBrief } from "@/lib/deck-types";
import { planInterviewQuestions } from "@/lib/interview-questions";
import type { InterviewQuestionField, InterviewQuestionPlan } from "@/lib/interview-questions";
import { mockBrief } from "@/lib/mock-ai";

export type InterviewAnswerMap = Partial<Record<InterviewQuestionField, string>>;

export function createQuestionPlan(project: DeckProject): InterviewQuestionPlan {
  return planInterviewQuestions({
    initialPrompt: project.initialPrompt,
    slideCount: project.slideCount,
    aspectRatio: project.aspectRatio,
    language: project.language,
  });
}

export function createBriefDraft(
  project: DeckProject,
  plan: InterviewQuestionPlan,
  answers: InterviewAnswerMap,
): InterviewBrief {
  const base = mockBrief(project.initialPrompt, project.slideCount, project.aspectRatio);
  return {
    ...base,
    goal: answerOrDraft(answers.goal, plan.draft.goal, base.goal),
    audience: answerOrDraft(answers.audience, plan.draft.audience, base.audience),
    desiredOutcome: answerOrDraft(
      answers.desiredOutcome,
      plan.draft.desiredOutcome,
      base.desiredOutcome,
    ),
    slideCount: plan.draft.slideCount,
    aspectRatio: plan.draft.aspectRatio,
    language: plan.draft.language,
    tone: mergeList(plan.draft.tone, splitAnswer(answers.tone), base.tone),
    mustInclude: mergeList(plan.draft.mustInclude, splitAnswer(answers.mustInclude)),
    mustAvoid: mergeList(plan.draft.mustAvoid, splitAnswer(answers.mustAvoid), base.mustAvoid),
    successCriteria: mergeList(
      plan.draft.successCriteria,
      splitAnswer(answers.successCriteria),
      answerAsList("핵심 메시지", answers.coreMessage),
    ),
    openQuestions: [...plan.openQuestions, ...unansweredQuestions(plan, answers)],
  };
}

function answerOrDraft(
  answer: string | undefined,
  extracted: string | undefined,
  fallback: string,
): string {
  return answer?.trim() || extracted || fallback;
}

function splitAnswer(value: string | undefined): readonly string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function answerAsList(label: string, value: string | undefined): readonly string[] {
  return value?.trim() ? [`${label}: ${value.trim()}`] : [];
}

function mergeList(...lists: readonly (readonly string[])[]): string[] {
  const merged: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!merged.includes(item)) merged.push(item);
    }
  }
  return merged;
}

function unansweredQuestions(plan: InterviewQuestionPlan, answers: InterviewAnswerMap): string[] {
  return plan.questions
    .filter((question) => !answers[question.field]?.trim())
    .map((question) => question.question);
}
