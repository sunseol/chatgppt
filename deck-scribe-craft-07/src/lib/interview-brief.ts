import { z } from "zod";
import type { ArtifactRecord } from "./artifacts";
import { createArtifactRecord } from "./artifacts";
import type { InterviewBrief } from "./deck-types";

export const InterviewBriefSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1),
  audience: z.string().min(1),
  desiredOutcome: z.string().min(1),
  slideCount: z.number().int().min(1),
  aspectRatio: z.union([z.literal("16:9"), z.literal("4:3")]),
  language: z.union([z.literal("ko"), z.literal("en"), z.literal("mixed")]),
  tone: z.array(z.string().min(1)),
  mustInclude: z.array(z.string().min(1)),
  mustAvoid: z.array(z.string().min(1)),
  successCriteria: z.array(z.string().min(1)),
  openQuestions: z.array(z.string()),
  approvedHash: z.string().optional(),
});

export interface ApprovedInterviewBriefArtifact {
  readonly record: ArtifactRecord;
  readonly brief: ImmutableInterviewBrief;
}

export interface ApproveInterviewBriefInput {
  readonly projectId: string;
  readonly brief: InterviewBrief;
  readonly version: number;
  readonly approvedAt: number;
}

export type ImmutableInterviewBrief = Readonly<
  Omit<InterviewBrief, "tone" | "mustInclude" | "mustAvoid" | "successCriteria" | "openQuestions">
> & {
  readonly tone: readonly string[];
  readonly mustInclude: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly successCriteria: readonly string[];
  readonly openQuestions: readonly string[];
};

export function parseInterviewBrief(input: unknown): InterviewBrief {
  return InterviewBriefSchema.parse(input);
}

export function createApprovedInterviewBriefArtifact(
  input: ApproveInterviewBriefInput,
): ApprovedInterviewBriefArtifact {
  const brief = cloneImmutableBrief(parseInterviewBrief(input.brief));
  const record = createArtifactRecord({
    projectId: input.projectId,
    type: "brief",
    version: input.version,
    content: JSON.stringify(brief),
    createdAt: input.approvedAt,
  });
  return Object.freeze({ record, brief });
}

function cloneImmutableBrief(brief: InterviewBrief): ImmutableInterviewBrief {
  return Object.freeze({
    id: brief.id,
    goal: brief.goal,
    audience: brief.audience,
    desiredOutcome: brief.desiredOutcome,
    slideCount: brief.slideCount,
    aspectRatio: brief.aspectRatio,
    language: brief.language,
    tone: Object.freeze([...brief.tone]),
    mustInclude: Object.freeze([...brief.mustInclude]),
    mustAvoid: Object.freeze([...brief.mustAvoid]),
    successCriteria: Object.freeze([...brief.successCriteria]),
    openQuestions: Object.freeze([...brief.openQuestions]),
    ...(brief.approvedHash === undefined ? {} : { approvedHash: brief.approvedHash }),
  });
}
