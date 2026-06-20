import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import type { ReviewGalleryItem } from "./review-gallery-model";
import type { ReviewGalleryLiveCompositionIssue } from "./review-gallery-live-validation";

export function compositorPreviewIdentityIssues(
  items: readonly ReviewGalleryItem[],
): readonly ReviewGalleryLiveCompositionIssue[] {
  const seenSlides = new Set<number>();
  const seenPreviews = new Set<string>();
  return items.flatMap((item) => {
    if (seenSlides.has(item.slide.number)) return [];
    seenSlides.add(item.slide.number);
    const composition = item.composition;
    if (composition === undefined) return [];
    if (!seenPreviews.has(composition.previewPngDataUrl)) {
      seenPreviews.add(composition.previewPngDataUrl);
      return [];
    }
    return [
      {
        code: "duplicate_compositor_preview" as const,
        slideNumber: item.slide.number,
        message: "Review gallery compositor previews must be distinct per slide.",
      },
    ];
  });
}

export function compositorPreviewIssues(
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

function hasPngSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo");
}
