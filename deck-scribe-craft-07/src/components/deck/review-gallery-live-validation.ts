import {
  backgroundArtifactTargetsSlide,
  type FinalSlideComposition,
  type FinalSlideOverlayBounds,
} from "@/lib/final-slide-compositor";
import type { ReviewGalleryItem } from "./review-gallery-model";

export type ReviewGalleryLiveCompositionIssueCode =
  | "expected_five_compositions"
  | "duplicate_compositor_slide"
  | "missing_compositor_slide"
  | "missing_compositor_result"
  | "slide_composition_mismatch"
  | "mock_background_artifact"
  | "missing_stored_background_artifact"
  | "invalid_stored_background_artifact_hash"
  | "stored_background_artifact_slide_mismatch"
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

export function validateReviewGalleryLiveCompositions(input: {
  readonly items: readonly ReviewGalleryItem[];
  readonly expectedSlideCount?: number;
  readonly backgroundTextDetections?: readonly BackgroundTextDetection[];
}): ReviewGalleryLiveCompositionValidation {
  const expectedSlideCount = input.expectedSlideCount ?? 5;
  const detections = input.backgroundTextDetections ?? [];
  const issues = [
    ...countIssues(input.items, expectedSlideCount),
    ...slideCoverageIssues(input.items, expectedSlideCount),
    ...input.items.flatMap((item) => liveCompositionIssues(item, detections)),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

function countIssues(
  items: readonly ReviewGalleryItem[],
  expectedSlideCount: number,
): readonly ReviewGalleryLiveCompositionIssue[] {
  return items.length === expectedSlideCount
    ? []
    : [
        {
          code: "expected_five_compositions",
          message: `Review gallery requires ${expectedSlideCount} compositor items.`,
        },
      ];
}

function slideCoverageIssues(
  items: readonly ReviewGalleryItem[],
  expectedSlideCount: number,
): readonly ReviewGalleryLiveCompositionIssue[] {
  const slideNumbers = items.map((item) => item.slide.number);
  const seen = new Set<number>();
  const duplicateIssues = slideNumbers.flatMap((slideNumber) => {
    if (!seen.has(slideNumber)) {
      seen.add(slideNumber);
      return [];
    }
    return [
      {
        code: "duplicate_compositor_slide" as const,
        slideNumber,
        message: "Review gallery must not duplicate compositor slide entries.",
      },
    ];
  });
  const missingIssues = Array.from({ length: expectedSlideCount }, (_, index) => index + 1)
    .filter((slideNumber) => !seen.has(slideNumber))
    .map((slideNumber) => ({
      code: "missing_compositor_slide" as const,
      slideNumber,
      message: "Review gallery is missing a required compositor slide entry.",
    }));
  return [...duplicateIssues, ...missingIssues];
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
  if (!backgroundArtifactTargetsSlide(artifact, composition.slideNumber)) {
    return [
      {
        code: "stored_background_artifact_slide_mismatch",
        slideNumber: composition.slideNumber,
        message: "Stored background artifact must target the compositor slide.",
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
  return REQUIRED_OVERLAY_ROLES.filter(
    (role) =>
      !composition.overlayRoles.includes(role) ||
      !composition.overlayBounds.some((overlay) => overlay.role === role),
  ).map((role) => ({
    code: "missing_editable_overlay",
    slideNumber: composition.slideNumber,
    message: `Missing editable ${role} overlay.`,
  }));
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
