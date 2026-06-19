import type { LiveSlideReportLineage } from "./live-generation-report-lineage";
import type { ExecutionMode, ProviderArtifactProvenance } from "./provider-provenance";

export type LiveReportProviderLinkIssueCode =
  | "missing_text_provider_lineage"
  | "missing_image_provider_lineage"
  | "text_provider_lineage_mismatch"
  | "image_provider_lineage_mismatch";

export type LiveReportProviderLinkIssue = {
  readonly code: LiveReportProviderLinkIssueCode;
  readonly slideNumber: number;
  readonly artifactId: string;
  readonly message: string;
};

export function liveReportProviderLinkIssues(input: {
  readonly executionMode: ExecutionMode | undefined;
  readonly providerLineage: readonly ProviderArtifactProvenance[];
  readonly slides: readonly LiveSlideReportLineage[];
}): readonly LiveReportProviderLinkIssue[] {
  if (input.executionMode !== "production") return [];
  const byArtifactId = new Map(input.providerLineage.map((item) => [item.artifactId, item]));
  return input.slides.flatMap((slide) => [
    ...textProviderLinkIssues(slide, byArtifactId.get(slide.textArtifactId)),
    ...imageProviderLinkIssues(slide, byArtifactId.get(slide.imageArtifactId)),
  ]);
}

function textProviderLinkIssues(
  slide: LiveSlideReportLineage,
  artifact: ProviderArtifactProvenance | undefined,
): readonly LiveReportProviderLinkIssue[] {
  if (!artifact) {
    return [
      issue(
        "missing_text_provider_lineage",
        slide,
        slide.textArtifactId,
        "Live report text artifact must exist in provider provenance.",
      ),
    ];
  }
  if (
    artifact.executionMode === "production" &&
    artifact.providerKind === slide.textProviderKind &&
    artifact.turnId === slide.textTurnId &&
    artifact.threadId === slide.textThreadId &&
    artifact.fixture === slide.fixture
  ) {
    return [];
  }
  return [
    issue(
      "text_provider_lineage_mismatch",
      slide,
      slide.textArtifactId,
      "Live report text lineage must match provider turn provenance.",
    ),
  ];
}

function imageProviderLinkIssues(
  slide: LiveSlideReportLineage,
  artifact: ProviderArtifactProvenance | undefined,
): readonly LiveReportProviderLinkIssue[] {
  if (!artifact) {
    return [
      issue(
        "missing_image_provider_lineage",
        slide,
        slide.imageArtifactId,
        "Live report image artifact must exist in provider provenance.",
      ),
    ];
  }
  if (
    artifact.executionMode === "production" &&
    artifact.providerKind === slide.imageProviderKind &&
    artifact.requestId === slide.imageRequestId &&
    artifact.promptVersion === slide.promptVersion &&
    artifact.fixture === slide.fixture
  ) {
    return [];
  }
  return [
    issue(
      "image_provider_lineage_mismatch",
      slide,
      slide.imageArtifactId,
      "Live report image lineage must match provider request provenance.",
    ),
  ];
}

function issue(
  code: LiveReportProviderLinkIssueCode,
  slide: LiveSlideReportLineage,
  artifactId: string,
  message: string,
): LiveReportProviderLinkIssue {
  return { code, slideNumber: slide.slideNumber, artifactId, message };
}
