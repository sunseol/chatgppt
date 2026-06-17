import { hashContent } from "./artifacts";
import type { GeneratedSlide } from "./deck-types";
import type { SlideRevisionRequest } from "./slide-revision-model";

export type SlideRevisionPreservationStatus = "kept" | "changed" | "missing";

export interface SlideRevisionOriginalImage {
  readonly artifactId: string;
  readonly imageDataUrl: string;
  readonly hash: string;
}

export interface SlideRevisionPreservationCheck {
  readonly target: string;
  readonly status: SlideRevisionPreservationStatus;
  readonly message: string;
}

export interface SlideRevisionGenerationProviderInput {
  readonly request: SlideRevisionRequest;
  readonly originalSlide: GeneratedSlide;
  readonly originalImage: SlideRevisionOriginalImage;
}

export interface SlideRevisionGenerationCandidate {
  readonly imageDescriptor: string;
  readonly preservationChecks: readonly SlideRevisionPreservationCheck[];
}

export interface SlideRevisionGenerationProvider {
  readonly id: string;
  generate(input: SlideRevisionGenerationProviderInput): Promise<SlideRevisionGenerationCandidate>;
}

export interface SlideRevisionComparison {
  readonly slideNumber: number;
  readonly originalSlideVersion: number;
  readonly revisedSlideVersion: number;
  readonly beforeImageDescriptor: string;
  readonly afterImageDescriptor: string;
  readonly requestedChanges: readonly string[];
  readonly preservedTargets: readonly string[];
  readonly preservationChecks: readonly SlideRevisionPreservationCheck[];
  readonly summary: string;
}

export interface SlideRevisionGenerationArtifact {
  readonly id: string;
  readonly projectId: string;
  readonly type: "slide_revision_generation";
  readonly path: string;
  readonly hash: string;
  readonly createdAt: number;
  readonly revisionRequestId: string;
  readonly slideNumber: number;
  readonly version: number;
}

export interface SlideRevisionGenerationFailure {
  readonly code: "must-keep-changed";
  readonly providerId: string;
  readonly slideNumber: number;
  readonly retryable: true;
  readonly changedKeepItems: readonly string[];
  readonly userMessage: string;
}

export type SlideRevisionGenerationResult =
  | {
      readonly kind: "ready";
      readonly slide: GeneratedSlide;
      readonly artifact: SlideRevisionGenerationArtifact;
      readonly comparison: SlideRevisionComparison;
    }
  | {
      readonly kind: "failed";
      readonly failure: SlideRevisionGenerationFailure;
      readonly comparison: SlideRevisionComparison;
    };

export interface GeneratePreservedSlideRevisionInput {
  readonly projectId: string;
  readonly request: SlideRevisionRequest;
  readonly originalSlide: GeneratedSlide;
  readonly originalImage: SlideRevisionOriginalImage;
  readonly provider: SlideRevisionGenerationProvider;
  readonly now?: () => number;
}

export function createMockSlideRevisionGenerationProvider(
  options: {
    readonly changedKeepItems?: readonly string[];
  } = {},
): SlideRevisionGenerationProvider {
  return {
    id: "mock",
    async generate(input) {
      const changed = new Set(options.changedKeepItems ?? []);
      return {
        imageDescriptor: mockRevisionDescriptor(input),
        preservationChecks: input.request.mustKeep.map((target) => ({
          target,
          status: changed.has(target) ? "changed" : "kept",
          message: changed.has(target)
            ? `${target} changed during revision.`
            : `${target} preserved.`,
        })),
      };
    },
  };
}

export async function generatePreservedSlideRevision(
  input: GeneratePreservedSlideRevisionInput,
): Promise<SlideRevisionGenerationResult> {
  const candidate = await input.provider.generate({
    request: input.request,
    originalSlide: input.originalSlide,
    originalImage: input.originalImage,
  });
  const revisedVersion = input.originalSlide.version + 1;
  const comparison = createComparison(input, candidate, revisedVersion);
  const failedChecks = comparison.preservationChecks.filter((check) => check.status !== "kept");

  if (failedChecks.length > 0) {
    return {
      kind: "failed",
      failure: {
        code: "must-keep-changed",
        providerId: input.provider.id,
        slideNumber: input.request.slideNumber,
        retryable: true,
        changedKeepItems: failedChecks.map((check) => check.target),
        userMessage: `Slide ${input.request.slideNumber} revision changed preserved targets: ${failedChecks
          .map((check) => check.target)
          .join(", ")}.`,
      },
      comparison,
    };
  }

  const slide = createRevisedSlide(input.originalSlide, input.request, candidate, revisedVersion);
  return {
    kind: "ready",
    slide,
    artifact: createRevisionArtifact(input, candidate, comparison, revisedVersion),
    comparison,
  };
}

