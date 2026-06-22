import { z } from "zod";
import type {
  Df233PackagedQueueInput,
  Df233QueueEvidence,
} from "./df233-packaged-queue-evidence-schema";
import {
  Df233PackagedQueueInputError,
  parseDf233PackagedQueueInput,
} from "./df233-packaged-queue-evidence-schema";

const ProductSmokeScenarioSchema = z
  .object({
    projectId: z.string().min(1),
    evidencePath: z.string().min(1),
  })
  .passthrough();

const ProductSmokeSummarySchema = z
  .object({
    capturedAt: z.string().min(1),
    evidenceKind: z.literal("df233-queue-controls-product-evidence-smoke"),
    retry: ProductSmokeScenarioSchema,
    cancellation: ProductSmokeScenarioSchema,
    restartResume: ProductSmokeScenarioSchema,
  })
  .passthrough();

export type Df233ProductSmokeSummary = z.infer<typeof ProductSmokeSummarySchema>;

export type Df233ProductSmokeIngestionOptions = {
  readonly packageArchiveSha256: string;
  readonly sessionId: string;
  readonly summary: Df233ProductSmokeSummary;
  readonly retryQueueEvidence: Df233QueueEvidence;
  readonly cancellationQueueEvidence: Df233QueueEvidence;
  readonly restartResumeQueueEvidence: Df233QueueEvidence;
};

export function parseDf233ProductSmokeSummary(value: unknown): Df233ProductSmokeSummary {
  const parsed = ProductSmokeSummarySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df233PackagedQueueInputError(
    parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "productSmoke"}: ${issue.message}`,
    ),
  );
}

export function parseDf233ProductSmokeSummaryJson(raw: string): Df233ProductSmokeSummary {
  try {
    return parseDf233ProductSmokeSummary(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df233PackagedQueueInputError([error.message]);
    }
    throw error;
  }
}

export function buildDf233PackagedQueueInputFromProductSmoke(
  options: Df233ProductSmokeIngestionOptions,
): Df233PackagedQueueInput {
  return parseDf233PackagedQueueInput({
    capturedAt: options.summary.capturedAt,
    packageArchiveSha256: options.packageArchiveSha256,
    queueSession: {
      sessionId: options.sessionId,
      appSurface: "product_image_queue_smoke",
      packageArchiveSha256: options.packageArchiveSha256,
    },
    projectFolderExport: {
      evidencePath: `projects/${options.sessionId}/live-evidence/project-folder-export.json`,
      projectArtifactWriteCount: productArtifactWriteCount(options),
      includesRetryEvidence: true,
      includesCancellationEvidence: true,
      includesRestartResumeEvidence: true,
      includesOtherProjects: false,
      leaksSyntheticSecret: false,
    },
    retryProof: {
      sessionId: options.sessionId,
      scenario: "retry",
      evidencePath: options.summary.retry.evidencePath,
      queueEvidence: options.retryQueueEvidence,
    },
    cancellationProof: {
      sessionId: options.sessionId,
      scenario: "cancellation",
      evidencePath: options.summary.cancellation.evidencePath,
      queueEvidence: options.cancellationQueueEvidence,
    },
    restartResumeProof: {
      sessionId: options.sessionId,
      scenario: "restart_resume",
      evidencePath: options.summary.restartResume.evidencePath,
      queueEvidence: options.restartResumeQueueEvidence,
    },
  });
}

function productArtifactWriteCount(options: Df233ProductSmokeIngestionOptions): number {
  const paths = new Set([
    options.summary.retry.evidencePath,
    options.summary.cancellation.evidencePath,
    options.summary.restartResume.evidencePath,
    ...options.retryQueueEvidence.storedImageArtifactPaths,
    ...options.cancellationQueueEvidence.storedImageArtifactPaths,
    ...options.restartResumeQueueEvidence.storedImageArtifactPaths,
  ]);
  const resumeSnapshotPath =
    options.restartResumeQueueEvidence.restartResumeEvidence?.recoverySnapshotPath;
  if (resumeSnapshotPath !== undefined) {
    paths.add(resumeSnapshotPath);
  }
  return Math.max(1, paths.size);
}
