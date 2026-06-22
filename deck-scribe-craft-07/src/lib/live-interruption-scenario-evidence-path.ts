import type {
  LiveInterruptionIssue,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";
import { hasObservedInterruptionEvidencePath } from "./live-interruption-evidence-path";

const SCENARIO_PATH_MARKERS = {
  text_turn_shutdown: ["text_turn_shutdown", "text-turn-shutdown"],
  fetch_shutdown: ["fetch_shutdown", "fetch-shutdown"],
  image_partial_resume: ["image_partial_resume", "image-partial-resume"],
  cancel_job: ["cancel_job", "cancel-job"],
  interrupted_artifact_gate: ["interrupted_artifact_gate", "interrupted-artifact-gate"],
} as const;

type KnownScenarioId = keyof typeof SCENARIO_PATH_MARKERS;

export function scenarioEvidencePathIdentityIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const duplicatedPaths = duplicatedObservedRecoverySnapshotPaths(scenarios);
  const mismatches = scenarios.flatMap((scenario) =>
    scenarioEvidencePathMismatchRefs(scenario, duplicatedPaths),
  );
  return mismatches.length === 0
    ? []
    : [
        {
          code: "interruption_evidence_path_scenario_mismatch",
          message: "Interruption evidence paths must identify the scenario they prove.",
          refs: mismatches,
        },
      ];
}

function scenarioEvidencePathMismatchRefs(
  scenario: LiveInterruptionScenarioEvidence,
  duplicatedPaths: ReadonlySet<string>,
): readonly string[] {
  if (!isKnownScenarioId(scenario.id)) return [];
  const normalizedPath = scenario.recoverySnapshotPath.trim().toLowerCase();
  if (duplicatedPaths.has(normalizedPath)) return [];
  return !hasObservedInterruptionEvidencePath(scenario.recoverySnapshotPath) ||
    pathIdentifiesScenario(scenario.id, scenario.recoverySnapshotPath)
    ? []
    : [`${scenario.id}:recoverySnapshotPath`];
}

function duplicatedObservedRecoverySnapshotPaths(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const scenario of scenarios) {
    if (!hasObservedInterruptionEvidencePath(scenario.recoverySnapshotPath)) continue;
    const normalizedPath = scenario.recoverySnapshotPath.trim().toLowerCase();
    if (seen.has(normalizedPath)) duplicated.add(normalizedPath);
    seen.add(normalizedPath);
  }
  return duplicated;
}

function pathIdentifiesScenario(id: KnownScenarioId, path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return SCENARIO_PATH_MARKERS[id].some((marker) => normalizedPath.includes(marker));
}

function isKnownScenarioId(id: string): id is KnownScenarioId {
  return Object.prototype.hasOwnProperty.call(SCENARIO_PATH_MARKERS, id);
}
