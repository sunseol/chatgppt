import { mkdir } from "node:fs/promises";
import type { DeckProject, GeneratedSlide } from "../src/lib/deck-types";
import { createFrozenDeckContext } from "../src/lib/deck-context";
import { evaluateLiveInterruptionMatrix } from "../src/lib/live-interruption-matrix";
import type {
  LiveInterruptionScenarioEvidence,
  LiveInterruptionScenarioId,
} from "../src/lib/live-interruption-matrix";
import { writeLiveInterruptionCancelEvidenceExport } from "../src/lib/live-interruption-cancel-evidence-export";
import { buildLocalProjectFolderExport } from "../src/lib/local-data-control";
import { createProviderJobManager } from "../src/lib/provider-job-manager";
import { buildSlideContextBundles } from "../src/lib/slide-context-bundle";
import { runSlideGenerationQueue } from "../src/lib/slide-generation-queue";
import {
  FileBackedArtifactStore,
  approvedProject,
  clock,
  contentBytes,
  sequentialIds,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622";
const PROJECT_ID = "df243_cancel_product_smoke_20260622";
const RUN_ID = "cancel_product_run_20260622";

const startedAt = Date.now();
await mkdir(EVIDENCE_DIR, { recursive: true });

const project = approvedProject(PROJECT_ID, startedAt);
const bundles = slideContextBundles(project, startedAt);
const store = new FileBackedArtifactStore();
let cancelRequested = false;
const providerReturnedSlides: number[] = [];

const queueResult = await runSlideGenerationQueue({
  bundles,
  providerId: "codex",
  maxParallel: 1,
  manager: createProviderJobManagerForSmoke(),
  isCancellationRequested: () => cancelRequested,
  generateSlide: async (input) => {
    providerReturnedSlides.push(input.bundle.slideSpec.slideNumber);
    cancelRequested = true;
    return generatedLateSlide(input.bundle.slideSpec.slideNumber);
  },
});

if (queueResult.kind === "blocked") {
  throw new Error(`DF-243 cancel smoke queue blocked: ${queueResult.issues.join(" ")}`);
}

const cancelEvidence = await writeLiveInterruptionCancelEvidenceExport({
  store,
  projectId: PROJECT_ID,
  jobId: RUN_ID,
  exportedAt: clock(startedAt + 1_000)(),
  result: queueResult,
});

if (cancelEvidence.kind === "blocked") {
  throw new Error(`DF-243 cancel evidence blocked: ${cancelEvidence.issues.join(" ")}`);
}

const matrix = {
  reportPath: "docs/live-interruption-matrix.md",
  scenarios: completeScenariosWith(cancelEvidence.scenario),
};
const matrixResult = evaluateLiveInterruptionMatrix(matrix);
if (matrixResult.kind === "blocked") {
  throw new Error(
    `DF-243 cancel smoke matrix blocked: ${matrixResult.issues
      .map((issue) => issue.code)
      .join(" ")}`,
  );
}

const projectFolderExport = buildLocalProjectFolderExport(
  {
    ...project,
    slides: queueResult.slides,
    updatedAt: Date.now(),
  },
  { artifactWrites: store.browserWrites() },
);
const matrixPath = `${EVIDENCE_DIR}/df243-cancel-product-smoke-matrix.json`;
await writeJson(matrixPath, matrix);
const summaryPath = `${EVIDENCE_DIR}/summary.json`;
await writeJson(summaryPath, {
  capturedAt: new Date().toISOString(),
  evidenceKind: "df243-cancel-product-evidence-smoke",
  runtime: "product slide generation queue plus DF-243 cancel writer",
  projectId: PROJECT_ID,
  runId: RUN_ID,
  queueStatus: queueResult.status,
  providerReturnedSlides,
  acceptedSlides: queueResult.slides.map((slide) => slide.number),
  lateOutputRejected: providerReturnedSlides.length > 0 && queueResult.slides.length === 0,
  failures: queueResult.failures,
  jobs: queueResult.jobs.map((job) => ({
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    cancelRequested: job.cancelRequested,
    errorMessage: job.errorMessage,
  })),
  recoverySnapshotPath: cancelEvidence.recoverySnapshotPath,
  cancelSignalEvidencePath: cancelEvidence.cancelSignalEvidencePath,
  matrixPath,
  matrixResult,
  artifactWrites: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
  projectFolderExport: {
    hash: projectFolderExport.hash,
    bytes: Buffer.byteLength(projectFolderExport.content),
    projectArtifactWriteCount: store.browserWrites().length,
    includesCancelSnapshot: projectFolderExport.content.includes(
      cancelEvidence.recoverySnapshotPath,
    ),
    includesCancelSignal: projectFolderExport.content.includes(
      cancelEvidence.cancelSignalEvidencePath,
    ),
  },
});

console.log(`${summaryPath} ${await sha256File(summaryPath)}`);

function createProviderJobManagerForSmoke() {
  return createProviderJobManager({ createId: sequentialIds("live_job_cancel_product") });
}

function slideContextBundles(project: DeckProject, now: number) {
  const contextResult = createFrozenDeckContext(project, { now: clock(now) });
  if (contextResult.kind === "blocked") {
    throw new Error(`DF-243 cancel smoke context blocked: ${contextResult.issues.join(" ")}`);
  }
  const bundleResult = buildSlideContextBundles({ project, context: contextResult.context });
  if (bundleResult.kind === "blocked") {
    throw new Error(`DF-243 cancel smoke bundles blocked: ${bundleResult.issues.join(" ")}`);
  }
  return bundleResult.bundles;
}

function generatedLateSlide(slideNumber: number): GeneratedSlide {
  return {
    number: slideNumber,
    version: 1,
    status: "ready",
    imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
  };
}

function completeScenariosWith(
  cancelScenario: LiveInterruptionScenarioEvidence,
): readonly LiveInterruptionScenarioEvidence[] {
  return [
    scenario("text_turn_shutdown", "failed"),
    scenario("fetch_shutdown", "failed"),
    scenario("image_partial_resume", "interrupted", {
      pendingImageArtifactIds: [`${PROJECT_ID}_image_slide_001_v2`],
      resumedArtifactIds: [`${PROJECT_ID}_image_slide_001_v2`],
    }),
    cancelScenario,
    scenario("interrupted_artifact_gate", "interrupted", {
      interruptedArtifactIds: [`${PROJECT_ID}_partial_plan_turn`],
      approvalGateChecked: true,
      approvalGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-interrupted-artifact-gate-approval-${RUN_ID}.json`,
      exportGateChecked: true,
      exportGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-interrupted-artifact-gate-export-${RUN_ID}.json`,
    }),
  ];
}

function scenario(
  id: Exclude<LiveInterruptionScenarioId, "cancel_job">,
  status: LiveInterruptionScenarioEvidence["jobStatusAfterRestart"],
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart: status,
    completedArtifactIdsBefore: [],
    completedArtifactIdsAfter: [],
    liveJobId: `live_job_${id}_smoke_20260622`,
    recoverySnapshotPath: `projects/${PROJECT_ID}/live-evidence/df243-${id.replaceAll(
      "_",
      "-",
    )}-recovery-snapshot-${RUN_ID}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    pendingImageArtifactIds: [],
    resumedArtifactIds: [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: [],
    approvableArtifactIds: [],
    exportableArtifactIds: [],
    approvalGateChecked: true,
    approvalGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-interrupted-artifact-gate-approval-default-${id}.json`,
    exportGateChecked: true,
    exportGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-interrupted-artifact-gate-export-default-${id}.json`,
    ...patch,
  };
}
