import { z } from "zod";

const QueueJobSchema = z
  .object({
    id: z.string().min(1),
    providerId: z.string().min(1),
    capability: z.string().min(1),
    status: z.string().min(1),
    attempt: z.number().int().positive(),
    cancelRequested: z.boolean(),
  })
  .passthrough();

const QueueSlideSchema = z
  .object({
    number: z.number().int().positive(),
    version: z.number().int().positive(),
    status: z.literal("ready"),
    imageDescriptor: z.string().min(1),
    notes: z.string().min(1),
  })
  .passthrough();

const QueueFailureSchema = z
  .object({
    jobId: z.string().min(1),
    failureKind: z.string().min(1),
  })
  .passthrough();

const RetryProvenanceSchema = z
  .object({
    jobId: z.string().min(1),
    slideNumber: z.number().int().positive(),
    attempt: z.number().int().positive(),
    failureKind: z.string().min(1),
  })
  .passthrough();

const RestartResumeEvidenceSchema = z
  .object({
    recoverySnapshotPath: z.string().min(1),
    liveJobId: z.string().min(1),
    completedArtifactIdsBefore: z.array(z.string().min(1)),
    completedArtifactIdsAfter: z.array(z.string().min(1)),
    pendingImageArtifactIds: z.array(z.string().min(1)),
    resumedArtifactIds: z.array(z.string().min(1)),
  })
  .strict();

const QueueValidationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ready") }).passthrough(),
  z
    .object({
      kind: z.literal("blocked"),
      issues: z.array(
        z
          .object({
            code: z.string().min(1),
            message: z.string().min(1),
          })
          .passthrough(),
      ),
    })
    .passthrough(),
]);

const QueueEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    issue: z.literal("DF-233"),
    projectId: z.string().min(1),
    jobId: z.string().min(1),
    exportedAt: z.number().int().nonnegative(),
    resultStatus: z.enum(["succeeded", "failed"]),
    slides: z.array(QueueSlideSchema),
    failures: z.array(QueueFailureSchema),
    jobs: z.array(QueueJobSchema),
    retryProvenance: z.array(RetryProvenanceSchema),
    storedImageArtifactPaths: z.array(z.string().min(1)),
    restartResumeEvidence: RestartResumeEvidenceSchema.optional(),
    validation: QueueValidationSchema,
  })
  .passthrough();

const QueueSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    appSurface: z.literal("packaged_image_queue"),
    packageArchiveSha256: z.string().min(1),
  })
  .strict();

const ProjectFolderExportSchema = z
  .object({
    evidencePath: z.string().min(1),
    projectArtifactWriteCount: z.number().int().positive(),
    includesRetryEvidence: z.boolean(),
    includesCancellationEvidence: z.boolean(),
    includesRestartResumeEvidence: z.boolean(),
    includesOtherProjects: z.literal(false),
    leaksSyntheticSecret: z.literal(false),
  })
  .strict();

const QueueProofSchema = z
  .object({
    sessionId: z.string().min(1),
    scenario: z.enum(["retry", "cancellation", "restart_resume"]),
    evidencePath: z.string().min(1),
    queueEvidence: QueueEvidenceSchema,
  })
  .strict();

const PackagedQueueInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    queueSession: QueueSessionSchema,
    projectFolderExport: ProjectFolderExportSchema,
    retryProof: QueueProofSchema.optional(),
    cancellationProof: QueueProofSchema.optional(),
    restartResumeProof: QueueProofSchema.optional(),
  })
  .strict();

export type Df233PackagedQueueInput = z.infer<typeof PackagedQueueInputSchema>;
export type Df233PackagedQueueProof = z.infer<typeof QueueProofSchema>;

export class Df233PackagedQueueInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-233 packaged queue input: ${issues.join("; ")}`);
    this.name = "Df233PackagedQueueInputError";
    this.issues = issues;
  }
}

export function parseDf233PackagedQueueInput(value: unknown): Df233PackagedQueueInput {
  const parsed = PackagedQueueInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df233PackagedQueueInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf233PackagedQueueJson(raw: string): Df233PackagedQueueInput {
  try {
    return parseDf233PackagedQueueInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df233PackagedQueueInputError([error.message]);
    }
    throw error;
  }
}
