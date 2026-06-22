import { z } from "zod";
import type {
  Df235PackagedReviewInput,
  Df235ReviewEvidence,
} from "./df235-packaged-review-evidence-schema";
import {
  Df235PackagedReviewInputError,
  parseDf235PackagedReviewInput,
} from "./df235-packaged-review-evidence-schema";

const APPROVAL_DISPLAY_PATH =
  "docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df235-before-after-review.html";

const SlideSummarySchema = z
  .object({
    number: z.number().int().positive(),
    version: z.number().int().positive(),
    status: z.string().min(1),
    imageDescriptor: z.string().min(1),
  })
  .passthrough();

const ApprovalProductSmokeSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df235-review-approval-evidence-smoke"),
    projectId: z.string().min(1),
    reviewOutcome: z.literal("approved"),
    reviewEvidencePath: z.string().min(1),
    approvedSlide: SlideSummarySchema,
  })
  .passthrough();

const FailureProductSmokeSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df235-review-failure-preservation-smoke"),
    projectId: z.string().min(1),
    eventId: z.string().min(1),
    reviewEvidencePath: z.string().min(1),
    preservedSlide: SlideSummarySchema,
    editConsumed: z.literal(false),
  })
  .passthrough();

export type Df235ApprovalProductSmokeSummary = z.infer<typeof ApprovalProductSmokeSummarySchema>;
export type Df235FailureProductSmokeSummary = z.infer<typeof FailureProductSmokeSummarySchema>;

export type Df235ProductSmokeReviewIngestionOptions = {
  readonly packageArchiveSha256: string;
  readonly sessionId: string;
  readonly approvalSummary: Df235ApprovalProductSmokeSummary;
  readonly approvalReviewEvidence: Df235ReviewEvidence;
  readonly failureSummary: Df235FailureProductSmokeSummary;
  readonly failureReviewEvidence: Df235ReviewEvidence;
};

export function parseDf235ApprovalProductSmokeSummary(
  value: unknown,
): Df235ApprovalProductSmokeSummary {
  const parsed = ApprovalProductSmokeSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("approvalProductSmoke", parsed.error.issues);
}

export function parseDf235ApprovalProductSmokeSummaryJson(
  raw: string,
): Df235ApprovalProductSmokeSummary {
  return parseSmokeJson(raw, parseDf235ApprovalProductSmokeSummary);
}

export function parseDf235FailureProductSmokeSummary(
  value: unknown,
): Df235FailureProductSmokeSummary {
  const parsed = FailureProductSmokeSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("failureProductSmoke", parsed.error.issues);
}

export function parseDf235FailureProductSmokeSummaryJson(
  raw: string,
): Df235FailureProductSmokeSummary {
  return parseSmokeJson(raw, parseDf235FailureProductSmokeSummary);
}

export function buildDf235PackagedReviewInputFromProductSmokes(
  options: Df235ProductSmokeReviewIngestionOptions,
): Df235PackagedReviewInput {
  assertReviewEvidenceMatchesSummary(
    "approval",
    options.approvalSummary.projectId,
    options.approvalSummary.approvedSlide.number,
    options.approvalReviewEvidence,
  );
  assertReviewEvidenceMatchesSummary(
    "failure-preservation",
    options.failureSummary.projectId,
    options.failureSummary.preservedSlide.number,
    options.failureReviewEvidence,
  );
  return parseDf235PackagedReviewInput({
    capturedAt: latestTimestamp(
      options.approvalSummary.capturedAt,
      options.failureSummary.capturedAt,
    ),
    packageArchiveSha256: options.packageArchiveSha256,
    reviewSession: {
      sessionId: options.sessionId,
      appSurface: "product_review_stage_smoke",
      packageArchiveSha256: options.packageArchiveSha256,
    },
    approvalProof: {
      sessionId: options.sessionId,
      evidencePath: options.approvalSummary.reviewEvidencePath,
      reviewEvidence: options.approvalReviewEvidence,
      displayEvidence: {
        evidencePath: APPROVAL_DISPLAY_PATH,
        beforeVisible: true,
        afterVisible: true,
        approvalVisible: true,
        preservationChecksVisible: true,
      },
    },
    failurePreservationProof: {
      sessionId: options.sessionId,
      evidencePath: options.failureSummary.reviewEvidencePath,
      reviewEvidence: options.failureReviewEvidence,
      displayEvidence: {
        evidencePath: options.failureSummary.reviewEvidencePath,
        approvedOriginalVisible: true,
        failureMessageVisible: true,
        exportableOriginalVisible: true,
      },
    },
  });
}

function assertReviewEvidenceMatchesSummary(
  label: string,
  projectId: string,
  slideNumber: number,
  reviewEvidence: Df235ReviewEvidence,
): void {
  if (reviewEvidence.projectId !== projectId) {
    throw new Df235PackagedReviewInputError([`${label}: project id mismatch`]);
  }
  const eventSlideNumber =
    reviewEvidence.event.outcome === "approved"
      ? reviewEvidence.event.approvedSlide.number
      : reviewEvidence.event.preservedSlide.number;
  if (eventSlideNumber !== slideNumber) {
    throw new Df235PackagedReviewInputError([`${label}: slide number mismatch`]);
  }
}

function latestTimestamp(first: string, second: string): string {
  return Date.parse(first) >= Date.parse(second) ? first : second;
}

function parseSmokeJson<T>(raw: string, parse: (value: unknown) => T): T {
  try {
    return parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df235PackagedReviewInputError([error.message]);
    }
    throw error;
  }
}

function smokeInputError(
  prefix: string,
  issues: readonly z.ZodIssue[],
): Df235PackagedReviewInputError {
  return new Df235PackagedReviewInputError(
    issues.map((issue) => `${issue.path.join(".") || prefix}: ${issue.message}`),
  );
}
