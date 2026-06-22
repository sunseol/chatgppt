import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";

export type LiveInterruptionGateEvidenceExportIssue =
  | "live_job_missing"
  | "interrupted_artifact_missing"
  | "noncanonical_artifact_id"
  | "duplicate_artifact_id"
  | "completed_artifact_lost"
  | "approval_gate_missing_interrupted_artifact"
  | "export_gate_missing_interrupted_artifact"
  | "interrupted_artifact_approvable";

export type LiveInterruptionGateRecoverySnapshot = {
  readonly schemaVersion: 1;
  readonly issue: "DF-243";
  readonly scenarioId: "interrupted_artifact_gate";
  readonly projectId: string;
  readonly jobId: string;
  readonly liveJobId: string;
  readonly exportedAt: number;
  readonly recoverySnapshotScope: "app_storage";
  readonly jobStatusAfterRestart: "interrupted";
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly interruptedArtifactIds: readonly string[];
  readonly approvalGateEvidencePath: string;
  readonly exportGateEvidencePath: string;
};

export type LiveInterruptionGateDecisionEvidence = {
  readonly schemaVersion: 1;
  readonly issue: "DF-243";
  readonly scenarioId: "interrupted_artifact_gate";
  readonly gate: "approval" | "export";
  readonly projectId: string;
  readonly jobId: string;
  readonly liveJobId: string;
  readonly exportedAt: number;
  readonly interruptedArtifactIds: readonly string[];
  readonly deniedInterruptedArtifactIds: readonly string[];
  readonly allowedArtifactIds: readonly string[];
};

export type LiveInterruptionGateEvidenceExportResult =
  | {
      readonly kind: "written";
      readonly recoverySnapshotPath: string;
      readonly approvalGateEvidencePath: string;
      readonly exportGateEvidencePath: string;
      readonly recoverySnapshot: LiveInterruptionGateRecoverySnapshot;
      readonly scenario: LiveInterruptionScenarioEvidence;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionGateEvidenceExportIssue[];
    };

export async function writeLiveInterruptionGateEvidenceExport(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly jobId: string;
  readonly liveJobId: string;
  readonly exportedAt: number;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly interruptedArtifactIds: readonly string[];
  readonly approvalDeniedArtifactIds: readonly string[];
  readonly exportDeniedArtifactIds: readonly string[];
  readonly approvableArtifactIds: readonly string[];
  readonly exportableArtifactIds: readonly string[];
}): Promise<LiveInterruptionGateEvidenceExportResult> {
  const validation = validateGateEvidence(input);
  if (validation.kind === "blocked") return validation;

  const recoverySnapshotPath = gateRecoverySnapshotPath(input.projectId, input.jobId);
  const approvalGateEvidencePath = gateDecisionPath(input.projectId, input.jobId, "approval");
  const exportGateEvidencePath = gateDecisionPath(input.projectId, input.jobId, "export");
  const recoverySnapshot: LiveInterruptionGateRecoverySnapshot = {
    schemaVersion: 1,
    issue: "DF-243",
    scenarioId: "interrupted_artifact_gate",
    projectId: input.projectId,
    jobId: input.jobId,
    liveJobId: input.liveJobId,
    exportedAt: input.exportedAt,
    recoverySnapshotScope: "app_storage",
    jobStatusAfterRestart: "interrupted",
    completedArtifactIdsBefore: input.completedArtifactIdsBefore,
    completedArtifactIdsAfter: input.completedArtifactIdsAfter,
    interruptedArtifactIds: input.interruptedArtifactIds,
    approvalGateEvidencePath,
    exportGateEvidencePath,
  };
  const approvalEvidence = gateDecisionEvidence(input, "approval", input.approvalDeniedArtifactIds);
  const exportEvidence = gateDecisionEvidence(input, "export", input.exportDeniedArtifactIds);

  await input.store.write({
    path: recoverySnapshotPath,
    content: JSON.stringify(recoverySnapshot, null, 2),
  });
  await input.store.write({
    path: approvalGateEvidencePath,
    content: JSON.stringify(approvalEvidence, null, 2),
  });
  await input.store.write({
    path: exportGateEvidencePath,
    content: JSON.stringify(exportEvidence, null, 2),
  });

  return {
    kind: "written",
    recoverySnapshotPath,
    approvalGateEvidencePath,
    exportGateEvidencePath,
    recoverySnapshot,
    scenario: {
      id: "interrupted_artifact_gate",
      jobStatusAfterRestart: "interrupted",
      completedArtifactIdsBefore: input.completedArtifactIdsBefore,
      completedArtifactIdsAfter: input.completedArtifactIdsAfter,
      liveJobId: input.liveJobId,
      recoverySnapshotPath,
      recoverySnapshotScope: "app_storage",
      cancellationRecorded: true,
      pendingImageArtifactIds: [],
      resumedArtifactIds: [],
      cancelledJobStillRunning: false,
      interruptedArtifactIds: input.interruptedArtifactIds,
      approvableArtifactIds: input.approvableArtifactIds,
      exportableArtifactIds: input.exportableArtifactIds,
      approvalGateChecked: true,
      approvalGateEvidencePath,
      exportGateChecked: true,
      exportGateEvidencePath,
    },
  };
}

