import type { DesignSystem } from "./deck-types";
import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import { reconstructTextLayers, type ReconstructedTextLayer } from "./text-layer-reconstruction";

export interface EditableSvgCanvas {
  readonly width: number;
  readonly height: number;
}

export type SvgRegionLayerType = "vector_region" | "image_region";

export interface SvgRegionLayer {
  readonly id: string;
  readonly type: SvgRegionLayerType;
  readonly sourceLayerId: string;
  readonly bounds: MvpEditableLayer["bounds"];
  readonly pathData?: string;
  readonly imageDataUrl?: string;
}

export interface EditableSvgRenderResult {
  readonly slideNumber: number;
  readonly svg: string;
  readonly editableObjectCount: number;
  readonly renderedLayerCount: number;
}

export interface EditableSvgSimilarityInput {
  readonly sourceLayerCount: number;
  readonly renderedLayerCount: number;
  readonly thresholdPercent: number;
}

export interface EditableSvgSimilarityReport {
  readonly deltaPercent: number;
  readonly thresholdPercent: number;
  readonly passed: boolean;
}

export class EditableSvgRendererError extends Error {
  constructor(layerType: never) {
    super(`Unsupported editable SVG layer type: ${layerType}`);
    this.name = "EditableSvgRendererError";
  }
}

export function renderEditableSvg(input: {
  readonly canvas: EditableSvgCanvas;
  readonly model: MvpEditableLayerModel;
  readonly design: DesignSystem;
  readonly backgroundImageDataUrl?: string;
  readonly extensionLayers?: readonly SvgRegionLayer[];
  readonly exportMode?: "native-editable" | "hybrid-safe";
}): EditableSvgRenderResult {
  const textLayers = reconstructTextLayers({ layers: input.model.layers, design: input.design });
  const extensionLayers = input.extensionLayers ?? [];
  const exportMode = input.exportMode ?? "native-editable";
  const svg = [
    `<svg data-editable-svg="${input.model.slideNumber}" data-export-mode="${exportMode}" viewBox="0 0 ${input.canvas.width} ${input.canvas.height}" xmlns="http://www.w3.org/2000/svg">`,
    input.backgroundImageDataUrl
      ? renderBackground(input.backgroundImageDataUrl, input.canvas)
      : "",
    `<g data-role="deckforge-editable-layers">`,
    ...input.model.layers.map((layer) => renderLayer(layer, textLayers)),
    "</g>",
    extensionLayers.length > 0 ? `<g data-role="deckforge-extension-layers">` : "",
    ...extensionLayers.map(renderExtensionLayer),
    extensionLayers.length > 0 ? "</g>" : "",
    "</svg>",
  ].join("");
  return {
    slideNumber: input.model.slideNumber,
    svg,
    editableObjectCount: input.model.layers.filter((layer) => layer.editable).length,
    renderedLayerCount: input.model.layers.length + extensionLayers.length,
  };
}

export function estimateEditableSvgSimilarity(
  input: EditableSvgSimilarityInput,
): EditableSvgSimilarityReport {
  const missing = Math.max(0, input.sourceLayerCount - input.renderedLayerCount);
  const deltaPercent =
    input.sourceLayerCount === 0 ? 0 : Math.round((missing / input.sourceLayerCount) * 100);
  return {
    deltaPercent,
    thresholdPercent: input.thresholdPercent,
    passed: deltaPercent <= input.thresholdPercent,
  };
}

function renderBackground(imageDataUrl: string, canvas: EditableSvgCanvas): string {
  return `<image data-role="generated-background" data-locked="true" href="${escapeXml(
    imageDataUrl,
  )}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="xMidYMid slice" />`;
}

function renderLayer(
  layer: MvpEditableLayer,
  textLayers: readonly ReconstructedTextLayer[],
): string {
  switch (layer.type) {
    case "text":
      return renderTextLayer(layer, textLayers);
    case "chart":
      return renderChartLayer(layer);
    case "shape":
      return renderShapeLayer(layer);
    case "image":
      return renderImageLayer(layer);
    default:
      throw new EditableSvgRendererError(layer.type);
  }
}

