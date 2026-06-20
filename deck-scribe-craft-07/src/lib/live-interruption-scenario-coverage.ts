import type {
  LiveInterruptionIssue,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export function scenarioCoverageIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
  requiredScenarios: readonly string[],
): readonly LiveInterruptionIssue[] {
  return [
    ...unknownScenarioIssues(scenarios, requiredScenarios),
    ...missingScenarioIssues(scenarios, requiredScenarios),
    ...duplicateScenarioIssues(scenarios, requiredScenarios),
  ];
}

function missingScenarioIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
  requiredScenarios: readonly string[],
): readonly LiveInterruptionIssue[] {
  const present = new Set(
    scenarios
      .filter((scenario) => isRequiredScenarioId(scenario.id, requiredScenarios))
      .map((scenario) => scenario.id),
  );
  const missing = requiredScenarios.filter((id) => !present.has(id));
  return missing.length === 0
    ? []
    : [issue("missing_interruption_scenario", "Live interruption matrix is incomplete.", missing)];
}

function unknownScenarioIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
  requiredScenarios: readonly string[],
): readonly LiveInterruptionIssue[] {
  const unknown = uniqueRefs(
    scenarios
      .map((scenario) => scenario.id)
      .filter((id) => !isRequiredScenarioId(id, requiredScenarios)),
  );
  return unknown.length === 0
    ? []
    : [
        issue(
          "unknown_interruption_scenario",
          "Live interruption matrix may only include the five DF-243 scenarios.",
          unknown,
        ),
      ];
}

function duplicateScenarioIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
  requiredScenarios: readonly string[],
): readonly LiveInterruptionIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const scenario of scenarios) {
    if (!isRequiredScenarioId(scenario.id, requiredScenarios)) continue;
    if (seen.has(scenario.id)) duplicates.add(scenario.id);
    seen.add(scenario.id);
  }
  return duplicates.size === 0
    ? []
    : [
        issue(
          "duplicate_interruption_scenario",
          "Each live interruption scenario must appear exactly once.",
          Array.from(duplicates),
        ),
      ];
}

function isRequiredScenarioId(value: string, requiredScenarios: readonly string[]): boolean {
  return requiredScenarios.some((scenarioId) => scenarioId === value);
}

function uniqueRefs(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function issue(
  code: LiveInterruptionIssue["code"],
  message: string,
  refs: readonly string[],
): LiveInterruptionIssue {
  return { code, message, refs };
}
