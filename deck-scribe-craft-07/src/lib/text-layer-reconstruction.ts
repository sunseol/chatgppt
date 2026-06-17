import type { DesignSystem } from "./deck-types";
import type { MvpEditableLayer } from "./editable-layer-model";
import { FONT_POLICY } from "./font-policy";

export interface TextLayerFontCandidate {
  readonly family: string;
  readonly sizePx: number;
  readonly minPx: number;
  readonly maxPx: number;
  readonly lineHeight: number;
  readonly letterSpacing: "0em";
}

export interface ReconstructedTextLayer {
  readonly id: string;
  readonly sourceLayerId: string;
  readonly role: string;
  readonly text: string;
  readonly bounds: MvpEditableLayer["bounds"];
  readonly editable: boolean;
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly sourceMapIds: readonly string[];
  readonly font: TextLayerFontCandidate;
  readonly qualityLevel: "level2";
}

export interface TextLayerReconstructionScore {
  readonly titleEditableRate: number;
  readonly bodyEditableRate: number;
  readonly passed: boolean;
}

export interface KoreanTextIntegrityReport {
  readonly passed: boolean;
  readonly corruptedLayerIds: readonly string[];
}

export function reconstructTextLayers(input: {
  readonly layers: readonly MvpEditableLayer[];
  readonly design: DesignSystem;
}): readonly ReconstructedTextLayer[] {
  return input.layers
    .filter((layer) => layer.type === "text")
    .map((layer) => reconstructTextLayer(layer, input.design));
}

export function scoreTextLayerReconstruction(
  slides: readonly (readonly ReconstructedTextLayer[])[],
): TextLayerReconstructionScore {
  const slideCount = slides.length;
  const titleEditableRate = slideCount === 0 ? 1 : roleEditableRate(slides, "title");
  const bodyEditableRate = slideCount === 0 ? 1 : roleEditableRate(slides, "body");
  return {
    titleEditableRate,
    bodyEditableRate,
    passed: titleEditableRate >= 0.95 && bodyEditableRate >= 0.85,
  };
}

export function validateKoreanTextIntegrity(
  layers: readonly ReconstructedTextLayer[],
): KoreanTextIntegrityReport {
  const corruptedLayerIds = layers
    .filter((layer) => containsReplacementCharacter(layer.text))
    .map((layer) => layer.id);
  return {
    passed: corruptedLayerIds.length === 0,
    corruptedLayerIds,
  };
}

function reconstructTextLayer(
  layer: MvpEditableLayer,
  design: DesignSystem,
): ReconstructedTextLayer {
  return {
    id: layer.id,
    sourceLayerId: layer.sourceLayerId,
    role: layer.role,
    text: layer.text ?? "",
    bounds: layer.bounds,
    editable: layer.editable,
    sourceIds: [...layer.sourceIds],
    datasetIds: [...layer.datasetIds],
    sourceMapIds: [...layer.sourceMapIds],
    font: fontForRole(layer.role, design),
    qualityLevel: "level2",
  };
}

function fontForRole(role: string, design: DesignSystem): TextLayerFontCandidate {
  if (role === "title" || role === "sectionMarker") {
    return {
      family: FONT_POLICY.serifFamily,
      sizePx: design.typography.title.minPx,
      minPx: design.typography.title.minPx,
      maxPx: design.typography.title.maxPx,
      lineHeight: FONT_POLICY.lineHeight.title,
      letterSpacing: FONT_POLICY.letterSpacing,
    };
  }
  if (role === "metric") {
    return {
      family: FONT_POLICY.monoFamily,
      sizePx: design.typography.number.minPx,
      minPx: design.typography.number.minPx,
      maxPx: design.typography.number.maxPx,
      lineHeight: FONT_POLICY.lineHeight.body,
      letterSpacing: FONT_POLICY.letterSpacing,
    };
  }
  if (role === "source" || role === "caption") {
    return {
      family: FONT_POLICY.sansFamily,
      sizePx: Math.max(20, design.typography.caption.minPx),
      minPx: design.typography.caption.minPx,
      maxPx: design.typography.caption.maxPx,
      lineHeight: FONT_POLICY.lineHeight.caption,
      letterSpacing: FONT_POLICY.letterSpacing,
    };
  }
  return {
    family: FONT_POLICY.sansFamily,
    sizePx: design.typography.body.minPx,
    minPx: design.typography.body.minPx,
    maxPx: design.typography.body.maxPx,
    lineHeight: FONT_POLICY.lineHeight.body,
    letterSpacing: FONT_POLICY.letterSpacing,
  };
}

function roleEditableRate(
  slides: readonly (readonly ReconstructedTextLayer[])[],
  role: string,
): number {
  const editableCount = slides.filter((layers) =>
    layers.some((layer) => layer.role === role && layer.editable && layer.text.length > 0),
  ).length;
  return editableCount / slides.length;
}

function containsReplacementCharacter(text: string): boolean {
  return text.includes("\uFFFD");
}
