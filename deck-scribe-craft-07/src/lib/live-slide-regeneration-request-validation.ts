import type { SlideRevisionRequest } from "./slide-revision-model";
import type { LiveSlideRegenerationIssue } from "./live-slide-regeneration";

export function requestIssues(input: {
  readonly revisionRequest: SlideRevisionRequest;
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}): readonly LiveSlideRegenerationIssue[] {
  return [
    ...editInstructionIssues(input.revisionRequest),
    ...mustKeepIssues(input.revisionRequest),
    ...mustChangeIssues(input.revisionRequest),
    ...blankTargetIssues(input.revisionRequest),
    ...targetCanonicalIssues(input.revisionRequest),
    ...duplicateTargetIssues(input.revisionRequest),
    ...targetOverlapIssues(input.revisionRequest),
    ...originalBackgroundIssues(input),
    ...originalBackgroundCanonicalIssues(input),
  ];
}

function editInstructionIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  return revisionRequest.editInstruction.trim()
    ? []
    : [
        {
          code: "missing_edit_instruction" as const,
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration requests must include an edit instruction.",
        },
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

function blankTargetIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  const hasBlankTarget = [...revisionRequest.mustKeep, ...revisionRequest.mustChange].some(
    (target) => !target.trim(),
  );
  return hasBlankTarget
    ? [
        {
          code: "blank_revision_target" as const,
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration targets cannot be blank.",
        },
      ]
    : [];
}

function targetCanonicalIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  const hasPaddedTarget = [...revisionRequest.mustKeep, ...revisionRequest.mustChange].some(
    (target) => target.trim() && target !== target.trim(),
  );
  return hasPaddedTarget
    ? [
        {
          code: "revision_target_not_canonical" as const,
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration targets must be canonical before provider submission.",
        },
      ]
    : [];
}

function duplicateTargetIssues(
  revisionRequest: SlideRevisionRequest,
): readonly LiveSlideRegenerationIssue[] {
  return hasDuplicateTarget(revisionRequest.mustKeep) ||
    hasDuplicateTarget(revisionRequest.mustChange)
    ? [
        {
          code: "duplicate_revision_target" as const,
          slideNumber: revisionRequest.slideNumber,
          message: "Live regeneration targets must not be duplicated.",
        },
      ]
    : [];
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

function originalBackgroundCanonicalIssues(input: {
  readonly revisionRequest: SlideRevisionRequest;
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}): readonly LiveSlideRegenerationIssue[] {
  return [input.originalBackgroundArtifactId, input.originalBackgroundRequestId].some(
    (value) => value.trim() && value !== value.trim(),
  )
    ? [
        {
          code: "original_background_evidence_not_canonical" as const,
          slideNumber: input.revisionRequest.slideNumber,
          message: "Live regeneration original background evidence must be canonical.",
        },
      ]
    : [];
}

function hasTargets(values: readonly string[]): boolean {
  return values.some((value) => value.trim());
}

function hasDuplicateTarget(values: readonly string[]): boolean {
  const seen = new Set<string>();
  return values.some((value) => {
    const target = value.trim();
    if (!target) return false;
    if (seen.has(target)) return true;
    seen.add(target);
    return false;
  });
}
