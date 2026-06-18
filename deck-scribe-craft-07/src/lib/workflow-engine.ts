import type { DeckProject, Stage, StepKey } from "./deck-types";
import { STEPS, stageToStep, stepIndex } from "./deck-types";

const STEP_ORDER: readonly StepKey[] = STEPS.map((step) => step.key);

const DOWNSTREAM: Record<StepKey, readonly StepKey[]> = {
  project: [
    "interview",
    "research",
    "plan",
    "design",
    "layout",
    "generate",
    "review",
    "editor",
    "export",
  ],
  interview: ["research", "plan", "design", "layout", "generate", "review", "editor", "export"],
  research: ["plan", "design", "layout", "generate", "review", "editor", "export"],
  plan: ["design", "layout", "generate", "review", "editor", "export"],
  design: ["layout", "generate", "review", "editor", "export"],
  layout: ["generate", "review", "editor", "export"],
  generate: ["review", "editor", "export"],
  review: ["editor", "export"],
  vectorize: ["editor", "export"],
  editor: ["export"],
  export: [],
};

const APPROVAL_NEXT_STAGE: Partial<Record<StepKey, Stage>> = {
  interview: "RESEARCHING",
  research: "PLANNING",
  plan: "DESIGNING",
  design: "PROTOTYPING_LAYOUT",
  layout: "GENERATING_SLIDES",
  review: "EDITOR",
  vectorize: "EDITOR",
  editor: "FINAL_REPORTING",
};

export class WorkflowTransitionError extends Error {
  constructor(step: StepKey) {
    super(`No approval transition is defined for step "${step}".`);
    this.name = "WorkflowTransitionError";
  }
}

export function getReachableSteps(project: DeckProject): StepKey[] {
  if (project.stage === "PROJECT_CREATED") return ["project", "interview"];
  const currentStep = stageToStep(project.stage);
  const currentIndex = stepIndex(currentStep);
  return STEP_ORDER.filter((_step, index) => index <= currentIndex);
}

export function isStepReachable(project: DeckProject, step: StepKey): boolean {
  return getReachableSteps(project).includes(step);
}

export function canGenerateLayoutPrototype(project: DeckProject): boolean {
  return (
    isStepReachable(project, "layout") &&
    project.plan?.approvedHash !== undefined &&
    project.design?.approvedHash !== undefined
  );
}

export function getRedirectStep(project: DeckProject, requestedStep: StepKey): StepKey {
  if (isStepReachable(project, requestedStep)) return requestedStep;
  return stageToStep(project.stage);
}

export function getVisitStage(currentStage: Stage, requestedStep: StepKey): Stage {
  if (currentStage === "PROJECT_CREATED" && requestedStep === "interview") {
    return "INTERVIEWING";
  }
  return currentStage;
}

export function nextStageAfterApproval(step: StepKey): Stage {
  const next = APPROVAL_NEXT_STAGE[step];
  if (!next) throw new WorkflowTransitionError(step);
  return next;
}

export function invalidatedAfter(fromStep: StepKey): Partial<Record<StepKey, true>> {
  const invalidated: Partial<Record<StepKey, true>> = {};
  for (const step of DOWNSTREAM[fromStep]) {
    invalidated[step] = true;
  }
  return invalidated;
}
