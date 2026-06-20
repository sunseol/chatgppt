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
  return comparisonMatchesCandidate(candidate, comparison, currentSlide)
    ? []
    : [
        {
          code: "regeneration_comparison_mismatch" as const,
          slideNumber: candidate.slide.number,
          message:
            "Before/after comparison evidence must match the approved original and regenerated candidate.",
        },
      ];
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
  const expectedTargets = normalizedTargets(expected);
  const actualTargets = normalizedTargets(actual);
  return (
    expectedTargets.length === actualTargets.length &&
    expectedTargets.every((target, index) => target === actualTargets[index])
  );
}

function normalizedTargets(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).sort();
}
