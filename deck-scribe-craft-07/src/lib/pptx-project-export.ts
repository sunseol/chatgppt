import { hashContent } from "./artifacts";
import type { DeckProject, EditableLayerModel } from "./deck-types";
import {
  contentTypesPart,
  packageRelationshipsPart,
  presentationRelationshipsPart,
  slideLayoutPart,
  slideLayoutRelationshipsPart,
  slideMasterPart,
  slideMasterRelationshipsPart,
  slideRelationshipsPart,
  themePart,
} from "./pptx-openxml-parts";
import { assessPptxExportQuality, type ProjectExportPptxQuality } from "./pptx-export-quality";
import {
  buildPptxSlideBackgroundImages,
  findPptxBackgroundImage,
  PptxBackgroundImageError,
  type PptxSlideBackgroundImage,
} from "./pptx-background-images";
import {
  buildPptxSlideMetrics,
  renderPptxPresentationPart,
  renderPptxSlidePart,
  type PptxSlideMetrics,
} from "./pptx-slide-renderer";
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
  readonly backgroundImageCount: number;
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
type PptxBackgroundImageBuildResult =
  | { readonly kind: "ready"; readonly images: readonly PptxSlideBackgroundImage[] }
  | {
      readonly kind: "failed";
      readonly message: string;
      readonly fallbacks: readonly ProjectExportPptxFallback[];
    };

export function buildPptxCompatibilityExport(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): ProjectExportPptxResult {
  const editableTextCount = countLayers(input.layers, "text");
  const editableShapeCount = countLayers(input.layers, "shape");
  const fallbacks = input.layers.flatMap(fallbacksForModel);
  const metrics = buildPptxSlideMetrics(input.project);
  const quality = assessPptxExportQuality({ layers: input.layers, fallbacks });
  const backgroundImages = pptxBackgroundImages(input.project, input.layers, fallbacks);
  if (backgroundImages.kind === "failed") return backgroundImages;
  const bytes = renderOpenXmlPackage(input.project, input.layers, metrics, backgroundImages.images);
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
      backgroundImageCount: backgroundImages.images.length,
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
  metrics: PptxSlideMetrics,
  backgroundImages: readonly PptxSlideBackgroundImage[],
): Uint8Array {
  const entries: StoredZipEntry[] = [
    { path: "[Content_Types].xml", content: contentTypesPart(models) },
    { path: "_rels/.rels", content: packageRelationshipsPart() },
    { path: "ppt/presentation.xml", content: renderPptxPresentationPart(models, metrics) },
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
      {
        path: `ppt/slides/slide${model.slideNumber}.xml`,
        content: renderPptxSlidePart({
          metrics,
          model,
          backgroundImage: findPptxBackgroundImage(backgroundImages, model.slideNumber),
        }),
      },
      {
        path: `ppt/slides/_rels/slide${model.slideNumber}.xml.rels`,
        content: slideRelationshipsPart(
          slideRelationshipImage(findPptxBackgroundImage(backgroundImages, model.slideNumber)),
        ),
      },
    ]),
    ...backgroundImages.map((image) => ({ path: image.mediaPath, content: image.bytes })),
  ];
  return buildStoredZip(entries);
}

function pptxBackgroundImages(
  project: DeckProject,
  layers: readonly EditableLayerModel[],
  fallbacks: readonly ProjectExportPptxFallback[],
): PptxBackgroundImageBuildResult {
  try {
    return { kind: "ready", images: buildPptxSlideBackgroundImages({ project, layers }) };
  } catch (error) {
    if (error instanceof PptxBackgroundImageError) {
      return {
        kind: "failed",
        message: error.message,
        fallbacks,
      };
    }
    throw error;
  }
}

function slideRelationshipImage(
  image: PptxSlideBackgroundImage | undefined,
): Parameters<typeof slideRelationshipsPart>[0] {
  if (image === undefined) return undefined;
  return {
    relationshipId: image.relationshipId,
    target: image.relationshipTarget,
  };
}
