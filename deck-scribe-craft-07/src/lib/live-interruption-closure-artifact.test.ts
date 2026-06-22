import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  evaluateLiveInterruptionClosureEvidence,
  type LiveInterruptionClosureEvidence,
} from "./live-interruption-closure-evidence";
import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";

const CLOSURE_PATH = "docs/live-evidence/lane-h-20260621/df243-closure-evidence.json";

const ScenarioSchema = z
  .object({
    id: z.string(),
    jobStatusAfterRestart: z.enum([
      "queued",
      "running",
      "succeeded",
      "failed",
      "cancelled",
      "interrupted",
    ]),
    completedArtifactIdsBefore: z.array(z.string()),
    completedArtifactIdsAfter: z.array(z.string()),
    liveJobId: z.string(),
    recoverySnapshotPath: z.string(),
    recoverySnapshotScope: z.enum(["app_storage", "protocol_probe", "transient"]),
    cancellationRecorded: z.boolean(),
    cancelSignalEvidencePath: z.string().optional(),
    cancelSignalJobId: z.string().optional(),
    pendingImageArtifactIds: z.array(z.string()),
    resumedArtifactIds: z.array(z.string()),
    cancelledJobStillRunning: z.boolean(),
    interruptedArtifactIds: z.array(z.string()),
    approvableArtifactIds: z.array(z.string()),
    exportableArtifactIds: z.array(z.string()),
    approvalGateChecked: z.boolean(),
    approvalGateEvidencePath: z.string().optional(),
    exportGateChecked: z.boolean(),
    exportGateEvidencePath: z.string().optional(),
  })
  .strict();

const MatrixSchema = z
  .object({
    reportPath: z.string(),
    scenarios: z.array(ScenarioSchema),
  })
  .strict();

const ClosureSchema = z
  .object({
    issue: z.literal("#153"),
    ticket: z.literal("DF-243"),
    status: z.enum(["ready_for_close", "blocked"]),
    reportPath: z.string(),
    matrixEvidencePath: z.string(),
    matrix: MatrixSchema,
    requiredArtifacts: z
      .object({
        imagePartialResumeEvidencePath: z.string(),
        appCancelSnapshotPath: z.string(),
        cancelSignalEvidencePath: z.string(),
        approvalGateEvidencePath: z.string(),
        exportGateEvidencePath: z.string(),
      })
      .strict(),
  })
  .strict();

const ObservedRecoverySnapshotSchema = z
  .object({
    scenarioId: z.enum(["text_turn_shutdown", "fetch_shutdown"]),
    liveJobId: z.string(),
    statusAfterRecovery: z.enum(["failed", "interrupted"]),
    evidenceDigest: z.string(),
    observedAt: z.string(),
    sourceDocumentPath: z.string(),
    observedSignals: z.array(z.string()),
  })
  .strict();

describe("committed DF-243 interruption closure artifact", () => {
  test("materializes observed text and fetch recovery snapshots", () => {
    // Given
    const closure = readClosureEvidence(CLOSURE_PATH);
    const textScenario = scenarioById(closure, "text_turn_shutdown");
    const fetchScenario = scenarioById(closure, "fetch_shutdown");

    // When
    const matrixArtifact = readMatrixEvidence(closure.matrixEvidencePath);
    const textSnapshot = readRecoverySnapshot(textScenario.recoverySnapshotPath);
    const fetchSnapshot = readRecoverySnapshot(fetchScenario.recoverySnapshotPath);
    const result = evaluateLiveInterruptionClosureEvidence(closure);

    // Then
    expect(matrixArtifact).toEqual(closure.matrix);
    expect(textSnapshot.evidenceDigest).toBe(
      "27855e9afff031bc49c87bb08bb46ea6ac9a5436e4a2eef9ecb74382e62809b6",
    );
    expect(fetchSnapshot.evidenceDigest).toBe(
      "a472a031283e5a2ce537801d43a15b2d121241d823397868b81437c50e78bc3d",
    );
    expect(missingRecoveryRefs(result)).toEqual([
      "image_partial_resume",
      "cancel_job",
      "interrupted_artifact_gate",
    ]);
  });
});

function readClosureEvidence(path: string): LiveInterruptionClosureEvidence {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return ClosureSchema.parse(parsed);
}

function readMatrixEvidence(path: string): z.infer<typeof MatrixSchema> {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return MatrixSchema.parse(parsed);
}

function readRecoverySnapshot(path: string): z.infer<typeof ObservedRecoverySnapshotSchema> {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return ObservedRecoverySnapshotSchema.parse(parsed);
}

function scenarioById(
  closure: LiveInterruptionClosureEvidence,
  id: "text_turn_shutdown" | "fetch_shutdown",
): LiveInterruptionScenarioEvidence {
  const scenario = closure.matrix.scenarios.find((item) => item.id === id);
  if (scenario === undefined) throw new Error(`Missing scenario: ${id}`);
  return scenario;
}

function missingRecoveryRefs(
  result: ReturnType<typeof evaluateLiveInterruptionClosureEvidence>,
): readonly string[] {
  if (result.kind === "ready") return [];
  return result.issues.find((issue) => issue.code === "missing_recovery_snapshot")?.refs ?? [];
}
