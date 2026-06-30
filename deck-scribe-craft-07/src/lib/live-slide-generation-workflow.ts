import { buildBasicChartOverlays } from "./chart-overlay";
import { createFrozenDeckContext } from "./deck-context";
import type { DeckProject, EditableLayerModel, GeneratedSlide } from "./deck-types";
import { composeMvpEditableLayers } from "./editable-layer-composer";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import { composeFinalSlide, type FinalSlideComposition } from "./final-slide-compositor";
import { type ImageArtifactStore, type StoredSlideImageArtifact } from "./image-artifact-store";
import {
  buildLiveBackgroundBatch,
  validateLiveBackgroundBatch,
  type LiveBackgroundBatchIssue,
} from "./live-background-batch";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import { ImageProviderRequestError } from "./image-provider-errors";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { ProviderJobManager } from "./provider-job-manager";
import {
  runSlideGenerationQueue,
  type SlideGenerationFailure,
  type SlideGenerationQueueProgress,
} from "./slide-generation-queue";
import type { SlideGenerationRetryProvenance } from "./slide-generation-queue-types";
import type { ProviderJob } from "./provider-job-manager";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import type { SlideImageArtifact, SlideImageProvider } from "./slide-image-provider";
import { buildSlidePromptPackage, type SlidePromptPackage } from "./slide-prompt-package";
import { buildMinimalSlideSourceMap } from "./slide-source-map";
import type { PromptUsageRecord } from "./prompt-assets";

export type LiveSlideGenerationWorkflowIssueCode =
  | "mock_provider_not_allowed"
  | "unsupported_slide_count"
  | "missing_research"
  | "missing_layout"
  | "frozen_context_blocked"
  | "slide_context_blocked"
  | "chart_overlay_blocked"
  | "live_background_batch_blocked";

export type LiveSlideGenerationWorkflowIssue = {
  readonly code: LiveSlideGenerationWorkflowIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
};

export type LiveSlideGenerationWorkflowResult =
  | { readonly kind: "blocked"; readonly issues: readonly LiveSlideGenerationWorkflowIssue[] }
  | {
      readonly kind: "ready";
      readonly status: "succeeded";
      readonly slides: readonly GeneratedSlide[];
      readonly layers: readonly EditableLayerModel[];
      readonly compositions: readonly FinalSlideComposition[];
      readonly artifacts: readonly SlideImageArtifact[];
      readonly storedArtifacts: readonly StoredSlideImageArtifact[];
      readonly promptPackages: readonly SlidePromptPackage[];
      readonly providerLineage: readonly ProviderArtifactProvenance[];
      readonly jobs: readonly ProviderJob[];
      readonly promptUsages: readonly PromptUsageRecord[];
      readonly retryProvenance: readonly SlideGenerationRetryProvenance[];
      readonly progress: SlideGenerationQueueProgress;
    }
  | {
      readonly kind: "incomplete";
      readonly status: "partial_failure" | "failed";
      readonly slides: readonly GeneratedSlide[];
      readonly artifacts: readonly SlideImageArtifact[];
      readonly storedArtifacts: readonly StoredSlideImageArtifact[];
      readonly promptPackages: readonly SlidePromptPackage[];
      readonly jobs: readonly ProviderJob[];
      readonly promptUsages: readonly PromptUsageRecord[];
      readonly retryProvenance: readonly SlideGenerationRetryProvenance[];
      readonly failures: readonly SlideGenerationFailure[];
      readonly progress: SlideGenerationQueueProgress;
    };

