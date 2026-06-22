import type { ExecutionMode } from "./provider-provenance";
import type {
  LiveGenerationReportLineageIssue,
  LiveSlideReportLineage,
} from "./live-generation-report-lineage";

export function productionContaminationIssues(
  executionMode: ExecutionMode,
  slide: LiveSlideReportLineage,
): readonly LiveGenerationReportLineageIssue[] {
  if (executionMode !== "production") return [];
  return [
    ...(slide.textProviderKind === "mock" || slide.imageProviderKind === "mock"
      ? [
          {
            code: "mock_lineage_contamination" as const,
            slideNumber: slide.slideNumber,
            message: "Production live report cannot include mock provider artifacts.",
          },
        ]
      : []),
    ...(hasMockExportMarker(slide.projectFileContent)
      ? [
          {
            code: "mock_lineage_contamination" as const,
            slideNumber: slide.slideNumber,
            message: "Production project export cannot retain mock-mode markers.",
          },
        ]
      : []),
    ...(slide.fixture
      ? [
          {
            code: "fixture_lineage_contamination" as const,
            slideNumber: slide.slideNumber,
            message: "Production live report cannot include fixture artifacts.",
          },
        ]
      : []),
    ...(hasFixtureExportMarker(slide.projectFileContent)
      ? [
          {
            code: "fixture_lineage_contamination" as const,
            slideNumber: slide.slideNumber,
            message: "Production project export cannot retain fixture markers.",
          },
        ]
      : []),
  ];
}

function hasMockExportMarker(value: string): boolean {
  return /\bMOCK MODE\b/i.test(value) || /"providerKind"\s*:\s*"mock"/i.test(value);
}

const hasFixtureExportMarker = (value: string): boolean =>
  /"fixture"\s*:\s*true/i.test(value) || /\bfixtures\//i.test(value);
