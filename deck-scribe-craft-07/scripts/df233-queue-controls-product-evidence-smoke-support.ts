import type { DeckProject, GeneratedSlide } from "../src/lib/deck-types";
import { createFrozenDeckContext } from "../src/lib/deck-context";
import { ImageProviderRequestError } from "../src/lib/image-provider-errors";
import { writeLiveImageQueueEvidenceExport } from "../src/lib/live-image-queue-evidence-export";
import type { LiveImageQueueRestartResumeEvidence } from "../src/lib/live-image-queue-restart-resume-evidence";
import { createProviderJobManager } from "../src/lib/provider-job-manager";
import { buildSlideContextBundles } from "../src/lib/slide-context-bundle";
import { runSlideGenerationQueue } from "../src/lib/slide-generation-queue";
import {
  FileBackedArtifactStore,
  approvedProject,
  clock,
  sequentialIds,
} from "./live-codex-generate-export-smoke-support";

const RETRY_PROJECT_ID = "df233_queue_retry_smoke_20260622";
const RESUME_PROJECT_ID = "df233_queue_resume_smoke_20260622";
const CANCEL_PROJECT_ID = "df233_queue_cancel_smoke_20260622";

export async function runQueueControlProductEvidenceSmokes(startedAt: number) {
  return {
    retry: await runRetryEvidence(startedAt),
    cancellation: await runCancelEvidence(startedAt + 4_000),
    restartResume: await runResumeEvidence(startedAt + 2_000),
  };
}

async function runRetryEvidence(now: number) {
  const project = approvedProject(RETRY_PROJECT_ID, now);
  const store = new FileBackedArtifactStore();
  const retryEvents: string[] = [];
  const result = await runSlideGenerationQueue({
    bundles: slideContextBundles(project, now),
    providerId: "codex",
    manager: createProviderJobManager({
      createId: sequentialIds("live_job_retry_product"),
      now: clock(now + 100),
    }),
    retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250 },
    waitForRetry: async (_delayMs, event) => {
      retryEvents.push(`${event.failureKind}:${event.attempt}:${event.delayMs}`);
    },
    generateSlide: async (input) => {
      if (input.attempt < 3) {
        throw new ImageProviderRequestError("server", "upstream 503 from product smoke");
      }
      return generatedSlide(RETRY_PROJECT_ID, input.bundle.slideSpec.slideNumber, input.attempt);
    },
  });
  if (result.kind === "blocked") {
    throw new Error(`DF-233 retry queue blocked: ${result.issues.join(" ")}`);
  }
  const stored = await writeLiveImageQueueEvidenceExport({
    store,
    projectId: RETRY_PROJECT_ID,
    jobId: "retry_product_run_20260622",
    exportedAt: clock(now + 1_000)(),
    result,
    storedImageArtifactPaths: storedImageArtifactPaths(RETRY_PROJECT_ID, result.slides),
  });
  if (stored.evidence.validation.kind !== "ready") {
    throw new Error("DF-233 retry queue evidence did not validate as ready.");
  }
  return {
    projectId: RETRY_PROJECT_ID,
    evidencePath: stored.path,
    validation: stored.evidence.validation,
    queueStatus: result.status,
    retryEvents,
    retryProvenance: result.retryProvenance,
    jobs: result.jobs.map(jobSummary),
  };
}

async function runResumeEvidence(now: number) {
  const project = approvedProject(RESUME_PROJECT_ID, now, { slideCount: 2 });
  const store = new FileBackedArtifactStore();
  const generatedNumbers: number[] = [];
  const result = await runSlideGenerationQueue({
    bundles: slideContextBundles(project, now),
    providerId: "codex",
    manager: createProviderJobManager({
      createId: sequentialIds("live_job_resume_product"),
      now: clock(now + 100),
    }),
    completedSlides: [generatedSlide(RESUME_PROJECT_ID, 1, 1)],
    generateSlide: async (input) => {
      generatedNumbers.push(input.bundle.slideSpec.slideNumber);
      return generatedSlide(RESUME_PROJECT_ID, input.bundle.slideSpec.slideNumber, 1);
    },
  });
  if (result.kind === "blocked") {
    throw new Error(`DF-233 resume queue blocked: ${result.issues.join(" ")}`);
  }
  const restartResumeEvidence = createRestartResumeEvidence();
  const stored = await writeLiveImageQueueEvidenceExport({
    store,
    projectId: RESUME_PROJECT_ID,
    jobId: "resume_product_run_20260622",
    exportedAt: clock(now + 1_000)(),
    result,
    storedImageArtifactPaths: storedImageArtifactPaths(RESUME_PROJECT_ID, result.slides),
    restartResumeEvidence,
  });
  if (stored.evidence.validation.kind !== "ready") {
    throw new Error("DF-233 restart-resume queue evidence did not validate as ready.");
  }
  return {
    projectId: RESUME_PROJECT_ID,
    evidencePath: stored.path,
    validation: stored.evidence.validation,
    generatedNumbers,
    completedSlides: result.slides.map((slide) => slide.number),
    jobs: result.jobs.map(jobSummary),
    restartResumeEvidence,
  };
}

