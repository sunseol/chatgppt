import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";

export function lineageReferenceIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return [...duplicateSlideIssues(slides), ...duplicateImageRequestIssues(slides)];
}

function duplicateSlideIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return duplicateNumbers(slides.map((slide) => slide.slideNumber)).map((slideNumber) => ({
    code: "duplicate_slide_lineage",
    slideNumber,
    message: "Production generation report lineage must include one row per slide.",
  }));
}

function duplicateImageRequestIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return duplicateValues(slides.map((slide) => slide.imageRequestId ?? "")).map((requestId) => ({
    code: "duplicate_image_request",
    message: `Image request ${requestId} cannot satisfy multiple slide lineage rows.`,
  }));
}

function duplicateNumbers(values: readonly number[]): readonly number[] {
  return duplicateValues(values.map(String)).map(Number);
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates];
}
