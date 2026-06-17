import type { DeckPlan, DesignSystem, SlideSpec } from "./deck-types";
import type { LayoutIR } from "./layout-ir";
import { LayoutIRSchema } from "./layout-ir";
import {
  getLayoutComponentDefinition,
  LayoutComponentTypes,
  layoutComponentDefinitions,
  selectLayoutComponentForSlide,
  type LayoutComponentType,
} from "./layout-component-catalog";

export type LayoutIrPromptIssue =
  | "Deck plan must be approved before generating Layout IR."
  | "Design system must be approved before generating Layout IR."
  | "Deck plan must include at least one slide.";

export type LayoutIrPromptResult =
  | {
      readonly kind: "ready";
      readonly prompt: string;
      readonly allowedComponentTypes: readonly LayoutComponentType[];
      readonly expectedSlides: readonly LayoutIrPromptSlideConstraint[];
    }
  | { readonly kind: "blocked"; readonly issues: readonly LayoutIrPromptIssue[] };

export type LayoutIrPromptSlideConstraint = {
  readonly slideNumber: number;
  readonly role: string;
  readonly componentType: LayoutComponentType;
  readonly slotIds: readonly string[];
  readonly editableRoles: readonly string[];
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
};

export type LayoutIrCandidateParseResult =
  | { readonly kind: "ready"; readonly ir: LayoutIR }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export function buildLayoutIrPrompt(input: {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
}): LayoutIrPromptResult {
  const issues = collectPromptIssues(input.plan, input.design);
  if (issues.length > 0) return { kind: "blocked", issues };

  const expectedSlides = input.plan.slides.map((slide, index) =>
    buildSlideConstraint(slide, index, input.plan.slides.length),
  );
  return {
    kind: "ready",
    prompt: buildPrompt(input.plan, input.design, expectedSlides),
    allowedComponentTypes: Object.freeze([...LayoutComponentTypes]),
    expectedSlides: Object.freeze(expectedSlides),
  };
}

export function parseLayoutIrCandidate(candidate: unknown): LayoutIrCandidateParseResult {
  const parsed = LayoutIRSchema.safeParse(candidate);
  if (parsed.success) return { kind: "ready", ir: parsed.data };
  return {
    kind: "blocked",
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}

function collectPromptIssues(plan: DeckPlan, design: DesignSystem): readonly LayoutIrPromptIssue[] {
  const issues: LayoutIrPromptIssue[] = [];
  if (!plan.approvedHash) {
    issues.push("Deck plan must be approved before generating Layout IR.");
  }
  if (!design.approvedHash) {
    issues.push("Design system must be approved before generating Layout IR.");
  }
  if (plan.slides.length === 0) {
    issues.push("Deck plan must include at least one slide.");
  }
  return issues;
}

function buildSlideConstraint(
  slide: SlideSpec,
  index: number,
  totalSlides: number,
): LayoutIrPromptSlideConstraint {
  const componentType = selectLayoutComponentForSlide(slide, index, totalSlides);
  const definition = getLayoutComponentDefinition(componentType);
  return {
    slideNumber: slide.number,
    role: slide.role,
    componentType,
    slotIds: definition.requiredSlots.map((slot) => slot.id),
    editableRoles: [...definition.editableLayerRoles],
    sourceIds: slide.evidence.filter((id) => id.startsWith("claim_") || id.startsWith("src_")),
    datasetIds: (slide.dataSourceConstraints ?? []).filter((id) => id.startsWith("dataset_")),
  };
}

function buildPrompt(
  plan: DeckPlan,
  design: DesignSystem,
  expectedSlides: readonly LayoutIrPromptSlideConstraint[],
): string {
  return [
    "# Layout IR Generation Package",
    "",
    "## Required Output Contract",
    "Return JSON only.",
    "Output must pass the Layout IR JSON Schema used by the application.",
    "metadata.layoutPurpose must be draft for every slide.",
    `Use designSystemId exactly: ${design.id}`,
    `Use canvas exactly: ${design.canvas.ratio}, ${design.canvas.w}x${design.canvas.h}, safe margin ${design.canvas.safeMargin.x}x${design.canvas.safeMargin.y}`,
    `Design negative rules: ${joinOrNone(design.negativeRules)}`,
    `Allowed components: ${LayoutComponentTypes.join(", ")}`,
    "Allowed top-level fields: id, version, designSystemId, canvas, slides.",
    "Allowed slide fields: id, slideNumber, componentType, metadata, slots, layers.",
    "Allowed slot fields: id, role, text, sourceIds, datasetIds, tokenRefs.",
    "Allowed layer fields: id, slotId, role, editable, bboxPreference.",
    "Use only approved token refs from the component catalog.",
    "Use only sourceIds and datasetIds listed in the per-slide constraints.",
    "Set editable only as a boolean; do not add editor-specific behaviors.",
    "",
    "## Forbidden surfaces",
    "Do not output arbitrary CSS, style objects, raw color values, raw font names, JavaScript, script tags, inline event handlers, iframes, external resources, URLs, or HTML.",
    "",
    "## Component Catalog",
    ...layoutComponentDefinitions().map(formatComponentDefinition),
    "",
    "## Slide Constraints",
    ...expectedSlides.map(formatSlideConstraint),
    "",
    "## Deck Plan Summary",
    `Plan id: ${plan.id}`,
    ...plan.slides.map(
      (slide) =>
        `Slide ${slide.number}: ${slide.title} | ${slide.coreMessage} | visual ${slide.visualType}`,
    ),
  ].join("\n");
}

function formatComponentDefinition(
  definition: ReturnType<typeof layoutComponentDefinitions>[number],
): string {
  return [
    `${definition.type}:`,
    `  slots: ${definition.requiredSlots.map((slot) => slot.id).join(", ")}`,
    `  editable roles: ${definition.editableLayerRoles.join(", ")}`,
    `  token refs: ${definition.allowedTokenRefs.join(", ")}`,
  ].join("\n");
}

function formatSlideConstraint(constraint: LayoutIrPromptSlideConstraint): string {
  return [
    `Slide ${constraint.slideNumber} | ${constraint.role} | ${constraint.componentType}`,
    `slots: ${constraint.slotIds.join(", ")}`,
    `editable roles: ${constraint.editableRoles.join(", ")}`,
    `sourceIds: ${joinOrNone(constraint.sourceIds)}`,
    `datasetIds: ${joinOrNone(constraint.datasetIds)}`,
  ].join("\n");
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
