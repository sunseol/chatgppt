import type { StoredSlideImageArtifact } from "./image-artifact-store";
import type {
  LiveSlideRegenerationIssue,
  LiveSlideRegenerationRequest,
} from "./live-slide-regeneration";

export function candidateInputLineageIssues(input: {
  readonly request: LiveSlideRegenerationRequest;
  readonly candidateBackground: StoredSlideImageArtifact;
}): readonly LiveSlideRegenerationIssue[] {
  const originalArtifactId = input.request.originalBackgroundArtifactId;
  if (input.candidateBackground.binary.artifactId === originalArtifactId) return [];
  return canonicalNonEmpty(originalArtifactId) &&
    input.candidateBackground.provenance.inputArtifactIds.includes(originalArtifactId)
    ? []
    : [
        {
          code: "regeneration_input_lineage_mismatch",
          slideNumber: input.request.slideNumber,
          message: "Regenerated background provenance must cite the approved original artifact.",
        },
      ];
}

function canonicalNonEmpty(value: string): boolean {
  return value.length > 0 && value === value.trim();
}
