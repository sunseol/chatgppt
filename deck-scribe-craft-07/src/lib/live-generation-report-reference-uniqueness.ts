import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import { liveReportImageTurnId } from "./live-generation-report-image-turn";

export function lineageReferenceIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return [
    ...blankSourceTraceIssues(slides),
    ...duplicateSourceTraceIssues(slides),
    ...duplicateSlideIssues(slides),
    ...duplicateImageArtifactIssues(slides),
    ...duplicateImageRequestIssues(slides),
    ...duplicateExportHashIssues(slides),
  ];
}

function blankSourceTraceIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return slides
    .filter((slide) => hasBlankAndNonblankValues(slide.sourceIds))
    .map((slide) => ({
      code: "missing_source_trace" as const,
      slideNumber: slide.slideNumber,
      message: "Live report source ids cannot include blank entries.",
    }));
}

function duplicateSourceTraceIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return slides
    .filter((slide) => duplicateValues(slide.sourceIds).length > 0)
    .map((slide) => ({
      code: "missing_source_trace" as const,
      slideNumber: slide.slideNumber,
      message: "Live report source ids cannot include duplicate entries.",
    }));
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
  return duplicateValues(slides.map((slide) => liveReportImageTurnId(slide) ?? "")).map(
    (requestId) => ({
      code: "duplicate_image_request",
      message: `Image turn/request ${requestId} cannot satisfy multiple slide lineage rows.`,
    }),
  );
}

function duplicateExportHashIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return duplicateValues(slides.map((slide) => slide.exportedPngHash)).map((exportedPngHash) => ({
    code: "duplicate_export_hash",
    message: `Exported PNG hash ${exportedPngHash} cannot satisfy multiple slide lineage rows.`,
  }));
}

function duplicateImageArtifactIssues(
  slides: readonly LiveSlideReportLineage[],
): readonly LiveGenerationReportLineageIssue[] {
  return duplicateValues(slides.map((slide) => slide.imageArtifactId)).map((artifactId) => ({
    code: "duplicate_image_artifact",
    message: `Image artifact ${artifactId} cannot satisfy multiple slide lineage rows.`,
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

function hasBlankAndNonblankValues(values: readonly string[]): boolean {
  return values.some((value) => !value.trim()) && values.some((value) => value.trim());
}
