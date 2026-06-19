import { redactSensitiveText } from "./redaction";
import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";

export function lineageFieldSecretIssues(
  slide: LiveSlideReportLineage,
): readonly LiveGenerationReportLineageIssue[] {
  return lineageFieldValues(slide).some((value) => redactSensitiveText(value) !== value)
    ? [
        {
          code: "secret_leak",
          slideNumber: slide.slideNumber,
          message: "Live report sidecar lineage contains secret-like text.",
        },
      ]
    : [];
}

function lineageFieldValues(slide: LiveSlideReportLineage): readonly string[] {
  return [
    ...slide.sourceIds,
    slide.textArtifactId,
    slide.textTurnId ?? "",
    slide.textThreadId ?? "",
    slide.imageArtifactId,
    slide.imageRequestId ?? "",
    slide.promptVersion,
    slide.compositorHash,
    slide.exportedPngHash,
  ];
}
