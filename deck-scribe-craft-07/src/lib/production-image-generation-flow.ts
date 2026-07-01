import { hashContent } from "./artifacts";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import {
  validateFullSlideDesignConsistency,
  type FullSlideDesignConsistencyValidation,
} from "./full-slide-design-consistency";
import { createFrozenDeckContext } from "./deck-context";
import type { ImageArtifactStore, StoredSlideImageArtifact } from "./image-artifact-store";
import {
  buildLiveBackgroundBatch,
  validateLiveBackgroundBatch,
  type LiveBackgroundBatchValidation,
} from "./live-background-batch";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import {
  approveLiveSlideRegenerationCandidate,
  buildLiveSlideRegenerationRequest,
  createLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import { createSlideRevisionRequest } from "./slide-revision-model";
import type { SlideImageArtifact, SlideImageProvider } from "./slide-image-provider";
import { buildSlideContextBundles } from "./slide-context-bundle";
import { buildSlidePromptPackage, type SlidePromptPackage } from "./slide-prompt-package";

export type ProductionImageGenerationFlowIssue = {
  readonly code:
    | "context_blocked"
    | "bundle_blocked"
    | "provider_failed"
    | "batch_blocked"
    | "slide_not_found"
    | "artifact_not_found"
    | "regeneration_blocked"
    | "design_consistency_blocked";
  readonly message: string;
  readonly slideNumber?: number;
};

export type ProductionImageGenerationProjectPatch = {
  readonly slides: GeneratedSlide[];
  readonly stage: DeckProject["stage"];
};

export type ProductionImageGenerationFlowResult =
  | {
      readonly kind: "ready";
      readonly promptPackages: readonly SlidePromptPackage[];
      readonly artifacts: readonly SlideImageArtifact[];
      readonly storedArtifacts: readonly StoredSlideImageArtifact[];
      readonly slides: readonly GeneratedSlide[];
      readonly designConsistencyValidation: FullSlideDesignConsistencyValidation;
      readonly batchValidation: LiveBackgroundBatchValidation;
      readonly projectPatch: ProductionImageGenerationProjectPatch;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly ProductionImageGenerationFlowIssue[];
    };

export type ProductionSlideRegenerationFlowResult =
  | {
      readonly kind: "ready";
      readonly promptPackage: SlidePromptPackage;
      readonly artifact: SlideImageArtifact;
      readonly storedArtifact: StoredSlideImageArtifact;
      readonly candidate: LiveSlideRegenerationCandidate;
      readonly projectPatch: ProductionImageGenerationProjectPatch;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly ProductionImageGenerationFlowIssue[];
    };

export async function runProductionImageGenerationFlow(input: {
  readonly project: DeckProject;
  readonly provider: SlideImageProvider;
  readonly store: ImageArtifactStore;
  readonly now?: () => number;
  readonly version?: number;
}): Promise<ProductionImageGenerationFlowResult> {
  const now = input.now ?? Date.now;
  const version = input.version ?? 1;

  const contextResult = createFrozenDeckContext(input.project, { now });
  if (contextResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: contextResult.issues.map((message) => ({ code: "context_blocked", message })),
    };
  }

  const bundleResult = buildSlideContextBundles({
    project: input.project,
    context: contextResult.context,
  });
  if (bundleResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: bundleResult.issues.map((message) => ({ code: "bundle_blocked", message })),
    };
  }

  const promptPackages = bundleResult.bundles.map(buildSlidePromptPackage);
  const designConsistencyValidation = validateFullSlideDesignConsistency(promptPackages);
  if (designConsistencyValidation.kind === "blocked") {
    return {
      kind: "blocked",
      issues: designConsistencyValidation.issues.map((issue) => ({
        code: "design_consistency_blocked",
        slideNumber: issue.slideNumber,
        message: issue.message,
      })),
    };
  }
  const artifacts: SlideImageArtifact[] = [];
  const storedArtifacts: StoredSlideImageArtifact[] = [];
  const slides: GeneratedSlide[] = [];
  const issues: ProductionImageGenerationFlowIssue[] = [];

  for (const promptPackage of promptPackages) {
    const result = await generateAndStoreSlideImageArtifact({
      provider: input.provider,
      store: input.store,
      package: promptPackage,
      aspectRatio: input.project.aspectRatio,
      projectId: input.project.id,
      version,
      createdAt: now(),
    });

    if (result.kind === "failed") {
      issues.push({
        code: "provider_failed",
        slideNumber: result.failure.slideNumber,
        message: result.failure.userMessage,
      });
      continue;
    }

    artifacts.push(result.artifact);
    storedArtifacts.push(result.stored);
    slides.push(result.slide);
  }

  if (issues.length > 0) return { kind: "blocked", issues };

  const batch = buildLiveBackgroundBatch({
    batchId: `${input.project.id}_live_background_batch_v${version}`,
    deckContextId: contextResult.context.deckContextId,
    designSystemId: contextResult.context.approvedArtifacts.designSystemId,
    artifacts,
    storedArtifacts,
    promptPackages,
  });
  const batchValidation = validateLiveBackgroundBatch(batch);
  if (batchValidation.kind === "blocked") {
    return {
      kind: "blocked",
      issues: batchValidation.issues.map((issue) => ({
        code: "batch_blocked",
        slideNumber: issue.slideNumber,
        message: issue.message,
      })),
    };
  }

  return {
    kind: "ready",
    promptPackages,
    artifacts,
    storedArtifacts,
    slides: slides.sort((left, right) => left.number - right.number),
    designConsistencyValidation,
    batchValidation,
    projectPatch: {
      slides: slides.sort((left, right) => left.number - right.number),
      stage: "SLIDE_REVIEW_PENDING",
    },
  };
}


