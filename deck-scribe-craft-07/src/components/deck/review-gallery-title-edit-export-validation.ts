import { hasNonSyntheticEvidencePath } from "@/lib/live-evidence-path";
import type { ReviewGalleryItem } from "./review-gallery-model";
import type { ReviewGalleryLiveCompositionIssue } from "./review-gallery-live-validation";

export interface ReviewGalleryTitleEditReexportEvidence {
  readonly slideNumber: number;
  readonly originalTitle: string;
  readonly editedTitle: string;
  readonly exportedSvgPath: string;
  readonly exportedSvgContent: string;
}

const NON_OBSERVED_EXPORT_PATH_MARKERS = ["template", "sample", "example", "placeholder"] as const;

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
    isObservedTitleEditExportPath(evidence.exportedSvgPath, evidence.slideNumber) &&
    evidence.exportedSvgContent.includes(editedTitle) &&
    !evidence.exportedSvgContent.includes(`>${originalTitle}<`)
  );
}

function isObservedTitleEditExportPath(value: string, slideNumber: number): boolean {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  return (
    hasNonSyntheticEvidencePath(trimmed, [".svg"]) &&
    normalized.startsWith("projects/") &&
    normalized.endsWith(`/exports/svg/slide_${pad2(slideNumber)}.svg`) &&
    !NON_OBSERVED_EXPORT_PATH_MARKERS.some((marker) => normalized.includes(marker))
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
