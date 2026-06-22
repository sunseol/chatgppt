import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";

export type LiveInterruptionImageResumeEvidenceExportIssue =
  | "live_job_missing"
  | "pending_image_missing"
  | "resumed_image_missing"
  | "noncanonical_image_artifact_id"
  | "duplicate_image_artifact_id"
  | "completed_artifact_lost"
  | "completed_image_resumed"
  | "pending_image_not_resumed"
  | "resumed_image_not_pending";

export type LiveInterruptionImageResumeRecoverySnapshot = {
  readonly schemaVersion: 1;
  readonly issue: "DF-243";
  readonly scenarioId: "image_partial_resume";
  readonly projectId: string;
  readonly jobId: string;
  readonly liveJobId: string;
  readonly exportedAt: number;
  readonly recoverySnapshotScope: "app_storage";
  readonly jobStatusAfterRestart: "interrupted";
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly pendingImageArtifactIds: readonly string[];
  readonly resumedArtifactIds: readonly string[];
};

export type LiveInterruptionImageResumeEvidenceExportResult =
  | {
      readonly kind: "written";
      readonly recoverySnapshotPath: string;
      readonly snapshot: LiveInterruptionImageResumeRecoverySnapshot;
      readonly scenario: LiveInterruptionScenarioEvidence;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionImageResumeEvidenceExportIssue[];
    };

export async function writeLiveInterruptionImageResumeEvidenceExport(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly jobId: string;
  readonly liveJobId: string;
  readonly exportedAt: number;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly pendingImageArtifactIds: readonly string[];
  readonly resumedArtifactIds: readonly string[];
}): Promise<LiveInterruptionImageResumeEvidenceExportResult> {
  const validation = validateImageResumeEvidence(input);
  if (validation.kind === "blocked") return validation;

  const recoverySnapshotPath = imagePartialResumeSnapshotPath(input.projectId, input.jobId);
  const snapshot: LiveInterruptionImageResumeRecoverySnapshot = {
    schemaVersion: 1,
    issue: "DF-243",
    scenarioId: "image_partial_resume",
    projectId: input.projectId,
    jobId: input.jobId,
    liveJobId: input.liveJobId,
    exportedAt: input.exportedAt,
    recoverySnapshotScope: "app_storage",
    jobStatusAfterRestart: "interrupted",
    completedArtifactIdsBefore: input.completedArtifactIdsBefore,
    completedArtifactIdsAfter: input.completedArtifactIdsAfter,
    pendingImageArtifactIds: input.pendingImageArtifactIds,
    resumedArtifactIds: input.resumedArtifactIds,
  };

  await input.store.write({
    path: recoverySnapshotPath,
    content: JSON.stringify(snapshot, null, 2),
  });

  return {
    kind: "written",
    recoverySnapshotPath,
    snapshot,
    scenario: {
      id: "image_partial_resume",
      jobStatusAfterRestart: "interrupted",
      completedArtifactIdsBefore: input.completedArtifactIdsBefore,
      completedArtifactIdsAfter: input.completedArtifactIdsAfter,
      liveJobId: input.liveJobId,
      recoverySnapshotPath,
      recoverySnapshotScope: "app_storage",
      cancellationRecorded: true,
      pendingImageArtifactIds: input.pendingImageArtifactIds,
      resumedArtifactIds: input.resumedArtifactIds,
      cancelledJobStillRunning: false,
      interruptedArtifactIds: input.pendingImageArtifactIds,
      approvableArtifactIds: [],
      exportableArtifactIds: [],
      approvalGateChecked: false,
      exportGateChecked: false,
    },
  };
}

function validateImageResumeEvidence(input: {
  readonly liveJobId: string;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly pendingImageArtifactIds: readonly string[];
  readonly resumedArtifactIds: readonly string[];
}):
  | { readonly kind: "ready" }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionImageResumeEvidenceExportIssue[];
    } {
  const artifactGroups = [
    input.completedArtifactIdsBefore,
    input.completedArtifactIdsAfter,
    input.pendingImageArtifactIds,
    input.resumedArtifactIds,
  ];
  if (!canonicalEvidenceId(input.liveJobId)) return blocked("live_job_missing");
  if (!artifactGroups.every(allCanonicalArtifactIds)) {
    return blocked("noncanonical_image_artifact_id");
  }
  if (
    hasDuplicates(input.completedArtifactIdsBefore) ||
    hasDuplicates(input.pendingImageArtifactIds) ||
    hasDuplicates(input.resumedArtifactIds)
  ) {
    return blocked("duplicate_image_artifact_id");
  }
  if (input.pendingImageArtifactIds.length === 0) return blocked("pending_image_missing");
  if (input.resumedArtifactIds.length === 0) return blocked("resumed_image_missing");

  const completedBefore = new Set(input.completedArtifactIdsBefore);
  const completedAfter = new Set(input.completedArtifactIdsAfter);
  const pendingImages = new Set(input.pendingImageArtifactIds);
  const resumedImages = new Set(input.resumedArtifactIds);
  if (input.completedArtifactIdsBefore.some((artifactId) => !completedAfter.has(artifactId))) {
    return blocked("completed_artifact_lost");
  }
  if (input.resumedArtifactIds.some((artifactId) => completedBefore.has(artifactId))) {
    return blocked("completed_image_resumed");
  }
  if (input.pendingImageArtifactIds.some((artifactId) => !resumedImages.has(artifactId))) {
    return blocked("pending_image_not_resumed");
  }
  if (input.resumedArtifactIds.some((artifactId) => !pendingImages.has(artifactId))) {
    return blocked("resumed_image_not_pending");
  }
  return { kind: "ready" };
}

function imagePartialResumeSnapshotPath(projectId: string, jobId: string): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df243-image-partial-resume-recovery-snapshot-${safeSegment(
    jobId,
    "job id",
  )}.json`;
}

function allCanonicalArtifactIds(artifactIds: readonly string[]): boolean {
  return artifactIds.every(canonicalEvidenceId);
}

function canonicalEvidenceId(value: string): boolean {
  if (value.length === 0 || value !== value.trim()) return false;
  return !hasSyntheticEvidenceMarker(value);
}

function hasSyntheticEvidenceMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return ["mock", "fixture", "test", "fake"].some((marker) => normalized.includes(marker));
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function blocked(issue: LiveInterruptionImageResumeEvidenceExportIssue): {
  readonly kind: "blocked";
  readonly issues: readonly LiveInterruptionImageResumeEvidenceExportIssue[];
} {
  return { kind: "blocked", issues: [issue] };
}

function safeSegment(value: string, label: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ImageArtifactStoreError(
    `Live interruption image resume evidence ${label} must be safe.`,
  );
}
