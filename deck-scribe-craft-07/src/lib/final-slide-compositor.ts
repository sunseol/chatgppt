import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import { isVersionedProjectImageArtifactPath } from "./image-path-decision";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type {
  SlideImageArtifact,
  SlideImageCanvas,
  SlideImageProviderId,
} from "./slide-image-provider";

export interface FinalSlideOverlayBounds {
  readonly id: string;
  readonly role: string;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

export interface FinalSlideBackgroundArtifactRef {
  readonly artifactId: string;
  readonly path: string;
  readonly hash: string;
}

export interface FinalSlideComposition {
  readonly slideNumber: number;
  readonly exportBasis: "compositor";
  readonly canvas: SlideImageCanvas;
  readonly backgroundProviderId: SlideImageProviderId;
  readonly backgroundArtifact?: FinalSlideBackgroundArtifactRef;
  readonly overlayRoles: readonly string[];
  readonly overlayBounds: readonly FinalSlideOverlayBounds[];
  readonly svg: string;
  readonly previewPngDataUrl: string;
}

export function composeFinalSlide(input: {
  readonly background: SlideImageArtifact;
  readonly layers: MvpEditableLayerModel;
  readonly backgroundArtifact?: FinalSlideBackgroundArtifactRef;
}): FinalSlideComposition {
  if (input.background.slideNumber !== input.layers.slideNumber) {
    throw new Error("Background artifact and editable layers must target the same slide.");
  }
  if (input.backgroundArtifact !== undefined) {
    assertBackgroundArtifactTargetsSlide(input.backgroundArtifact, input.background.slideNumber);
  }
  return {
    slideNumber: input.background.slideNumber,
    exportBasis: "compositor",
    canvas: input.background.canvas,
    backgroundProviderId: input.background.providerId,
    ...(input.backgroundArtifact === undefined
      ? {}
      : { backgroundArtifact: input.backgroundArtifact }),
    overlayRoles: input.layers.layers.map((layer) => layer.role),
    overlayBounds: input.layers.layers.map((layer) => ({
      id: layer.id,
      role: layer.role,
      bounds: layer.bounds,
    })),
    svg: renderSvg(input.background, input.layers, input.backgroundArtifact),
    previewPngDataUrl: renderPreviewPng(input.background.canvas),
  };
}

function assertBackgroundArtifactTargetsSlide(
  artifact: FinalSlideBackgroundArtifactRef,
  slideNumber: number,
): void {
  if (!isSha256Digest(artifact.hash)) {
    throw new Error("Stored background artifact hash must be a SHA-256 digest.");
  }
  if (backgroundArtifactTargetsSlide(artifact, slideNumber)) return;
  throw new Error(
    `Stored background artifact must target slide ${slideNumber} with versioned project image storage.`,
  );
}

function isSha256Digest(hash: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(hash);
}

export function backgroundArtifactTargetsSlide(
  artifact: FinalSlideBackgroundArtifactRef,
  slideNumber: number,
): boolean {
  const token = `slide_${String(slideNumber).padStart(3, "0")}`;
  const artifactIdMatch = new RegExp(`^[A-Za-z0-9_-]+_image_${token}_v([1-9]\\d*)$`).exec(
    artifact.artifactId,
  );
  const pathMatch = new RegExp(`(?:^|/)${token}\\.v([1-9]\\d*)\\.png$`).exec(artifact.path);
  const artifactVersion = artifactIdMatch?.[1];
  const pathVersion = pathMatch?.[1];
  return (
    artifactVersion !== undefined &&
    pathVersion !== undefined &&
    artifactVersion === pathVersion &&
    isVersionedProjectImageArtifactPath(artifact.path)
  );
}

export function countKoreanTextOverlays(composition: FinalSlideComposition): number {
  return (composition.svg.match(/data-layer-type="text"/g) ?? []).length;
}

function renderSvg(
  background: SlideImageArtifact,
  model: MvpEditableLayerModel,
  backgroundArtifact: FinalSlideBackgroundArtifactRef | undefined,
): string {
  return [
    `<svg data-final-slide="${background.slideNumber}" data-export-basis="compositor" viewBox="0 0 ${background.canvas.width} ${background.canvas.height}" xmlns="http://www.w3.org/2000/svg">`,
    `<image data-role="generated-background" data-locked="true" href="${escapeXml(
      background.imageDataUrl,
    )}"${backgroundArtifactAttributes(backgroundArtifact)} x="0" y="0" width="${background.canvas.width}" height="${background.canvas.height}" preserveAspectRatio="xMidYMid slice" />`,
    `<g data-role="editable-overlays">`,
    ...model.layers.map(renderLayer),
    "</g>",
    "</svg>",
  ].join("");
}

function backgroundArtifactAttributes(
  backgroundArtifact: FinalSlideBackgroundArtifactRef | undefined,
): string {
  if (backgroundArtifact === undefined) return "";
  return [
    ` data-background-artifact-id="${escapeXml(backgroundArtifact.artifactId)}"`,
    ` data-background-artifact-path="${escapeXml(backgroundArtifact.path)}"`,
    ` data-background-artifact-hash="${escapeXml(backgroundArtifact.hash)}"`,
  ].join("");
}

function renderLayer(layer: MvpEditableLayer): string {
  if (layer.type === "chart") return renderChartLayer(layer);
  return renderTextLayer(layer);
}

function renderTextLayer(layer: MvpEditableLayer): string {
  const text = layer.text ?? "";
  return [
    `<text data-editable-layer="${escapeXml(layer.id)}" data-source-layer-id="${escapeXml(
      layer.sourceLayerId,
    )}" data-layer-type="text" data-role="${escapeXml(layer.role)}" data-source-map-ids="${escapeXml(
      layer.sourceMapIds.join(" "),
    )}" x="${layer.bounds.x}" y="${layer.bounds.y + textBaselineOffset(layer)}" font-size="${fontSize(
      layer,
    )}">`,
    escapeXml(text),
    "</text>",
  ].join("");
}

function renderChartLayer(layer: MvpEditableLayer): string {
  return [
    `<g data-editable-layer="${escapeXml(layer.id)}" data-source-layer-id="${escapeXml(
      layer.sourceLayerId,
    )}" data-layer-type="chart" data-role="${escapeXml(layer.role)}" data-chart-overlay-id="${escapeXml(
      layer.chartOverlayId ?? "none",
    )}" data-source-map-ids="${escapeXml(layer.sourceMapIds.join(" "))}">`,
    `<rect x="${layer.bounds.x}" y="${layer.bounds.y}" width="${layer.bounds.w}" height="${layer.bounds.h}" fill="none" stroke="currentColor" stroke-width="2" />`,
    `<text x="${layer.bounds.x + 24}" y="${layer.bounds.y + 40}" font-size="24">${escapeXml(
      layer.chartOverlayId ?? "chart overlay",
    )}</text>`,
    "</g>",
  ].join("");
}

function renderPreviewPng(canvas: SlideImageCanvas): string {
  const preview =
    canvas.width / canvas.height > 1.4 ? { width: 160, height: 90 } : { width: 120, height: 90 };
  return encodeSolidPngDataUrl({
    width: preview.width,
    height: preview.height,
    color: { r: 245, g: 246, b: 248, a: 255 },
  });
}

function textBaselineOffset(layer: MvpEditableLayer): number {
  if (layer.role === "title") return Math.min(72, layer.bounds.h);
  if (layer.role === "source") return Math.min(28, layer.bounds.h);
  return Math.min(48, layer.bounds.h);
}

function fontSize(layer: MvpEditableLayer): number {
  if (layer.role === "title") return 56;
  if (layer.role === "source") return 20;
  return 34;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
