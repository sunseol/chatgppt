import { mkdir } from "node:fs/promises";
import { runCodexGenerateStageJob } from "../src/components/deck/generate-stage-codex-runner";
import type { DeckProject } from "../src/lib/deck-types";
import { prepareCodexImageBillingJob } from "../src/lib/live-image-billing-job";
import { buildLocalProjectFolderExport } from "../src/lib/local-data-control";
import { createProviderJobManager, type ProviderJob } from "../src/lib/provider-job-manager";
import {
  FileBackedArtifactStore,
  MemoryStorage,
  appServerErrors,
  approvedProject,
  clock,
  contentBytes,
  createLiveCodexImageClient,
  sequentialIds,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df244-generate-export-smoke-20260622";
const JOB_PREFIX = "job_generate_export_smoke";
const PROJECT_ID = "df244_generate_export_smoke_20260622";

const startedAt = Date.now();
await mkdir(EVIDENCE_DIR, { recursive: true });

const project = approvedProject(PROJECT_ID, startedAt);
const store = new FileBackedArtifactStore();
const manager = createProviderJobManager({ createId: sequentialIds(JOB_PREFIX) });
const queued = manager.enqueue({
  providerId: "codex",
  capability: "imageGeneration",
  description: "Generate Codex export smoke slide",
});
const jobs: ProviderJob[] = [queued];
const progress: number[] = [];
const client = createLiveCodexImageClient();

const billing = await prepareCodexImageBillingJob({
  projectId: project.id,
  jobId: queued.id,
  providerId: "codex",
  slideCount: project.slideCount,
  manager,
  evidenceStore: store,
  storage: new MemoryStorage(),
  confirm: () => true,
  now: clock(startedAt),
});

if (billing.kind !== "confirmed") {
  throw new Error(`Billing confirmation was not confirmed: ${billing.reason}`);
}
jobs.push(billing.job);

const completed = await runCodexGenerateStageJob({
  project,
  jobId: queued.id,
  manager,
  client,
  store,
  onJob: (job) => jobs.push(job),
  onSlides: () => undefined,
  onProgress: (percent) => progress.push(percent),
  now: clock(startedAt + 1_000),
});

const exportedProject: DeckProject = {
  ...project,
  slides: completed.output ?? [],
  stage: "REVIEWING",
  updatedAt: Date.now(),
};
const projectFolderExport = buildLocalProjectFolderExport(exportedProject, {
  artifactWrites: store.browserWrites(),
});
const summaryPath = `${EVIDENCE_DIR}/summary.json`;
await writeJson(summaryPath, {
  capturedAt: new Date().toISOString(),
  evidenceKind: "live-codex-generate-export-smoke",
  runtime: "codex app-server --stdio via product Generate runner",
  projectId: project.id,
  jobId: queued.id,
  billingJobStatus: billing.job.status,
  completedJobStatus: completed.status,
  partialResult: completed.partialResult,
  progress,
  jobs: jobs.map((job) => ({
    id: job.id,
    status: job.status,
    attempt: job.attempt,
    errorMessage: job.errorMessage,
    partialResult: job.partialResult,
  })),
  slides: (completed.output ?? []).map((slide) => ({
    slideNumber: slide.number,
    status: slide.status,
    imageDescriptor: slide.imageDescriptor,
    artifactPath: slide.notes,
  })),
  artifactWrites: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
  projectFolderExport: {
    hash: projectFolderExport.hash,
    bytes: Buffer.byteLength(projectFolderExport.content),
    projectArtifactWriteCount: store.browserWrites().length,
    includesOtherProjects: projectFolderExport.content.includes("projects/other_project/"),
    leaksSyntheticSecret: projectFolderExport.content.includes("sk-live-secret123"),
  },
  appServerTurns: client.evidence.map((evidence) => ({
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
if (completed.status !== "succeeded") {
  throw new Error(`Codex generate export smoke failed; see ${summaryPath}`);
}
