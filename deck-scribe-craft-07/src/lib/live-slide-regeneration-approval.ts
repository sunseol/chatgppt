import type { GeneratedSlide } from "./deck-types";
import type {
  LiveSlideRegenerationCandidate,
  LiveSlideRegenerationIssue,
} from "./live-slide-regeneration";
import type { SlideRevisionComparison } from "./slide-revision-generation";

export function liveSlideRegenerationApprovalIssues(input: {
  readonly slides: readonly GeneratedSlide[];
  readonly candidate: LiveSlideRegenerationCandidate;
  readonly comparison?: SlideRevisionComparison;
}): readonly LiveSlideRegenerationIssue[] {
  const currentSlide = input.slides.find((slide) => slide.number === input.candidate.slide.number);
  return [
    ...(input.candidate.slide.status === "ready"
      ? []
      : [
          {
            code: "candidate_not_ready_for_approval" as const,
            slideNumber: input.candidate.slide.number,
            message: "Only ready regeneration candidates can be approved.",
          },
        ]),
    ...(input.comparison === undefined
      ? [
          {
            code: "missing_regeneration_comparison" as const,
            slideNumber: input.candidate.slide.number,
            message: "Live regeneration approval requires before/after comparison evidence.",
          },
        ]
      : comparisonIssues(input.candidate, input.comparison, currentSlide)),
  ];
}

function comparisonIssues(
  candidate: LiveSlideRegenerationCandidate,
  comparison: SlideRevisionComparison,
  currentSlide: GeneratedSlide | undefined,
): readonly LiveSlideRegenerationIssue[] {
  if (!comparisonMatchesCandidate(candidate, comparison, currentSlide)) {
    return [
      {
        code: "regeneration_comparison_mismatch" as const,
        slideNumber: candidate.slide.number,
        message:
          "Before/after comparison evidence must match the approved original and regenerated candidate.",
      },
    ];
  }
  return preservationCheckIssues(candidate, comparison);
}

function comparisonMatchesCandidate(
  candidate: LiveSlideRegenerationCandidate,
  comparison: SlideRevisionComparison,
  currentSlide: GeneratedSlide | undefined,
): boolean {
  return (
    currentSlide?.status === "approved" &&
    currentSlide.version === comparison.originalSlideVersion &&
    currentSlide.imageDescriptor === comparison.beforeImageDescriptor &&
    comparison.slideNumber === candidate.slide.number &&
    comparison.revisedSlideVersion === candidate.slide.version &&
    comparison.beforeImageDescriptor === candidate.beforeImageDescriptor &&
    comparison.afterImageDescriptor === candidate.afterImageDescriptor &&
    comparison.afterImageDescriptor === candidate.slide.imageDescriptor &&
    comparison.afterImageDescriptor.includes(candidate.backgroundArtifactId) &&
    targetsMatch(candidate.mustChange, comparison.requestedChanges) &&
    targetsMatch(candidate.mustKeep, comparison.preservedTargets)
  );
}

function targetsMatch(expected: readonly string[], actual: readonly string[]): boolean {
  const expectedTargets = sortedTargets(expected);
  const actualTargets = sortedTargets(actual);
  return (
    expectedTargets.length === actualTargets.length &&
    expectedTargets.every((target, index) => target === actualTargets[index])
  );
}

function preservationCheckIssues(
  candidate: LiveSlideRegenerationCandidate,
  comparison: SlideRevisionComparison,
): readonly LiveSlideRegenerationIssue[] {
  const checkedTargets = comparison.preservationChecks.map((check) => check.target);
  return targetsMatch(candidate.mustKeep, checkedTargets) &&
    comparison.preservationChecks.every((check) => check.status === "kept")
    ? []
    : [
        {
          code: "regeneration_preservation_check_failed" as const,
          slideNumber: candidate.slide.number,
          message: "Live regeneration approval requires every preserved target check to pass.",
        },
      ];
}

function sortedTargets(values: readonly string[]): readonly string[] {
  return [...values].sort();
}
