import type { ProductionPackagingIssue } from "./production-packaging-evidence";
import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

export const CLEAN_MACHINE_STEPS = [
  "install_app",
  "codex_login",
  "image_credentials",
  "project_launch",
  "live_interview",
] as const;

export type CleanMachineStep = (typeof CLEAN_MACHINE_STEPS)[number];

export type CleanMachineStepEvidencePaths = {
  readonly [Step in CleanMachineStep]?: string;
};

const CLEAN_MACHINE_STEP_PATH_MARKERS = {
  install_app: ["install-app", "install_app"],
  codex_login: ["codex-login", "codex_login"],
  image_credentials: ["image-credentials", "image_credentials"],
  project_launch: ["project-launch", "project_launch"],
  live_interview: ["live-interview", "live_interview"],
} as const satisfies Record<CleanMachineStep, readonly string[]>;

export function cleanMachineStepIssues(
  steps: readonly unknown[],
): readonly ProductionPackagingIssue[] {
  const validSteps = steps.filter(isCleanMachineStep);
  const invalidSteps = steps
    .filter((step) => !isCleanMachineStep(step))
    .map((step) => String(step));
  const present = new Set(validSteps);
  const missing = CLEAN_MACHINE_STEPS.filter((step) => !present.has(step));
  const duplicates = duplicateCleanMachineSteps(validSteps);
  return [
    ...(invalidSteps.length === 0
      ? []
      : [
          issue(
            "invalid_clean_machine_step",
            "Clean-machine validation steps must match the release checklist taxonomy.",
            invalidSteps,
          ),
        ]),
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

export function countDistinctCleanMachineSteps(steps: readonly unknown[]): number {
  return new Set(steps.filter(isCleanMachineStep)).size;
}

export function cleanMachineStepEvidencePathIssues(
  evidencePaths: CleanMachineStepEvidencePaths | undefined,
): readonly ProductionPackagingIssue[] {
  const missing = new Set([
    ...CLEAN_MACHINE_STEPS.filter(
      (step) => !hasStepSpecificEvidencePath(step, evidencePaths?.[step]),
    ),
    ...duplicatedStepEvidencePathSteps(evidencePaths),
  ]);
  const refs = CLEAN_MACHINE_STEPS.filter((step) => missing.has(step));
  return refs.length === 0
    ? []
    : [
        issue(
          "missing_clean_machine_step_evidence",
          "Clean-machine validation steps must cite step-specific persisted evidence paths.",
          refs,
        ),
      ];
}

function hasStepSpecificEvidencePath(step: CleanMachineStep, path: string | undefined): boolean {
  if (path === undefined) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalizedPath = path.toLowerCase();
  return CLEAN_MACHINE_STEP_PATH_MARKERS[step].some((marker) => normalizedPath.includes(marker));
}

function duplicatedStepEvidencePathSteps(
  evidencePaths: CleanMachineStepEvidencePaths | undefined,
): readonly CleanMachineStep[] {
  const stepsByPath = new Map<string, readonly CleanMachineStep[]>();
  for (const step of CLEAN_MACHINE_STEPS) {
    const path = evidencePaths?.[step];
    if (path === undefined || !hasStepSpecificEvidencePath(step, path)) continue;
    const normalizedPath = path.trim().toLowerCase();
    stepsByPath.set(normalizedPath, [...(stepsByPath.get(normalizedPath) ?? []), step]);
  }
  return [...stepsByPath.values()].filter((steps) => steps.length > 1).flat();
}

function isCleanMachineStep(value: unknown): value is CleanMachineStep {
  return CLEAN_MACHINE_STEPS.some((step) => step === value);
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
