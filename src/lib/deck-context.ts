import type { DeckProject, LayoutPrototype } from "./deck-types";
import { hashContent } from "./artifacts";

export type FrozenDeckContextIssue =
  | "Approved brief is required."
  | "Approved research pack is required."
  | "Approved deck plan is required."
  | "Approved design system is required."
  | "Approved layout prototype is required.";

export type FrozenDeckContextResult =
  | { readonly kind: "ready"; readonly context: FrozenDeckContext }
  | { readonly kind: "blocked"; readonly issues: readonly FrozenDeckContextIssue[] };

export type FrozenDeckContext = {
  readonly deckContextId: string;
  readonly projectId: string;
  readonly approvedArtifacts: {
    readonly briefId: string;
    readonly researchPackId: string;
    readonly deckPlanId: string;
    readonly designSystemId: string;
    readonly layoutPrototypeId: string;
  };
  readonly approvedHashes: {
    readonly briefHash: string;
    readonly researchHash: string;
    readonly deckPlanHash: string;
    readonly designHash: string;
    readonly layoutHash: string;
  };
  readonly hash: string;
  readonly createdAt: number;
  readonly locked: true;
  readonly slideCount: number;
  readonly layout: {
    readonly layoutPrototypeId: string;
    readonly slides: readonly {
      readonly slideNumber: number;
      readonly componentType: string;
      readonly domLayers: LayoutPrototype["slides"][number]["domLayers"];
    }[];
  };
};

export type DeckContextPromptReference = {
  readonly deckContextId: string;
  readonly slideNumber: number;
  readonly layoutPrototypeId: string;
  readonly domLayerCount: number;
};

export function createFrozenDeckContext(
  project: DeckProject,
  options: { readonly now?: () => number } = {},
): FrozenDeckContextResult {
  const issues = collectContextIssues(project);
  if (issues.length > 0) return { kind: "blocked", issues };

  const payload = contextPayload(project);
  const hash = hashContent(JSON.stringify(payload));
  return {
    kind: "ready",
    context: {
      ...payload,
      deckContextId: `deckctx_${hash.slice("sha256:".length, "sha256:".length + 12)}`,
      hash,
      createdAt: options.now?.() ?? Date.now(),
      locked: true,
    },
  };
}

export function createDeckContextPromptReferences(
  context: FrozenDeckContext,
): readonly DeckContextPromptReference[] {
  return context.layout.slides.map((slide) => ({
    deckContextId: context.deckContextId,
    slideNumber: slide.slideNumber,
    layoutPrototypeId: context.layout.layoutPrototypeId,
    domLayerCount: slide.domLayers.length,
  }));
}

function collectContextIssues(project: DeckProject): readonly FrozenDeckContextIssue[] {
  const issues: FrozenDeckContextIssue[] = [];
  if (!project.brief?.approvedHash) issues.push("Approved brief is required.");
  if (!project.research?.approvedHash) issues.push("Approved research pack is required.");
  if (!project.plan?.approvedHash) issues.push("Approved deck plan is required.");
  if (!project.design?.approvedHash) issues.push("Approved design system is required.");
  if (!project.layout?.approvedHash) issues.push("Approved layout prototype is required.");
  return issues;
}

function contextPayload(project: DeckProject) {
  const brief = requireApproved(project.brief, "Approved brief is required.");
  const research = requireApproved(project.research, "Approved research pack is required.");
  const plan = requireApproved(project.plan, "Approved deck plan is required.");
  const design = requireApproved(project.design, "Approved design system is required.");
  const layout = requireApproved(project.layout, "Approved layout prototype is required.");
  return {
    projectId: project.id,
    approvedArtifacts: {
      briefId: brief.id,
      researchPackId: research.id,
      deckPlanId: plan.id,
      designSystemId: design.id,
      layoutPrototypeId: layout.id,
    },
    approvedHashes: {
      briefHash: brief.approvedHash,
      researchHash: research.approvedHash,
      deckPlanHash: plan.approvedHash,
      designHash: design.approvedHash,
      layoutHash: layout.approvedHash,
    },
    slideCount: plan.slides.length,
    layout: {
      layoutPrototypeId: layout.id,
      slides: layout.slides.map((slide) => ({
        slideNumber: slide.number,
        componentType: slide.componentType,
        domLayers: slide.domLayers,
      })),
    },
  };
}

function requireApproved<T extends { readonly approvedHash?: string }>(
  value: T | undefined,
  message: FrozenDeckContextIssue,
): T & { readonly approvedHash: string } {
  if (!value?.approvedHash) throw new Error(message);
  return { ...value, approvedHash: value.approvedHash };
}
