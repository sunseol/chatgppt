import type {
  Df243InterruptionClosureInput,
  Df243InterruptionMatrix,
} from "./df243-interruption-closure-evidence-schema";
import {
  Df243InterruptionClosureInputError,
  parseDf243InterruptionClosureInput,
} from "./df243-interruption-closure-evidence-schema";
import { packagedEvidenceArtifactPath } from "./packaged-dry-run-codex-bridge-support";

type Df243InterruptionScenario = Df243InterruptionMatrix["scenarios"][number];

export type Df243InterruptionArtifactMapping = {
  readonly originalPath: string;
  readonly evidencePath: string;
};

export type Df243PackagedInterruptionClosureOptions = {
  readonly capturedAt: string;
  readonly packageArchiveSha256: string;
  readonly evidenceDir: string;
  readonly matrixEvidencePath: string;
  readonly observedMatrix: Df243InterruptionMatrix;
  readonly cancelMatrix: Df243InterruptionMatrix;
  readonly resumeGateMatrix: Df243InterruptionMatrix;
};

export type Df243PackagedInterruptionClosureBundle = {
  readonly input: Df243InterruptionClosureInput;
  readonly artifactMappings: readonly Df243InterruptionArtifactMapping[];
};

export function buildDf243PackagedInterruptionClosureInput(
  options: Df243PackagedInterruptionClosureOptions,
): Df243PackagedInterruptionClosureBundle {
  const imagePartialResume = scenario(options.resumeGateMatrix, "image_partial_resume");
  const cancelJob = scenario(options.cancelMatrix, "cancel_job");
  const interruptedGate = scenario(options.resumeGateMatrix, "interrupted_artifact_gate");
  const artifactMappings = productArtifactMappings(options.evidenceDir, [
    imagePartialResume,
    cancelJob,
    interruptedGate,
  ]);
  const pathMap = new Map(
    artifactMappings.map((mapping) => [mapping.originalPath, mapping.evidencePath]),
  );
  const matrix = {
    reportPath: options.observedMatrix.reportPath,
    scenarios: [
      scenario(options.observedMatrix, "text_turn_shutdown"),
      scenario(options.observedMatrix, "fetch_shutdown"),
      rebaseScenarioPaths(imagePartialResume, pathMap),
      rebaseScenarioPaths(cancelJob, pathMap),
      rebaseScenarioPaths(interruptedGate, pathMap),
    ],
  };
  return {
    input: parseDf243InterruptionClosureInput({
      capturedAt: options.capturedAt,
      packageArchiveSha256: options.packageArchiveSha256,
      matrixEvidencePath: options.matrixEvidencePath,
      matrix,
    }),
    artifactMappings,
  };
}

function productArtifactMappings(
  evidenceDir: string,
  scenarios: readonly Df243InterruptionScenario[],
): readonly Df243InterruptionArtifactMapping[] {
  const mappings = new Map<string, string>();
  for (const path of scenarios.flatMap(scenarioPaths)) {
    if (path.startsWith("docs/live-evidence/")) continue;
    mappings.set(path, packagedEvidenceArtifactPath(evidenceDir, path));
  }
  return Array.from(mappings, ([originalPath, evidencePath]) => ({
    originalPath,
    evidencePath,
  }));
}

function scenarioPaths(scenario: Df243InterruptionScenario): readonly string[] {
  return [
    scenario.recoverySnapshotPath,
    ...optionalPath(scenario.cancelSignalEvidencePath),
    ...optionalPath(scenario.approvalGateEvidencePath),
    ...optionalPath(scenario.exportGateEvidencePath),
  ];
}

function rebaseScenarioPaths(
  candidate: Df243InterruptionScenario,
  pathMap: ReadonlyMap<string, string>,
): Df243InterruptionScenario {
  return {
    ...candidate,
    recoverySnapshotPath: rebasePath(candidate.recoverySnapshotPath, pathMap),
    ...optionalRebasedPath("cancelSignalEvidencePath", candidate.cancelSignalEvidencePath, pathMap),
    ...optionalRebasedPath("approvalGateEvidencePath", candidate.approvalGateEvidencePath, pathMap),
    ...optionalRebasedPath("exportGateEvidencePath", candidate.exportGateEvidencePath, pathMap),
  };
}

function scenario(matrix: Df243InterruptionMatrix, id: string): Df243InterruptionScenario {
  const found = matrix.scenarios.find((candidate) => candidate.id === id);
  if (found !== undefined) return found;
  throw new Df243InterruptionClosureInputError([`matrix.scenarios: missing ${id}`]);
}

function optionalPath(path: string | undefined): readonly string[] {
  return path === undefined ? [] : [path];
}

function optionalRebasedPath(
  key: "approvalGateEvidencePath" | "cancelSignalEvidencePath" | "exportGateEvidencePath",
  path: string | undefined,
  pathMap: ReadonlyMap<string, string>,
): Partial<Df243InterruptionScenario> {
  return path === undefined ? {} : { [key]: rebasePath(path, pathMap) };
}

function rebasePath(path: string, pathMap: ReadonlyMap<string, string>): string {
  return pathMap.get(path) ?? path;
}
