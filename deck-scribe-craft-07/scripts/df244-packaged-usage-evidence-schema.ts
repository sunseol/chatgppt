import { z } from "zod";

const JobEventSchema = z
  .object({
    id: z.string(),
    status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
    attempt: z.number().int().nonnegative(),
  })
  .strict();

const ProductRunSummarySchema = z
  .object({
    evidenceKind: z.string(),
    projectId: z.string(),
    jobId: z.string(),
    completedJobStatus: z.literal("succeeded"),
    jobs: z.array(JobEventSchema),
    slides: z.array(
      z
        .object({
          slideNumber: z.number().int().positive(),
          status: z.literal("ready"),
          artifactPath: z.string(),
        })
        .strict(),
    ),
    projectFolderExport: z
      .object({
        projectArtifactWriteCount: z.number().int().positive(),
        includesOtherProjects: z.literal(false),
        leaksSyntheticSecret: z.literal(false),
      })
      .strict(),
    appServerTurns: z.array(
      z
        .object({
          threadId: z.string(),
          turnId: z.string(),
          durationMs: z.number().int().positive(),
          errors: z.array(z.unknown()),
        })
        .strict(),
    ),
  })
  .strict();

const UsageSummarySchema = z
  .object({
    evidenceKind: z.string(),
    projectId: z.string(),
    providerKind: z.literal("codex"),
    imageCount: z.number().int().positive(),
    totalLatencyMs: z.number().int().positive(),
    costDisplay: z.literal("hidden_provider_did_not_supply_cost"),
    userConfirmation: z.literal("confirmed_app_surface_pre_generation_codex_oauth"),
    confirmationEvidencePath: z.string(),
    confirmationRecordPath: z.string(),
    confirmationLabel: z.literal("Codex image usage confirmed"),
    billingOwner: z.literal("codex_oauth_account"),
    confirmedAt: z.number().int().nonnegative(),
  })
  .strict();

const ConfirmationRecordSchema = z
  .object({
    type: z.literal("deckforge_live_image_billing_confirmation"),
    version: z.literal(1),
    projectId: z.string(),
    jobId: z.string(),
    providerId: z.literal("codex"),
    evidencePath: z.string(),
    label: z.literal("Codex image usage confirmed"),
    apiKeyRequired: z.literal(false),
    billingOwner: z.literal("codex_oauth_account"),
    confirmedAt: z.number().int().nonnegative(),
  })
  .strict();

const DisplayEvidenceSchema = z
  .object({
    evidencePath: z.string(),
    latencyVisible: z.boolean(),
    retryCountVisible: z.boolean(),
    imageCountVisible: z.boolean(),
    confirmationVisible: z.boolean(),
  })
  .strict();

const PackagedUsageInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    productRunSummary: ProductRunSummarySchema,
    usageSummary: UsageSummarySchema,
    confirmationRecord: ConfirmationRecordSchema,
    displayEvidence: DisplayEvidenceSchema,
  })
  .strict();

export type Df244PackagedUsageInput = z.infer<typeof PackagedUsageInputSchema>;

export class Df244PackagedUsageInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-244 packaged usage input: ${issues.join("; ")}`);
    this.name = "Df244PackagedUsageInputError";
    this.issues = issues;
  }
}

export function parseDf244PackagedUsageInput(value: unknown): Df244PackagedUsageInput {
  const parsed = PackagedUsageInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df244PackagedUsageInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf244PackagedUsageJson(raw: string): Df244PackagedUsageInput {
  try {
    return parseDf244PackagedUsageInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df244PackagedUsageInputError([error.message]);
    }
    throw error;
  }
}
