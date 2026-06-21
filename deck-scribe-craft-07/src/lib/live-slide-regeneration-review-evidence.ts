import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import type { GeneratedSlide } from "./deck-types";
import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";
import type { LiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import type { SlideRevisionComparison } from "./slide-revision-generation";

const REVIEW_EVIDENCE_PATH =
  /^projects\/[A-Za-z0-9_-]+\/live-evidence\/df235-slide-regeneration-review-[A-Za-z0-9_-]+\.json$/;
const TEMPLATE_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;

export type LiveSlideRegenerationReviewEvent =
  | {
      readonly outcome: "approved";
      readonly candidate: LiveSlideRegenerationCandidate;
      readonly comparison: SlideRevisionComparison;
      readonly approvedSlide: GeneratedSlide;
    }
  | {
      readonly outcome: "preserved_after_approval_blocked";
      readonly candidate: LiveSlideRegenerationCandidate;
      readonly comparison: SlideRevisionComparison;
      readonly issues: readonly string[];
      readonly preservedSlide: GeneratedSlide;
    }
  | {
      readonly outcome: "preserved_after_failure";
      readonly slideNumber: number;
      readonly originalSlideVersion: number;
      readonly instruction: string;
      readonly issues: readonly string[];
      readonly userMessage: string;
      readonly preservedSlide: GeneratedSlide;
    };

export type LiveSlideRegenerationReviewEvidence = {
  readonly schemaVersion: 1;
  readonly issue: "DF-235";
  readonly projectId: string;
  readonly eventId: string;
  readonly exportedAt: number;
  readonly event: LiveSlideRegenerationReviewEvent;
};

export type StoredLiveSlideRegenerationReviewEvidence = {
  readonly path: string;
  readonly evidence: LiveSlideRegenerationReviewEvidence;
};

export async function writeLiveSlideRegenerationReviewEvidence(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly eventId: string;
  readonly exportedAt: number;
  readonly event: LiveSlideRegenerationReviewEvent;
}): Promise<StoredLiveSlideRegenerationReviewEvidence> {
  validateReviewEvent(input.event);
  const evidence = {
    schemaVersion: 1,
    issue: "DF-235",
    projectId: input.projectId,
    eventId: input.eventId,
    exportedAt: input.exportedAt,
    event: input.event,
  } satisfies LiveSlideRegenerationReviewEvidence;
  const path = liveSlideRegenerationReviewEvidencePath(input.projectId, input.eventId);
  await input.store.write({
    path,
    content: JSON.stringify(evidence, null, 2),
  });
  return { path, evidence };
}

function validateReviewEvent(event: LiveSlideRegenerationReviewEvent): void {
  if (event.outcome !== "approved") return;
  validateApprovedSlide(event);
  validateApprovedComparison(event);
}

function validateApprovedSlide(
  event: Extract<LiveSlideRegenerationReviewEvent, { readonly outcome: "approved" }>,
): void {
  const candidateSlide = event.candidate.slide;
  if (
    event.approvedSlide.status === "approved" &&
    event.approvedSlide.number === candidateSlide.number &&
    event.approvedSlide.version === candidateSlide.version &&
    event.approvedSlide.imageDescriptor === candidateSlide.imageDescriptor
  ) {
    return;
  }
  throw new ImageArtifactStoreError(
    "Approved slide regeneration review evidence must match the ready candidate.",
  );
}

function validateApprovedComparison(
  event: Extract<LiveSlideRegenerationReviewEvent, { readonly outcome: "approved" }>,
): void {
  if (approvedComparisonMatchesCandidate(event)) return;
  throw new ImageArtifactStoreError(
    "Approved slide regeneration review comparison evidence must match the ready candidate.",
  );
}

function approvedComparisonMatchesCandidate(
  event: Extract<LiveSlideRegenerationReviewEvent, { readonly outcome: "approved" }>,
): boolean {
  const candidate = event.candidate;
  const comparison = event.comparison;
  return (
    comparison.slideNumber === candidate.slide.number &&
    comparison.revisedSlideVersion === candidate.slide.version &&
    comparison.beforeImageDescriptor === candidate.beforeImageDescriptor &&
    comparison.afterImageDescriptor === candidate.afterImageDescriptor &&
    comparison.afterImageDescriptor === candidate.slide.imageDescriptor &&
    comparison.afterImageDescriptor.includes(candidate.backgroundArtifactId) &&
    targetsMatch(candidate.mustChange, comparison.requestedChanges) &&
    targetsMatch(candidate.mustKeep, comparison.preservedTargets) &&
    preservedTargetsKept(candidate.mustKeep, comparison.preservationChecks)
  );
}

function preservedTargetsKept(
  mustKeep: readonly string[],
  preservationChecks: SlideRevisionComparison["preservationChecks"],
): boolean {
  const checkedTargets = preservationChecks.map((check) => check.target);
  return (
    targetsMatch(mustKeep, checkedTargets) &&
    preservationChecks.every((check) => check.status === "kept")
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

function sortedTargets(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

export function hasLiveSlideRegenerationReviewEvidencePath(path: string | undefined): boolean {
  if (path === undefined || path.trim() !== path) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalized = path.toLowerCase();
  return (
    REVIEW_EVIDENCE_PATH.test(path) &&
    !TEMPLATE_EVIDENCE_MARKERS.some((marker) => normalized.includes(marker))
  );
}

function liveSlideRegenerationReviewEvidencePath(projectId: string, eventId: string): string {
  return `projects/${safeSegment(
    projectId,
    "project id",
  )}/live-evidence/df235-slide-regeneration-review-${safeSegment(eventId, "event id")}.json`;
}

function safeSegment(value: string, label: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ImageArtifactStoreError(
    `Live slide regeneration review evidence ${label} must be safe.`,
  );
}
