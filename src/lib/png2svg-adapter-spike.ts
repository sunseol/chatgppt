import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import type { SvgRegionLayer } from "./editable-svg-renderer";

export type Png2SvgOcrEngine = "none" | "windows" | "external";
export type Png2SvgRegionKind = "vector" | "raster";
export type Png2SvgAdapterStatus = "ready" | "blocked";
export type Png2SvgAdapterIssueCode = "figma-import-present" | "fixture-count-low";

export interface Png2SvgBounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Png2SvgTextCandidate {
  readonly id: string;
  readonly text: string;
  readonly bounds: Png2SvgBounds;
  readonly confidence: number;
}

export interface Png2SvgRegion {
  readonly id: string;
  readonly kind: Png2SvgRegionKind;
  readonly bounds: Png2SvgBounds;
  readonly confidence: number;
  readonly pathData?: string;
  readonly imageDataUrl?: string;
}

export interface Png2SvgSlideOutput {
  readonly slideNumber: number;
  readonly pngPath: string;
  readonly svgPath: string;
  readonly hybridSvgPath?: string;
  readonly textCandidates: readonly Png2SvgTextCandidate[];
  readonly visualRegions: readonly Png2SvgRegion[];
  readonly rasterRegions: readonly Png2SvgRegion[];
}

export interface Png2SvgSpikeManifest {
  readonly runId: string;
  readonly ocrEngine: Png2SvgOcrEngine;
  readonly figmaImportPresent: boolean;
  readonly slides: readonly Png2SvgSlideOutput[];
}

export interface Png2SvgAdapterIssue {
  readonly code: Png2SvgAdapterIssueCode;
  readonly message: string;
}

export interface Png2SvgFixtureDiff {
  readonly slideNumber: number;
  readonly pngPath: string;
  readonly svgPath: string;
  readonly hybridSvgPath?: string;
  readonly metadataComparable: boolean;
  readonly visualDiffStatus: "stubbed";
}

export interface Png2SvgLicenseHandoff {
  readonly targetTicket: "DF-156";
  readonly status: "blocked_for_bundle";
  readonly reason: string;
}

export interface Png2SvgAdapterSpikeReport {
  readonly runId: string;
  readonly status: Png2SvgAdapterStatus;
  readonly fixtureCount: number;
  readonly ocrEngine: Png2SvgOcrEngine;
  readonly figmaImportExcluded: boolean;
  readonly issues: readonly Png2SvgAdapterIssue[];
  readonly fixtureDiffs: readonly Png2SvgFixtureDiff[];
  readonly limitations: readonly string[];
  readonly licenseHandoff: Png2SvgLicenseHandoff;
}

export interface Png2SvgExtensionLayers {
  readonly slideNumber: number;
  readonly layers: readonly SvgRegionLayer[];
}

export interface Png2SvgAdapterSpikeResult {
  readonly status: Png2SvgAdapterStatus;
  readonly editableDrafts: readonly MvpEditableLayerModel[];
  readonly extensionLayersBySlide: readonly Png2SvgExtensionLayers[];
  readonly report: Png2SvgAdapterSpikeReport;
}

const EXPECTED_FIXTURE_COUNT = 10;

export function adaptPng2SvgSpikeOutput(manifest: Png2SvgSpikeManifest): Png2SvgAdapterSpikeResult {
  const issues = adapterIssues(manifest);
  const status: Png2SvgAdapterStatus = issues.length > 0 ? "blocked" : "ready";
  return {
    status,
    editableDrafts: status === "blocked" ? [] : manifest.slides.map(toEditableDraft),
    extensionLayersBySlide:
      status === "blocked" ? [] : manifest.slides.map(toExtensionLayersBySlide),
    report: {
      runId: manifest.runId,
      status,
      fixtureCount: manifest.slides.length,
      ocrEngine: manifest.ocrEngine,
      figmaImportExcluded: !manifest.figmaImportPresent,
      issues,
      fixtureDiffs: manifest.slides.map(toFixtureDiff),
      limitations: limitationsForManifest(manifest),
      licenseHandoff: {
        targetTicket: "DF-156",
        status: "blocked_for_bundle",
        reason: "PNG2SVG candidate is unlicensed in current evidence; use spike metadata only.",
      },
    },
  };
}

