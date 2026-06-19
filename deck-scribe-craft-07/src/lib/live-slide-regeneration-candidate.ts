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
  const candidateRequestId = input.candidateBackground.metadata.request.requestId?.trim();
  const candidateProvenanceRequestId = input.candidateBackground.provenance.requestId?.trim();
  const originalRequestId = input.request.originalBackgroundRequestId.trim();
  const hasRequestEvidence = Boolean(candidateRequestId && candidateProvenanceRequestId);
  const requestEvidenceMatches = candidateRequestId === candidateProvenanceRequestId;
  const versionMatchesCandidate = backgroundVersionMatchesCandidate(
    input.candidateBackground,
    input.candidateVersion,
  );
  return [
    ...(input.originalSlide.number === input.request.slideNumber
      ? []
      : [
          {
            code: "original_slide_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regeneration candidates must be built from the selected approved slide.",
          },
        ]),
    ...(input.originalSlide.version === input.request.originalSlideVersion
      ? []
      : [
          {
            code: "original_slide_version_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regeneration candidates must start from the approved original slide version.",
          },
        ]),
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
    ...(hasRequestEvidence &&
    input.candidateBackground.metadata.providerId !== "mock" &&
    !isLiveOpenAiBackground(input.candidateBackground)
      ? [
          {
            code: "regeneration_background_not_live" as const,
            slideNumber: input.request.slideNumber,
            message:
              "Regenerated background provenance must come from production OpenAI image API credentials.",
          },
        ]
      : []),
    ...(hasRequestEvidence
      ? []
      : [
          {
            code: "missing_regeneration_request_id" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background must preserve a provider request id.",
          },
        ]),
    ...(hasRequestEvidence && !requestEvidenceMatches
      ? [
          {
            code: "regeneration_request_provenance_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background request metadata must match stored provenance.",
          },
        ]
      : []),
    ...(hasRequestEvidence &&
    requestEvidenceMatches &&
    candidateRequestId === originalRequestId &&
    input.candidateBackground.binary.artifactId !== input.request.originalBackgroundArtifactId
      ? [
          {
            code: "regeneration_request_id_not_new" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background must use a new provider request id.",
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
    ...(isSha256Digest(input.candidateBackground.binary.hash)
      ? []
      : [
          {
            code: "invalid_regeneration_background_hash" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background hash must be a full SHA-256 digest.",
          },
        ]),
    ...(input.candidateBackground.binary.artifactId ===
      input.request.originalBackgroundArtifactId || versionMatchesCandidate
      ? []
      : [
          {
            code: "background_artifact_version_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background artifact version must match the candidate slide.",
          },
        ]),
    ...(input.candidateBackground.binary.artifactId ===
      input.request.originalBackgroundArtifactId ||
    !versionMatchesCandidate ||
    backgroundStoragePathsMatchCandidate(
      input.candidateBackground,
      input.request.slideNumber,
      input.candidateVersion,
    )
      ? []
      : [
          {
            code: "background_artifact_storage_path_mismatch" as const,
            slideNumber: input.request.slideNumber,
            message: "Regenerated background storage paths must match the candidate slide.",
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

function backgroundStoragePathsMatchCandidate(
  candidateBackground: StoredSlideImageArtifact,
  slideNumber: number,
  candidateVersion: number,
): boolean {
  const identity = imageArtifactIdentity(candidateBackground.binary.artifactId);
  if (identity === undefined) return false;
  if (identity.slideNumber !== slideNumber || identity.version !== candidateVersion) return false;
  const basePath = `projects/${identity.projectId}/slides/images/slide_${identity.slideToken}`;
  return (
    candidateBackground.binary.path === `${basePath}.v${candidateVersion}.png` &&
    candidateBackground.metadata.path === `${basePath}.v${candidateVersion}.metadata.json`
  );
}

function imageArtifactIdentity(artifactId: string):
  | {
      readonly projectId: string;
      readonly slideToken: string;
      readonly slideNumber: number;
      readonly version: number;
    }
  | undefined {
  const match = /^([A-Za-z0-9_-]+)_image_slide_(\d{3})_v(\d+)$/.exec(artifactId);
  if (match === null) return undefined;
  const [, projectId, slideToken, versionText] = match;
  if (projectId === undefined || slideToken === undefined || versionText === undefined) {
    return undefined;
  }
  return {
    projectId,
    slideToken,
    slideNumber: Number.parseInt(slideToken, 10),
    version: Number.parseInt(versionText, 10),
  };
}

function isLiveOpenAiBackground(candidateBackground: StoredSlideImageArtifact): boolean {
  const provenance = candidateBackground.provenance;
  return (
    candidateBackground.metadata.providerId === "openaiImage" &&
    provenance.providerKind === "openaiImage" &&
    provenance.executionMode === "production" &&
    provenance.authMode === "api_key" &&
    !provenance.fixture
  );
}

function isSha256Digest(value: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}
