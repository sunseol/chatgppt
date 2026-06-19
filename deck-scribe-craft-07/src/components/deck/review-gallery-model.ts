import type { GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
export type {
  BackgroundTextDetection,
  ReviewGalleryLiveCompositionIssue,
  ReviewGalleryLiveCompositionIssueCode,
  ReviewGalleryLiveCompositionValidation,
} from "./review-gallery-live-validation";
export { validateReviewGalleryLiveCompositions } from "./review-gallery-live-validation";

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
