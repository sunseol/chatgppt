import type { StepKey } from "./deck-types";
import type { FrozenDeckContext } from "./deck-context";
import type { ProviderJobStatus } from "./provider-job-manager";
import { hasRawConversationSource } from "./project-thread-raw-source";

export type ProjectWorkerThreadStage = Extract<
  StepKey,
  "research" | "plan" | "design" | "layout" | "generate" | "review"
>;

export type ProjectWorkerThreadInput = {
  readonly stage: ProjectWorkerThreadStage;
  readonly threadId: string;
  readonly lastCompletedTurnId: string;
};

export type ProjectWorkerThreadManifest = ProjectWorkerThreadInput & {
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly approvedArtifactIds: readonly string[];
};

export type ProjectThreadManifest = {
  readonly projectId: string;
  readonly coordinatorThreadId: string;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly approvedArtifactIds: readonly string[];
  readonly workers: readonly ProjectWorkerThreadManifest[];
};

export type ProjectThreadManifestValidation =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export type LiveContextJobSnapshot = {
  readonly jobId: string;
  readonly providerId: string;
  readonly deckContextId: string;
  readonly status: ProviderJobStatus;
};

export type ProjectThreadRecoverySnapshot = {
  readonly manifest: ProjectThreadManifest;
  readonly persistedAt: number;
};

export type ResumableProjectWorkerThread = ProjectWorkerThreadInput & {
  readonly deckContextId: string;
};

export type ProjectThreadRecoveryResult =
  | {
      readonly kind: "ready";
      readonly manifest: ProjectThreadManifest;
      readonly resumableThreads: readonly ResumableProjectWorkerThread[];
    }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export function createProjectThreadManifest(input: {
  readonly context: FrozenDeckContext;
  readonly coordinatorThreadId: string;
  readonly workers: readonly ProjectWorkerThreadInput[];
}): ProjectThreadManifest {
  const approvedArtifactIds = approvedIds(input.context);
  return {
    projectId: input.context.projectId,
    coordinatorThreadId: input.coordinatorThreadId,
    deckContextId: input.context.deckContextId,
    deckContextHash: input.context.hash,
    approvedArtifactIds,
    workers: input.workers.map((worker) => ({
      ...worker,
      deckContextId: input.context.deckContextId,
      deckContextHash: input.context.hash,
      approvedArtifactIds,
    })),
  };
}