async function runCancelEvidence(now: number) {
  const project = approvedProject(CANCEL_PROJECT_ID, now);
  const store = new FileBackedArtifactStore();
  let cancelRequested = false;
  const providerReturnedNumbers: number[] = [];
  const result = await runSlideGenerationQueue({
    bundles: slideContextBundles(project, now),
    providerId: "codex",
    manager: createProviderJobManager({
      createId: sequentialIds("live_job_cancel_product"),
      now: clock(now + 100),
    }),
    maxParallel: 1,
    isCancellationRequested: () => cancelRequested,
    generateSlide: async (input) => {
      providerReturnedNumbers.push(input.bundle.slideSpec.slideNumber);
      cancelRequested = true;
      return generatedSlide(CANCEL_PROJECT_ID, input.bundle.slideSpec.slideNumber, 1);
    },
  });
  if (result.kind === "blocked") {
    throw new Error(`DF-233 cancel queue blocked: ${result.issues.join(" ")}`);
  }
  const stored = await writeLiveImageQueueEvidenceExport({
    store,
    projectId: CANCEL_PROJECT_ID,
    jobId: "cancel_product_run_20260622",
    exportedAt: clock(now + 1_000)(),
    result,
    storedImageArtifactPaths: storedImageArtifactPaths(CANCEL_PROJECT_ID, result.slides),
  });
  if (stored.evidence.validation.kind !== "ready") {
    throw new Error("DF-233 cancellation queue evidence did not validate as ready.");
  }
  return {
    projectId: CANCEL_PROJECT_ID,
    evidencePath: stored.path,
    validation: stored.evidence.validation,
    queueStatus: result.status,
    providerReturnedNumbers,
    acceptedSlides: result.slides.map((slide) => slide.number),
    lateOutputRejected: providerReturnedNumbers.length > 0 && result.slides.length === 0,
    failures: result.failures,
    jobs: result.jobs.map(jobSummary),
  };
}

function slideContextBundles(project: DeckProject, now: number) {
  const contextResult = createFrozenDeckContext(project, { now: clock(now) });
  if (contextResult.kind === "blocked") {
    throw new Error(`DF-233 smoke context blocked: ${contextResult.issues.join(" ")}`);
  }
  const bundleResult = buildSlideContextBundles({ project, context: contextResult.context });
  if (bundleResult.kind === "blocked") {
    throw new Error(`DF-233 smoke bundles blocked: ${bundleResult.issues.join(" ")}`);
  }
  return bundleResult.bundles;
}

function generatedSlide(projectId: string, slideNumber: number, version: number): GeneratedSlide {
  return {
    number: slideNumber,
    version,
    status: "ready",
    imageDescriptor: `codex|16:9|slide_${String(slideNumber).padStart(
      2,
      "0",
    )}_layout.png|slide_generation@v1`,
    notes: storedImageArtifactPath(projectId, slideNumber, version),
  };
}

function storedImageArtifactPaths(
  projectId: string,
  slides: readonly GeneratedSlide[],
): readonly string[] {
  return slides.map((slide) => storedImageArtifactPath(projectId, slide.number, slide.version));
}

function storedImageArtifactPath(projectId: string, slideNumber: number, version: number): string {
  return `projects/${projectId}/slides/images/slide_${String(slideNumber).padStart(
    3,
    "0",
  )}.v${version}.png`;
}

function createRestartResumeEvidence(): LiveImageQueueRestartResumeEvidence {
  return {
    recoverySnapshotPath: `projects/${RESUME_PROJECT_ID}/live-evidence/df243-image-partial-resume-recovery-snapshot-resume_product_run_20260622.json`,
    liveJobId: "live_job_resume_product_1",
    completedArtifactIdsBefore: [`${RESUME_PROJECT_ID}_image_slide_001_v1`],
    completedArtifactIdsAfter: [
      `${RESUME_PROJECT_ID}_image_slide_001_v1`,
      `${RESUME_PROJECT_ID}_image_slide_002_v1`,
    ],
    pendingImageArtifactIds: [`${RESUME_PROJECT_ID}_image_slide_002_v1`],
    resumedArtifactIds: [`${RESUME_PROJECT_ID}_image_slide_002_v1`],
  };
}

function jobSummary(job: {
  readonly id: string;
  readonly status: string;
  readonly attempt: number;
  readonly cancelRequested: boolean;
}) {
  return {
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    cancelRequested: job.cancelRequested,
  };
}
