import type { Claim, DeckProject, DesignSystem, SlideSpec } from "./deck-types";
import type { FrozenDeckContext } from "./deck-context";
import {
  buildMinimalSlideSourceMap,
  createSlidePromptSourceMapReference,
  type SlideSourceMapEntry,
  type SlidePromptSourceMapReference,
} from "./slide-source-map";

export type SlideContextBundleIssue =
  | "Approved brief is required."
  | "Approved research pack is required."
  | "Approved deck plan is required."
  | "Approved design system is required.";

export type SlideContextBundleResult =
  | { readonly kind: "ready"; readonly bundles: readonly SlideContextBundle[] }
  | { readonly kind: "blocked"; readonly issues: readonly SlideContextBundleIssue[] };

export type SlideContextBundle = {
  readonly bundleId: string;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly designSystemId: string;
  readonly globalSummary: {
    readonly goal: string;
    readonly audience: string;
    readonly tone: readonly string[];
    readonly slideCount: number;
    readonly language: string;
  };
  readonly designTokens: {
    readonly colors: DesignSystem["colors"];
    readonly typography: DesignSystem["typography"];
    readonly layoutRules: readonly string[];
    readonly componentRules: readonly string[];
    readonly visualLanguage: string;
    readonly negativeRules: readonly string[];
  };
  readonly layoutPrototype: {
    readonly layoutPrototypeId: string;
    readonly layoutScreenshot: string;
    readonly domLayers: FrozenDeckContext["layout"]["slides"][number]["domLayers"];
  };
  readonly slideSpec: {
    readonly slideNumber: number;
    readonly title: string;
    readonly role: string;
    readonly message: string;
    readonly visualType: string;
  };
  readonly sourceMap: SlidePromptSourceMapReference;
  readonly facts: readonly {
    readonly claimId: string;
    readonly text: string;
    readonly sourceIds: readonly string[];
    readonly datasetIds: readonly string[];
    readonly allowedUsage: "caption or supporting bullet only";
  }[];
};

export function buildSlideContextBundles(input: {
  readonly project: DeckProject;
  readonly context: FrozenDeckContext;
}): SlideContextBundleResult {
  const issues = collectIssues(input.project);
  if (issues.length > 0) return { kind: "blocked", issues };

  const brief = input.project.brief;
  const research = input.project.research;
  const plan = input.project.plan;
  const design = input.project.design;
  if (!brief || !research || !plan || !design) return { kind: "blocked", issues };

  const sourceMap = buildMinimalSlideSourceMap({ slides: plan.slides, research });
  const bundles = plan.slides.map((slide) => {
    const sourceMapEntry =
      sourceMap.entries.find((entry) => entry.slideNumber === slide.number) ?? emptyEntry(slide);
    return buildBundle({
      slide,
      context: input.context,
      brief,
      design,
      sourceMap: createSlidePromptSourceMapReference(sourceMapEntry),
      facts: factsForSourceMap(sourceMapEntry, research.claims),
    });
  });
  return { kind: "ready", bundles };
}

function buildBundle(input: {
  readonly slide: SlideSpec;
  readonly context: FrozenDeckContext;
  readonly brief: NonNullable<DeckProject["brief"]>;
  readonly design: DesignSystem;
  readonly sourceMap: SlidePromptSourceMapReference;
  readonly facts: readonly SlideContextBundle["facts"][number][];
}): SlideContextBundle {
  const renderedSlide = input.context.layout.slides.find(
    (slide) => slide.slideNumber === input.slide.number,
  );
  return {
    bundleId: `bundle_${input.context.deckContextId}_slide_${String(input.slide.number).padStart(
      2,
      "0",
    )}`,
    deckContextId: input.context.deckContextId,
    deckContextHash: input.context.hash,
    designSystemId: input.design.id,
    globalSummary: {
      goal: input.brief.goal,
      audience: input.brief.audience,
      tone: input.brief.tone,
      slideCount: input.brief.slideCount,
      language: input.brief.language,
    },
    designTokens: {
      colors: input.design.colors,
      typography: input.design.typography,
      layoutRules: input.design.layoutRules,
      componentRules: input.design.componentRules,
      visualLanguage: input.design.visualLanguage,
      negativeRules: input.design.negativeRules,
    },
    layoutPrototype: {
      layoutPrototypeId: input.context.layout.layoutPrototypeId,
      layoutScreenshot: `slide_${String(input.slide.number).padStart(2, "0")}_layout.png`,
      domLayers: renderedSlide?.domLayers ?? [],
    },
    slideSpec: {
      slideNumber: input.slide.number,
      title: input.slide.title,
      role: input.slide.role,
      message: input.slide.coreMessage,
      visualType: input.slide.visualType,
    },
    sourceMap: input.sourceMap,
    facts: input.facts,
  };
}

function collectIssues(project: DeckProject): readonly SlideContextBundleIssue[] {
  const issues: SlideContextBundleIssue[] = [];
  if (!project.brief?.approvedHash) issues.push("Approved brief is required.");
  if (!project.research?.approvedHash) issues.push("Approved research pack is required.");
  if (!project.plan?.approvedHash) issues.push("Approved deck plan is required.");
  if (!project.design?.approvedHash) issues.push("Approved design system is required.");
  return issues;
}

function factsForSourceMap(
  entry: SlideSourceMapEntry,
  claims: readonly Claim[],
): readonly SlideContextBundle["facts"][number][] {
  const ids = new Set(entry.claimIds);
  return claims
    .filter((claim) => ids.has(claim.id))
    .map((claim) => ({
      claimId: claim.id,
      text: claim.statement,
      sourceIds: claim.sourceIds,
      datasetIds: claim.datasetIds,
      allowedUsage: "caption or supporting bullet only",
    }));
}

function emptyEntry(slide: SlideSpec): SlideSourceMapEntry {
  return {
    slideId: formatSlideId(slide.number),
    slideNumber: slide.number,
    claimIds: [],
    sourceIds: [],
    datasetIds: [],
    rejectedClaimIds: [],
  };
}

function formatSlideId(slideNumber: number): string {
  return `slide_${String(slideNumber).padStart(2, "0")}`;
}
