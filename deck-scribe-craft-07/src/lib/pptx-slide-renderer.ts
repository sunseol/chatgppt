import type { DeckProject, EditableLayerModel } from "./deck-types";
import { shapeTreeRoot, xml } from "./pptx-openxml-parts";
import type { PptxSlideBackgroundImage } from "./pptx-background-images";

type ProjectLayer = EditableLayerModel["layers"][number];

export type PptxSlideMetrics = {
  readonly widthEmu: number;
  readonly heightEmu: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly type: "wide" | "screen4x3";
};

const SLIDE_SIZE_EMU = {
  "16:9": { width: 12_192_000, height: 6_858_000, type: "wide" },
  "4:3": { width: 9_144_000, height: 6_858_000, type: "screen4x3" },
} as const;

export function buildPptxSlideMetrics(project: DeckProject): PptxSlideMetrics {
  const size = SLIDE_SIZE_EMU[project.aspectRatio];
  const canvas = project.design?.canvas;
  const sourceWidth = canvas?.w ?? (project.aspectRatio === "16:9" ? 1600 : 1200);
  const sourceHeight = canvas?.h ?? 900;
  return {
    widthEmu: size.width,
    heightEmu: size.height,
    scaleX: size.width / sourceWidth,
    scaleY: size.height / sourceHeight,
    type: size.type,
  };
}

export function renderPptxPresentationPart(
  models: readonly EditableLayerModel[],
  metrics: PptxSlideMetrics,
): string {
  const slides = models
    .map(
      (model, index) =>
        `<p:sldId id="${256 + index}" r:id="rId${index + 2}" data-slide-number="${model.slideNumber}"/>`,
    )
    .join("");
  return xml(
    `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides}</p:sldIdLst><p:sldSz cx="${metrics.widthEmu}" cy="${metrics.heightEmu}" type="${metrics.type}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr/></p:defaultTextStyle></p:presentation>`,
  );
}

export function renderPptxSlidePart(input: {
  readonly model: EditableLayerModel;
  readonly metrics: PptxSlideMetrics;
  readonly backgroundImage?: PptxSlideBackgroundImage;
}): string {
  const background = renderBackgroundImage(input.backgroundImage, 2, input.metrics);
  const firstLayerShapeId = input.backgroundImage === undefined ? 2 : 3;
  return xml(
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>${shapeTreeRoot()}${background}${input.model.layers.map((layer, index) => renderLayer(layer, index + firstLayerShapeId, input.metrics)).join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  );
}

function renderBackgroundImage(
  image: PptxSlideBackgroundImage | undefined,
  shapeId: number,
  metrics: PptxSlideMetrics,
): string {
  if (image === undefined) return "";
  return `<p:pic data-deckforge-background="generated-image" data-slide-number="${image.slideNumber}"><p:nvPicPr><p:cNvPr id="${shapeId}" name="slide_${image.slideNumber}_generated_background"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${image.relationshipId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${metrics.widthEmu}" cy="${metrics.heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function renderLayer(layer: ProjectLayer, shapeId: number, metrics: PptxSlideMetrics): string {
  if (!layer.editable) return "";
  if (layer.type === "text") return renderTextShape(layer, shapeId, metrics);
  if (layer.type === "shape") return renderRectShape(layer, shapeId, metrics);
  return "";
}

function renderTextShape(layer: ProjectLayer, shapeId: number, metrics: PptxSlideMetrics): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(layer, metrics)}<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(layer.text ?? "")}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function renderRectShape(layer: ProjectLayer, shapeId: number, metrics: PptxSlideMetrics): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(
    layer,
    metrics,
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
  )}</p:sp>`;
}

function shapeOpen(layer: ProjectLayer, shapeId: number): string {
  return `<p:sp data-deckforge-layer="${escapeXml(layer.id)}"><p:nvSpPr><p:cNvPr id="${shapeId}" name="${escapeXml(layer.id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`;
}

function shapeProperties(layer: ProjectLayer, metrics: PptxSlideMetrics, geometry = ""): string {
  return `<p:spPr><a:xfrm><a:off x="${emu(layer.bounds.x, metrics.scaleX)}" y="${emu(layer.bounds.y, metrics.scaleY)}"/><a:ext cx="${emu(layer.bounds.w, metrics.scaleX)}" cy="${emu(layer.bounds.h, metrics.scaleY)}"/></a:xfrm>${geometry}</p:spPr>`;
}

function emu(value: number, scale: number): number {
  return Math.round(value * scale);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
