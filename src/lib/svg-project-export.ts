import { hashContent } from "./artifacts";
import type { DeckProject, EditableLayerModel, LayoutPrototype } from "./deck-types";
import {
  estimateEditableSvgSimilarity,
  renderEditableSvg,
  type EditableSvgSimilarityReport,
  type SvgRegionLayer,
} from "./editable-svg-renderer";
import {
  type EditabilityQualityLevel,
  MvpEditableLayerModelSchema,
  type MvpEditableLayer,
  type MvpEditableLayerModel,
} from "./editable-layer-model";

type LayoutSlide = LayoutPrototype["slides"][number];
type LayoutDomLayer = LayoutSlide["domLayers"][number];
type ProjectLayer = EditableLayerModel["layers"][number];

type ProjectExportSvgFileBase = {
  readonly slideNumber: number;
  readonly filename: string;
  readonly path: string;
  readonly mime: "image/svg+xml";
  readonly content: string;
  readonly hash: string;
  readonly editableObjectCount: number;
  readonly renderedLayerCount: number;
  readonly similarity: EditableSvgSimilarityReport;
};

export type ProjectExportSvgFile = ProjectExportSvgFileBase & {
  readonly source: "native_editable_svg";
};

export type ProjectExportHybridSvgFile = ProjectExportSvgFileBase & {
  readonly source: "hybrid_compatibility_svg";
  readonly lockedBackground: boolean;
  readonly visualRegionCount: number;
};

export function buildNativeSvgFiles(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): readonly ProjectExportSvgFile[] {
  const design = input.project.design;
  const layout = input.project.layout;
  if (!design || !layout) return [];

  return input.layers.map((model): ProjectExportSvgFile => {
    const slide = layout.slides.find((candidate) => candidate.number === model.slideNumber);
    const mvpModel = toMvpEditableLayerModel(model, slide);
    const rendered = renderEditableSvg({
      canvas: { width: design.canvas.w, height: design.canvas.h },
      model: mvpModel,
      design,
      backgroundImageDataUrl: slide?.layoutPngDataUrl,
    });
    const similarity = estimateEditableSvgSimilarity({
      sourceLayerCount: sourceLayerCount(model, slide),
      renderedLayerCount: rendered.renderedLayerCount,
      thresholdPercent: 10,
    });
    const padded = String(model.slideNumber).padStart(2, "0");
    return {
      slideNumber: model.slideNumber,
      filename: `slide_${padded}.svg`,
      path: `projects/${input.project.id}/exports/svg/slide_${padded}.svg`,
      mime: "image/svg+xml",
      content: rendered.svg,
      hash: hashContent(rendered.svg),
      source: "native_editable_svg",
      editableObjectCount: rendered.editableObjectCount,
      renderedLayerCount: rendered.renderedLayerCount,
      similarity,
    };
  });
}

export function buildHybridSvgFiles(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): readonly ProjectExportHybridSvgFile[] {
  const design = input.project.design;
  const layout = input.project.layout;
  if (!design || !layout) return [];

  return input.layers.map((model): ProjectExportHybridSvgFile => {
    const slide = layout.slides.find((candidate) => candidate.number === model.slideNumber);
    const mvpModel = toMvpEditableLayerModel(model, slide);
    const extensionLayers = toHybridExtensionLayers(model);
    const rendered = renderEditableSvg({
      canvas: { width: design.canvas.w, height: design.canvas.h },
      model: mvpModel,
      design,
      backgroundImageDataUrl: slide?.layoutPngDataUrl,
      extensionLayers,
      exportMode: "hybrid-safe",
    });
    const similarity = estimateEditableSvgSimilarity({
      sourceLayerCount: sourceLayerCount(model, slide),
      renderedLayerCount: rendered.renderedLayerCount,
      thresholdPercent: 5,
    });
    const padded = String(model.slideNumber).padStart(2, "0");
    return {
      slideNumber: model.slideNumber,
      filename: `slide_${padded}.hybrid.svg`,
      path: `projects/${input.project.id}/exports/svg/hybrid/slide_${padded}.hybrid.svg`,
      mime: "image/svg+xml",
      content: rendered.svg,
      hash: hashContent(rendered.svg),
      source: "hybrid_compatibility_svg",
      editableObjectCount: rendered.editableObjectCount,
      renderedLayerCount: rendered.renderedLayerCount,
      similarity,
      lockedBackground: slide?.layoutPngDataUrl !== undefined,
      visualRegionCount: extensionLayers.length,
    };
  });
}

