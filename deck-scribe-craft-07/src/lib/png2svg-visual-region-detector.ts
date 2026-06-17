import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import type { Png2SvgRegion, Png2SvgSlideOutput } from "./png2svg-adapter-spike";

export type DetectedVisualRegionType = "visual_region" | "image_region";
export type DetectedVisualRegionKind = "panel" | "icon_block" | "photo_like";
export type VisualRegionDetectorStatus = "passed" | "warning";
export type VisualRegionIssueCode =
  | "text-intrusion"
  | "blur-risk"
  | "missing-region"
  | "oversegmentation";

export interface DetectedVisualRegionLayer {
  readonly id: string;
  readonly type: DetectedVisualRegionType;
  readonly regionKind: DetectedVisualRegionKind;
  readonly sourceLayerId: string;
  readonly originalPngPath: string;
  readonly originalPngHash: string;
  readonly bounds: MvpEditableLayer["bounds"];
  readonly confidence: number;
  readonly movable: true;
}

export interface VisualRegionIssue {
  readonly code: VisualRegionIssueCode;
  readonly message: string;
  readonly regionId?: string;
}

export interface VisualRegionDetectorMetrics {
  readonly candidateCount: number;
  readonly acceptedCount: number;
  readonly rejectedForOverlayCollision: number;
  readonly oversegmentedCount: number;
  readonly missingRegionCount: number;
  readonly blurRiskCount: number;
  readonly textIntrusionCount: number;
}

export interface VisualRegionDetectorReport {
  readonly status: VisualRegionDetectorStatus;
  readonly slideNumber: number;
  readonly layers: readonly DetectedVisualRegionLayer[];
  readonly issues: readonly VisualRegionIssue[];
  readonly metrics: VisualRegionDetectorMetrics;
}

export interface DetectPng2SvgVisualRegionsInput {
  readonly slide: Png2SvgSlideOutput;
  readonly overlayModel: MvpEditableLayerModel;
  readonly originalPngHash: string;
  readonly expectedRegionCount: number;
}

const TEXT_INTRUSION_RATIO = 0.2;
const BLUR_RISK_CONFIDENCE = 0.5;
const OVERSEGMENTATION_MULTIPLIER = 2;

export function detectPng2SvgVisualRegions(
  input: DetectPng2SvgVisualRegionsInput,
): VisualRegionDetectorReport {
  const candidates = regionCandidates(input.slide);
  const accepted: DetectedVisualRegionLayer[] = [];
  const issues: VisualRegionIssue[] = [];
  let rejectedForOverlayCollision = 0;

  for (const candidate of candidates) {
    if (collidesWithOverlay(candidate.region, input.overlayModel)) {
      rejectedForOverlayCollision += 1;
      issues.push({
        code: "text-intrusion",
        regionId: candidate.region.id,
        message: `${candidate.region.id} overlaps an editable overlay region.`,
      });
      continue;
    }
    if (candidate.region.confidence < BLUR_RISK_CONFIDENCE) {
      issues.push({
        code: "blur-risk",
        regionId: candidate.region.id,
        message: `${candidate.region.id} has low visual-region confidence.`,
      });
    }
    accepted.push(toDetectedLayer(candidate, input.slide.pngPath, input.originalPngHash));
  }

  const missingRegionCount = Math.max(0, input.expectedRegionCount - accepted.length);
  if (missingRegionCount > 0) {
    issues.push({
      code: "missing-region",
      message: `${missingRegionCount} expected visual regions were not accepted.`,
    });
  }
  const oversegmentedCount = Math.max(
    0,
    candidates.length - input.expectedRegionCount * OVERSEGMENTATION_MULTIPLIER,
  );
  if (oversegmentedCount > 0) {
    issues.push({
      code: "oversegmentation",
      message: `${oversegmentedCount} extra visual region candidates were detected.`,
    });
  }

  return {
    status: issues.length > 0 ? "warning" : "passed",
    slideNumber: input.slide.slideNumber,
    layers: accepted,
    issues,
    metrics: {
      candidateCount: candidates.length,
      acceptedCount: accepted.length,
      rejectedForOverlayCollision,
      oversegmentedCount,
      missingRegionCount,
      blurRiskCount: issues.filter((issue) => issue.code === "blur-risk").length,
      textIntrusionCount: issues.filter((issue) => issue.code === "text-intrusion").length,
    },
  };
}

function regionCandidates(slide: Png2SvgSlideOutput): readonly {
  readonly region: Png2SvgRegion;
  readonly sourceKind: "visual_region" | "raster_region";
}[] {
  return [
    ...slide.visualRegions.map((region) => regionCandidate(region, "visual_region")),
    ...slide.rasterRegions.map((region) => regionCandidate(region, "raster_region")),
  ];
}

function regionCandidate(region: Png2SvgRegion, sourceKind: "visual_region" | "raster_region") {
  return { region, sourceKind };
}

function toDetectedLayer(
  candidate: {
    readonly region: Png2SvgRegion;
    readonly sourceKind: "visual_region" | "raster_region";
  },
  originalPngPath: string,
  originalPngHash: string,
): DetectedVisualRegionLayer {
  const sourceLayerId = `png2svg.${candidate.sourceKind}.${candidate.region.id}`;
  return {
    id: `region_${sourceLayerId.replaceAll(".", "_")}`,
    type: candidate.sourceKind === "raster_region" ? "image_region" : "visual_region",
    regionKind: regionKind(candidate.region, candidate.sourceKind),
    sourceLayerId,
    originalPngPath,
    originalPngHash,
    bounds: candidate.region.bounds,
    confidence: candidate.region.confidence,
    movable: true,
  };
}

function regionKind(
  region: Png2SvgRegion,
  sourceKind: "visual_region" | "raster_region",
): DetectedVisualRegionKind {
  if (sourceKind === "raster_region") return "photo_like";
  if (/icon/i.test(region.id) || area(region.bounds) <= 22_500) return "icon_block";
  return "panel";
}

function collidesWithOverlay(region: Png2SvgRegion, overlayModel: MvpEditableLayerModel): boolean {
  return overlayModel.layers
    .filter((layer) => layer.editable && (layer.type === "text" || layer.type === "chart"))
    .some((layer) => intersectionRatio(region.bounds, layer.bounds) > TEXT_INTRUSION_RATIO);
}

function intersectionRatio(
  regionBounds: MvpEditableLayer["bounds"],
  overlayBounds: MvpEditableLayer["bounds"],
): number {
  const left = Math.max(regionBounds.x, overlayBounds.x);
  const top = Math.max(regionBounds.y, overlayBounds.y);
  const right = Math.min(regionBounds.x + regionBounds.w, overlayBounds.x + overlayBounds.w);
  const bottom = Math.min(regionBounds.y + regionBounds.h, overlayBounds.y + overlayBounds.h);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const regionArea = area(regionBounds);
  return regionArea === 0 ? 0 : (width * height) / regionArea;
}

function area(bounds: MvpEditableLayer["bounds"]): number {
  return bounds.w * bounds.h;
}
