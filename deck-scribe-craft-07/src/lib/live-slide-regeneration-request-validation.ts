import type { SlideRevisionRequest } from "./slide-revision-model";
import type { LiveSlideRegenerationIssue } from "./live-slide-regeneration";

export function requestIssues(input: {
  readonly revisionRequest: SlideRevisionRequest;
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}): readonly LiveSlideRegenerationIssue[] {
  return [
    ...mustKeepIssues(input.revisionRequest),
    ...mustChangeIssues(input.revisionRequest),
    ...targetOverlapIssues(input.revisionRequest),
    ...originalBackgroundIssues(input),
  ];
}

function mustKeepIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  return hasTargets(revisionRequest.mustKeep)
    ? []
    : [
        {
          code: "missing_must_keep_targets",
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration requests must include must_keep targets.",
        },
      ];
}

function mustChangeIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  return hasTargets(revisionRequest.mustChange)
    ? []
    : [
        {
          code: "missing_must_change_targets",
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration requests must include must_change targets.",
        },
      ];
}

function targetOverlapIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  const mustKeep = new Set(revisionRequest.mustKeep.map((target) => target.trim()));
  const overlapping = revisionRequest.mustChange.filter((target) => mustKeep.has(target.trim()));
  return overlapping.length === 0
    ? []
    : [
        {
          code: "revision_targets_overlap",
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration cannot keep and change the same target.",
        },
      ];
}

function originalBackgroundIssues(input: {
  readonly revisionRequest: SlideRevisionRequest;
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}): readonly LiveSlideRegenerationIssue[] {
  return [
    ...(input.originalBackgroundArtifactId.trim()
      ? []
      : [
          {
            code: "missing_original_background_artifact" as const,
            slideNumber: input.revisionRequest.slideNumber,
            message: "Live regeneration requires the approved original background artifact id.",
          },
        ]),
    ...(input.originalBackgroundRequestId.trim()
      ? []
      : [
          {
            code: "missing_original_background_request" as const,
            slideNumber: input.revisionRequest.slideNumber,
            message: "Live regeneration requires the approved original provider request id.",
          },
        ]),
  ];
}

function hasTargets(values: readonly string[]): boolean {
  return values.some((value) => value.trim());
}