function createRevisedSlide(
  originalSlide: GeneratedSlide,
  request: SlideRevisionRequest,
  candidate: SlideRevisionGenerationCandidate,
  revisedVersion: number,
): GeneratedSlide {
  return {
    ...originalSlide,
    version: revisedVersion,
    status: "ready",
    imageDescriptor: candidate.imageDescriptor,
    notes: request.editInstruction,
  };
}

function createComparison(
  input: GeneratePreservedSlideRevisionInput,
  candidate: SlideRevisionGenerationCandidate,
  revisedVersion: number,
): SlideRevisionComparison {
  const preservationChecks = checkedMustKeepTargets(input.request, candidate.preservationChecks);
  return {
    slideNumber: input.request.slideNumber,
    originalSlideVersion: input.originalSlide.version,
    revisedSlideVersion: revisedVersion,
    beforeImageDescriptor: input.originalSlide.imageDescriptor,
    afterImageDescriptor: candidate.imageDescriptor,
    requestedChanges: input.request.mustChange,
    preservedTargets: input.request.mustKeep,
    preservationChecks,
    summary: comparisonSummary(input.request, preservationChecks.length, revisedVersion),
  };
}

function checkedMustKeepTargets(
  request: SlideRevisionRequest,
  checks: readonly SlideRevisionPreservationCheck[],
): readonly SlideRevisionPreservationCheck[] {
  return request.mustKeep.map((target) => {
    const check = checks.find((candidate) => candidate.target === target);
    return (
      check ?? {
        target,
        status: "missing",
        message: `${target} was not verified during revision.`,
      }
    );
  });
}

function createRevisionArtifact(
  input: GeneratePreservedSlideRevisionInput,
  candidate: SlideRevisionGenerationCandidate,
  comparison: SlideRevisionComparison,
  revisedVersion: number,
): SlideRevisionGenerationArtifact {
  const artifactWithoutHash = {
    id: `${input.request.id}_generation_v${revisedVersion}`,
    projectId: input.projectId,
    type: "slide_revision_generation",
    path: revisionGenerationPath(
      input.projectId,
      input.request.slideNumber,
      input.request.id,
      revisedVersion,
    ),
    createdAt: input.now?.() ?? Date.now(),
    revisionRequestId: input.request.id,
    slideNumber: input.request.slideNumber,
    version: revisedVersion,
  } as const;
  return {
    ...artifactWithoutHash,
    hash: hashContent(
      JSON.stringify({
        artifact: artifactWithoutHash,
        originalImageHash: input.originalImage.hash,
        imageDescriptor: candidate.imageDescriptor,
        comparison,
      }),
    ),
  };
}

function revisionGenerationPath(
  projectId: string,
  slideNumber: number,
  revisionRequestId: string,
  version: number,
): string {
  return `projects/${projectId}/slides/slide_${String(slideNumber).padStart(
    2,
    "0",
  )}/revisions/${revisionRequestId}/generation_v${version}.json`;
}

function mockRevisionDescriptor(input: SlideRevisionGenerationProviderInput): string {
  return [
    "revision",
    `provider=mock`,
    `slide=${input.request.slideNumber}`,
    `source=${input.originalImage.hash}`,
    `artifact=${input.originalImage.artifactId}`,
    `instruction=${input.request.editInstruction}`,
    `change=${input.request.mustChange.join("+")}`,
  ].join("|");
}

function comparisonSummary(
  request: SlideRevisionRequest,
  preservedCount: number,
  revisedVersion: number,
): string {
  return `Slide ${request.slideNumber} revision v${revisedVersion} keeps ${preservedCount} targets and changes ${request.mustChange.join(
    ", ",
  )}.`;
}
