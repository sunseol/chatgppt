import {
  buildFullSlideDesignConsistencyContract,
  type FullSlideDesignConsistencyContract,
  type FullSlideOutputKind,
} from "./full-slide-design-consistency";
import { getPromptAsset, type PromptVersion } from "./prompt-assets";
import type { SlideContextBundle } from "./slide-context-bundle";
import {
  buildTextOverlayPromptAddendum,
  buildTextOverlayStrategy,
  type TextOverlayStrategy,
} from "./text-overlay-strategy";

export interface SlideControlSpec {
  readonly outputKind: FullSlideOutputKind;
  readonly designConsistencyContractId: string;
  readonly layoutArchetype: string;
  readonly slideRole: string;
  readonly visualHierarchy: {
    readonly title: string;
    readonly keyMessage: string;
    readonly visualType: string;
  };
  readonly mustPreserve: readonly string[];
  readonly mustAvoid: readonly string[];
}

export interface SlidePromptPackage {
  readonly promptId: "slide_generation";
  readonly promptVersion: PromptVersion;
  readonly promptHash: string;
  readonly outputKind: FullSlideOutputKind;
  readonly bundleId: string;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly designSystemId: string;
  readonly designConsistency: FullSlideDesignConsistencyContract;
  readonly slideControlSpec?: SlideControlSpec;
  readonly slideNumber: number;
  readonly layoutScreenshot: string;
  readonly sourceMapIds: readonly string[];
  readonly textOverlayStrategy: TextOverlayStrategy;
  readonly prompt: string;
}

export function buildSlidePromptPackage(bundle: SlideContextBundle): SlidePromptPackage {
  const asset = getPromptAsset("slide_generation");
  const textOverlayStrategy = buildTextOverlayStrategy(bundle);
  const designConsistency = buildFullSlideDesignConsistencyContract(bundle);
  const slideControlSpec = buildSlideControlSpec(bundle, designConsistency);
  return {
    promptId: "slide_generation",
    promptVersion: asset.version,
    promptHash: asset.contentHash,
    outputKind: designConsistency.outputKind,
    bundleId: bundle.bundleId,
    deckContextId: bundle.deckContextId,
    deckContextHash: bundle.deckContextHash,
    designSystemId: bundle.designSystemId,
    designConsistency,
    slideControlSpec,
    slideNumber: bundle.slideSpec.slideNumber,
    layoutScreenshot: bundle.layoutPrototype.layoutScreenshot,
    sourceMapIds: bundle.sourceMap.sourceMapIds,
    textOverlayStrategy,
    prompt: buildPrompt(bundle, textOverlayStrategy, asset.contentHash, designConsistency, slideControlSpec),
  };
}

function buildPrompt(
  bundle: SlideContextBundle,
  textOverlayStrategy: TextOverlayStrategy,
  promptHash: string,
  designConsistency: FullSlideDesignConsistencyContract,
  slideControlSpec: SlideControlSpec,
): string {
  return [
    "# Slide Generation Prompt Package",
    `Prompt asset: slide_generation@v1 ${promptHash}`,
    "",
    "[ROLE]",
    "You are generating one slide in a multi-slide deck.",
    "",
    "[GLOBAL DECK CONTEXT]",
    `- Deck Context ID: ${bundle.deckContextId}`,
    `- Deck Context Hash: ${bundle.deckContextHash}`,
    `- Goal: ${bundle.globalSummary.goal}`,
    `- Audience: ${bundle.globalSummary.audience}`,
    `- Tone: ${joinOrNone(bundle.globalSummary.tone)}`,
    `- Total slides: ${bundle.globalSummary.slideCount}`,
    `- Language: ${bundle.globalSummary.language}`,
    "",
    "[APPROVED DESIGN SYSTEM]",
    `- Design System ID: ${bundle.designSystemId}`,
    `- Colors: ${JSON.stringify(bundle.designTokens.colors)}`,
    `- Typography: ${JSON.stringify(bundle.designTokens.typography)}`,
    `- Layout rules: ${joinOrNone(bundle.designTokens.layoutRules)}`,
    `- Component rules: ${joinOrNone(bundle.designTokens.componentRules)}`,
    `- Visual language: ${bundle.designTokens.visualLanguage || "none"}`,
    `- Design negative rules: ${joinOrNone(bundle.designTokens.negativeRules)}`,
    "",
    designConsistency.promptBlock,
    "",
    buildSlideControlSpecPromptBlock(slideControlSpec),
    "",
    "[CURRENT SLIDE SPEC]",
    `- Slide number: ${bundle.slideSpec.slideNumber}`,
    `- Role: ${bundle.slideSpec.role}`,
    `- Title: ${bundle.slideSpec.title}`,
    `- Core message: ${bundle.slideSpec.message}`,
    `- Visual type: ${bundle.slideSpec.visualType}`,
    "",
    "[APPROVED HTML LAYOUT PROTOTYPE]",
    `- Layout screenshot: ${bundle.layoutPrototype.layoutScreenshot}`,
    "- Use the screenshot as composition reference, not final style.",
    "- DOM layer metadata:",
    ...bundle.layoutPrototype.domLayers.map(formatDomLayer),
    "",
    "[SOURCE MAP]",
    `- Source map ids: ${joinOrNone(bundle.sourceMap.sourceMapIds)}`,
    ...bundle.facts.map(formatFact),
    "",
    buildTextOverlayPromptAddendum(textOverlayStrategy),
    "",
    "[EDITABILITY CONSTRAINTS]",
    "- Keep title, body, chart, image, and background visually separable.",
    "- Avoid merging text with textured backgrounds.",
    "- Leave sufficient safe margin.",
    "- Use clear object boundaries for later vector/layer extraction.",
    "",
    "[NEGATIVE CONSTRAINTS]",
    "- Do not invent data.",
    "- Do not add unsourced statistics.",
    "- Do not add new numbers, sentences, logos, or source citations.",
    "- Do not use a different style from the approved design system.",
    "- Do not create unreadable tiny text.",
    "- Do not add random logos or fake UI.",
    "- Do not reproduce the HTML layout screenshot as a literal web UI.",
    "- Do not use generic SaaS dashboard or landing page aesthetics.",
    ...bundle.designTokens.negativeRules.map((rule) => `- Design rule: ${rule}`),
    "",
    "[OUTPUT]",
    "- Slide image matching the approved aspect ratio.",
    "- Clean layout.",
    "- Production-ready visual direction.",
  ].join("\n");
}