export function validateProjectThreadManifest(
  manifest: ProjectThreadManifest,
): ProjectThreadManifestValidation {
  const issues = [
    ...manifestIssues(manifest),
    ...manifest.workers.flatMap((worker) => workerIssues(manifest, worker)),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function findStaleLiveContextJobs(input: {
  readonly currentDeckContextId: string;
  readonly jobs: readonly LiveContextJobSnapshot[];
}): readonly string[] {
  return input.jobs
    .filter((job) => isLiveProvider(job.providerId))
    .filter((job) => isActive(job.status))
    .filter((job) => job.deckContextId !== input.currentDeckContextId)
    .map((job) => job.jobId);
}

export function recoverProjectThreadManifest(input: {
  readonly context: FrozenDeckContext;
  readonly snapshot: ProjectThreadRecoverySnapshot;
}): ProjectThreadRecoveryResult {
  const expectedArtifactIds = approvedIds(input.context);
  const manifest = input.snapshot.manifest;
  const currentManifest: ProjectThreadManifest = {
    ...manifest,
    deckContextId: input.context.deckContextId,
    deckContextHash: input.context.hash,
    approvedArtifactIds: expectedArtifactIds,
  };
  const issues = [
    ...manifestIssues(manifest),
    ...(manifest.projectId === input.context.projectId
      ? []
      : ["Recovered coordinator thread belongs to a different project."]),
    ...(manifest.deckContextId === input.context.deckContextId
      ? []
      : ["Recovered coordinator thread belongs to a stale deck context."]),
    ...(manifest.deckContextHash === input.context.hash
      ? []
      : ["Recovered coordinator thread uses a stale context hash."]),
    ...(sameIds(manifest.approvedArtifactIds, expectedArtifactIds)
      ? []
      : ["Recovered approved artifact bundle does not match the current deck context."]),
    ...manifest.workers.flatMap((worker) => workerIssues(currentManifest, worker)),
  ];
  if (issues.length > 0) return { kind: "blocked", issues };
  return {
    kind: "ready",
    manifest,
    resumableThreads: manifest.workers.map((worker) => ({
      stage: worker.stage,
      threadId: worker.threadId,
      lastCompletedTurnId: worker.lastCompletedTurnId,
      deckContextId: worker.deckContextId,
    })),
  };
}

function manifestIssues(manifest: ProjectThreadManifest): readonly string[] {
  return [
    ...(manifest.coordinatorThreadId.trim()
      ? []
      : ["Project thread manifest is missing a coordinator thread id."]),
    ...duplicateWorkerStageIssues(manifest.workers),
    ...duplicateWorkerThreadIdIssues(manifest.workers),
    ...rawManifestSourceIssues(manifest),
  ];
}

function duplicateWorkerStageIssues(
  workers: readonly ProjectWorkerThreadManifest[],
): readonly string[] {
  const seenStages = new Set<ProjectWorkerThreadStage>();
  const duplicateStages = new Set<ProjectWorkerThreadStage>();
  for (const worker of workers) {
    if (seenStages.has(worker.stage)) duplicateStages.add(worker.stage);
    seenStages.add(worker.stage);
  }
  return [...duplicateStages].map(
    (stage) => `Project thread manifest has duplicate ${stage} worker threads.`,
  );
}

function duplicateWorkerThreadIdIssues(
  workers: readonly ProjectWorkerThreadManifest[],
): readonly string[] {
  const seenThreadIds = new Set<string>();
  const duplicateThreadIds = new Set<string>();
  for (const worker of workers) {
    const threadId = worker.threadId.trim();
    if (!threadId) continue;
    if (seenThreadIds.has(threadId)) duplicateThreadIds.add(threadId);
    seenThreadIds.add(threadId);
  }
  return [...duplicateThreadIds].map(
    (threadId) => `Project thread manifest has duplicate worker thread id ${threadId}.`,
  );
}

function workerIssues(
  manifest: ProjectThreadManifest,
  worker: ProjectWorkerThreadManifest,
): readonly string[] {
  const threadId = worker.threadId.trim();
  const coordinatorThreadId = manifest.coordinatorThreadId.trim();
  return [
    ...(threadId ? [] : [`Worker thread for ${worker.stage} is missing a thread id.`]),
    ...(threadId && threadId === coordinatorThreadId
      ? [`Worker thread ${threadId} reuses the coordinator thread id.`]
      : []),
    ...(worker.lastCompletedTurnId.trim()
      ? []
      : [`Worker thread ${worker.threadId} is missing the last completed turn id.`]),
    ...(worker.deckContextId === manifest.deckContextId
      ? []
      : [`Worker thread ${worker.threadId} does not use the coordinator deck context.`]),
    ...(worker.deckContextHash === manifest.deckContextHash
      ? []
      : [`Worker thread ${worker.threadId} does not use the coordinator context hash.`]),
    ...(sameIds(worker.approvedArtifactIds, manifest.approvedArtifactIds)
      ? []
      : [`Worker thread ${worker.threadId} does not use the approved artifact bundle.`]),
    ...rawWorkerSourceIssues(worker),
  ];
}

function rawManifestSourceIssues(manifest: ProjectThreadManifest): readonly string[] {
  return hasRawConversationSource({ ...manifest, workers: [] })
    ? ["Project thread manifest cannot use raw conversation as source of truth."]
    : [];
}

function rawWorkerSourceIssues(worker: ProjectWorkerThreadManifest): readonly string[] {
  return hasRawConversationSource(worker)
    ? [`Worker thread ${worker.threadId} cannot persist raw conversation source material.`]
    : [];
}

function approvedIds(context: FrozenDeckContext): readonly string[] {
  return [
    context.approvedArtifacts.briefId,
    context.approvedArtifacts.researchPackId,
    context.approvedArtifacts.deckPlanId,
    context.approvedArtifacts.designSystemId,
    context.approvedArtifacts.layoutPrototypeId,
  ];
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isLiveProvider(providerId: string): boolean {
  return providerId === "codex" || providerId === "openaiImage";
}

function isActive(status: ProviderJobStatus): boolean {
  return status === "queued" || status === "running";
}