function validateGateEvidence(input: {
  readonly liveJobId: string;
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly interruptedArtifactIds: readonly string[];
  readonly approvalDeniedArtifactIds: readonly string[];
  readonly exportDeniedArtifactIds: readonly string[];
  readonly approvableArtifactIds: readonly string[];
  readonly exportableArtifactIds: readonly string[];
}):
  | { readonly kind: "ready" }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionGateEvidenceExportIssue[];
    } {
  const artifactGroups = [
    input.completedArtifactIdsBefore,
    input.completedArtifactIdsAfter,
    input.interruptedArtifactIds,
    input.approvalDeniedArtifactIds,
    input.exportDeniedArtifactIds,
    input.approvableArtifactIds,
    input.exportableArtifactIds,
  ];
  if (!canonicalEvidenceId(input.liveJobId)) return blocked("live_job_missing");
  if (!artifactGroups.every(allCanonicalArtifactIds)) return blocked("noncanonical_artifact_id");
  if (artifactGroups.some(hasDuplicates)) return blocked("duplicate_artifact_id");
  if (input.interruptedArtifactIds.length === 0) return blocked("interrupted_artifact_missing");

  const completedAfter = new Set(input.completedArtifactIdsAfter);
  if (input.completedArtifactIdsBefore.some((artifactId) => !completedAfter.has(artifactId))) {
    return blocked("completed_artifact_lost");
  }

  const approvalDenied = new Set(input.approvalDeniedArtifactIds);
  const exportDenied = new Set(input.exportDeniedArtifactIds);
  if (input.interruptedArtifactIds.some((artifactId) => !approvalDenied.has(artifactId))) {
    return blocked("approval_gate_missing_interrupted_artifact");
  }
  if (input.interruptedArtifactIds.some((artifactId) => !exportDenied.has(artifactId))) {
    return blocked("export_gate_missing_interrupted_artifact");
  }

  const interrupted = new Set(input.interruptedArtifactIds);
  if (
    input.approvableArtifactIds.some((artifactId) => interrupted.has(artifactId)) ||
    input.exportableArtifactIds.some((artifactId) => interrupted.has(artifactId))
  ) {
    return blocked("interrupted_artifact_approvable");
  }
  return { kind: "ready" };
}

function gateDecisionEvidence(
  input: {
    readonly projectId: string;
    readonly jobId: string;
    readonly liveJobId: string;
    readonly exportedAt: number;
    readonly interruptedArtifactIds: readonly string[];
    readonly approvableArtifactIds: readonly string[];
    readonly exportableArtifactIds: readonly string[];
  },
  gate: "approval" | "export",
  deniedInterruptedArtifactIds: readonly string[],
): LiveInterruptionGateDecisionEvidence {
  return {
    schemaVersion: 1,
    issue: "DF-243",
    scenarioId: "interrupted_artifact_gate",
    gate,
    projectId: input.projectId,
    jobId: input.jobId,
    liveJobId: input.liveJobId,
    exportedAt: input.exportedAt,
    interruptedArtifactIds: input.interruptedArtifactIds,
    deniedInterruptedArtifactIds,
    allowedArtifactIds:
      gate === "approval" ? input.approvableArtifactIds : input.exportableArtifactIds,
  };
}

function gateRecoverySnapshotPath(projectId: string, jobId: string): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df243-interrupted-artifact-gate-recovery-snapshot-${safeSegment(
    jobId,
    "job id",
  )}.json`;
}

function gateDecisionPath(projectId: string, jobId: string, gate: "approval" | "export"): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df243-interrupted-artifact-gate-${gate}-${safeSegment(
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

function blocked(issue: LiveInterruptionGateEvidenceExportIssue): {
  readonly kind: "blocked";
  readonly issues: readonly LiveInterruptionGateEvidenceExportIssue[];
} {
  return { kind: "blocked", issues: [issue] };
}

function safeSegment(value: string, label: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ImageArtifactStoreError(`Live interruption gate evidence ${label} must be safe.`);
}