function toMvpEditableLayerModel(
  model: EditableLayerModel,
  slide: LayoutSlide | undefined,
): MvpEditableLayerModel {
  return MvpEditableLayerModelSchema.parse({
    slideNumber: model.slideNumber,
    layers: model.layers.map((layer) => toMvpEditableLayer(layer, slide)),
  });
}

function toMvpEditableLayer(layer: ProjectLayer, slide: LayoutSlide | undefined): MvpEditableLayer {
  const domLayer = findDomLayer(layer, slide);
  const sourceLayerId = inferSourceLayerId(layer.id) ?? domLayer?.id ?? layer.id;
  const qualityLevel: EditabilityQualityLevel = sourceLayerId.startsWith("png2svg.")
    ? "level3"
    : "level2";
  const base = {
    id: layer.id,
    sourceLayerId,
    type: layer.type,
    role: layer.role,
    bounds: layer.bounds,
    editable: layer.editable,
    sourceIds: domLayer?.sourceIds ?? [],
    datasetIds: domLayer?.datasetIds ?? [],
    sourceMapIds: [sourceLayerId],
    qualityLevel,
  };
  if (layer.text === undefined) return base;
  return { ...base, text: layer.text };
}

function findDomLayer(
  layer: ProjectLayer,
  slide: LayoutSlide | undefined,
): LayoutDomLayer | undefined {
  if (!slide) return undefined;
  return (
    slide.domLayers.find((candidate) => candidate.id === layer.id) ??
    slide.domLayers.find(
      (candidate) => candidate.role === layer.role && boundsEqual(candidate.bounds, layer.bounds),
    ) ??
    slide.domLayers.find((candidate) => candidate.role === layer.role && candidate.editable)
  );
}

function boundsEqual(left: ProjectLayer["bounds"], right: ProjectLayer["bounds"]): boolean {
  return left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h;
}

function sourceLayerCount(model: EditableLayerModel, slide: LayoutSlide | undefined): number {
  return Math.max(model.layers.length, slide?.domLayers.length ?? 0);
}

function toHybridExtensionLayers(model: EditableLayerModel): readonly SvgRegionLayer[] {
  return model.layers.flatMap((layer): readonly SvgRegionLayer[] => {
    const sourceLayerId = inferSourceLayerId(layer.id) ?? layer.id;
    if (sourceLayerId.startsWith("png2svg.visual_region.")) {
      return [
        {
          id: sourceLayerId.replaceAll(".", "_"),
          type: "vector_region",
          sourceLayerId,
          bounds: layer.bounds,
        },
      ];
    }
    if (sourceLayerId.startsWith("png2svg.raster_region.")) {
      return [
        {
          id: sourceLayerId.replaceAll(".", "_"),
          type: "image_region",
          sourceLayerId,
          bounds: layer.bounds,
        },
      ];
    }
    return [];
  });
}

function inferSourceLayerId(layerId: string): string | undefined {
  if (layerId.startsWith("png2svg.")) return layerId;
  return (
    inferWithPrefix(layerId, "editable_png2svg_text_", "png2svg.text.") ??
    inferWithPrefix(layerId, "editable_png2svg_visual_region_", "png2svg.visual_region.") ??
    inferWithPrefix(layerId, "editable_png2svg_raster_region_", "png2svg.raster_region.")
  );
}

function inferWithPrefix(
  layerId: string,
  idPrefix: string,
  sourcePrefix: string,
): string | undefined {
  if (!layerId.startsWith(idPrefix)) return undefined;
  const suffix = layerId.slice(idPrefix.length);
  if (suffix.length === 0) return undefined;
  return `${sourcePrefix}${suffix}`;
}
