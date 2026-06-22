import { z } from "zod";
import type {
  Df243InterruptionClosureInput,
  Df243InterruptionMatrix,
} from "./df243-interruption-closure-evidence-schema";
import {
  Df243InterruptionClosureInputError,
  parseDf243InterruptionClosureInput,
} from "./df243-interruption-closure-evidence-schema";

const CancelJobSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1),
    cancelRequested: z.boolean(),
  })
  .passthrough();

const CancelProductSmokeSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df243-cancel-product-evidence-smoke"),
    projectId: z.string().min(1),
    runId: z.string().min(1),
    jobs: z.array(CancelJobSchema).min(1),
    recoverySnapshotPath: z.string().min(1),
    cancelSignalEvidencePath: z.string().min(1),
    matrixPath: z.string().min(1),
  })
  .passthrough();

const ImageResumeSummarySchema = z
  .object({
    recoverySnapshotPath: z.string().min(1),
    pendingImageArtifactIds: z.array(z.string().min(1)).min(1),
    resumedArtifactIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

const InterruptedGateSummarySchema = z
  .object({
    recoverySnapshotPath: z.string().min(1),
    approvalGateEvidencePath: z.string().min(1),
    exportGateEvidencePath: z.string().min(1),
    interruptedArtifactIds: z.array(z.string().min(1)).min(1),
    approvableArtifactIds: z.array(z.string().min(1)).min(1),
    exportableArtifactIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

const ResumeGateProductSmokeSummarySchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df243-resume-gate-product-evidence-smoke"),
    projectId: z.string().min(1),
    runId: z.string().min(1),
    imageResume: ImageResumeSummarySchema,
    interruptedGate: InterruptedGateSummarySchema,
    matrixPath: z.string().min(1),
  })
  .passthrough();

type Df243InterruptionScenario = Df243InterruptionMatrix["scenarios"][number];

export type Df243CancelProductSmokeSummary = z.infer<typeof CancelProductSmokeSummarySchema>;
export type Df243ResumeGateProductSmokeSummary = z.infer<
  typeof ResumeGateProductSmokeSummarySchema
>;

export type Df243ProductSmokeClosureIngestionOptions = {
  readonly packageArchiveSha256: string;
  readonly matrixEvidencePath: string;
  readonly cancelSummary: Df243CancelProductSmokeSummary;
  readonly cancelMatrix: Df243InterruptionMatrix;
  readonly resumeGateSummary: Df243ResumeGateProductSmokeSummary;
  readonly resumeGateMatrix: Df243InterruptionMatrix;
};

export function parseDf243CancelProductSmokeSummary(
  value: unknown,
): Df243CancelProductSmokeSummary {
  const parsed = CancelProductSmokeSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("cancelProductSmoke", parsed.error.issues);
}

export function parseDf243CancelProductSmokeSummaryJson(
  raw: string,
): Df243CancelProductSmokeSummary {
  return parseSmokeJson(raw, parseDf243CancelProductSmokeSummary);
}

export function parseDf243ResumeGateProductSmokeSummary(
  value: unknown,
): Df243ResumeGateProductSmokeSummary {
  const parsed = ResumeGateProductSmokeSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw smokeInputError("resumeGateProductSmoke", parsed.error.issues);
}

export function parseDf243ResumeGateProductSmokeSummaryJson(
  raw: string,
): Df243ResumeGateProductSmokeSummary {
  return parseSmokeJson(raw, parseDf243ResumeGateProductSmokeSummary);
}

export function buildDf243InterruptionClosureInputFromProductSmokes(
  options: Df243ProductSmokeClosureIngestionOptions,
): Df243InterruptionClosureInput {
  const textShutdown = scenario(options.resumeGateMatrix, "text_turn_shutdown");
  const fetchShutdown = scenario(options.resumeGateMatrix, "fetch_shutdown");
  const imagePartialResume = imagePartialResumeScenario(options);
  const cancelJob = cancelJobScenario(options);
  const interruptedArtifactGate = interruptedGateScenario(options);
  return parseDf243InterruptionClosureInput({
    capturedAt: latestTimestamp(
      options.cancelSummary.capturedAt,
      options.resumeGateSummary.capturedAt,
    ),
    packageArchiveSha256: options.packageArchiveSha256,
    matrixEvidencePath: options.matrixEvidencePath,
    matrix: {
      reportPath: options.resumeGateMatrix.reportPath,
      scenarios: [
        textShutdown,
        fetchShutdown,
        imagePartialResume,
        cancelJob,
        interruptedArtifactGate,
      ],
    },
  });
}

export function buildDf243ProductSmokeInterruptionMatrixCandidate(
  options: Df243ProductSmokeClosureIngestionOptions,
): Df243InterruptionMatrix {
  return buildDf243InterruptionClosureInputFromProductSmokes(options).matrix;
}

function cancelJobScenario(
  options: Df243ProductSmokeClosureIngestionOptions,
): Df243InterruptionScenario {
  const cancelJob = scenario(options.cancelMatrix, "cancel_job");
  pathMustMatch(
    "cancel_job.recoverySnapshotPath",
    cancelJob.recoverySnapshotPath,
    options.cancelSummary.recoverySnapshotPath,
  );
  pathMustMatch(
    "cancel_job.cancelSignalEvidencePath",
    cancelJob.cancelSignalEvidencePath,
    options.cancelSummary.cancelSignalEvidencePath,
  );
  return {
    ...cancelJob,
    recoverySnapshotPath: options.cancelSummary.recoverySnapshotPath,
    cancelSignalEvidencePath: options.cancelSummary.cancelSignalEvidencePath,
  };
}

function imagePartialResumeScenario(
  options: Df243ProductSmokeClosureIngestionOptions,
): Df243InterruptionScenario {
  const imagePartialResume = scenario(options.resumeGateMatrix, "image_partial_resume");
  pathMustMatch(
    "image_partial_resume.recoverySnapshotPath",
    imagePartialResume.recoverySnapshotPath,
    options.resumeGateSummary.imageResume.recoverySnapshotPath,
  );
  return {
    ...imagePartialResume,
    recoverySnapshotPath: options.resumeGateSummary.imageResume.recoverySnapshotPath,
    pendingImageArtifactIds: options.resumeGateSummary.imageResume.pendingImageArtifactIds,
    resumedArtifactIds: options.resumeGateSummary.imageResume.resumedArtifactIds,
  };
}

function interruptedGateScenario(
  options: Df243ProductSmokeClosureIngestionOptions,
): Df243InterruptionScenario {
  const interruptedGate = scenario(options.resumeGateMatrix, "interrupted_artifact_gate");
  const summary = options.resumeGateSummary.interruptedGate;
  pathMustMatch(
    "interrupted_artifact_gate.recoverySnapshotPath",
    interruptedGate.recoverySnapshotPath,
    summary.recoverySnapshotPath,
  );
  pathMustMatch(
    "interrupted_artifact_gate.approvalGateEvidencePath",
    interruptedGate.approvalGateEvidencePath,
    summary.approvalGateEvidencePath,
  );
  pathMustMatch(
    "interrupted_artifact_gate.exportGateEvidencePath",
    interruptedGate.exportGateEvidencePath,
    summary.exportGateEvidencePath,
  );
  return {
    ...interruptedGate,
    recoverySnapshotPath: summary.recoverySnapshotPath,
    approvalGateEvidencePath: summary.approvalGateEvidencePath,
    exportGateEvidencePath: summary.exportGateEvidencePath,
    interruptedArtifactIds: summary.interruptedArtifactIds,
    approvableArtifactIds: summary.approvableArtifactIds,
    exportableArtifactIds: summary.exportableArtifactIds,
  };
}

function scenario(matrix: Df243InterruptionMatrix, id: string): Df243InterruptionScenario {
  const found = matrix.scenarios.find((candidate) => candidate.id === id);
  if (found !== undefined) return found;
  throw new Df243InterruptionClosureInputError([`matrix.scenarios: missing ${id}`]);
}

function pathMustMatch(label: string, matrixPath: string | undefined, summaryPath: string): void {
  if (matrixPath === summaryPath) return;
  throw new Df243InterruptionClosureInputError([
    `${label}: product smoke summary path does not match matrix path`,
  ]);
}

function latestTimestamp(first: string, second: string): string {
  return Date.parse(first) >= Date.parse(second) ? first : second;
}

function parseSmokeJson<T>(raw: string, parse: (value: unknown) => T): T {
  try {
    return parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df243InterruptionClosureInputError([error.message]);
    }
    throw error;
  }
}

function smokeInputError(
  prefix: string,
  issues: readonly z.ZodIssue[],
): Df243InterruptionClosureInputError {
  return new Df243InterruptionClosureInputError(
    issues.map((issue) => `${issue.path.join(".") || prefix}: ${issue.message}`),
  );
}
