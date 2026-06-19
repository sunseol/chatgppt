import type { ProductionPackagingIssue } from "./production-packaging-evidence";

export const CLEAN_MACHINE_STEPS = [
  "install_app",
  "codex_login",
  "image_credentials",
  "project_launch",
  "live_interview",
] as const;

export type CleanMachineStep = (typeof CLEAN_MACHINE_STEPS)[number];

export function cleanMachineStepIssues(
  steps: readonly CleanMachineStep[],
): readonly ProductionPackagingIssue[] {
  const present = new Set(steps);
  const missing = CLEAN_MACHINE_STEPS.filter((step) => !present.has(step));
  const duplicates = duplicateCleanMachineSteps(steps);
  return [
    ...(missing.length === 0
      ? []
      : [
          issue(
            "missing_clean_machine_step",
            "Clean-machine validation must cover install, auth, credentials, launch, and first live interview.",
            missing,
          ),
        ]),
    ...(duplicates.length === 0
      ? []
      : [
          issue(
            "duplicate_clean_machine_step",
            "Clean-machine validation steps must be distinct evidence events.",
            duplicates,
          ),
        ]),
  ];
}

export function countDistinctCleanMachineSteps(steps: readonly CleanMachineStep[]): number {
  return new Set(steps).size;
}

function duplicateCleanMachineSteps(
  steps: readonly CleanMachineStep[],
): readonly CleanMachineStep[] {
  const seen = new Set<CleanMachineStep>();
  const duplicates = new Set<CleanMachineStep>();
  for (const step of steps) {
    if (seen.has(step)) duplicates.add(step);
    seen.add(step);
  }
  return [...duplicates];
}

function issue(
  code: ProductionPackagingIssue["code"],
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