function adapterIssues(manifest: Png2SvgSpikeManifest): readonly Png2SvgAdapterIssue[] {
  const issues: Png2SvgAdapterIssue[] = [];
  if (manifest.figmaImportPresent) {
    issues.push({
      code: "figma-import-present",
      message: "Figma import packages are excluded from the MVP PNG2SVG adapter path.",
    });
  }
  if (manifest.slides.length < EXPECTED_FIXTURE_COUNT) {
    issues.push({
      code: "fixture-count-low",
      message: `Expected ${EXPECTED_FIXTURE_COUNT} PNG fixtures for the spike report.`,
    });
  }
  return issues;
}

function toEditableDraft(slide: Png2SvgSlideOutput): MvpEditableLayerModel {
  return {
    slideNumber: slide.slideNumber,
    layers: [
      ...slide.textCandidates.map(toTextLayer),
      ...slide.visualRegions.map((region) => toRegionLayer(region, "visual_region")),
      ...slide.rasterRegions.map((region) => toRegionLayer(region, "raster_region")),
    ],
  };
}

function toTextLayer(candidate: Png2SvgTextCandidate): MvpEditableLayer {
  const sourceLayerId = `png2svg.text.${candidate.id}`;
  return {
    id: `editable_${sourceLayerId.replaceAll(".", "_")}`,
    sourceLayerId,
    type: "text",
    role: "text_candidate",
    bounds: candidate.bounds,
    editable: true,
    text: candidate.text,
    sourceIds: [],
    datasetIds: [],
    sourceMapIds: [sourceLayerId],
    qualityLevel: "level3",
  };
}

function toRegionLayer(
  region: Png2SvgRegion,
  sourceKind: "visual_region" | "raster_region",
): MvpEditableLayer {
  const sourceLayerId = `png2svg.${sourceKind}.${region.id}`;
  return {
    id: `editable_${sourceLayerId.replaceAll(".", "_")}`,
    sourceLayerId,
    type: region.kind === "vector" ? "shape" : "image",
    role: sourceKind,
    bounds: region.bounds,
    editable: true,
    sourceIds: [],
    datasetIds: [],
    sourceMapIds: [sourceLayerId],
    qualityLevel: "level3",
  };
}

function toExtensionLayersBySlide(slide: Png2SvgSlideOutput): Png2SvgExtensionLayers {
  return {
    slideNumber: slide.slideNumber,
    layers: [
      ...slide.visualRegions.map((region) => toExtensionLayer(region, "visual_region")),
      ...slide.rasterRegions.map((region) => toExtensionLayer(region, "raster_region")),
    ],
  };
}

function toExtensionLayer(
  region: Png2SvgRegion,
  sourceKind: "visual_region" | "raster_region",
): SvgRegionLayer {
  const sourceLayerId = `png2svg.${sourceKind}.${region.id}`;
  return {
    id: sourceLayerId.replaceAll(".", "_"),
    type: region.kind === "vector" ? "vector_region" : "image_region",
    sourceLayerId,
    bounds: region.bounds,
    ...(region.pathData === undefined ? {} : { pathData: region.pathData }),
    ...(region.imageDataUrl === undefined ? {} : { imageDataUrl: region.imageDataUrl }),
  };
}

function toFixtureDiff(slide: Png2SvgSlideOutput): Png2SvgFixtureDiff {
  return {
    slideNumber: slide.slideNumber,
    pngPath: slide.pngPath,
    svgPath: slide.svgPath,
    ...(slide.hybridSvgPath === undefined ? {} : { hybridSvgPath: slide.hybridSvgPath }),
    metadataComparable: true,
    visualDiffStatus: "stubbed",
  };
}

function limitationsForManifest(manifest: Png2SvgSpikeManifest): readonly string[] {
  return [
    ...(manifest.ocrEngine === "none"
      ? ["OCR unavailable; text candidates are review hints only."]
      : []),
    "Visual diff is metadata-only in this spike; pixel comparison remains future work.",
    "PNG2SVG source code and Figma plugin are not bundled in MVP.",
  ];
}
