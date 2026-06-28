import { z } from "zod";
import type { DeckProject, InterviewBrief } from "./deck-types";
import { InterviewBriefSchema } from "./interview-brief";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import type { LiveInterviewAnswerMap } from "./live-interview-cutover";
import type { InterviewQuestionPlan } from "./interview-questions";
import type { ProviderJobManager } from "./provider-job-manager";

export type DesktopLiveInterviewJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
};

const INTERVIEW_QUESTION_FIELDS = [
  "goal",
  "audience",
  "desiredOutcome",
  "coreMessage",
  "slideCount",
  "aspectRatio",
  "language",
  "tone",
  "mustInclude",
  "mustAvoid",
  "successCriteria",
] as const;

const InterviewQuestionFieldSchema = z.enum(INTERVIEW_QUESTION_FIELDS);

const INTERVIEW_QUESTION_DRAFT_FIELDS = [
  "goal",
  "audience",
  "desiredOutcome",
  "coreMessage",
  "slideCount",
  "aspectRatio",
  "language",
  "tone",
  "mustInclude",
  "mustAvoid",
  "successCriteria",
] as const;

const InterviewQuestionPlanSchema = z.object({
  draft: z.object({
    goal: z.string().optional(),
    audience: z.string().optional(),
    desiredOutcome: z.string().optional(),
    coreMessage: z.string().optional(),
    slideCount: z.number().int().min(1),
    aspectRatio: z.union([z.literal("16:9"), z.literal("4:3")]),
    language: z.union([z.literal("ko"), z.literal("en"), z.literal("mixed")]),
    tone: z.array(z.string()),
    mustInclude: z.array(z.string()),
    mustAvoid: z.array(z.string()),
    successCriteria: z.array(z.string()),
  }),
  questions: z.array(
    z.object({
      field: InterviewQuestionFieldSchema,
      question: z.string().min(1),
    }),
  ),
  openQuestions: z.array(z.string()),
});

const InterviewQuestionPlanOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["draft", "questions", "openQuestions"],
  properties: {
    draft: {
      type: "object",
      additionalProperties: false,
      required: INTERVIEW_QUESTION_DRAFT_FIELDS,
      properties: {
        goal: { type: "string" },
        audience: { type: "string" },
        desiredOutcome: { type: "string" },
        coreMessage: { type: "string" },
        slideCount: { type: "integer", minimum: 1 },
        aspectRatio: { enum: ["16:9", "4:3"] },
        language: { enum: ["ko", "en", "mixed"] },
        tone: { type: "array", items: { type: "string" } },
        mustInclude: { type: "array", items: { type: "string" } },
        mustAvoid: { type: "array", items: { type: "string" } },
        successCriteria: { type: "array", items: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "question"],
        properties: {
          field: { enum: INTERVIEW_QUESTION_FIELDS },
          question: { type: "string", minLength: 1 },
        },
      },
    },
    openQuestions: { type: "array", items: { type: "string" } },
  },
} as const;

const InterviewBriefOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "goal",
    "audience",
    "desiredOutcome",
    "slideCount",
    "aspectRatio",
    "language",
    "tone",
    "mustInclude",
    "mustAvoid",
    "successCriteria",
    "openQuestions",
  ],
  properties: {
    id: { type: "string", minLength: 1 },
    goal: { type: "string", minLength: 1 },
    audience: { type: "string", minLength: 1 },
    desiredOutcome: { type: "string", minLength: 1 },
    slideCount: { type: "integer", minimum: 1 },
    aspectRatio: { enum: ["16:9", "4:3"] },
    language: { enum: ["ko", "en", "mixed"] },
    tone: { type: "array", items: { type: "string", minLength: 1 } },
    mustInclude: { type: "array", items: { type: "string", minLength: 1 } },
    mustAvoid: { type: "array", items: { type: "string", minLength: 1 } },
    successCriteria: { type: "array", items: { type: "string", minLength: 1 } },
    openQuestions: { type: "array", items: { type: "string" } },
  },
} as const;

