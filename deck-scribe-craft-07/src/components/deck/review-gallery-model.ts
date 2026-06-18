import type { GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import type { FinalSlideComposition, FinalSlideOverlayBounds } from "@/lib/final-slide-compositor";

export type SlideQaStatus = "passed" | "failed" | "not_run";

export interface ReviewGalleryItem {
  readonly slide: GeneratedSlide;
  readonly title: string;
  readonly qaStatus: SlideQaStatus;
  readonly selected: boolean;
  readonly composition?: FinalSlideComposition;
}

export interface BuildReviewGalleryItemsInput {
  readonly slides: readonly GeneratedSlide[];
  readonly specs: readonly SlideSpec[];
  readonly selectedSlideNumber: number | null;
  readonly qaBySlide?: Readonly<Record<number, SlideQaStatus>>;
  readonly compositions?: readonly FinalSlideComposition[];
}

export const PARTIAL_EDIT_EXPERIMENT_LABEL = "부분 수정 (실험)";

export type ReviewGalleryLiveCompositionIssueCode =
  | "expected_five_compositions"
  | "missing_compositor_result"
  | "slide_composition_mismatch"
  | "mock_background_artifact"
  | "missing_stored_background_artifact"
  | "invalid_stored_background_artifact_hash"
  | "invalid_compositor_preview"
  | "missing_editable_overlay"
  | "text_overlay_collision";

export interface ReviewGalleryLiveCompositionIssue {
  readonly code: ReviewGalleryLiveCompositionIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
}

export type ReviewGalleryLiveCompositionValidation =
  | { readonly kind: "ready" }
  | {
      readonly kind: "blocked";
      readonly issues: readonly ReviewGalleryLiveCompositionIssue[];
    };

export interface BackgroundTextDetection {
  readonly slideNumber: number;
  readonly text: string;
  readonly bounds: FinalSlideOverlayBounds["bounds"];
}

const REQUIRED_OVERLAY_ROLES: readonly string[] = ["title", "body", "chart", "source"];

export function buildReviewGalleryItems(
  input: BuildReviewGalleryItemsInput,
): readonly ReviewGalleryItem[] {
  return input.slides.map((slide) => {
    const composition = input.compositions?.find((item) => item.slideNumber === slide.number);
    return {
      slide,
      title:
        input.specs.find((spec) => spec.number === slide.number)?.title ?? `Slide ${slide.number}`,
      qaStatus: input.qaBySlide?.[slide.number] ?? "not_run",
      selected: input.selectedSlideNumber === slide.number,
      ...(composition === undefined ? {} : { composition }),
    };
  });
}

export function validateReviewGalleryLiveCompositions(input: {
  readonly items: readonly ReviewGalleryItem[];
  readonly expectedSlideCount?: number;
  readonly backgroundTextDetections?: readonly BackgroundTextDetection[];
}): ReviewGalleryLiveCompositionValidation {
  const expectedSlideCount = input.expectedSlideCount ?? 5;
  const detections = input.backgroundTextDetections ?? [];
  const issues = [
    ...(input.items.length === expectedSlideCount
      ? []
      : [
          {
            code: "expected_five_compositions" as const,
            message: `Review gallery requires ${expectedSlideCount} compositor items.`,
          },
        ]),
    ...input.items.flatMap((item) => liveCompositionIssues(item, detections)),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function canAdvanceToVectorize(items: readonly ReviewGalleryItem[]): boolean {
  return (
    items.length > 0 &&
    items.every((item) => item.slide.status === "approved" && item.qaStatus !== "failed")
  );
}

export function approveReviewSlide(
  slides: readonly GeneratedSlide[],
  slideNumber: number,
): readonly GeneratedSlide[] {
  return slides.map((slide) =>
    slide.number === slideNumber ? { ...slide, status: "approved" } : slide,
  );
}

export function requestSelectedSlideRegeneration(
  slides: readonly GeneratedSlide[],
  slideNumber: number,
  note: string,
): readonly GeneratedSlide[] {
  return slides.map((slide) =>
    slide.number === slideNumber
      ? { ...slide, version: slide.version + 1, status: "ready", notes: note }
      : slide,
  );
}

function liveCompositionIssues(
  item: ReviewGalleryItem,
  detections: readonly BackgroundTextDetection[],
): readonly ReviewGalleryLiveCompositionIssue[] {
  const composition = item.composition;
  if (composition === undefined) {
    return [
      {
        code: "missing_compositor_result",
        slideNumber: item.slide.number,
        message: "Review gallery item is missing a compositor result.",
      },
    ];
  }
  return [
    ...compositionIdentityIssues(item, composition),
    ...backgroundIssues(composition),
    ...previewIssues(composition),
    ...overlayIssues(composition),
    ...collisionIssues(composition, detections),
  ];
}

function compositionIdentityIssues(
  item: ReviewGalleryItem,
  composition: FinalSlideComposition,
): readonly ReviewGalleryLiveCompositionIssue[] {
  return composition.slideNumber === item.slide.number
    ? []
    : [
        {
          code: "slide_composition_mismatch",
          slideNumber: item.slide.number,
          message: "Compositor result must match the review slide number.",
        },
      ];
}

function backgroundIssues(
  composition: FinalSlideComposition,
): readonly ReviewGalleryLiveCompositionIssue[] {
  if (composition.backgroundProviderId === "mock") {
    return [
      {
        code: "mock_background_artifact",
        slideNumber: composition.slideNumber,
        message: "Live review must use a real image artifact background.",
      },
    ];
  }
  const artifact = composition.backgroundArtifact;
  if (
    artifact === undefined ||
    !artifact.path.endsWith(".png") ||
    !artifact.hash.startsWith("sha256:")
  ) {
    return [
      {
        code: "missing_stored_background_artifact",
        slideNumber: composition.slideNumber,
        message: "Live review must reference a stored real background image artifact.",
      },
    ];
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(artifact.hash)) {
    return [
      {
        code: "invalid_stored_background_artifact_hash",
        slideNumber: composition.slideNumber,
        message: "Stored background artifact hash must be a full SHA-256 digest.",
      },
    ];
  }
  return [];
}

function previewIssues(
  composition: FinalSlideComposition,
): readonly ReviewGalleryLiveCompositionIssue[] {
  return hasPngSignatureDataUrl(composition.previewPngDataUrl)
    ? []
    : [
        {
          code: "invalid_compositor_preview",
          slideNumber: composition.slideNumber,
          message: "Compositor review preview must contain PNG binary output.",
        },
      ];
}

function overlayIssues(
  composition: FinalSlideComposition,
): readonly ReviewGalleryLiveCompositionIssue[] {
  return REQUIRED_OVERLAY_ROLES.filter((role) => !composition.overlayRoles.includes(role)).map(
    (role) => ({
      code: "missing_editable_overlay",
      slideNumber: composition.slideNumber,
      message: `Missing editable ${role} overlay.`,
    }),
  );
}

function collisionIssues(
  composition: FinalSlideComposition,
  detections: readonly BackgroundTextDetection[],
): readonly ReviewGalleryLiveCompositionIssue[] {
  return detections
    .filter((detection) => detection.slideNumber === composition.slideNumber)
    .filter((detection) =>
      composition.overlayBounds.some((overlay) => overlaps(detection.bounds, overlay.bounds)),
    )
    .map((detection) => ({
      code: "text_overlay_collision",
      slideNumber: detection.slideNumber,
      message: `Detected generated image text collision: ${detection.text}`,
    }));
}

function overlaps(
  left: FinalSlideOverlayBounds["bounds"],
  right: FinalSlideOverlayBounds["bounds"],
): boolean {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}

function hasPngSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo");
}
