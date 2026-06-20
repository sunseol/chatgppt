import type { SlideImageArtifact } from "./slide-image-provider";

export function assertLiveImageProviderArtifact(artifact: SlideImageArtifact): void {
  if (artifact.providerId === "mock") {
    throw new ImageArtifactStoreLiveProviderError(
      "Mock image artifacts cannot be stored as live provider output.",
    );
  }
}

export class ImageArtifactStoreLiveProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageArtifactStoreLiveProviderError";
  }
}
