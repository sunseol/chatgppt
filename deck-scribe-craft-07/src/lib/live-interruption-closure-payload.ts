import { z } from "zod";
import type {
  LiveInterruptionClosureEvidence,
  LiveInterruptionClosureIssue,
} from "./live-interruption-closure-evidence";
import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";

const MatrixScenarioPayloadSchema = z
  .object({
    id: z.string().min(1),
    liveJobId: z.string().min(1),
    recoverySnapshotPath: z.string().min(1),
    cancelSignalEvidencePath: z.string().optional(),
    approvalGateEvidencePath: z.string().optional(),
    exportGateEvidencePath: z.string().optional(),
  })
  .strict();

const MatrixEvidencePayloadSchema = z
  .object({
    kind: z.literal("df243_interruption_matrix"),
    evidencePath: z.string().min(1),
    reportPath: z.string().min(1),
    scenarios: z.array(MatrixScenarioPayloadSchema),
    capturedAt: z.string().datetime(),
  })
  .strict();

type MatrixEvidencePayload = z.infer<typeof MatrixEvidencePayloadSchema>;

export function matrixEvidencePayloadIssues(
  evidence: LiveInterruptionClosureEvidence,
): readonly LiveInterruptionClosureIssue[] {
  const parsed = MatrixEvidencePayloadSchema.safeParse(evidence.matrixEvidencePayload);
  return parsed.success && matrixPayloadMatchesEvidence(parsed.data, evidence)
    ? []
    : [
        {
          code: "missing_interruption_matrix_evidence",
          message: "DF-243 closure evidence requires a matching persisted matrix JSON bundle.",
          refs: [evidence.matrixEvidencePath || "missing"],
        },
      ];
}

function matrixPayloadMatchesEvidence(
  payload: MatrixEvidencePayload,
  evidence: LiveInterruptionClosureEvidence,
): boolean {
  return (
    payload.evidencePath === evidence.matrixEvidencePath &&
    payload.reportPath === evidence.matrix.reportPath &&
    sameScenarioPayloads(payload.scenarios, evidence.matrix.scenarios)
  );
}

function sameScenarioPayloads(
  payloads: MatrixEvidencePayload["scenarios"],
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): boolean {
  return (
    payloads.length === scenarios.length &&
    payloads.every((payload, index) => {
      const scenario = scenarios[index];
      return scenario !== undefined && scenarioPayloadMatchesEvidence(payload, scenario);
    })
  );
}

function scenarioPayloadMatchesEvidence(
  payload: MatrixEvidencePayload["scenarios"][number],
  scenario: LiveInterruptionScenarioEvidence,
): boolean {
  return (
    payload.id === scenario.id &&
    payload.liveJobId === scenario.liveJobId &&
    payload.recoverySnapshotPath === scenario.recoverySnapshotPath &&
    payload.cancelSignalEvidencePath === scenario.cancelSignalEvidencePath &&
    payload.approvalGateEvidencePath === scenario.approvalGateEvidencePath &&
    payload.exportGateEvidencePath === scenario.exportGateEvidencePath
  );
}
