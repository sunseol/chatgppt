import { mkdir } from "node:fs/promises";
import { runCodexLiveSlideGenerationSession } from "../src/lib/live-slide-generation-session";
import { writeLiveImageQueueEvidenceExport } from "../src/lib/live-image-queue-evidence-export";
import { writeLiveInterruptionCancelEvidenceExport } from "../src/lib/live-interruption-cancel-evidence-export";
import { buildLocalProjectFolderExport } from "../src/lib/local-data-control";
import { createProviderJobManager } from "../src/lib/provider-job-manager";
import {
  FileBackedArtifactStore,
  appServerErrors,
  approvedProject,
  clock,
  contentBytes,
  createLiveCodexImageClient,
  sequentialIds,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df243-live-codex-cancel-smoke-20260622";
const PROJECT_ID = "df243_live_codex_cancel_smoke_20260622";
const RUN_ID = "live_codex_cancel_product_run_20260622";

const startedAt = Date.now();
await mkdir(EVIDENCE_DIR, { recursive: true });

const project = approvedProject(PROJECT_ID, startedAt);
const store = new FileBackedArtifactStore();
const manager = createProviderJobManager({ createId: sequentialIds("live_job_cancel_codex") });
const liveClient = createLiveCodexImageClient();
let cancelRequested = false;
let cancelRequestedAt: number | undefined;

const queueResult = await runCodexLiveSlideGenerationSession({
  project,
  client: {
    async generate(request) {
      cancelRequested = true;
      cancelRequestedAt = Date.now();
      return liveClient.generate(request);
    },
  },
  store,
  manager,
  maxParallel: 1,
  isCancellationRequested: () => cancelRequested,
  now: clock(startedAt + 1_000),
});

if (queueResult.kind === "blocked") {
  throw new Error(`Live Codex cancel smoke queue blocked: ${queueResult.issues.join(" ")}`);
}

if (queueResult.status !== "failed") {
  throw new Error(`Expected cancelled live Codex queue to fail, got ${queueResult.status}.`);
}

if (store.writes.some((write) => write.path.includes("/slides/images/"))) {
  throw new Error("Cancelled live Codex late output wrote a slide image artifact.");
}

const queueEvidence = await writeLiveImageQueueEvidenceExport({
  store,
  projectId: PROJECT_ID,
  jobId: RUN_ID,
  exportedAt: clock(startedAt + 2_000)(),
  result: queueResult,
  storedImageArtifactPaths: [],
});

if (queueEvidence.evidence.validation.kind !== "ready") {
  throw new Error("Expected live Codex cancellation queue evidence to validate as ready.");
}

const cancelEvidence = await writeLiveInterruptionCancelEvidenceExport({
  store,
  projectId: PROJECT_ID,
  jobId: RUN_ID,
  exportedAt: clock(startedAt + 3_000)(),
  result: queueResult,
});

if (cancelEvidence.kind === "blocked") {
  throw new Error(`Live Codex cancel evidence blocked: ${cancelEvidence.issues.join(" ")}`);
}

const exportedProject = {
  ...project,
  slides: queueResult.slides,
  stage: "REVIEWING" as const,
  updatedAt: Date.now(),
};
const projectFolderExport = buildLocalProjectFolderExport(exportedProject, {
  artifactWrites: store.browserWrites(),
});
const summaryPath = `${EVIDENCE_DIR}/summary.json`;
await writeJson(summaryPath, {
  capturedAt: new Date().toISOString(),
  evidenceKind: "df243-live-codex-cancel-product-evidence-smoke",
  runtime: "codex app-server --stdio via product slide generation queue",
  projectId: PROJECT_ID,
  runId: RUN_ID,
  cancelRequested,
  cancelRequestedAt,
  queueStatus: queueResult.status,
  acceptedSlides: queueResult.slides.map((slide) => slide.number),
  failures: queueResult.failures,
  jobs: queueResult.jobs.map((job) => ({
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    cancelRequested: job.cancelRequested,
    errorMessage: job.errorMessage,
  })),
  queueEvidencePath: queueEvidence.path,
  queueEvidenceValidation: queueEvidence.evidence.validation,
  recoverySnapshotPath: cancelEvidence.recoverySnapshotPath,
  cancelSignalEvidencePath: cancelEvidence.cancelSignalEvidencePath,
  artifactWrites: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
  wroteSlideImageArtifacts: store.writes.some((write) => write.path.includes("/slides/images/")),
  projectFolderExport: {
    hash: projectFolderExport.hash,
    bytes: Buffer.byteLength(projectFolderExport.content),
    projectArtifactWriteCount: store.browserWrites().length,
    includesQueueEvidence: projectFolderExport.content.includes(queueEvidence.path),
    includesCancelSnapshot: projectFolderExport.content.includes(
      cancelEvidence.recoverySnapshotPath,
    ),
    includesCancelSignal: projectFolderExport.content.includes(
      cancelEvidence.cancelSignalEvidencePath,
    ),
  },
  appServerTurns: liveClient.evidence.map((evidence) => ({
    threadId: evidence.threadId,
    turnId: evidence.turnId,
    durationMs: evidence.durationMs,
    protocolLineCount: evidence.protocolLineCount,
    stderrLogLineCount: evidence.stderrLogLineCount,
    eventMethods: evidence.eventMethods,
    errors: appServerErrors(evidence),
  })),
});

console.log(`${summaryPath} ${await sha256File(summaryPath)}`);
