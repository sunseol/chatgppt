import type { StoredSlideImageArtifact } from "./image-artifact-store";

export type RegenerationProviderEvidence = {
  readonly metadataId?: string;
  readonly provenanceId?: string;
  readonly isLive: boolean;
};

export function collectRegenerationProviderEvidence(
  candidateBackground: StoredSlideImageArtifact,
): RegenerationProviderEvidence {
  switch (candidateBackground.metadata.providerId) {
    case "openaiImage":
      return {
        metadataId: canonicalText(candidateBackground.metadata.request.requestId),
        provenanceId: canonicalText(candidateBackground.provenance.requestId),
        isLive: isLiveOpenAiBackground(candidateBackground),
      };
    case "codex":
      return {
        metadataId: canonicalText(candidateBackground.metadata.request.turnId),
        provenanceId: canonicalText(candidateBackground.provenance.turnId),
        isLive: isLiveCodexBackground(candidateBackground),
      };
    case "mock":
      return { isLive: false };
    default:
      return assertNever(candidateBackground.metadata.providerId);
  }
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

function isLiveCodexBackground(candidateBackground: StoredSlideImageArtifact): boolean {
  const provenance = candidateBackground.provenance;
  return (
    candidateBackground.metadata.providerId === "codex" &&
    provenance.providerKind === "codex" &&
    provenance.executionMode === "production" &&
    provenance.authMode === "codex_session" &&
    !provenance.fixture
  );
}

function canonicalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && value === trimmed ? value : undefined;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected regeneration provider evidence: ${String(value)}`);
}
