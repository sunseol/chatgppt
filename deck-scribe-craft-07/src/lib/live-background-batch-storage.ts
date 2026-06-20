import type { StoredSlideImageArtifact } from "./image-artifact-store";
import { parseVersionedProjectImageArtifactPath } from "./image-artifact-path";
import type { LiveBackgroundBatchIssue } from "./live-background-batch";
import type { ProviderAuthMode } from "./provider-provenance";
import type { SlideImageArtifact, SlideImageRequestMetadata } from "./slide-image-provider";

const AUTH_MODE_BY_PROVIDER = {
  mock: "none",
  openaiImage: "api_key",
  codex: "codex_session",
} as const satisfies Record<SlideImageArtifact["providerId"], ProviderAuthMode>;

export function storedArtifactIssues(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact | undefined,
): readonly LiveBackgroundBatchIssue[] {
  if (!stored) {
    return [
      {
        code: "missing_stored_background_artifact",
        slideNumber: artifact.slideNumber,
        message: "Live background artifact must be stored as a versioned binary artifact.",
      },
    ];
  }
  return storedArtifactMatches(artifact, stored)
    ? []
    : [
        {
          code: "stored_background_artifact_mismatch",
          slideNumber: artifact.slideNumber,
          message: "Stored background artifact metadata must match the live image artifact.",
        },
      ];
}

function storedArtifactMatches(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact,
): boolean {
  return (
    stored.metadata.providerId === artifact.providerId &&
    stored.metadata.slideNumber === artifact.slideNumber &&
    stored.metadata.aspectRatio === artifact.aspectRatio &&
    stored.metadata.canvas.width === artifact.canvas.width &&
    stored.metadata.canvas.height === artifact.canvas.height &&
    stored.metadata.layoutReference.screenshot === artifact.layoutReference.screenshot &&
    stored.metadata.layoutReference.mode === artifact.layoutReference.mode &&
    stored.metadata.prompt.id === artifact.prompt.id &&
    stored.metadata.prompt.version === artifact.prompt.version &&
    stored.metadata.prompt.hash === artifact.prompt.hash &&
    storedRequestMatches(artifact, stored) &&
    storedBinaryPathMatchesSlide(stored.binary.path, artifact.slideNumber) &&
    sidecarPathsMatchBinary(stored) &&
    storedProvenanceMatches(artifact, stored) &&
    /^sha256:[a-f0-9]{64}$/.test(stored.binary.hash) &&
    stored.provenance.fixture === false
  );
}

function storedProvenanceMatches(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact,
): boolean {
  return (
    stored.provenance.artifactId === stored.binary.artifactId &&
    stored.provenance.executionMode === "production" &&
    stored.provenance.providerKind === artifact.providerId &&
    stored.provenance.authMode === AUTH_MODE_BY_PROVIDER[artifact.providerId] &&
    stored.provenance.promptVersion === `${artifact.prompt.id}@${artifact.prompt.version}` &&
    stored.provenance.inputArtifactIds.length === 2 &&
    stored.provenance.inputArtifactIds[0] === artifact.prompt.hash &&
    stored.provenance.inputArtifactIds[1] === artifact.layoutReference.screenshot &&
    provenanceDurationMatches(artifact, stored)
  );
}

function provenanceDurationMatches(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact,
): boolean {
  const requestLatencyMs = artifact.request?.latencyMs;
  if (requestLatencyMs === undefined) return stored.provenance.durationMs === 0;
  return stored.provenance.durationMs === requestLatencyMs;
}

function storedBinaryPathMatchesSlide(path: string, slideNumber: number): boolean {
  return parseVersionedProjectImageArtifactPath(path)?.slideNumber === slideNumber;
}

function sidecarPathsMatchBinary(stored: StoredSlideImageArtifact): boolean {
  const sidecarBasePath = stored.binary.path.replace(/\.png$/, "");
  return (
    stored.metadata.path === `${sidecarBasePath}.metadata.json` &&
    stored.provenance.path === `${sidecarBasePath}.provenance.json`
  );
}

function storedRequestMatches(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact,
): boolean {
  const request = artifact.request;
  if (!request?.requestId) return true;
  return (
    stored.metadata.request.requestId === request.requestId &&
    stored.provenance.requestId === request.requestId &&
    stored.metadata.request.model === request.model &&
    stored.provenance.modelOrRuntime === request.model &&
    requestUsageMetadataMatches(request) &&
    requestUsageMetadataMatches(stored.metadata.request)
  );
}

function requestUsageMetadataMatches(request: SlideImageRequestMetadata): boolean {
  const usage = request.usage;
  if (usage === undefined) return true;
  return (
    usageHasEvidence(usage) &&
    [usage.inputTokens, usage.outputTokens, usage.imageCount].every(validOptionalCount) &&
    validOptionalCost(usage.estimatedCostUsd)
  );
}

function usageHasEvidence(usage: SlideImageRequestMetadata["usage"]): boolean {
  if (usage === undefined) return true;
  return (
    usage.inputTokens !== undefined ||
    usage.outputTokens !== undefined ||
    usage.imageCount !== undefined ||
    usage.estimatedCostUsd !== undefined
  );
}

function validOptionalCount(value: number | undefined): boolean {
  return value === undefined || (Number.isInteger(value) && value >= 0);
}

function validOptionalCost(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}
