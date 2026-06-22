import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectCodexImageGenerationResult } from "../src/lib/codex-image-result-mapper";
import type { CodexImageClient, CodexImageClientRequest } from "../src/lib/codex-image-provider";
import { runCodexGenerateStageJob } from "../src/components/deck/generate-stage-codex-runner";
import type { DeckProject } from "../src/lib/deck-types";
import type { ImageArtifactStoreWrite } from "../src/lib/image-artifact-store";
import { prepareCodexImageBillingJob } from "../src/lib/live-image-billing-job";
import { buildLocalProjectFolderExport } from "../src/lib/local-data-control";
import { createProviderJobManager, type ProviderJob } from "../src/lib/provider-job-manager";
import {
  FileBackedArtifactStore,
  MemoryStorage,
  appServerErrors,
  approvedProject,
  buildImageTurnRequest,
  clock,
  contentBytes,
  sequentialIds,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";
import {
  startPackagedDryRunServer,
  runPackagedDryRunStructuredTurn,
  writePackagedEvidenceArtifact,
} from "./packaged-dry-run-codex-bridge-support";
import type { StructuredTurnEvidence } from "./live-app-server-types";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622";
const JOB_PREFIX = "job_packaged_generate_export_smoke";
const PROJECT_ID = "df244_packaged_generate_export_smoke_20260622";
const PORT = Number(process.env.DF244_PACKAGED_SMOKE_PORT ?? "4194");

const startedAt = Date.now();
await mkdir(EVIDENCE_DIR, { recursive: true });

const server = await startPackagedDryRunServer({ port: PORT });
try {
  const project = approvedProject(PROJECT_ID, startedAt);
  const store = new FileBackedArtifactStore();
  const manager = createProviderJobManager({ createId: sequentialIds(JOB_PREFIX) });
  const queued = manager.enqueue({
    providerId: "codex",
    capability: "imageGeneration",
    description: "Generate packaged Codex export smoke slide",
  });
  const jobs: ProviderJob[] = [queued];
  const progress: number[] = [];
  const client = createPackagedDryRunCodexImageClient(server.baseUrl);

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

  const evidenceArtifacts = await copyArtifactsToEvidenceBundle(store.writes);
  const exportedProject: DeckProject = {
    ...project,
    slides: completed.output ?? [],
    stage: "REVIEWING",
    updatedAt: Date.now(),
  };
  const projectFolderExport = buildLocalProjectFolderExport(exportedProject, {
    artifactWrites: store.browserWrites(),
  });
  const projectFolderExportPath = `${EVIDENCE_DIR}/project-folder-export.json`;
  await writeFile(projectFolderExportPath, projectFolderExport.content);

  const confirmationRecordPath = confirmationEvidencePath(evidenceArtifacts);
  const confirmationRecord = JSON.parse(
    String(
      evidenceArtifacts.find((artifact) => artifact.evidencePath === confirmationRecordPath)
        ?.content,
    ),
  );
  const totalLatencyMs = client.evidence.reduce((sum, evidence) => sum + evidence.durationMs, 0);
  const usageSummaryPath = `${EVIDENCE_DIR}/usage-summary.json`;
  await writeJson(usageSummaryPath, {
    capturedAt: new Date().toISOString(),
    evidenceKind: "df244-product-usage-confirmation-summary",
    projectId: project.id,
    providerKind: "codex",
    imageCount: completed.output?.length ?? 0,
    totalLatencyMs,
    costDisplay: "hidden_provider_did_not_supply_cost",
    productRunSummaryPath: `${EVIDENCE_DIR}/summary.json`,
    userConfirmation: "confirmed_app_surface_pre_generation_codex_oauth",
    confirmationEvidencePath: confirmationRecord.evidencePath,
    confirmationRecordPath,
    confirmationLabel: confirmationRecord.label,
    billingOwner: confirmationRecord.billingOwner,
    confirmedAt: confirmationRecord.confirmedAt,
  });

  const summaryPath = `${EVIDENCE_DIR}/summary.json`;
  await writeJson(summaryPath, {
    capturedAt: new Date().toISOString(),
    evidenceKind: "packaged-live-codex-generate-export-smoke",
    runtime: "DeckForge dry-run package localhost bridge -> codex app-server --stdio",
    packageSurface: {
      baseUrl: server.baseUrl,
      stdout: server.stdoutLines(),
      stderr: server.stderrLines(),
    },
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
      originalArtifactPath: slide.notes,
      artifactPath: evidencePathForOriginal(evidenceArtifacts, slide.notes),
    })),
    artifactWrites: evidenceArtifacts.map((artifact) => ({
      originalPath: artifact.originalPath,
      path: artifact.evidencePath,
      kind: typeof artifact.content === "string" ? "text" : "binary",
      bytes: contentBytes(artifact.content),
    })),
    projectFolderExport: {
      evidencePath: projectFolderExportPath,
      hash: projectFolderExport.hash,
      bytes: Buffer.byteLength(projectFolderExport.content),
      projectArtifactWriteCount: store.browserWrites().length,
      includesOtherProjects: projectFolderExport.content.includes("projects/other_project/"),
      leaksSyntheticSecret: projectFolderExport.content.includes("sk-live-secret123"),
    },
    usageSummaryPath,
    confirmationRecordPath,
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
    throw new Error(`Packaged Codex generate export smoke failed; see ${summaryPath}`);
  }
} finally {
  await server.stop();
}

function createPackagedDryRunCodexImageClient(baseUrl: string): CodexImageClient & {
  readonly evidence: StructuredTurnEvidence[];
} {
  const evidence: StructuredTurnEvidence[] = [];
  return {
    evidence,
    async generate(request: CodexImageClientRequest) {
      const turnEvidence = await runPackagedDryRunStructuredTurn(
        baseUrl,
        buildImageTurnRequest(request),
      );
      evidence.push(turnEvidence);
      const result = collectCodexImageGenerationResult({
        notifications: turnEvidence.notifications,
        runtime: turnEvidence.runtime,
        durationMs: turnEvidence.durationMs,
      });
      if (result.kind === "blocked") {
        throw new Error(result.issues.join(" "));
      }
      return result.response;
    },
  };
}

async function copyArtifactsToEvidenceBundle(writes: readonly ImageArtifactStoreWrite[]): Promise<
  readonly {
    readonly originalPath: string;
    readonly evidencePath: string;
    readonly content: string | Uint8Array;
  }[]
> {
  return Promise.all(
    writes.map(async (write) => ({
      originalPath: write.path,
      evidencePath: await writePackagedEvidenceArtifact(EVIDENCE_DIR, write.path, write.content),
      content: write.content,
    })),
  );
}

function evidencePathForOriginal(
  artifacts: readonly { readonly originalPath: string; readonly evidencePath: string }[],
  originalPath: string | undefined,
): string {
  const artifact = artifacts.find((candidate) => candidate.originalPath === originalPath);
  if (!artifact) throw new Error(`Missing copied evidence artifact for ${String(originalPath)}`);
  return artifact.evidencePath;
}

function confirmationEvidencePath(
  artifacts: readonly {
    readonly originalPath: string;
    readonly evidencePath: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  const artifact = artifacts.find((candidate) =>
    candidate.originalPath.endsWith("image-billing-confirmation.json"),
  );
  if (!artifact || typeof artifact.content !== "string") {
    throw new Error("Packaged smoke did not capture a billing confirmation record.");
  }
  return artifact.evidencePath;
}
