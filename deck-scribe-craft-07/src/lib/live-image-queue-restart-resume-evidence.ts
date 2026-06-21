import type { LiveImageQueueEvidenceIssue } from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadySlideGenerationQueueResult = Extract<
  SlideGenerationQueueResult,
  { readonly kind: "ready" }
>;

export type LiveImageQueueRestartResumeEvidence = {
  readonly recoverySnapshotPath: string;
  readonly liveJobId: string;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly pendingImageArtifactIds: readonly string[];
  readonly resumedArtifactIds: readonly string[];
};

export function restartResumeEvidenceIssues(input: {
  readonly projectId: string;
  readonly result: ReadySlideGenerationQueueResult;
  readonly evidence?: LiveImageQueueRestartResumeEvidence;
}): readonly LiveImageQueueEvidenceIssue[] {
  if (!hasRestartResumeBoundary(input.result)) return [];
  if (input.evidence === undefined) {
    return [
      {
        code: "missing_restart_resume_evidence" as const,
        message:
          "Resumed queue evidence must include restart-resume proof for completed slides reused across a restart.",
      },
    ];
  }
  return validRestartResumeEvidence(input.projectId, input.evidence)
    ? []
    : [
        {
          code: "invalid_restart_resume_evidence" as const,
          message:
            "Restart-resume proof must cite a canonical recovery snapshot and preserved pending/resumed artifacts.",
        },
      ];
}

function hasRestartResumeBoundary(result: ReadySlideGenerationQueueResult): boolean {
  return result.slides.length > result.jobs.length + result.failures.length;
}

function validRestartResumeEvidence(
  projectId: string,
  evidence: LiveImageQueueRestartResumeEvidence,
): boolean {
  const completedAfter = new Set(evidence.completedArtifactIdsAfter);
  const resumed = new Set(evidence.resumedArtifactIds);
  return (
    isRecoverySnapshotPath(projectId, evidence.recoverySnapshotPath) &&
    canonicalEvidenceId(evidence.liveJobId) &&
    evidence.completedArtifactIdsBefore.length > 0 &&
    evidence.pendingImageArtifactIds.length > 0 &&
    evidence.resumedArtifactIds.length > 0 &&
    artifactGroupsAreCanonical(evidence) &&
    artifactGroupsHaveUniqueIds(evidence) &&
    evidence.completedArtifactIdsBefore.every((artifactId) => completedAfter.has(artifactId)) &&
    evidence.pendingImageArtifactIds.every((artifactId) => resumed.has(artifactId))
  );
}

function artifactGroupsAreCanonical(evidence: LiveImageQueueRestartResumeEvidence): boolean {
  return [
    ...evidence.completedArtifactIdsBefore,
    ...evidence.completedArtifactIdsAfter,
    ...evidence.pendingImageArtifactIds,
    ...evidence.resumedArtifactIds,
  ].every(canonicalEvidenceId);
}

function artifactGroupsHaveUniqueIds(evidence: LiveImageQueueRestartResumeEvidence): boolean {
  return [
    evidence.completedArtifactIdsBefore,
    evidence.completedArtifactIdsAfter,
    evidence.pendingImageArtifactIds,
    evidence.resumedArtifactIds,
  ].every((artifactIds) => new Set(artifactIds).size === artifactIds.length);
}

function isRecoverySnapshotPath(projectId: string, path: string): boolean {
  return (
    path.length > 0 &&
    path === path.trim() &&
    path.startsWith(`projects/${projectId}/live-evidence/`) &&
    path.endsWith(".json") &&
    path.toLowerCase().includes("resume") &&
    !hasSyntheticEvidenceMarker(path)
  );
}

function canonicalEvidenceId(value: string): boolean {
  return value.length > 0 && value === value.trim() && !hasSyntheticEvidenceMarker(value);
}

function hasSyntheticEvidenceMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return ["mock", "fixture", "test", "fake"].some((marker) => normalized.includes(marker));
}