function renderTextLayer(
  layer: MvpEditableLayer,
  textLayers: readonly ReconstructedTextLayer[],
): string {
  const textLayer = textLayers.find((candidate) => candidate.id === layer.id);
  const font = textLayer?.font;
  return [
    `<text data-editable-layer="${escapeXml(layer.id)}" data-source-layer-id="${escapeXml(
      layer.sourceLayerId,
    )}" data-layer-type="text" data-role="${escapeXml(layer.role)}" data-source-map-ids="${escapeXml(
      layer.sourceMapIds.join(" "),
    )}" x="${layer.bounds.x}" y="${layer.bounds.y + textBaselineOffset(layer)}" font-family="${escapeXml(
      font?.family ?? "sans-serif",
    )}" font-size="${font?.sizePx ?? 28}" letter-spacing="${font?.letterSpacing ?? "0em"}">`,
    escapeXml(layer.text ?? ""),
    "</text>",
  ].join("");
}

function renderChartLayer(layer: MvpEditableLayer): string {
  return [
    renderGroupOpen(layer, "chart"),
    `<rect x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" fill="none" stroke="currentColor" stroke-width="2" />`,
    `<text x="${layer.bounds.x + 20}" y="${layer.bounds.y + 36}" font-size="22">${escapeXml(
      layer.chartOverlayId ?? "chart",
    )}</text>`,
    "</g>",
  ].join("");
}

function renderShapeLayer(layer: MvpEditableLayer): string {
  return [
    renderGroupOpen(layer, "shape"),
    `<rect x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" rx="8" fill="none" stroke="currentColor" stroke-width="2" />`,
    "</g>",
  ].join("");
}

function renderImageLayer(layer: MvpEditableLayer): string {
  return [
    renderGroupOpen(layer, "image"),
    `<rect x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="8 8" />`,
    `<text x="${layer.bounds.x + 20}" y="${layer.bounds.y + 36}" font-size="22">image</text>`,
    "</g>",
  ].join("");
}

function renderGroupOpen(layer: MvpEditableLayer, type: MvpEditableLayer["type"]): string {
  return `<g data-editable-layer="${escapeXml(layer.id)}" data-source-layer-id="${escapeXml(
    layer.sourceLayerId,
  )}" data-layer-type="${type}" data-role="${escapeXml(
    layer.role,
  )}" data-source-map-ids="${escapeXml(layer.sourceMapIds.join(" "))}">`;
}

function renderExtensionLayer(layer: SvgRegionLayer): string {
  if (layer.type === "vector_region") return renderVectorRegion(layer);
  return renderImageRegion(layer);
}

function renderVectorRegion(layer: SvgRegionLayer): string {
  return [
    `<g data-extension-layer="${escapeXml(layer.id)}" data-extension-type="vector_region" data-source-layer-id="${escapeXml(layer.sourceLayerId)}">`,
    `<path d="${escapeXml(layer.pathData ?? rectanglePath(layer.bounds))}" fill="none" stroke="currentColor" stroke-width="2" />`,
    "</g>",
  ].join("");
}

function renderImageRegion(layer: SvgRegionLayer): string {
  const image = layer.imageDataUrl
    ? `<image href="${escapeXml(layer.imageDataUrl)}" x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" preserveAspectRatio="xMidYMid slice" />`
    : `<rect x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" fill="none" stroke="currentColor" stroke-width="2" />`;
  return [
    `<g data-extension-layer="${escapeXml(layer.id)}" data-extension-type="image_region" data-source-layer-id="${escapeXml(layer.sourceLayerId)}">`,
    image,
    "</g>",
  ].join("");
}

function rectanglePath(bounds: MvpEditableLayer["bounds"]): string {
  const right = bounds.x + bounds.w;
  const bottom = bounds.y + bounds.h;
  return `M ${bounds.x} ${bounds.y} L ${right} ${bounds.y} L ${right} ${bottom} L ${bounds.x} ${bottom} Z`;
}

function textBaselineOffset(layer: MvpEditableLayer): number {
  if (layer.role === "title") return Math.min(72, layer.bounds.h);
  if (layer.role === "source") return Math.min(28, layer.bounds.h);
  return Math.min(48, layer.bounds.h);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
