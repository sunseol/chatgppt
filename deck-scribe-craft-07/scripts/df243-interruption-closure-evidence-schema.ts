import { z } from "zod";

const InterruptionScenarioSchema = z
  .object({
    id: z.string(),
    jobStatusAfterRestart: z.enum([
      "queued",
      "running",
      "succeeded",
      "failed",
      "cancelled",
      "interrupted",
    ]),
    completedArtifactIdsBefore: z.array(z.string()),
    completedArtifactIdsAfter: z.array(z.string()),
    liveJobId: z.string(),
    recoverySnapshotPath: z.string(),
    recoverySnapshotScope: z.enum(["app_storage", "protocol_probe", "transient"]),
    cancellationRecorded: z.boolean(),
    cancelSignalEvidencePath: z.string().optional(),
    cancelSignalJobId: z.string().optional(),
    pendingImageArtifactIds: z.array(z.string()),
    resumedArtifactIds: z.array(z.string()),
    cancelledJobStillRunning: z.boolean(),
    interruptedArtifactIds: z.array(z.string()),
    approvableArtifactIds: z.array(z.string()),
    exportableArtifactIds: z.array(z.string()),
    approvalGateChecked: z.boolean(),
    approvalGateEvidencePath: z.string().optional(),
    exportGateChecked: z.boolean(),
    exportGateEvidencePath: z.string().optional(),
  })
  .strict();

const InterruptionMatrixSchema = z
  .object({
    reportPath: z.string(),
    scenarios: z.array(InterruptionScenarioSchema),
  })
  .strict();

const InterruptionClosureInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    matrixEvidencePath: z.string().min(1),
    matrix: InterruptionMatrixSchema,
  })
  .strict();

export type Df243InterruptionClosureInput = z.infer<typeof InterruptionClosureInputSchema>;

export class Df243InterruptionClosureInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-243 interruption closure input: ${issues.join("; ")}`);
    this.name = "Df243InterruptionClosureInputError";
    this.issues = issues;
  }
}

export function parseDf243InterruptionClosureInput(value: unknown): Df243InterruptionClosureInput {
  const parsed = InterruptionClosureInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df243InterruptionClosureInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf243InterruptionClosureJson(raw: string): Df243InterruptionClosureInput {
  try {
    return parseDf243InterruptionClosureInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df243InterruptionClosureInputError([error.message]);
    }
    throw error;
  }
}
