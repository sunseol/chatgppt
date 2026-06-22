import { z } from "zod";
import type { Df244PackagedUsageInput } from "./df244-packaged-usage-evidence-schema";
import {
  Df244PackagedUsageInputError,
  parseDf244PackagedUsageInput,
} from "./df244-packaged-usage-evidence-schema";

const DISPLAY_EVIDENCE_PATH =
  "docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df244-usage-display.html";

const JobEventSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
    attempt: z.number().int().nonnegative(),
  })
  .passthrough();

const ProductRunSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("live-codex-generate-export-smoke"),
    projectId: z.string().min(1),
    jobId: z.string().min(1),
    completedJobStatus: z.literal("succeeded"),
    jobs: z.array(JobEventSchema).min(1),
    slides: z
      .array(
        z
          .object({
            slideNumber: z.number().int().positive(),
            status: z.literal("ready"),
            artifactPath: z.string().min(1),
          })
          .passthrough(),
      )
      .min(1),
    projectFolderExport: z
      .object({
        projectArtifactWriteCount: z.number().int().positive(),
        includesOtherProjects: z.literal(false),
        leaksSyntheticSecret: z.literal(false),
      })
      .passthrough(),
    appServerTurns: z
      .array(
        z
          .object({
            threadId: z.string().min(1),
            turnId: z.string().min(1),
            durationMs: z.number().int().positive(),
            errors: z.array(z.unknown()),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

const ProductUsageSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df244-product-usage-confirmation-summary"),
    projectId: z.string().min(1),
    providerKind: z.literal("codex"),
    imageCount: z.number().int().positive(),
    totalLatencyMs: z.number().int().positive(),
    costDisplay: z.literal("hidden_provider_did_not_supply_cost"),
    userConfirmation: z.literal("confirmed_app_surface_pre_generation_codex_oauth"),
    confirmationEvidencePath: z.string().min(1),
    confirmationRecordPath: z.string().min(1),
    confirmationLabel: z.literal("Codex image usage confirmed"),
    billingOwner: z.literal("codex_oauth_account"),
    confirmedAt: z.number().int().nonnegative(),
  })
  .passthrough();

const ConfirmationRecordSchema = z
  .object({
    type: z.literal("deckforge_live_image_billing_confirmation"),
    version: z.literal(1),
    projectId: z.string().min(1),
    jobId: z.string().min(1),
    providerId: z.literal("codex"),
    evidencePath: z.string().min(1),
    label: z.literal("Codex image usage confirmed"),
    apiKeyRequired: z.literal(false),
    billingOwner: z.literal("codex_oauth_account"),
    confirmedAt: z.number().int().nonnegative(),
  })
  .strict();

export type Df244ProductRunSummary = z.infer<typeof ProductRunSummarySchema>;
export type Df244ProductUsageSummary = z.infer<typeof ProductUsageSummarySchema>;
export type Df244ConfirmationRecord = z.infer<typeof ConfirmationRecordSchema>;

export type Df244ProductSmokeUsageIngestionOptions = {
  readonly packageArchiveSha256: string;
  readonly productRunSummary: Df244ProductRunSummary;
  readonly usageSummary: Df244ProductUsageSummary;
  readonly confirmationRecord: Df244ConfirmationRecord;
};

export function parseDf244ProductRunSummary(value: unknown): Df244ProductRunSummary {
  const parsed = ProductRunSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("productRunSummary", parsed.error.issues);
}

export function parseDf244ProductRunSummaryJson(raw: string): Df244ProductRunSummary {
  return parseSmokeJson(raw, parseDf244ProductRunSummary);
}

export function parseDf244ProductUsageSummary(value: unknown): Df244ProductUsageSummary {
  const parsed = ProductUsageSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("productUsageSummary", parsed.error.issues);
}

export function parseDf244ProductUsageSummaryJson(raw: string): Df244ProductUsageSummary {
  return parseSmokeJson(raw, parseDf244ProductUsageSummary);
}

export function parseDf244ConfirmationRecord(value: unknown): Df244ConfirmationRecord {
  const parsed = ConfirmationRecordSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("confirmationRecord", parsed.error.issues);
}

export function parseDf244ConfirmationRecordJson(raw: string): Df244ConfirmationRecord {
  return parseSmokeJson(raw, parseDf244ConfirmationRecord);
}

export function buildDf244PackagedUsageInputFromProductSmoke(
  options: Df244ProductSmokeUsageIngestionOptions,
): Df244PackagedUsageInput {
  return parseDf244PackagedUsageInput({
    capturedAt: latestTimestamp(
      options.productRunSummary.capturedAt,
      options.usageSummary.capturedAt,
    ),
    packageArchiveSha256: options.packageArchiveSha256,
    productRunSummary: {
      evidenceKind: options.productRunSummary.evidenceKind,
      projectId: options.productRunSummary.projectId,
      jobId: options.productRunSummary.jobId,
      completedJobStatus: options.productRunSummary.completedJobStatus,
      jobs: options.productRunSummary.jobs.map((job) => ({
        id: job.id,
        status: job.status,
        attempt: job.attempt,
      })),
      slides: options.productRunSummary.slides.map((slide) => ({
        slideNumber: slide.slideNumber,
        status: slide.status,
        artifactPath: slide.artifactPath,
      })),
      projectFolderExport: {
        projectArtifactWriteCount:
          options.productRunSummary.projectFolderExport.projectArtifactWriteCount,
        includesOtherProjects: options.productRunSummary.projectFolderExport.includesOtherProjects,
        leaksSyntheticSecret: options.productRunSummary.projectFolderExport.leaksSyntheticSecret,
      },
      appServerTurns: options.productRunSummary.appServerTurns.map((turn) => ({
        threadId: turn.threadId,
        turnId: turn.turnId,
        durationMs: turn.durationMs,
        errors: turn.errors,
      })),
    },
    usageSummary: {
      evidenceKind: options.usageSummary.evidenceKind,
      projectId: options.usageSummary.projectId,
      providerKind: options.usageSummary.providerKind,
      imageCount: options.usageSummary.imageCount,
      totalLatencyMs: options.usageSummary.totalLatencyMs,
      costDisplay: options.usageSummary.costDisplay,
      userConfirmation: options.usageSummary.userConfirmation,
      confirmationEvidencePath: options.usageSummary.confirmationEvidencePath,
      confirmationRecordPath: options.usageSummary.confirmationRecordPath,
      confirmationLabel: options.usageSummary.confirmationLabel,
      billingOwner: options.usageSummary.billingOwner,
      confirmedAt: options.usageSummary.confirmedAt,
    },
    confirmationRecord: options.confirmationRecord,
    displayEvidence: {
      evidencePath: DISPLAY_EVIDENCE_PATH,
      latencyVisible: true,
      retryCountVisible: true,
      imageCountVisible: true,
      confirmationVisible: true,
    },
  });
}

function latestTimestamp(first: string, second: string): string {
  return Date.parse(first) >= Date.parse(second) ? first : second;
}

function parseSmokeJson<T>(raw: string, parse: (value: unknown) => T): T {
  try {
    return parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df244PackagedUsageInputError([error.message]);
    }
    throw error;
  }
}

function smokeInputError(
  prefix: string,
  issues: readonly z.ZodIssue[],
): Df244PackagedUsageInputError {
  return new Df244PackagedUsageInputError(
    issues.map((issue) => `${issue.path.join(".") || prefix}: ${issue.message}`),
  );
}
