import { ImageArtifactStoreError } from "./image-artifact-store-error";
import type { SlideImageArtifact, SlideImageRequestMetadata } from "./slide-image-provider";

export function requireImageRequestMetadata(
  artifact: SlideImageArtifact,
): SlideImageRequestMetadata {
  if (!artifact.request) {
    throw new ImageArtifactStoreError("Image artifact request metadata is required.");
  }
  if (!artifact.request.model.trim()) {
    throw new ImageArtifactStoreError("Image artifact request model is required.");
  }
  if (artifact.providerId === "openaiImage" && !artifact.request.requestId?.trim()) {
    throw new ImageArtifactStoreError("OpenAI image artifacts require a provider request id.");
  }
  if (!hasCanonicalRequestMetadata(artifact.request)) {
    throw new ImageArtifactStoreError("Image artifact canonical request metadata is required.");
  }
  if (!validLatencyMs(artifact.request.latencyMs)) {
    throw new ImageArtifactStoreError(
      "Image artifact request latency must be a non-negative number.",
    );
  }
  if (!validUsageSummary(artifact.request.usage)) {
    throw new ImageArtifactStoreError(
      "Image artifact request usage counts must be non-negative integers.",
    );
  }
  if (!usageSummaryHasEvidence(artifact.request.usage)) {
    throw new ImageArtifactStoreError(
      "Image artifact request usage evidence is required when usage metadata is supplied.",
    );
  }
  return artifact.request;
}

function hasCanonicalRequestMetadata(request: SlideImageRequestMetadata): boolean {
  return (
    optionalCanonicalText(request.model) &&
    optionalCanonicalText(request.requestId) &&
    optionalCanonicalText(request.size) &&
    optionalCanonicalText(request.quality)
  );
}

function optionalCanonicalText(value: string | undefined): boolean {
  if (value === undefined) return true;
  return value.length > 0 && value === value.trim();
}

function validLatencyMs(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function validUsageSummary(usage: SlideImageRequestMetadata["usage"]): boolean {
  if (usage === undefined) return true;
  return (
    [usage.inputTokens, usage.outputTokens, usage.imageCount].every(validOptionalCount) &&
    validOptionalCost(usage.estimatedCostUsd)
  );
}

function usageSummaryHasEvidence(usage: SlideImageRequestMetadata["usage"]): boolean {
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
