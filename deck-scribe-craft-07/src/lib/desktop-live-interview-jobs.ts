import { z } from "zod";
import type { DeckProject, InterviewBrief } from "./deck-types";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { InterviewBriefSchema } from "./interview-brief";
import type { InterviewQuestionPlan } from "./interview-questions";
import { liveInterviewAnswerArtifactId } from "./live-interview-cutover";
import type { LiveInterviewAnswerMap } from "./live-interview-cutover";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";
import type { ProviderJobManager } from "./provider-job-manager";

export type DesktopLiveInterviewJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
};

export type DesktopLiveInterviewBriefJobContext = DesktopLiveInterviewJobContext & {
  readonly questionPlan: StructuredCodexAccepted<InterviewQuestionPlan>;
  readonly answers: LiveInterviewAnswerMap;
};

const InterviewQuestionFieldSchema = z.union([
  z.literal("goal"),
  z.literal("audience"),
  z.literal("desiredOutcome"),
  z.literal("coreMessage"),
  z.literal("slideCount"),
  z.literal("aspectRatio"),
  z.literal("language"),
  z.literal("tone"),
  z.literal("mustInclude"),
  z.literal("mustAvoid"),
  z.literal("successCriteria"),
]);

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
      required: [
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
      ],
      properties: {
        goal: { type: "string" },
        audience: { type: "string" },
        desiredOutcome: { type: "string" },
        coreMessage: { type: "string" },
        slideCount: { type: "integer", minimum: 1 },
        aspectRatio: { type: "string", enum: ["16:9", "4:3"] },
        language: { type: "string", enum: ["ko", "en", "mixed"] },
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
          field: {
            type: "string",
            enum: [
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
            ],
          },
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
    aspectRatio: { type: "string", enum: ["16:9", "4:3"] },
    language: { type: "string", enum: ["ko", "en", "mixed"] },
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

export function interviewBriefJob(
  input: DesktopLiveInterviewBriefJobContext,
): DesktopProductionCodexAppServerJobInput<InterviewBrief> {
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "interview",
    description: "Run live interview brief desktop App Server turn",
    artifactId: interviewBriefArtifactId(input.project),
    parse: parseInterviewBrief,
    promptVersion: "interview_brief@v1",
    inputArtifactIds: [
      input.questionPlan.provenance.artifactId,
      liveInterviewAnswerArtifactId(input.questionPlan.provenance.artifactId),
    ],
    turnRequest: {
      prompt: interviewBriefPrompt(input),
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
    "Questions must ask only for fields still needed to create an approvable brief.",
  ].join("\n");
}

function interviewBriefPrompt(input: DesktopLiveInterviewBriefJobContext): string {
  return [
    "# Interview Brief",
    "Return JSON only matching the InterviewBrief shape.",
    "Do not include approvedHash.",
    `Project id: ${input.project.id}`,
    `Initial prompt: ${input.project.initialPrompt}`,
    `Question artifact id: ${input.questionPlan.provenance.artifactId}`,
    `Question draft JSON: ${JSON.stringify(input.questionPlan.value.draft)}`,
    `Question list JSON: ${JSON.stringify(input.questionPlan.value.questions)}`,
    `Open questions JSON: ${JSON.stringify(input.questionPlan.value.openQuestions)}`,
    `User answers JSON: ${JSON.stringify(input.answers)}`,
    "Use the question draft plus user answers to produce an approvable interview brief.",
    "Keep any unresolved items in openQuestions; otherwise return an empty openQuestions array.",
  ].join("\n");
}

function interviewQuestionArtifactId(project: DeckProject): string {
  return `${project.id}_questions_live`;
}

function interviewBriefArtifactId(project: DeckProject): string {
  return `${project.id}_brief_live`;
}