export async function runProductionSlideRegenerationFlow(input: {
  readonly project: DeckProject;
  readonly provider: SlideImageProvider;
  readonly store: ImageArtifactStore;
  readonly storedArtifacts: readonly StoredSlideImageArtifact[];
  readonly slideNumber: number;
  readonly instruction: string;
  readonly now?: () => number;
  readonly createRevisionId?: () => string;
}): Promise<ProductionSlideRegenerationFlowResult> {
  const now = input.now ?? Date.now;
  const contextResult = createFrozenDeckContext(input.project, { now });
  if (contextResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: contextResult.issues.map((message) => ({ code: "context_blocked", message })),
    };
  }

  const originalSlide = input.project.slides?.find((slide) => slide.number === input.slideNumber);
  const slideSpec = input.project.plan?.slides.find((slide) => slide.number === input.slideNumber);
  if (!originalSlide || !slideSpec || !input.project.plan || !input.project.design) {
    return {
      kind: "blocked",
      issues: [
        {
          code: "slide_not_found",
          slideNumber: input.slideNumber,
          message: `Slide ${input.slideNumber} must exist with approved plan and design before regeneration.`,
        },
      ],
    };
  }

  const originalBackground = input.storedArtifacts.find(
    (artifact) => artifact.metadata.slideNumber === input.slideNumber &&
      artifact.binary.artifactId.endsWith(`_v${originalSlide.version}`),
  );
  if (!originalBackground) {
    return {
      kind: "blocked",
      issues: [
        {
          code: "artifact_not_found",
          slideNumber: input.slideNumber,
          message: `Slide ${input.slideNumber} original image artifact is required before regeneration.`,
        },
      ],
    };
  }

  const bundleResult = buildSlideContextBundles({
    project: input.project,
    context: contextResult.context,
  });
  if (bundleResult.kind === "blocked") {
    return {
      kind: "blocked",
      issues: bundleResult.issues.map((message) => ({ code: "bundle_blocked", message })),
    };
  }
  const bundle = bundleResult.bundles.find((item) => item.slideSpec.slideNumber === input.slideNumber);
  if (!bundle) {
    return {
      kind: "blocked",
      issues: [
        {
          code: "bundle_blocked",
          slideNumber: input.slideNumber,
          message: `Slide ${input.slideNumber} context bundle is required before regeneration.`,
        },
      ],
    };
  }

  const revisionRequest = createSlideRevisionRequest({
    projectId: input.project.id,
    instruction: input.instruction,
    slide: originalSlide,
    slideSpec,
    design: input.project.design,
    plan: input.project.plan,
    now,
    createId: input.createRevisionId,
  });
  const regenerationRequest = buildLiveSlideRegenerationRequest({
    revisionRequest,
    deckContextId: contextResult.context.deckContextId,
    designSystemId: contextResult.context.approvedArtifacts.designSystemId,
    slideSpec,
    currentSlide: originalSlide,
    originalBackgroundArtifactId: originalBackground.binary.artifactId,
  });
  if (regenerationRequest.kind === "blocked") {
    return {
      kind: "blocked",
      issues: regenerationRequest.issues.map((issue) => ({
        code: "regeneration_blocked",
        slideNumber: issue.slideNumber,
        message: issue.message,
      })),
    };
  }

  const promptPackage = revisionPromptPackage(
    buildSlidePromptPackage(bundle),
    regenerationRequest.request.editInstruction,
  );
  const candidateVersion = originalSlide.version + 1;
  const generated = await generateAndStoreSlideImageArtifact({
    provider: input.provider,
    store: input.store,
    package: promptPackage,
    aspectRatio: input.project.aspectRatio,
    projectId: input.project.id,
    version: candidateVersion,
    createdAt: now(),
  });
  if (generated.kind === "failed") {
    return {
      kind: "blocked",
      issues: [
        {
          code: "provider_failed",
          slideNumber: generated.failure.slideNumber,
          message: generated.failure.userMessage,
        },
      ],
    };
  }

  const candidateResult = createLiveSlideRegenerationCandidate({
    request: regenerationRequest.request,
    originalSlide,
    candidateBackground: generated.stored,
    candidateDeckContextId: contextResult.context.deckContextId,
    candidateDesignSystemId: contextResult.context.approvedArtifacts.designSystemId,
    candidateVersion,
  });
  if (candidateResult.kind === "failed") {
    return {
      kind: "blocked",
      issues: candidateResult.failure.issues.map((issue) => ({
        code: "regeneration_blocked",
        slideNumber: issue.slideNumber,
        message: issue.message,
      })),
    };
  }

  const slides = [...approveLiveSlideRegenerationCandidate(input.project.slides ?? [], candidateResult.candidate)];
  return {
    kind: "ready",
    promptPackage,
    artifact: generated.artifact,
    storedArtifact: generated.stored,
    candidate: candidateResult.candidate,
    projectPatch: {
      slides,
      stage: "SLIDE_REVIEW_PENDING",
    },
  };
}

function revisionPromptPackage(
  pkg: SlidePromptPackage,
  editInstruction: string,
): SlidePromptPackage {
  const prompt = [
    pkg.prompt,
    "",
    "Regeneration instruction:",
    editInstruction,
    "Keep the approved deck context, design system, and editable overlay exclusions unchanged.",
  ].join("\n");
  return {
    ...pkg,
    prompt,
    promptHash: hashContent(prompt),
  };
}