export function interviewQuestionPlanJob(
  input: DesktopLiveInterviewJobContext,
): DesktopProductionCodexAppServerJobInput<InterviewQuestionPlan> {
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "interview",
    description: "Run live interview questions desktop App Server turn",
    artifactId: interviewQuestionArtifactId(input.project),
    parse: parseInterviewQuestionPlan,
    promptVersion: "interview_questions_desktop@v1",
    inputArtifactIds: [input.project.id],
    turnRequest: {
      prompt: interviewQuestionsPrompt(input.project),
      outputSchema: InterviewQuestionPlanOutputSchema,
      model: "gpt-5.4",
      networkAccess: false,
    },
  };
}

export function interviewBriefJob(input: {
  readonly context: DesktopLiveInterviewJobContext;
  readonly questionArtifactId: string;
  readonly answers: LiveInterviewAnswerMap;
}): DesktopProductionCodexAppServerJobInput<InterviewBrief> {
  return {
    tauriRuntime: input.context.tauriRuntime,
    jobManager: input.context.jobManager,
    capability: "interview",
    description: "Run live interview brief desktop App Server turn",
    artifactId: interviewBriefArtifactId(input.context.project),
    parse: parseInterviewBrief,
    promptVersion: "interview_brief_desktop@v1",
    inputArtifactIds: [input.questionArtifactId],
    turnRequest: {
      prompt: interviewBriefPrompt(input.context.project, input.answers),
      outputSchema: InterviewBriefOutputSchema,
      model: "gpt-5.4",
      networkAccess: false,
    },
  };
}

function parseInterviewQuestionPlan(value: unknown) {
  const parsed = InterviewQuestionPlanSchema.safeParse(value);
  if (!parsed.success) {
    return {
      kind: "invalid" as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return { kind: "valid" as const, value: parsed.data };
}

function parseInterviewBrief(value: unknown) {
  const parsed = InterviewBriefSchema.safeParse(value);
  if (!parsed.success) {
    return {
      kind: "invalid" as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return { kind: "valid" as const, value: parsed.data };
}

function interviewQuestionsPrompt(project: DeckProject): string {
  return [
    "# Interview Question Plan",
    "Return JSON only matching the InterviewQuestionPlan shape.",
    `Project id: ${project.id}`,
    `Initial prompt: ${project.initialPrompt}`,
    `Slide count: ${project.slideCount}`,
    `Aspect ratio: ${project.aspectRatio}`,
    `Language: ${project.language}`,
    "Draft known fields when they are directly supported by the prompt.",
    "For unknown draft text fields, return an empty string and include a matching question.",
    "For unknown draft list fields, return an empty array and include a matching question.",
    "Questions must ask only for fields still needed to create an approvable brief.",
  ].join("\n");
}

function interviewBriefPrompt(project: DeckProject, answers: LiveInterviewAnswerMap): string {
  return [
    "# Interview Brief",
    "Return JSON only matching the InterviewBrief shape.",
    "Do not include approvedHash; the user approves the brief in DeckForge.",
    `Brief id: ${interviewBriefArtifactId(project)}`,
    `Project id: ${project.id}`,
    `Initial prompt: ${project.initialPrompt}`,
    `Slide count: ${project.slideCount}`,
    `Aspect ratio: ${project.aspectRatio}`,
    `Language: ${project.language}`,
    "User answers:",
    ...answerLines(answers),
    "Use the answers to fill goal, audience, desiredOutcome, tone, mustInclude, mustAvoid, and successCriteria.",
  ].join("\n");
}

function answerLines(answers: LiveInterviewAnswerMap): readonly string[] {
  return Object.entries(answers).flatMap(([field, value]) => {
    const trimmed = value?.trim();
    return trimmed ? [`- ${field}: ${trimmed}`] : [];
  });
}

function interviewQuestionArtifactId(project: DeckProject): string {
  return `${project.id}_questions_live`;
}

function interviewBriefArtifactId(project: DeckProject): string {
  return `${project.id}_brief_live`;
}
