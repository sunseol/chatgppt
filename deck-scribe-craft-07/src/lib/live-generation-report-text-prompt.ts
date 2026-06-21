import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import { isCanonicalNonblankValue } from "./live-generation-report-canonical-value";

export function textPromptIssues(
  slide: LiveSlideReportLineage,
): readonly LiveGenerationReportLineageIssue[] {
  return isCanonicalNonblankValue(slide.textPromptVersion)
    ? []
    : [
        {
          code: "missing_text_prompt_version",
          slideNumber: slide.slideNumber,
          message: "Live text lineage requires the prompt version used for the text artifact.",
        },
      ];
}
