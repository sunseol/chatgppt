import type {
  DeckProject,
  GeneratedSlide,
  LiveSlideRegenerationReviewEvidenceRef,
} from "./deck-types";
import { hasLiveSlideRegenerationReviewEvidencePath } from "./live-slide-regeneration-review-evidence";

export function createReviewEvidenceProjectPatch(input: {
  readonly project: DeckProject;
  readonly slides: readonly GeneratedSlide[];
  readonly reviewEvidencePath: string | null;
  readonly slideNumber: number | null;
  readonly outcome: LiveSlideRegenerationReviewEvidenceRef["outcome"];
}): {
  readonly slides: GeneratedSlide[];
  readonly liveSlideRegenerationReviewEvidence?: readonly LiveSlideRegenerationReviewEvidenceRef[];
} {
  const slides = [...input.slides];
  if (
    input.reviewEvidencePath === null ||
    input.slideNumber === null ||
    !hasLiveSlideRegenerationReviewEvidencePath(input.reviewEvidencePath)
  ) {
    return { slides };
  }
  return {
    slides,
    liveSlideRegenerationReviewEvidence: appendReviewEvidenceRef(
      input.project.liveSlideRegenerationReviewEvidence ?? [],
      {
        path: input.reviewEvidencePath,
        slideNumber: input.slideNumber,
        outcome: input.outcome,
      },
    ),
  };
}

function appendReviewEvidenceRef(
  refs: readonly LiveSlideRegenerationReviewEvidenceRef[],
  next: LiveSlideRegenerationReviewEvidenceRef,
): readonly LiveSlideRegenerationReviewEvidenceRef[] {
  return [...refs.filter((ref) => ref.path !== next.path), next];
}
