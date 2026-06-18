import { hashContent } from "./artifacts";
import type { DeckProject, EditableLayerModel } from "./deck-types";
import {
  contentTypesPart,
  packageRelationshipsPart,
  presentationRelationshipsPart,
  shapeTreeRoot,
  slideLayoutPart,
  slideLayoutRelationshipsPart,
  slideMasterPart,
  slideMasterRelationshipsPart,
  slideRelationshipsPart,
  themePart,
  xml,
} from "./pptx-openxml-parts";
import { assessPptxExportQuality, type ProjectExportPptxQuality } from "./pptx-export-quality";
import { buildStoredZip, bytesToBase64, type StoredZipEntry } from "./zip-store";

type ProjectLayer = EditableLayerModel["layers"][number];

export type PptxFallbackReason =
  | "unsupported_chart_layer"
  | "unsupported_image_layer"
  | "locked_layer";

export type ProjectExportPptxFallback = {
  readonly slideNumber: number;
  readonly layerId: string;
  readonly layerType: ProjectLayer["type"];
  readonly reason: PptxFallbackReason;
};

export type ProjectExportPptxFile = {
  readonly filename: string;
  readonly path: string;
  readonly mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  readonly dataUrl: string;
  readonly hash: string;
  readonly source: "ooxml_pptx_compatibility";
  readonly slideWidthEmu: number;
  readonly slideHeightEmu: number;
  readonly editableTextCount: number;
  readonly editableShapeCount: number;
};

export type ProjectExportPptxResult =
  | {
      readonly kind: "ready";
      readonly file: ProjectExportPptxFile;
      readonly fallbacks: readonly ProjectExportPptxFallback[];
      readonly quality: ProjectExportPptxQuality;
    }
  | {
      readonly kind: "failed";
      readonly message: string;
      readonly fallbacks: readonly ProjectExportPptxFallback[];
    };

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const SLIDE_SIZE_EMU = {
  "16:9": { width: 12_192_000, height: 6_858_000, type: "wide" },
  "4:3": { width: 9_144_000, height: 6_858_000, type: "screen4x3" },
} as const;

type SlideMetrics = {
  readonly widthEmu: number;
  readonly heightEmu: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly type: "wide" | "screen4x3";
};

export function buildPptxCompatibilityExport(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): ProjectExportPptxResult {
  const editableTextCount = countLayers(input.layers, "text");
  const editableShapeCount = countLayers(input.layers, "shape");
  const fallbacks = input.layers.flatMap(fallbacksForModel);
  const metrics = slideMetrics(input.project);
  const quality = assessPptxExportQuality({ layers: input.layers, fallbacks });
  const bytes = renderOpenXmlPackage(input.project, input.layers, metrics);
  const dataUrl = `data:${PPTX_MIME};base64,${bytesToBase64(bytes)}`;
  return {
    kind: "ready",
    file: {
      filename: `${input.project.id}.pptx`,
      path: `projects/${input.project.id}/exports/pptx/${input.project.id}.pptx`,
      mime: PPTX_MIME,
      dataUrl,
      hash: hashContent(dataUrl),
      source: "ooxml_pptx_compatibility",
      slideWidthEmu: metrics.widthEmu,
      slideHeightEmu: metrics.heightEmu,
      editableTextCount,
      editableShapeCount,
    },
    fallbacks,
    quality,
  };
}

function countLayers(models: readonly EditableLayerModel[], type: "text" | "shape"): number {
  return models.reduce(
    (sum, model) =>
      sum + model.layers.filter((layer) => layer.editable && layer.type === type).length,
    0,
  );
}

function fallbacksForModel(model: EditableLayerModel): readonly ProjectExportPptxFallback[] {
  return model.layers.flatMap((layer): readonly ProjectExportPptxFallback[] => {
    const reason = fallbackReason(layer);
    if (!reason) return [];
    return [{ slideNumber: model.slideNumber, layerId: layer.id, layerType: layer.type, reason }];
  });
}

function fallbackReason(layer: ProjectLayer): PptxFallbackReason | undefined {
  if (!layer.editable) return "locked_layer";
  if (layer.type === "chart") return "unsupported_chart_layer";
  if (layer.type === "image") return "unsupported_image_layer";
  return undefined;
}

function renderOpenXmlPackage(
  project: DeckProject,
  models: readonly EditableLayerModel[],
  metrics: SlideMetrics,
): Uint8Array {
  const entries: StoredZipEntry[] = [
    { path: "[Content_Types].xml", content: contentTypesPart(models) },
    { path: "_rels/.rels", content: packageRelationshipsPart() },
    { path: "ppt/presentation.xml", content: presentationPart(models, metrics) },
    { path: "ppt/_rels/presentation.xml.rels", content: presentationRelationshipsPart(models) },
    { path: "ppt/slideLayouts/slideLayout1.xml", content: slideLayoutPart() },
    {
      path: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      content: slideLayoutRelationshipsPart(),
    },
    { path: "ppt/slideMasters/slideMaster1.xml", content: slideMasterPart() },
    {
      path: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      content: slideMasterRelationshipsPart(),
    },
    { path: "ppt/theme/theme1.xml", content: themePart() },
    ...models.flatMap((model): StoredZipEntry[] => [
      { path: `ppt/slides/slide${model.slideNumber}.xml`, content: slidePart(model, metrics) },
      {
        path: `ppt/slides/_rels/slide${model.slideNumber}.xml.rels`,
        content: slideRelationshipsPart(),
      },
    ]),
  ];
  return buildStoredZip(entries);
}

function presentationPart(models: readonly EditableLayerModel[], metrics: SlideMetrics): string {
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

function slidePart(model: EditableLayerModel, metrics: SlideMetrics): string {
  return xml(
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${shapeTreeRoot()}${model.layers.map((layer, index) => renderLayer(layer, index + 2, metrics)).join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  );
}

function renderLayer(layer: ProjectLayer, shapeId: number, metrics: SlideMetrics): string {
  if (!layer.editable) return "";
  if (layer.type === "text") return renderTextShape(layer, shapeId, metrics);
  if (layer.type === "shape") return renderRectShape(layer, shapeId, metrics);
  return "";
}

function renderTextShape(layer: ProjectLayer, shapeId: number, metrics: SlideMetrics): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(layer, metrics)}<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(layer.text ?? "")}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function renderRectShape(layer: ProjectLayer, shapeId: number, metrics: SlideMetrics): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(
    layer,
    metrics,
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
  )}</p:sp>`;
}

function shapeOpen(layer: ProjectLayer, shapeId: number): string {
  return `<p:sp data-deckforge-layer="${escapeXml(layer.id)}"><p:nvSpPr><p:cNvPr id="${shapeId}" name="${escapeXml(layer.id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`;
}

function shapeProperties(layer: ProjectLayer, metrics: SlideMetrics, geometry = ""): string {
  return `<p:spPr><a:xfrm><a:off x="${emu(layer.bounds.x, metrics.scaleX)}" y="${emu(layer.bounds.y, metrics.scaleY)}"/><a:ext cx="${emu(layer.bounds.w, metrics.scaleX)}" cy="${emu(layer.bounds.h, metrics.scaleY)}"/></a:xfrm>${geometry}</p:spPr>`;
}

function slideMetrics(project: DeckProject): SlideMetrics {
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
