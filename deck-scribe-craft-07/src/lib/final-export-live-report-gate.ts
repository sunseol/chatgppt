import {
  validateLiveGenerationReportLineage,
  type LiveGenerationReportLineageIssueCode,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import {
  liveReportProviderLinkIssues,
  type LiveReportProviderLinkIssueCode,
} from "./live-report-provider-link";
import type { ExecutionMode, ProviderArtifactProvenance } from "./provider-provenance";

export type LiveReportGateIssueCode =
  | "missing_live_report_lineage"
  | LiveGenerationReportLineageIssueCode
  | LiveReportProviderLinkIssueCode;

export type LiveReportGateIssue = {
  readonly code: LiveReportGateIssueCode;
  readonly message: string;
  readonly slideNumber?: number;
  readonly artifactId?: string;
};

export function liveReportGateIssues(input: {
  readonly executionMode: ExecutionMode | undefined;
  readonly expectedSlideCount: number;
  readonly providerLineage: readonly ProviderArtifactProvenance[];
  readonly liveReportLineage: readonly LiveSlideReportLineage[] | undefined;
}): readonly LiveReportGateIssue[] {
  if (input.executionMode !== "production") return [];
  if (!input.liveReportLineage || input.liveReportLineage.length === 0) {
    return [
      {
        code: "missing_live_report_lineage",
        message: "Production export requires slide-level live generation report lineage.",
      },
    ];
  }

  const validation = validateLiveGenerationReportLineage({
    executionMode: input.executionMode,
    expectedSlideCount: input.expectedSlideCount,
    slides: input.liveReportLineage,
  });
  if (validation.kind === "blocked") {
    return validation.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      ...(issue.slideNumber === undefined ? {} : { slideNumber: issue.slideNumber }),
    }));
  }

  return liveReportProviderLinkIssues({
    executionMode: input.executionMode,
    providerLineage: input.providerLineage,
    slides: input.liveReportLineage,
  });
}
