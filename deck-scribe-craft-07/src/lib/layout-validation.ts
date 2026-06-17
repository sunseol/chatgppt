import type { LayoutPrototype } from "./deck-types";
import type { LocalLayoutRenderArtifacts } from "./layout-html-renderer";
import { countDomLayerMetadataOmissions } from "./dom-layer-metadata";

export type LayoutValidationIssueCode =
  | "render-missing"
  | "bounds-overflow"
  | "safe-margin-breach"
  | "metadata-missing"
  | "density-high";

export type LayoutValidationIssue = {
  readonly code: LayoutValidationIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
};

export type LayoutValidationReport = {
  readonly status: "passed" | "failed";
  readonly thresholds: {
    readonly requiredRenderSuccessRate: 1;
    readonly maxOverflowSlideRate: 0.05;
    readonly maxSafeMarginBreachRate: 0.05;
  };
  readonly summary: {
    readonly slideCount: number;
    readonly renderedSlideCount: number;
    readonly renderSuccessRate: number;
    readonly overflowSlideCount: number;
    readonly overflowSlideRate: number;
    readonly safeMarginBreachSlideCount: number;
    readonly safeMarginBreachRate: number;
    readonly metadataOmissionCount: number;
  };
  readonly issues: readonly LayoutValidationIssue[];
};

type Bounds = LayoutPrototype["slides"][number]["domLayers"][number]["bounds"];

const THRESHOLDS = {
  requiredRenderSuccessRate: 1,
  maxOverflowSlideRate: 0.05,
  maxSafeMarginBreachRate: 0.05,
} as const;

export function validateLayoutArtifacts(
  artifacts: LocalLayoutRenderArtifacts,
): LayoutValidationReport {
  const slideCount = artifacts.manifest.slideCount;
  const renderedSlideCount = artifacts.slides.length;
  const overflowSlides = artifacts.slides.filter((slide) =>
    slide.domLayers.some((layer) => overflowsCanvas(layer.bounds, artifacts.manifest.canvas)),
  );
  const safeMarginBreachSlides = artifacts.slides.filter((slide) =>
    slide.domLayers.some((layer) => breachesSafeMargin(layer.bounds, artifacts.manifest.canvas)),
  );
  const metadataOmissionCount = countDomLayerMetadataOmissions(artifacts.prototype);
  const issues = [
    ...renderIssues(slideCount, renderedSlideCount),
    ...overflowSlides.map((slide) => issue("bounds-overflow", slide.number)),
    ...safeMarginBreachSlides.map((slide) => issue("safe-margin-breach", slide.number)),
    ...metadataIssues(metadataOmissionCount),
    ...densityIssues(artifacts),
  ];
  const summary = {
    slideCount,
    renderedSlideCount,
    renderSuccessRate: ratio(renderedSlideCount, slideCount),
    overflowSlideCount: overflowSlides.length,
    overflowSlideRate: ratio(overflowSlides.length, slideCount),
    safeMarginBreachSlideCount: safeMarginBreachSlides.length,
    safeMarginBreachRate: ratio(safeMarginBreachSlides.length, slideCount),
    metadataOmissionCount,
  };

  return {
    status: passes(summary) && issues.length === 0 ? "passed" : "failed",
    thresholds: THRESHOLDS,
    summary,
    issues,
  };
}

function passes(summary: LayoutValidationReport["summary"]): boolean {
  return (
    summary.renderSuccessRate === THRESHOLDS.requiredRenderSuccessRate &&
    summary.overflowSlideRate <= THRESHOLDS.maxOverflowSlideRate &&
    summary.safeMarginBreachRate <= THRESHOLDS.maxSafeMarginBreachRate &&
    summary.metadataOmissionCount === 0
  );
}

function renderIssues(
  slideCount: number,
  renderedSlideCount: number,
): readonly LayoutValidationIssue[] {
  if (renderedSlideCount === slideCount) return [];
  return [
    {
      code: "render-missing",
      message: `Rendered ${renderedSlideCount} of ${slideCount} layout slides.`,
    },
  ];
}

function metadataIssues(metadataOmissionCount: number): readonly LayoutValidationIssue[] {
  if (metadataOmissionCount === 0) return [];
  return [
    {
      code: "metadata-missing",
      message: `${metadataOmissionCount} DOM layer metadata fields are missing.`,
    },
  ];
}

function densityIssues(artifacts: LocalLayoutRenderArtifacts): readonly LayoutValidationIssue[] {
  return artifacts.slides
    .filter((slide) => slide.domLayers.length > 8)
    .map((slide) => issue("density-high", slide.number));
}

function overflowsCanvas(bounds: Bounds, canvas: LocalLayoutRenderArtifacts["manifest"]["canvas"]) {
  const overflowsX = bounds.x < 0 || bounds.x + bounds.w > canvas.w;
  const overflowsY = bounds.y < 0 || bounds.y + bounds.h > canvas.h;
  return overflowsX || overflowsY;
}

function breachesSafeMargin(
  bounds: Bounds,
  canvas: LocalLayoutRenderArtifacts["manifest"]["canvas"],
) {
  return (
    bounds.x < canvas.safeMargin.x ||
    bounds.y < canvas.safeMargin.y ||
    canvas.w - (bounds.x + bounds.w) < canvas.safeMargin.x ||
    canvas.h - (bounds.y + bounds.h) < canvas.safeMargin.y
  );
}

function issue(code: LayoutValidationIssueCode, slideNumber: number): LayoutValidationIssue {
  return {
    code,
    slideNumber,
    message:
      code === "bounds-overflow"
        ? `Slide ${slideNumber} has layer bounds outside the canvas.`
        : `Slide ${slideNumber} breaches layout validation policy ${code}.`,
  };
}

function ratio(count: number, total: number): number {
  if (total <= 0) return 0;
  return Number((count / total).toFixed(3));
}
