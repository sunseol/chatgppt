import type { GeneratedSlide } from "./deck-types";
import type { StoredSlideImageArtifact } from "./image-artifact-store";
import type {
  LiveSlideRegenerationIssue,
  LiveSlideRegenerationRequest,
} from "./live-slide-regeneration";

export function candidateIssues(input: {
  readonly request: LiveSlideRegenerationRequest;
  readonly originalSlide: GeneratedSlide;
  readonly candidateBackground: StoredSlideImageArtifact;
  readonly candidateDeckContextId: string;
  readonly candidateDesignSystemId: string;
  readonly candidateVersion: number;
}): readonly LiveSlideRegenerationIssue[] {
  return [
    ...(input.candidateDeckContextId === input.request.deckContextId
      ? []
      : [
          {
            code: "deck_context_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regeneration candidate must keep the original deck context id.",
          },
        ]),
    ...(input.candidateDesignSystemId === input.request.designSystemId
      ? []
      : [
          {
            code: "design_system_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regeneration candidate must keep the original design system id.",
          },
        ]),
    ...(input.candidateBackground.metadata.providerId === "mock"
      ? [
          {
            code: "mock_background_artifact" as const,
            slideNumber: input.request.slideNumber,
            message: "Live regeneration candidates must use a real image artifact.",
          },
        ]
      : []),
    ...(input.candidateBackground.binary.artifactId !== input.request.originalBackgroundArtifactId
      ? []
      : [
          {
            code: "background_artifact_not_new" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background must be stored as a new artifact version.",
          },
        ]),
    ...(input.candidateBackground.binary.artifactId ===
      input.request.originalBackgroundArtifactId ||
    backgroundVersionMatchesCandidate(input.candidateBackground, input.candidateVersion)
      ? []
      : [
          {
            code: "background_artifact_version_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background artifact version must match the candidate slide.",
          },
        ]),
    ...(input.candidateBackground.metadata.slideNumber === input.request.slideNumber
      ? []
      : [
          {
            code: "slide_id_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background must match the selected slide id.",
          },
        ]),
    ...(input.candidateVersion > input.originalSlide.version
      ? []
      : [
          {
            code: "stale_candidate_version" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated slide version must be newer than the approved original.",
          },
        ]),
  ];
}

function backgroundVersionMatchesCandidate(
  candidateBackground: StoredSlideImageArtifact,
  candidateVersion: number,
): boolean {
  return (
    candidateBackground.binary.artifactId.endsWith(`_v${candidateVersion}`) &&
    candidateBackground.binary.path.endsWith(`.v${candidateVersion}.png`) &&
    candidateBackground.metadata.path.endsWith(`.v${candidateVersion}.metadata.json`)
  );
}