export async function runLiveSlideGenerationWorkflow(input: {
  readonly project: DeckProject;
  readonly provider: SlideImageProvider;
  readonly store: ImageArtifactStore;
  readonly manager?: ProviderJobManager;
  readonly createdAt: number;
  readonly version?: number;
  readonly requiredSlideCount?: number;
  readonly maxParallel?: number;
  readonly isCancellationRequested?: () => boolean;
  readonly onProgress?: (progress: SlideGenerationQueueProgress) => void;
}): Promise<LiveSlideGenerationWorkflowResult> {
  const prerequisiteIssues = collectPrerequisiteIssues(input);
  if (prerequisiteIssues.length > 0) return { kind: "blocked", issues: prerequisiteIssues };

  const contextResult = createFrozenDeckContext(input.project, { now: () => input.createdAt });
  if (contextResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: contextResult.issues.map((message) => ({
        code: "frozen_context_blocked",
        message,
      })),
    };
  }

  const bundleResult = buildSlideContextBundles({
    project: input.project,
    context: contextResult.context,
  });
  if (bundleResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: bundleResult.issues.map((message) => ({
        code: "slide_context_blocked",
        message,
      })),
    };
  }

  const chartOverlays = buildBasicChartOverlays({
    research: requireResearch(input.project),
    layout: requireLayout(input.project),
    sourceMap: buildMinimalSlideSourceMap({
      slides: requirePlan(input.project).slides,
      research: requireResearch(input.project),
    }),
  });
  if (chartOverlays.fatalIssues.length > 0) {
    return {
      kind: "blocked",
      issues: chartOverlays.fatalIssues.map((issue) => ({
        code: "chart_overlay_blocked",
        slideNumber: issue.slideId === undefined ? undefined : slideNumberFromId(issue.slideId),
        message: issue.message,
      })),
    };
  }

  const artifactsBySlide = new Map<number, SlideImageArtifact>();
  const storedBySlide = new Map<number, StoredSlideImageArtifact>();
  const promptPackageBySlide = new Map<number, SlidePromptPackage>();
  const queueResult = await runSlideGenerationQueue({
    bundles: bundleResult.bundles,
    manager: input.manager,
    providerId: input.provider.id,
    maxParallel: input.maxParallel,
    isCancellationRequested: input.isCancellationRequested,
    onProgress: input.onProgress,
    generateSlide: async (workerInput) => {
      const promptPackage = buildSlidePromptPackage(workerInput.bundle);
      promptPackageBySlide.set(workerInput.bundle.slideSpec.slideNumber, promptPackage);
      const result = await generateAndStoreSlideImageArtifact({
        provider: input.provider,
        store: input.store,
        package: promptPackage,
        aspectRatio: input.project.aspectRatio,
        projectId: input.project.id,
        version: input.version ?? 1,
        createdAt: input.createdAt,
      });
      if (result.kind === "failed") {
        throw new ImageProviderRequestError(result.failure.errorKind, result.failure.errorMessage);
      }
      artifactsBySlide.set(result.artifact.slideNumber, result.artifact);
      storedBySlide.set(result.artifact.slideNumber, result.stored);
      return result.slide;
    },
  });

  if (queueResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: queueResult.issues.map((message) => ({
        code: "slide_context_blocked",
        message,
      })),
    };
  }

  const artifacts = valuesBySlideNumber(artifactsBySlide);
  const storedArtifacts = valuesBySlideNumber(storedBySlide);
  const promptPackages = valuesBySlideNumber(promptPackageBySlide);
  if (queueResult.status !== "succeeded") {
    return {
      kind: "incomplete",
      status: queueResult.status,
      slides: queueResult.slides,
      artifacts,
      storedArtifacts,
      promptPackages,
      jobs: queueResult.jobs,
      promptUsages: queueResult.promptUsages,
      retryProvenance: queueResult.retryProvenance,
      failures: queueResult.failures,
      progress: queueResult.progress,
    };
  }

  const batch = buildLiveBackgroundBatch({
    batchId: `live_backgrounds_${input.project.id}_v${input.version ?? 1}`,
    deckContextId: contextResult.context.deckContextId,
    designSystemId: requireDesign(input.project).id,
    artifacts,
    storedArtifacts,
    promptPackages,
  });
  const batchValidation = validateLiveBackgroundBatch(batch);
  if (batchValidation.kind === "blocked") {
    return {
      kind: "blocked",
      issues: batchValidation.issues.map(toWorkflowBatchIssue),
    };
  }

  const layerModels = bundleResult.bundles.map((bundle) =>
    composeMvpEditableLayers({ bundle, chartOverlays: chartOverlays.overlays }),
  );
  const compositions = composeFinalSlides({
    bundles: bundleResult.bundles,
    layerModels,
    artifacts,
    storedArtifacts,
  });

  return {
    kind: "ready",
    status: "succeeded",
    slides: queueResult.slides,
    layers: layerModels.map(toEditableLayerModel),
    compositions,
    artifacts,
    storedArtifacts,
    promptPackages,
    providerLineage: storedArtifacts.map((stored) => stored.provenance),
    jobs: queueResult.jobs,
    promptUsages: queueResult.promptUsages,
    retryProvenance: queueResult.retryProvenance,
    progress: queueResult.progress,
  };
}

