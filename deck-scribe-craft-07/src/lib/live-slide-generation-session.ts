import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { ImageProviderRequestError } from "./image-provider-errors";
import type { ImageArtifactStore } from "./image-artifact-store";
import {
  type CodexImageClient,
  type CodexImageClientRequest,
  createCodexImageProvider,
} from "./codex-image-provider";
import { buildSlideContextBundles } from "./slide-context-bundle";
import { buildSlidePromptPackage } from "./slide-prompt-package";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import {
  runSlideGenerationQueue,
  type RunSlideGenerationQueueInput,
  type SlideGenerationQueueResult,
  type SlideGenerationWorkerInput,
} from "./slide-generation-queue";

export type CodexLiveSlideGenerationClientRequest = CodexImageClientRequest;

export type CodexLiveSlideGenerationSessionInput = {
  readonly project: DeckProject;
  readonly client: CodexImageClient;
  readonly store: ImageArtifactStore;
  readonly manager?: RunSlideGenerationQueueInput["manager"];
  readonly maxParallel?: number;
  readonly completedSlides?: readonly GeneratedSlide[];
  readonly waitForRetry?: RunSlideGenerationQueueInput["waitForRetry"];
  readonly isCancellationRequested?: RunSlideGenerationQueueInput["isCancellationRequested"];
  readonly onProgress?: RunSlideGenerationQueueInput["onProgress"];
  readonly now?: () => number;
};

export async function runCodexLiveSlideGenerationSession(
  input: CodexLiveSlideGenerationSessionInput,
): Promise<SlideGenerationQueueResult> {
  const contextResult = createFrozenDeckContext(input.project, { now: input.now });
  if (contextResult.kind === "blocked") return contextResult;

  const bundleResult = buildSlideContextBundles({
    project: input.project,
    context: contextResult.context,
  });
  if (bundleResult.kind === "blocked") return bundleResult;

  const provider = createCodexImageProvider(input.client, { now: input.now });
  return runSlideGenerationQueue({
    bundles: bundleResult.bundles,
    providerId: "codex",
    manager: input.manager,
    maxParallel: input.maxParallel,
    completedSlides: input.completedSlides ?? input.project.slides ?? [],
    waitForRetry: input.waitForRetry,
    isCancellationRequested: input.isCancellationRequested,
    onProgress: input.onProgress,
    generateSlide: (worker) =>
      generateAndStoreCodexSlide({
        worker,
        project: input.project,
        store: input.store,
        provider,
        createdAt: input.now?.() ?? Date.now(),
      }),
  });
}

async function generateAndStoreCodexSlide(input: {
  readonly worker: SlideGenerationWorkerInput;
  readonly project: DeckProject;
  readonly store: ImageArtifactStore;
  readonly provider: ReturnType<typeof createCodexImageProvider>;
  readonly createdAt: number;
}): Promise<GeneratedSlide> {
  const result = await generateAndStoreSlideImageArtifact({
    provider: input.provider,
    store: input.store,
    package: buildSlidePromptPackage(input.worker.bundle),
    aspectRatio: input.project.aspectRatio,
    projectId: input.project.id,
    version: input.worker.attempt,
    createdAt: input.createdAt,
  });

  switch (result.kind) {
    case "ready":
      return {
        ...result.slide,
        version: input.worker.attempt,
        notes: result.stored.binary.path,
      };
    case "failed":
      throw new ImageProviderRequestError(result.failure.errorKind, result.failure.errorMessage);
    default:
      return assertNever(result);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Codex live slide generation session result: ${String(value)}`);
}
