import type { ReviewGalleryItem } from "./review-gallery-model";
import type { ReviewGalleryLiveCompositionIssue } from "./review-gallery-live-validation";

export interface ReviewGalleryTitleEditReexportEvidence {
  readonly slideNumber: number;
  readonly originalTitle: string;
  readonly editedTitle: string;
  readonly exportedSvgPath: string;
  readonly exportedSvgContent: string;
}

export function titleEditReexportIssues(
  items: readonly ReviewGalleryItem[],
  evidence: ReviewGalleryTitleEditReexportEvidence | undefined,
): readonly ReviewGalleryLiveCompositionIssue[] {
  if (evidence === undefined) {
    return [
      {
        code: "missing_title_edit_reexport_evidence" as const,
        message: "Live review requires title edit and re-export evidence.",
      },
    ];
  }
  return titleEditEvidenceMatches(items, evidence)
    ? []
    : [
        {
          code: "title_edit_reexport_mismatch" as const,
          slideNumber: evidence.slideNumber,
          message: "Title edit re-export evidence must target the reviewed slide and exported SVG.",
        },
      ];
}

function titleEditEvidenceMatches(
  items: readonly ReviewGalleryItem[],
  evidence: ReviewGalleryTitleEditReexportEvidence,
): boolean {
  const item = items.find((candidate) => candidate.slide.number === evidence.slideNumber);
  const originalTitle = evidence.originalTitle.trim();
  const editedTitle = evidence.editedTitle.trim();
  return (
    item?.composition?.overlayBounds.some((overlay) => overlay.role === "title") === true &&
    originalTitle.length > 0 &&
    editedTitle.length > 0 &&
    originalTitle !== editedTitle &&
    evidence.exportedSvgPath.endsWith(`exports/svg/slide_${pad2(evidence.slideNumber)}.svg`) &&
    evidence.exportedSvgContent.includes(editedTitle) &&
    !evidence.exportedSvgContent.includes(`>${originalTitle}<`)
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
