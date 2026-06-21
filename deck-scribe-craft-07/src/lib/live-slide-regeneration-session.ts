import type { DeckProject, GeneratedSlide, SlideSpec } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import type { ImageArtifactStore, StoredSlideImageArtifact } from "./image-artifact-store";
import {
  type CodexImageClient,
  type CodexImageClientRequest,
  createCodexImageProvider,
} from "./codex-image-provider";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import {
  buildLiveSlideRegenerationRequest,
  createLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { buildSlidePromptPackage, type SlidePromptPackage } from "./slide-prompt-package";
import { createSlideRevisionRequest } from "./slide-revision-model";
import type {
  SlideRevisionComparison,
  SlideRevisionPreservationCheck,
} from "./slide-revision-generation";

export type CodexLiveSlideRegenerationClientRequest = CodexImageClientRequest;

export type CodexLiveSlideRegenerationSessionInput = {
  readonly project: DeckProject;
  readonly slideNumber: number;
  readonly instruction: string;
  readonly originalBackground: {
    readonly artifactId: string;
    readonly providerRunId: string;
  };
  readonly client: CodexImageClient;
  readonly store: ImageArtifactStore;
  readonly now?: () => number;
  readonly createId?: () => string;
};

export type CodexLiveSlideRegenerationSessionResult =
  | {
      readonly kind: "ready";
      readonly candidate: LiveSlideRegenerationCandidate;
      readonly comparison: SlideRevisionComparison;
      readonly stored: StoredSlideImageArtifact;
    }
  | {
      readonly kind: "failed";
      readonly preservedSlide: GeneratedSlide;
      readonly issues: readonly string[];
      readonly userMessage: string;
    }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export async function runCodexLiveSlideRegenerationSession(
  input: CodexLiveSlideRegenerationSessionInput,
): Promise<CodexLiveSlideRegenerationSessionResult> {
  const contextResult = createFrozenDeckContext(input.project, { now: input.now });
  if (contextResult.kind === "blocked") return { kind: "blocked", issues: contextResult.issues };

  const bundleResult = buildSlideContextBundles({
    project: input.project,
    context: contextResult.context,
  });
  if (bundleResult.kind === "blocked") return { kind: "blocked", issues: bundleResult.issues };

  const lookup = sessionLookup(input, bundleResult.bundles);
  if (lookup.kind === "blocked") return lookup;

  const revisionRequest = createSlideRevisionRequest({
    projectId: input.project.id,
    instruction: input.instruction,
    slide: lookup.originalSlide,
    slideSpec: lookup.slideSpec,
    design: lookup.design,
    plan: lookup.plan,
    now: input.now,
    createId: input.createId,
  });
  const requestResult = buildLiveSlideRegenerationRequest({
    revisionRequest,
    deckContextId: lookup.bundle.deckContextId,
    designSystemId: lookup.bundle.designSystemId,
    slideSpec: lookup.slideSpec,
    currentSlide: lookup.originalSlide,
    originalBackgroundArtifactId: input.originalBackground.artifactId,
    originalBackgroundRequestId: input.originalBackground.providerRunId,
  });
  if (requestResult.kind === "blocked") {
    return { kind: "blocked", issues: requestResult.issues.map((issue) => issue.message) };
  }

  const storedResult = await generateAndStoreSlideImageArtifact({
    provider: createCodexImageProvider(input.client, { now: input.now }),
    store: input.store,
    package: regenerationPromptPackage(lookup.bundle, requestResult.request),
    aspectRatio: input.project.aspectRatio,
    projectId: input.project.id,
    version: lookup.originalSlide.version + 1,
    createdAt: input.now?.() ?? Date.now(),
    extraInputArtifactIds: [input.originalBackground.artifactId],
  });
  if (storedResult.kind === "failed") {
    return {
      kind: "failed",
      preservedSlide: lookup.originalSlide,
      issues: [storedResult.failure.errorMessage],
      userMessage: storedResult.failure.userMessage,
    };
  }

  const candidateResult = createLiveSlideRegenerationCandidate({
    request: requestResult.request,
    originalSlide: lookup.originalSlide,
    candidateBackground: storedResult.stored,
    candidateDeckContextId: lookup.bundle.deckContextId,
    candidateDesignSystemId: lookup.bundle.designSystemId,
    candidateSlideSpec: lookup.slideSpec,
    candidateVersion: lookup.originalSlide.version + 1,
  });
  if (candidateResult.kind === "failed") {
    return {
      kind: "failed",
      preservedSlide: candidateResult.preservedSlide,
      issues: candidateResult.failure.issues.map((issue) => issue.message),
      userMessage: candidateResult.failure.userMessage,
    };
  }

  return {
    kind: "ready",
    candidate: candidateResult.candidate,
    comparison: regenerationComparison(lookup.originalSlide, candidateResult.candidate),
    stored: storedResult.stored,
  };
}

type SessionLookupResult =
  | {
      readonly kind: "ready";
      readonly originalSlide: GeneratedSlide;
      readonly slideSpec: SlideSpec;
      readonly bundle: SlideContextBundle;
      readonly design: NonNullable<DeckProject["design"]>;
      readonly plan: NonNullable<DeckProject["plan"]>;
    }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

function sessionLookup(
  input: CodexLiveSlideRegenerationSessionInput,
  bundles: readonly SlideContextBundle[],
): SessionLookupResult {
  const originalSlide = input.project.slides?.find((slide) => slide.number === input.slideNumber);
  const slideSpec = input.project.plan?.slides.find((slide) => slide.number === input.slideNumber);
  const bundle = bundles.find((item) => item.slideSpec.slideNumber === input.slideNumber);
  const design = input.project.design;
  const plan = input.project.plan;
  const issues = [
    ...(originalSlide === undefined ? ["Selected slide is missing."] : []),
    ...(slideSpec === undefined ? ["Selected slide spec is missing."] : []),
    ...(bundle === undefined ? ["Selected slide context bundle is missing."] : []),
    ...(design === undefined ? ["Approved design system is required."] : []),
    ...(plan === undefined ? ["Approved deck plan is required."] : []),
  ];
  if (
    issues.length > 0 ||
    originalSlide === undefined ||
    slideSpec === undefined ||
    bundle === undefined ||
    design === undefined ||
    plan === undefined
  ) {
    return { kind: "blocked", issues };
  }
  return { kind: "ready", originalSlide, slideSpec, bundle, design, plan };
}

function regenerationPromptPackage(
  bundle: SlideContextBundle,
  request: {
    readonly requestId: string;
    readonly editInstruction: string;
    readonly mustKeep: readonly string[];
    readonly mustChange: readonly string[];
    readonly originalBackgroundArtifactId: string;
  },
): SlidePromptPackage {
  const base = buildSlidePromptPackage(bundle);
  return {
    ...base,
    prompt: [
      base.prompt,
      "",
      "[FULL SLIDE REGENERATION REQUEST]",
      `- Regeneration request id: ${request.requestId}`,
      `- Edit instruction: ${request.editInstruction}`,
      `- Original background artifact id: ${request.originalBackgroundArtifactId}`,
      `- Must keep: ${joinOrNone(request.mustKeep)}`,
      `- Must change: ${joinOrNone(request.mustChange)}`,
      "- Produce a complete replacement slide image, not a partial patch.",
      "- Preserve every must-keep target unless it directly conflicts with the edit instruction.",
    ].join("\n"),
  };
}

function regenerationComparison(
  originalSlide: GeneratedSlide,
  candidate: LiveSlideRegenerationCandidate,
): SlideRevisionComparison {
  const checks = preservationChecks(candidate.mustKeep, candidate.requestId);
  return {
    slideNumber: candidate.slide.number,
    originalSlideVersion: originalSlide.version,
    revisedSlideVersion: candidate.slide.version,
    beforeImageDescriptor: candidate.beforeImageDescriptor,
    afterImageDescriptor: candidate.afterImageDescriptor,
    requestedChanges: candidate.mustChange,
    preservedTargets: candidate.mustKeep,
    preservationChecks: checks,
    summary: `Slide ${candidate.slide.number} live regeneration ${candidate.requestId} is ready for approval.`,
  };
}

function preservationChecks(
  targets: readonly string[],
  requestId: string,
): readonly SlideRevisionPreservationCheck[] {
  return targets.map((target) => ({
    target,
    status: "kept",
    message: `${target} preserved by live regeneration request ${requestId}.`,
  }));
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
