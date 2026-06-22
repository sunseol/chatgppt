import { ImageProviderRequestError } from "./image-provider-errors";
import type {
  SlideImageArtifact,
  SlideImageAspectRatio,
  SlideImageProvider,
} from "./slide-image-provider";
import type { SlidePromptPackage } from "./slide-prompt-package";

export function assertSlideImageArtifactContract(
  input: {
    readonly provider: SlideImageProvider;
    readonly package: SlidePromptPackage;
    readonly aspectRatio: SlideImageAspectRatio;
  },
  artifact: SlideImageArtifact,
): void {
  const issue = artifactContractIssue(input, artifact);
  if (issue) throw new ImageProviderRequestError("provider_contract", issue);
}

function artifactContractIssue(
  input: {
    readonly provider: SlideImageProvider;
    readonly package: SlidePromptPackage;
    readonly aspectRatio: SlideImageAspectRatio;
  },
  artifact: SlideImageArtifact,
): string | undefined {
  if (artifact.providerId !== input.provider.id) {
    return "Image provider artifact provider id must match the requested provider.";
  }
  if (artifact.slideNumber !== input.package.slideNumber) {
    return "Image provider artifact slide number must match the prompt package.";
  }
  if (artifact.aspectRatio !== input.aspectRatio) {
    return "Image provider artifact aspect ratio must match the request.";
  }
  if (
    artifact.layoutReference.screenshot !== input.package.layoutScreenshot ||
    artifact.layoutReference.mode !== "composition-reference"
  ) {
    return "Image provider artifact layout reference must match the prompt package.";
  }
  if (
    artifact.prompt.id !== input.package.promptId ||
    artifact.prompt.version !== input.package.promptVersion ||
    artifact.prompt.hash !== input.package.promptHash
  ) {
    return "Image provider artifact prompt lineage must match the prompt package.";
  }
  return undefined;
}
