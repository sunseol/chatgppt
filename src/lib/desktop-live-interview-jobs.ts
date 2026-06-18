import { z } from "zod";
import type { DeckProject } from "./deck-types";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import type { InterviewQuestionPlan } from "./interview-questions";
import type { ProviderJobManager } from "./provider-job-manager";

export type DesktopLiveInterviewJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
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
    draft: { type: "object" },
    questions: { type: "array" },
    openQuestions: { type: "array" },
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

function interviewQuestionArtifactId(project: DeckProject): string {
  return `${project.id}_questions_live`;
}
