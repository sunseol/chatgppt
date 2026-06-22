import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";

export function noncanonicalScenarioIdentityRefs(
  scenario: LiveInterruptionScenarioEvidence,
): readonly string[] {
  return [
    ...noncanonicalRef(scenario.id, "liveJobId", scenario.liveJobId),
    ...noncanonicalRef(scenario.id, "recoverySnapshotPath", scenario.recoverySnapshotPath),
    ...noncanonicalOptionalRef(
      scenario.id,
      "cancelSignalEvidencePath",
      scenario.cancelSignalEvidencePath,
    ),
    ...noncanonicalOptionalRef(scenario.id, "cancelSignalJobId", scenario.cancelSignalJobId),
    ...noncanonicalOptionalRef(
      scenario.id,
      "approvalGateEvidencePath",
      scenario.approvalGateEvidencePath,
    ),
    ...noncanonicalOptionalRef(
      scenario.id,
      "exportGateEvidencePath",
      scenario.exportGateEvidencePath,
    ),
  ];
}

function noncanonicalOptionalRef(
  scenarioId: string,
  label: string,
  value: string | undefined,
): readonly string[] {
  return value === undefined ? [] : noncanonicalRef(scenarioId, label, value);
}

function noncanonicalRef(scenarioId: string, label: string, value: string): readonly string[] {
  return value === value.trim() && isCanonicalPathIdentity(label, value)
    ? []
    : [`${scenarioId}:${label}`];
}

function isCanonicalPathIdentity(label: string, value: string): boolean {
  if (!label.endsWith("Path")) return true;
  return value.split("/").every((segment) => segment !== "." && segment !== "..");
}
