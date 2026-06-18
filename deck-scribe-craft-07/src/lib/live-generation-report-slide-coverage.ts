import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";

export function slideCoverageIssues(
  expectedSlideCount: number | undefined,
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  if (expectedSlideCount === undefined) return [];
  const present = new Set(slides.map((slide) => slide.slideNumber));
  const missing = expectedSlideNumbers(expectedSlideCount).filter(
    (slideNumber) => !present.has(slideNumber),
  );
  return missing.map((slideNumber) => ({
    code: "missing_slide_lineage",
    slideNumber,
    message: "Production generation report lineage must include every project slide.",
  }));
}

function expectedSlideNumbers(expectedSlideCount: number): readonly number[] {
  return Array.from({ length: Math.max(0, expectedSlideCount) }, (_, index) => index + 1);
}