function buildSlideControlSpec(
  bundle: SlideContextBundle,
  designConsistency: FullSlideDesignConsistencyContract,
): SlideControlSpec {
  const safeArea = designConsistency.canvas.safeAreaPx;
  return {
    outputKind: designConsistency.outputKind,
    designConsistencyContractId: designConsistency.contractId,
    layoutArchetype: normalizeLayoutArchetype(bundle.slideSpec.visualType),
    slideRole: bundle.slideSpec.role,
    visualHierarchy: {
      title: bundle.slideSpec.title,
      keyMessage: bundle.slideSpec.message,
      visualType: bundle.slideSpec.visualType,
    },
    mustPreserve: [
      "header/footer locked positions",
      "card radius/stroke/shadow family",
      `safe area top ${safeArea.top}px right ${safeArea.right}px bottom ${safeArea.bottom}px left ${safeArea.left}px`,
      "same palette and typography fingerprints",
    ],
    mustAvoid: [...designConsistency.forbiddenFailures],
  };
}

function normalizeLayoutArchetype(visualType: string): string {
  const normalized = visualType.trim().toLowerCase();
  if (normalized.includes("chart") || normalized.includes("차트") || normalized.includes("그래프")) return "chart";
  if (normalized.includes("timeline")) return "timeline";
  if (normalized.includes("map") || normalized.includes("route")) return "route_map";
  if (normalized.includes("comparison") || normalized.includes("table")) return "comparison";
  if (normalized.includes("metric") || normalized.includes("card")) return "metric_cards";
  if (normalized.includes("hero") || normalized.includes("cover")) return "cover_hero";
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "general_slide";
}

function buildSlideControlSpecPromptBlock(spec: SlideControlSpec): string {
  return [
    "[SLIDE CONTROL SPEC]",
    `Output kind: ${spec.outputKind}`,
    `Design consistency contract: ${spec.designConsistencyContractId}`,
    `Layout archetype: ${spec.layoutArchetype}`,
    `Slide role: ${spec.slideRole}`,
    `Visual hierarchy: title=${spec.visualHierarchy.title}; key_message=${spec.visualHierarchy.keyMessage}; visual_type=${spec.visualHierarchy.visualType}`,
    `Must preserve: ${spec.mustPreserve.join(", ")}`,
    `Must avoid: ${spec.mustAvoid.join(", ")}`,
  ].join("\n");
}

function formatDomLayer(layer: SlideContextBundle["layoutPrototype"]["domLayers"][number]): string {
  return [
    `${layer.id} | ${layer.role} | editable ${String(layer.editable)}`,
    `bounds ${formatBounds(layer.bounds)}`,
    `sourceIds ${joinOrNone(layer.sourceIds)}`,
    `datasetIds ${joinOrNone(layer.datasetIds)}`,
  ].join(" | ");
}

function formatFact(fact: SlideContextBundle["facts"][number]): string {
  return [
    `- ${fact.claimId}: ${fact.text}`,
    `sourceIds ${joinOrNone(fact.sourceIds)}`,
    `datasetIds ${joinOrNone(fact.datasetIds)}`,
  ].join(" | ");
}

function formatBounds(bounds: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}): string {
  return `${bounds.x},${bounds.y},${bounds.w},${bounds.h}`;
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