function collectPrerequisiteIssues(input: {
  readonly project: DeckProject;
  readonly provider: SlideImageProvider;
  readonly requiredSlideCount?: number;
}): readonly LiveSlideGenerationWorkflowIssue[] {
  const requiredSlideCount = input.requiredSlideCount ?? 5;
  return [
    ...(input.provider.id === "mock"
      ? [
          {
            code: "mock_provider_not_allowed" as const,
            message: "Production live slide generation cannot use the mock image provider.",
          },
        ]
      : []),
    ...(input.project.plan?.slides.length === requiredSlideCount
      ? []
      : [
          {
            code: "unsupported_slide_count" as const,
            message: `Production MVP image generation requires exactly ${requiredSlideCount} slides.`,
          },
        ]),
    ...(input.project.research
      ? []
      : [
          {
            code: "missing_research" as const,
            message: "Approved research is required before live slide generation.",
          },
        ]),
    ...(input.project.layout
      ? []
      : [
          {
            code: "missing_layout" as const,
            message: "Approved layout is required before live slide generation.",
          },
        ]),
  ];
}

function composeFinalSlides(input: {
  readonly bundles: readonly SlideContextBundle[];
  readonly layerModels: readonly MvpEditableLayerModel[];
  readonly artifacts: readonly SlideImageArtifact[];
  readonly storedArtifacts: readonly StoredSlideImageArtifact[];
}): readonly FinalSlideComposition[] {
  return input.bundles.map((bundle) => {
    const background = requireBySlide(input.artifacts, bundle.slideSpec.slideNumber, "artifact");
    const stored = requireStoredBySlide(
      input.storedArtifacts,
      bundle.slideSpec.slideNumber,
      "stored artifact",
    );
    const layers = requireBySlide(input.layerModels, bundle.slideSpec.slideNumber, "layer model");
    return composeFinalSlide({
      background,
      layers,
      backgroundArtifact: {
        artifactId: stored.binary.artifactId,
        path: stored.binary.path,
        hash: stored.binary.hash,
      },
    });
  });
}

function toEditableLayerModel(model: MvpEditableLayerModel): EditableLayerModel {
  return {
    slideNumber: model.slideNumber,
    layers: model.layers.map((layer) => ({ ...layer })),
  };
}

function toWorkflowBatchIssue(issue: LiveBackgroundBatchIssue): LiveSlideGenerationWorkflowIssue {
  return {
    code: "live_background_batch_blocked",
    ...(issue.slideNumber === undefined ? {} : { slideNumber: issue.slideNumber }),
    message: issue.message,
  };
}

function requireBySlide<T extends { readonly slideNumber: number }>(
  values: readonly T[],
  slideNumber: number,
  label: string,
): T {
  const value = values.find((item) => item.slideNumber === slideNumber);
  if (!value) throw new Error(`Missing ${label} for slide ${slideNumber}.`);
  return value;
}

function requireStoredBySlide(
  values: readonly StoredSlideImageArtifact[],
  slideNumber: number,
  label: string,
): StoredSlideImageArtifact {
  const value = values.find((item) => item.metadata.slideNumber === slideNumber);
  if (!value) throw new Error(`Missing ${label} for slide ${slideNumber}.`);
  return value;
}

function valuesBySlideNumber<T>(values: ReadonlyMap<number, T>): readonly T[] {
  return [...values.entries()].sort(([left], [right]) => left - right).map(([, value]) => value);
}

function slideNumberFromId(slideId: string): number | undefined {
  const match = /^slide_(\d+)$/.exec(slideId);
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}

function requirePlan(project: DeckProject) {
  if (!project.plan) throw new Error("Expected approved plan.");
  return project.plan;
}

function requireDesign(project: DeckProject) {
  if (!project.design) throw new Error("Expected approved design.");
  return project.design;
}

function requireResearch(project: DeckProject) {
  if (!project.research) throw new Error("Expected approved research.");
  return project.research;
}

function requireLayout(project: DeckProject) {
  if (!project.layout) throw new Error("Expected approved layout.");
  return project.layout;
}
