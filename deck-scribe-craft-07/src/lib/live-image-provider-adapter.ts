import {
  ImageArtifactStoreError,
  storeSlideImageArtifact,
  type ImageArtifactStore,
  type StoredSlideImageArtifact,
} from "./image-artifact-store";
import {
  generateSlideImage,
  type SlideImageArtifact,
  type SlideImageAspectRatio,
  type SlideImageFailure,
  type SlideImageProvider,
} from "./slide-image-provider";
import type { GeneratedSlide } from "./deck-types";
import type { SlidePromptPackage } from "./slide-prompt-package";

export type StoredLiveSlideImageResult =
  | {
      readonly kind: "ready";
      readonly artifact: SlideImageArtifact;
      readonly slide: GeneratedSlide;
      readonly stored: StoredSlideImageArtifact;
    }
  | { readonly kind: "failed"; readonly failure: SlideImageFailure };

export async function generateAndStoreSlideImageArtifact(input: {
  readonly provider: SlideImageProvider;
  readonly store: ImageArtifactStore;
  readonly package: SlidePromptPackage;
  readonly aspectRatio: SlideImageAspectRatio;
  readonly projectId: string;
  readonly version: number;
  readonly createdAt: number;
}): Promise<StoredLiveSlideImageResult> {
  if (input.provider.id === "mock") {
    return {
      kind: "failed",
      failure: liveProviderContractFailure(input.provider.id, input.package.slideNumber),
    };
  }

  const result = await generateSlideImage({
    provider: input.provider,
    package: input.package,
    aspectRatio: input.aspectRatio,
  });

  switch (result.kind) {
    case "failed":
      return { kind: "failed", failure: result.failure };
    case "ready": {
      const stored = await storeProviderArtifactResult(input, result.artifact);
      if (stored.kind === "failed") return { kind: "failed", failure: stored.failure };
      return {
        kind: "ready",
        artifact: result.artifact,
        slide: result.slide,
        stored: stored.stored,
      };
    }
    default:
      return assertNever(result);
  }
}

type StoreProviderArtifactResult =
  | { readonly kind: "ready"; readonly stored: StoredSlideImageArtifact }
  | { readonly kind: "failed"; readonly failure: SlideImageFailure };

async function storeProviderArtifactResult(
  input: {
    readonly provider: SlideImageProvider;
    readonly store: ImageArtifactStore;
    readonly package: SlidePromptPackage;
    readonly projectId: string;
    readonly version: number;
    readonly createdAt: number;
  },
  artifact: SlideImageArtifact,
): Promise<StoreProviderArtifactResult> {
  try {
    const stored = await storeSlideImageArtifact({
      store: input.store,
      projectId: input.projectId,
      artifact,
      version: input.version,
      createdAt: input.createdAt,
    });
    return { kind: "ready", stored };
  } catch (error) {
    if (error instanceof ImageArtifactStoreError) {
      return {
        kind: "failed",
        failure: liveProviderContractFailure(
          input.provider.id,
          input.package.slideNumber,
          error.message,
        ),
      };
    }
    throw error;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled live image provider adapter result: ${String(value)}`);
}

function liveProviderContractFailure(
  providerId: SlideImageProvider["id"],
  slideNumber: number,
  message = "Mock image providers cannot run through live image storage.",
): SlideImageFailure {
  return {
    providerId,
    slideNumber,
    errorKind: "provider_contract",
    retryable: false,
    errorMessage: message,
    userMessage: `Slide ${slideNumber} image generation failed: ${message} Resolve the provider issue before retrying.`,
  };
}
