import { hasNonSyntheticEvidencePath } from "../src/lib/live-evidence-path";
import type {
  Df233PackagedQueueInput,
  Df233PackagedQueueProof,
} from "./df233-packaged-queue-evidence-schema";
export {
  Df233PackagedQueueInputError,
  parseDf233PackagedQueueInput,
  parseDf233PackagedQueueJson,
} from "./df233-packaged-queue-evidence-schema";

export type Df233PackagedQueueEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df233-packaged-queue-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly queueSessionId: string;
  readonly retry?: Df233PackagedQueueProofSummary;
  readonly cancellation?: Df233PackagedQueueProofSummary;
  readonly restartResume?: Df233PackagedQueueProofSummary;
  readonly releaseBlockers: readonly string[];
};

export type Df233PackagedQueueProofSummary = {
  readonly evidencePath: string;
  readonly projectId: string;
  readonly jobId: string;
  readonly storedImageArtifactCount: number;
};

type QueueScenario = Df233PackagedQueueProof["scenario"];

export function produceDf233PackagedQueueEvidence(
  input: Df233PackagedQueueInput,
): Df233PackagedQueueEvidence {
  const retry = proofSummary(input.retryProof);
  const cancellation = proofSummary(input.cancellationProof);
  const restartResume = proofSummary(input.restartResumeProof);
  const releaseBlockers = [
    ...queueSessionBlockers(input),
    ...projectFolderExportBlockers(input),
    ...retryBlockers(input),
    ...cancellationBlockers(input),
    ...restartResumeBlockers(input),
    ...distinctProofBlockers(input),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df233-packaged-queue-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    queueSessionId: input.queueSession.sessionId,
    ...(retry === undefined ? {} : { retry }),
    ...(cancellation === undefined ? {} : { cancellation }),
    ...(restartResume === undefined ? {} : { restartResume }),
    releaseBlockers,
  };
}

function queueSessionBlockers(input: Df233PackagedQueueInput): readonly string[] {
  return input.queueSession.packageArchiveSha256 === input.packageArchiveSha256
    ? []
    : ["DF-233 packaged queue session package hash does not match the release package"];
}

function projectFolderExportBlockers(input: Df233PackagedQueueInput): readonly string[] {
  const exportEvidence = input.projectFolderExport;
  return [
    ...(docsJsonPath(exportEvidence.evidencePath)
      ? []
      : ["DF-233 packaged project-folder export evidence path is not committed JSON"]),
    ...(exportEvidence.includesRetryEvidence &&
    exportEvidence.includesCancellationEvidence &&
    exportEvidence.includesRestartResumeEvidence
      ? []
      : ["DF-233 packaged project-folder export is missing queue evidence classes"]),
  ];
}

function retryBlockers(input: Df233PackagedQueueInput): readonly string[] {
  const proof = input.retryProof;
  if (proof === undefined) return ["DF-233 packaged retry proof is missing"];
  const evidence = proof.queueEvidence;
  return [
    ...commonProofBlockers(proof, input.queueSession.sessionId, "retry"),
    ...(evidence.resultStatus === "succeeded"
      ? []
      : ["DF-233 packaged retry proof did not finish"]),
    ...(evidence.retryProvenance.length > 0
      ? []
      : ["DF-233 packaged retry proof has no retry provenance"]),
    ...(evidence.retryProvenance.some((retry) => isTransientRetryKind(retry.failureKind))
      ? []
      : ["DF-233 packaged retry proof has no 429 or 5xx retry failure"]),
    ...(evidence.jobs.some((job) => job.attempt > 1)
      ? []
      : ["DF-233 packaged retry proof has no multi-attempt job"]),
    ...(evidence.slides.length > 0 &&
    evidence.storedImageArtifactPaths.length >= evidence.slides.length
      ? []
      : ["DF-233 packaged retry proof is missing completed image artifact paths"]),
  ];
}

