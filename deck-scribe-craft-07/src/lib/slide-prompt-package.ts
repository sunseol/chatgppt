import { getPromptAsset, type PromptVersion } from "./prompt-assets";
import type { SlideContextBundle } from "./slide-context-bundle";
import {
  buildTextOverlayPromptAddendum,
  buildTextOverlayStrategy,
  type TextOverlayStrategy,
} from "./text-overlay-strategy";

export interface SlidePromptPackage {
  readonly promptId: "slide_generation";
  readonly promptVersion: PromptVersion;
  readonly promptHash: string;
  readonly bundleId: string;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly designSystemId: string;
  readonly slideNumber: number;
  readonly layoutScreenshot: string;
  readonly sourceMapIds: readonly string[];
  readonly textOverlayStrategy: TextOverlayStrategy;
  readonly prompt: string;
}

export function buildSlidePromptPackage(bundle: SlideContextBundle): SlidePromptPackage {
  const asset = getPromptAsset("slide_generation");
  const textOverlayStrategy = buildTextOverlayStrategy(bundle);
  return {
    promptId: "slide_generation",
    promptVersion: asset.version,
    promptHash: asset.contentHash,
    bundleId: bundle.bundleId,
    deckContextId: bundle.deckContextId,
    deckContextHash: bundle.deckContextHash,
    designSystemId: bundle.designSystemId,
    slideNumber: bundle.slideSpec.slideNumber,
    layoutScreenshot: bundle.layoutPrototype.layoutScreenshot,
    sourceMapIds: bundle.sourceMap.sourceMapIds,
    textOverlayStrategy,
    prompt: buildPrompt(bundle, textOverlayStrategy, asset.contentHash),
  };
}

function buildPrompt(
  bundle: SlideContextBundle,
  textOverlayStrategy: TextOverlayStrategy,
  promptHash: string,
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
    `- Design negative rules: ${joinOrNone(bundle.designTokens.negativeRules)}`,
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
