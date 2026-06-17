import { hashContent } from "./artifacts";
import type { DeckProject, EditableLayerModel } from "./deck-types";

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
  readonly editableTextCount: number;
  readonly editableShapeCount: number;
};

export type ProjectExportPptxResult =
  | {
      readonly kind: "ready";
      readonly file: ProjectExportPptxFile;
      readonly fallbacks: readonly ProjectExportPptxFallback[];
    }
  | {
      readonly kind: "failed";
      readonly message: string;
      readonly fallbacks: readonly ProjectExportPptxFallback[];
    };

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const EMU_PER_PIXEL = 9_525;

export function buildPptxCompatibilityExport(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): ProjectExportPptxResult {
  const editableTextCount = countLayers(input.layers, "text");
  const editableShapeCount = countLayers(input.layers, "shape");
  const fallbacks = input.layers.flatMap(fallbacksForModel);
  const content = renderFlatOpcPackage(input.project, input.layers);
  const dataUrl = `data:${PPTX_MIME};base64,${base64Utf8(content)}`;
  return {
    kind: "ready",
    file: {
      filename: `${input.project.id}.pptx`,
      path: `projects/${input.project.id}/exports/pptx/${input.project.id}.pptx`,
      mime: PPTX_MIME,
      dataUrl,
      hash: hashContent(dataUrl),
      source: "ooxml_pptx_compatibility",
      editableTextCount,
      editableShapeCount,
    },
    fallbacks,
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

function renderFlatOpcPackage(project: DeckProject, models: readonly EditableLayerModel[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage" data-deckforge-project="${escapeXml(project.id)}">`,
    contentTypesPart(),
    relationshipPart(models),
    presentationPart(models),
    ...models.map(slidePart),
    `</pkg:package>`,
  ].join("");
}

function contentTypesPart(): string {
  return `<pkg:part pkg:name="/[Content_Types].xml" pkg:contentType="application/xml"><pkg:xmlData><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types></pkg:xmlData></pkg:part>`;
}

function relationshipPart(models: readonly EditableLayerModel[]): string {
  const rels = models
    .map(
      (model, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${model.slideNumber}.xml"/>`,
    )
    .join("");
  return `<pkg:part pkg:name="/ppt/_rels/presentation.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships></pkg:xmlData></pkg:part>`;
}

function presentationPart(models: readonly EditableLayerModel[]): string {
  const slides = models
    .map(
      (model, index) =>
        `<p:sldId id="${256 + index}" r:id="rId${index + 1}" data-slide-number="${model.slideNumber}"/>`,
    )
    .join("");
  return `<pkg:part pkg:name="/ppt/presentation.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"><pkg:xmlData><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${slides}</p:sldIdLst></p:presentation></pkg:xmlData></pkg:part>`;
}

function slidePart(model: EditableLayerModel): string {
  return `<pkg:part pkg:name="/ppt/slides/slide${model.slideNumber}.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"><pkg:xmlData><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${model.layers.map((layer, index) => renderLayer(layer, index + 2)).join("")}</p:spTree></p:cSld></p:sld></pkg:xmlData></pkg:part>`;
}

function renderLayer(layer: ProjectLayer, shapeId: number): string {
  if (!layer.editable) return "";
  if (layer.type === "text") return renderTextShape(layer, shapeId);
  if (layer.type === "shape") return renderRectShape(layer, shapeId);
  return "";
}

function renderTextShape(layer: ProjectLayer, shapeId: number): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(layer)}<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(layer.text ?? "")}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function renderRectShape(layer: ProjectLayer, shapeId: number): string {
  return `${shapeOpen(layer, shapeId)}${shapeProperties(
    layer,
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
  )}</p:sp>`;
}

function shapeOpen(layer: ProjectLayer, shapeId: number): string {
  return `<p:sp data-deckforge-layer="${escapeXml(layer.id)}"><p:nvSpPr><p:cNvPr id="${shapeId}" name="${escapeXml(layer.id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`;
}

function shapeProperties(layer: ProjectLayer, geometry = ""): string {
  return `<p:spPr><a:xfrm><a:off x="${emu(layer.bounds.x)}" y="${emu(layer.bounds.y)}"/><a:ext cx="${emu(layer.bounds.w)}" cy="${emu(layer.bounds.h)}"/></a:xfrm>${geometry}</p:spPr>`;
}

function emu(value: number): number {
  return Math.round(value * EMU_PER_PIXEL);
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 4096) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 4096));
  }
  return btoa(binary);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