function cancellationBlockers(input: Df233PackagedQueueInput): readonly string[] {
  const proof = input.cancellationProof;
  if (proof === undefined) return ["DF-233 packaged cancellation proof is missing"];
  const evidence = proof.queueEvidence;
  return [
    ...commonProofBlockers(proof, input.queueSession.sessionId, "cancellation"),
    ...(evidence.resultStatus === "failed"
      ? []
      : ["DF-233 packaged cancellation proof did not stop the queue"]),
    ...(evidence.jobs.some((job) => job.cancelRequested && job.status === "cancelled")
      ? []
      : ["DF-233 packaged cancellation proof has no cancelled provider job"]),
    ...(evidence.failures.some((failure) => failure.failureKind === "cancelled")
      ? []
      : ["DF-233 packaged cancellation proof has no cancelled slide failure"]),
  ];
}

function restartResumeBlockers(input: Df233PackagedQueueInput): readonly string[] {
  const proof = input.restartResumeProof;
  if (proof === undefined) return ["DF-233 packaged restart-resume proof is missing"];
  const evidence = proof.queueEvidence;
  const restartResumeEvidence = evidence.restartResumeEvidence;
  return [
    ...commonProofBlockers(proof, input.queueSession.sessionId, "restart_resume"),
    ...(evidence.resultStatus === "succeeded"
      ? []
      : ["DF-233 packaged restart-resume proof did not finish"]),
    ...(restartResumeEvidence === undefined
      ? ["DF-233 packaged restart-resume proof is missing restart-resume evidence"]
      : restartResumeDetailsBlockers(restartResumeEvidence)),
    ...(evidence.slides.length > evidence.jobs.length + evidence.failures.length
      ? []
      : ["DF-233 packaged restart-resume proof does not reuse completed slides"]),
    ...(evidence.storedImageArtifactPaths.length >= evidence.slides.length
      ? []
      : ["DF-233 packaged restart-resume proof is missing stored image paths"]),
  ];
}

function restartResumeDetailsBlockers(
  evidence: NonNullable<Df233PackagedQueueProof["queueEvidence"]["restartResumeEvidence"]>,
): readonly string[] {
  return evidence.completedArtifactIdsBefore.length > 0 &&
    evidence.pendingImageArtifactIds.length > 0 &&
    evidence.resumedArtifactIds.length > 0
    ? []
    : ["DF-233 packaged restart-resume proof has incomplete resume artifact groups"];
}

function commonProofBlockers(
  proof: Df233PackagedQueueProof,
  sessionId: string,
  expectedScenario: QueueScenario,
): readonly string[] {
  return [
    ...(proof.sessionId === sessionId
      ? []
      : [`DF-233 packaged ${expectedScenario} proof does not belong to the queue session`]),
    ...(proof.scenario === expectedScenario
      ? []
      : [`DF-233 packaged ${expectedScenario} proof has the wrong scenario`]),
    ...(docsJsonPath(proof.evidencePath)
      ? []
      : [`DF-233 packaged ${expectedScenario} evidence path is not committed JSON`]),
    ...(proof.queueEvidence.validation.kind === "ready"
      ? []
      : [`DF-233 packaged ${expectedScenario} proof is blocked`]),
    ...(proof.queueEvidence.jobs.some(
      (job) => job.providerId === "codex" && job.capability === "imageGeneration",
    )
      ? []
      : [`DF-233 packaged ${expectedScenario} proof has no Codex image provider job`]),
  ];
}

function distinctProofBlockers(input: Df233PackagedQueueInput): readonly string[] {
  const paths = [
    input.retryProof?.evidencePath,
    input.cancellationProof?.evidencePath,
    input.restartResumeProof?.evidencePath,
  ].filter((path) => path !== undefined);
  return new Set(paths).size === paths.length
    ? []
    : ["DF-233 packaged queue proofs reuse the same evidence path"];
}

function proofSummary(
  proof: Df233PackagedQueueInput["retryProof"],
): Df233PackagedQueueProofSummary | undefined {
  if (proof === undefined) return undefined;
  return {
    evidencePath: proof.evidencePath,
    projectId: proof.queueEvidence.projectId,
    jobId: proof.queueEvidence.jobId,
    storedImageArtifactCount: proof.queueEvidence.storedImageArtifactPaths.length,
  };
}

function docsJsonPath(path: string): boolean {
  return path.startsWith("docs/live-evidence/") && hasNonSyntheticEvidencePath(path, [".json"]);
}

function isTransientRetryKind(kind: string): boolean {
  return kind === "rate_limit" || kind === "server";
}
