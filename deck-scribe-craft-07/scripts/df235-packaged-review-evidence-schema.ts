import { z } from "zod";

const SlideSchema = z
  .object({
    number: z.number().int().positive(),
    version: z.number().int().positive(),
    status: z.string(),
    imageDescriptor: z.string().min(1),
  })
  .passthrough();

const ApprovalEventSchema = z
  .object({
    outcome: z.literal("approved"),
    candidate: z
      .object({
        requestId: z.string().min(1),
        slide: SlideSchema.extend({ status: z.literal("ready") }),
        originalBackgroundArtifactId: z.string().min(1),
        backgroundArtifactId: z.string().min(1),
        beforeImageDescriptor: z.string().min(1),
        afterImageDescriptor: z.string().min(1),
      })
      .passthrough(),
    comparison: z
      .object({
        slideNumber: z.number().int().positive(),
        originalSlideVersion: z.number().int().positive(),
        revisedSlideVersion: z.number().int().positive(),
        requestedChanges: z.array(z.string().min(1)),
        preservedTargets: z.array(z.string().min(1)),
        preservationChecks: z.array(
          z
            .object({
              target: z.string().min(1),
              status: z.literal("kept"),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
    approvedSlide: SlideSchema.extend({ status: z.literal("approved") }),
  })
  .passthrough();

const FailurePreservationEventSchema = z
  .object({
    outcome: z.literal("preserved_after_failure"),
    slideNumber: z.number().int().positive(),
    originalSlideVersion: z.number().int().positive(),
    instruction: z.string().min(1),
    issues: z.array(z.string().min(1)),
    userMessage: z.string().min(1),
    preservedSlide: SlideSchema.extend({ status: z.literal("approved") }),
  })
  .passthrough();

const ReviewEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    issue: z.literal("DF-235"),
    projectId: z.string().min(1),
    eventId: z.string().min(1),
    exportedAt: z.number().int().nonnegative(),
    event: z.discriminatedUnion("outcome", [ApprovalEventSchema, FailurePreservationEventSchema]),
  })
  .strict();

const ApprovalDisplayEvidenceSchema = z
  .object({
    evidencePath: z.string().min(1),
    beforeVisible: z.boolean(),
    afterVisible: z.boolean(),
    approvalVisible: z.boolean(),
    preservationChecksVisible: z.boolean(),
  })
  .strict();

const FailureDisplayEvidenceSchema = z
  .object({
    evidencePath: z.string().min(1),
    approvedOriginalVisible: z.boolean(),
    failureMessageVisible: z.boolean(),
    exportableOriginalVisible: z.boolean(),
  })
  .strict();

const ReviewSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    appSurface: z.literal("packaged_review_stage"),
    packageArchiveSha256: z.string().min(1),
  })
  .strict();

const ApprovalProofSchema = z
  .object({
    sessionId: z.string().min(1),
    evidencePath: z.string().min(1),
    reviewEvidence: ReviewEvidenceSchema,
    displayEvidence: ApprovalDisplayEvidenceSchema,
  })
  .strict();

const FailurePreservationProofSchema = z
  .object({
    sessionId: z.string().min(1),
    evidencePath: z.string().min(1),
    reviewEvidence: ReviewEvidenceSchema,
    displayEvidence: FailureDisplayEvidenceSchema,
  })
  .strict();

const PackagedReviewInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    reviewSession: ReviewSessionSchema,
    approvalProof: ApprovalProofSchema.optional(),
    failurePreservationProof: FailurePreservationProofSchema.optional(),
  })
  .strict();

export type Df235PackagedReviewInput = z.infer<typeof PackagedReviewInputSchema>;
export type Df235PackagedReviewProof = z.infer<typeof ApprovalProofSchema>;
export type Df235PackagedFailureProof = z.infer<typeof FailurePreservationProofSchema>;

export class Df235PackagedReviewInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-235 packaged review input: ${issues.join("; ")}`);
    this.name = "Df235PackagedReviewInputError";
    this.issues = issues;
  }
}

export function parseDf235PackagedReviewInput(value: unknown): Df235PackagedReviewInput {
  const parsed = PackagedReviewInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df235PackagedReviewInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf235PackagedReviewJson(raw: string): Df235PackagedReviewInput {
  try {
    return parseDf235PackagedReviewInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df235PackagedReviewInputError([error.message]);
    }
    throw error;
  }
}
