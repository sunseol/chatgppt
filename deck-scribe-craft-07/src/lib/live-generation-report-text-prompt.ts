import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";

export function textPromptIssues(
  slide: LiveSlideReportLineage,
): readonly LiveGenerationReportLineageIssue[] {
  return slide.textPromptVersion.trim()
    ? []
    : [
        {
          code: "missing_text_prompt_version",
          slideNumber: slide.slideNumber,
          message: "Live text lineage requires the prompt version used for the text artifact.",
        },
      ];
}
