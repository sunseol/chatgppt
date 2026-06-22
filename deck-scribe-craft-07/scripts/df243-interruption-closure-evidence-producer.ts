import {
  evaluateLiveInterruptionClosureEvidence,
  type LiveInterruptionClosureEvidence,
  type LiveInterruptionClosureEvidenceResult,
  type LiveInterruptionClosureRequiredArtifacts,
} from "../src/lib/live-interruption-closure-evidence";
import { evaluateLiveInterruptionMatrix } from "../src/lib/live-interruption-matrix";
import type { Df243InterruptionClosureInput } from "./df243-interruption-closure-evidence-schema";
export {
  Df243InterruptionClosureInputError,
  parseDf243InterruptionClosureInput,
  parseDf243InterruptionClosureJson,
} from "./df243-interruption-closure-evidence-schema";

export type Df243InterruptionClosureEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df243-packaged-interruption-closure-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly closure: LiveInterruptionClosureEvidence;
  readonly result: LiveInterruptionClosureEvidenceResult;
  readonly releaseBlockers: readonly string[];
};

export function produceDf243InterruptionClosureEvidence(
  input: Df243InterruptionClosureInput,
): Df243InterruptionClosureEvidence {
  const matrixResult = evaluateLiveInterruptionMatrix(input.matrix);
  const closure: LiveInterruptionClosureEvidence = {
    issue: "#153",
    ticket: "DF-243",
    status: matrixResult.kind === "ready" ? "ready_for_close" : "blocked",
    reportPath: input.matrix.reportPath,
    matrixEvidencePath: input.matrixEvidencePath,
    matrixEvidencePayload: matrixPayload(input),
    matrix: input.matrix,
    requiredArtifacts: requiredArtifacts(input),
  };
  const result = evaluateLiveInterruptionClosureEvidence(closure);
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df243-packaged-interruption-closure-evidence",
    status: result.kind === "ready" ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    closure,
    result,
    releaseBlockers:
      result.kind === "ready" ? [] : ["DF-243 interruption closure evidence is blocked"],
  };
}

function requiredArtifacts(
  input: Df243InterruptionClosureInput,
): LiveInterruptionClosureRequiredArtifacts {
  return {
    imagePartialResumeEvidencePath: scenarioPath(input, "image_partial_resume"),
    appCancelSnapshotPath: scenarioPath(input, "cancel_job"),
    cancelSignalEvidencePath: scenarioOptionalPath(input, "cancel_job", "cancelSignalEvidencePath"),
    approvalGateEvidencePath: scenarioOptionalPath(
      input,
      "interrupted_artifact_gate",
      "approvalGateEvidencePath",
    ),
    exportGateEvidencePath: scenarioOptionalPath(
      input,
      "interrupted_artifact_gate",
      "exportGateEvidencePath",
    ),
  };
}

function scenarioPath(input: Df243InterruptionClosureInput, id: string): string {
  return input.matrix.scenarios.find((scenario) => scenario.id === id)?.recoverySnapshotPath ?? "";
}

function scenarioOptionalPath(
  input: Df243InterruptionClosureInput,
  id: string,
  field: "cancelSignalEvidencePath" | "approvalGateEvidencePath" | "exportGateEvidencePath",
): string {
  return input.matrix.scenarios.find((scenario) => scenario.id === id)?.[field] ?? "";
}

function matrixPayload(input: Df243InterruptionClosureInput) {
  return {
    kind: "df243_interruption_matrix",
    evidencePath: input.matrixEvidencePath,
    reportPath: input.matrix.reportPath,
    scenarios: input.matrix.scenarios.map((scenario) => ({
      id: scenario.id,
      liveJobId: scenario.liveJobId,
      recoverySnapshotPath: scenario.recoverySnapshotPath,
      ...(scenario.cancelSignalEvidencePath === undefined
        ? {}
        : { cancelSignalEvidencePath: scenario.cancelSignalEvidencePath }),
      ...(scenario.approvalGateEvidencePath === undefined
        ? {}
        : { approvalGateEvidencePath: scenario.approvalGateEvidencePath }),
      ...(scenario.exportGateEvidencePath === undefined
        ? {}
        : { exportGateEvidencePath: scenario.exportGateEvidencePath }),
    })),
    capturedAt: input.capturedAt,
  };
}
