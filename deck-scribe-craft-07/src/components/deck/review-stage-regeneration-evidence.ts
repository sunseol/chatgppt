import { createBrowserImageArtifactStore } from "@/lib/browser-image-artifact-store";
import type {
  DeckProject,
  GeneratedSlide,
  LiveSlideRegenerationReviewEvidenceRef,
} from "@/lib/deck-types";
import type { ImageArtifactStore } from "@/lib/image-artifact-store";
import {
  approveLiveSlideRegenerationCandidate,
  liveSlideRegenerationApprovalIssues,
  type LiveSlideRegenerationCandidate,
} from "@/lib/live-slide-regeneration";
import { writeLiveSlideRegenerationReviewEvidence } from "@/lib/live-slide-regeneration-review-evidence";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";

export type ReviewStageRegenerationEvidenceResult = {
  readonly slides: readonly GeneratedSlide[];
  readonly comparison: SlideRevisionComparison | null;
  readonly liveCandidate: LiveSlideRegenerationCandidate | null;
  readonly editConsumed: boolean;
  readonly reviewEvidencePath: string | null;
};

export type ReviewStageRevisionApprovalResult = {
  readonly slides: readonly GeneratedSlide[];
  readonly reviewEvidencePath: string | null;
  readonly reviewOutcome: LiveSlideRegenerationReviewEvidenceRef["outcome"] | null;
};

export async function approveReviewStageRevisionWithEvidence(input: {
  readonly projectId: string;
  readonly slides: readonly GeneratedSlide[];
  readonly comparison: SlideRevisionComparison;
  readonly liveCandidate: LiveSlideRegenerationCandidate | null;
  readonly store?: ImageArtifactStore;
  readonly storage?: Storage;
  readonly now?: () => number;
}): Promise<ReviewStageRevisionApprovalResult> {
  const issues =
    input.liveCandidate === null
      ? []
      : liveSlideRegenerationApprovalIssues({
          slides: input.slides,
          candidate: input.liveCandidate,
          comparison: input.comparison,
        });
  const slides = approveReviewStageRevision(input);
  if (input.liveCandidate === null) {
    return { slides, reviewEvidencePath: null, reviewOutcome: null };
  }
  if (issues.length > 0) {
    const preservedSlide =
      input.slides.find((slide) => slide.number === input.liveCandidate?.slide.number) ??
      input.liveCandidate.slide;
    const stored = await writeLiveSlideRegenerationReviewEvidence({
      store: input.store ?? createBrowserImageArtifactStore(input.storage),
      projectId: input.projectId,
      eventId: input.liveCandidate.requestId,
      exportedAt: input.now?.() ?? Date.now(),
      event: {
        outcome: "preserved_after_approval_blocked",
        candidate: input.liveCandidate,
        comparison: input.comparison,
        issues: issues.map((issue) => issue.code),
        preservedSlide,
      },
    });
    return {
      slides,
      reviewEvidencePath: stored.path,
      reviewOutcome: "preserved_after_approval_blocked",
    };
  }
  const approvedSlide = slides.find((slide) => slide.number === input.liveCandidate?.slide.number);
  if (
    approvedSlide?.status !== "approved" ||
    approvedSlide.version !== input.liveCandidate.slide.version ||
    approvedSlide.imageDescriptor !== input.liveCandidate.slide.imageDescriptor
  ) {
    return { slides, reviewEvidencePath: null, reviewOutcome: null };
  }
  const stored = await writeLiveSlideRegenerationReviewEvidence({
    store: input.store ?? createBrowserImageArtifactStore(input.storage),
    projectId: input.projectId,
    eventId: input.liveCandidate.requestId,
    exportedAt: input.now?.() ?? Date.now(),
    event: {
      outcome: "approved",
      candidate: input.liveCandidate,
      comparison: input.comparison,
      approvedSlide,
    },
  });
  return { slides, reviewEvidencePath: stored.path, reviewOutcome: "approved" };
}

export async function preservedLiveRegenerationFailure(
  input: {
    readonly project: DeckProject;
    readonly slides: readonly GeneratedSlide[];
    readonly original: GeneratedSlide;
    readonly instruction: string;
    readonly now?: () => number;
  },
  store: ImageArtifactStore,
  result: {
    readonly eventId: string;
    readonly issues: readonly string[];
    readonly userMessage: string;
    readonly preservedSlide: GeneratedSlide;
  },
): Promise<ReviewStageRegenerationEvidenceResult> {
  const stored = await writeLiveSlideRegenerationReviewEvidence({
    store,
    projectId: input.project.id,
    eventId: result.eventId,
    exportedAt: input.now?.() ?? Date.now(),
    event: {
      outcome: "preserved_after_failure",
      slideNumber: input.original.number,
      originalSlideVersion: input.original.version,
      instruction: input.instruction,
      issues: result.issues,
      userMessage: result.userMessage,
      preservedSlide: result.preservedSlide,
    },
  });
  return {
    slides: input.slides,
    comparison: null,
    liveCandidate: null,
    editConsumed: false,
    reviewEvidencePath: stored.path,
  };
}

function approveReviewStageRevision(input: {
  readonly slides: readonly GeneratedSlide[];
  readonly comparison: SlideRevisionComparison;
  readonly liveCandidate: LiveSlideRegenerationCandidate | null;
}): readonly GeneratedSlide[] {
  if (input.liveCandidate !== null) {
    return approveLiveSlideRegenerationCandidate(
      input.slides,
      input.liveCandidate,
      input.comparison,
    );
  }
  return input.slides.map((slide) =>
    slide.number === input.comparison.slideNumber ? { ...slide, status: "approved" } : slide,
  );
}
