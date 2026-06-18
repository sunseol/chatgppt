import { hashContent } from "./artifacts";
import type { GeneratedSlide, SlideSpec } from "./deck-types";
import type { StoredSlideImageArtifact } from "./image-artifact-store";
import { candidateIssues } from "./live-slide-regeneration-candidate";
import type { SlideRevisionRequest } from "./slide-revision-model";

export type LiveSlideRegenerationIssueCode =
  | "slide_spec_mismatch"
  | "deck_context_mismatch"
  | "design_system_mismatch"
  | "mock_background_artifact"
  | "background_artifact_not_new"
  | "background_artifact_version_mismatch"
  | "slide_id_mismatch"
  | "stale_candidate_version"
  | "missing_regeneration_request_id"
  | "regeneration_request_id_not_new";

export interface LiveSlideRegenerationIssue {
  readonly code: LiveSlideRegenerationIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
}

export interface LiveSlideRegenerationRequest {
  readonly requestId: string;
  readonly slideNumber: number;
  readonly originalSlideVersion: number;
  readonly deckContextId: string;
  readonly designSystemId: string;
  readonly slidePlanId: string;
  readonly slideSpecHash: string;
  readonly editInstruction: string;
  readonly mustKeep: readonly string[];
  readonly mustChange: readonly string[];
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}

export type BuildLiveSlideRegenerationRequestResult =
  | { readonly kind: "ready"; readonly request: LiveSlideRegenerationRequest }
  | { readonly kind: "blocked"; readonly issues: readonly LiveSlideRegenerationIssue[] };

export interface LiveSlideRegenerationCandidate {
  readonly requestId: string;
  readonly slide: GeneratedSlide;
  readonly originalBackgroundArtifactId: string;
  readonly backgroundArtifactId: string;
  readonly backgroundArtifactHash: string;
  readonly deckContextId: string;
  readonly designSystemId: string;
  readonly mustKeep: readonly string[];
  readonly mustChange: readonly string[];
  readonly beforeImageDescriptor: string;
  readonly afterImageDescriptor: string;
}

export interface LiveSlideRegenerationFailure {
  readonly requestId: string;
  readonly slideNumber: number;
  readonly retryable: true;
  readonly issues: readonly LiveSlideRegenerationIssue[];
  readonly userMessage: string;
}

export type LiveSlideRegenerationCandidateResult =
  | { readonly kind: "ready"; readonly candidate: LiveSlideRegenerationCandidate }
  | {
      readonly kind: "failed";
      readonly failure: LiveSlideRegenerationFailure;
      readonly preservedSlide: GeneratedSlide;
    };

export function buildLiveSlideRegenerationRequest(input: {
  readonly revisionRequest: SlideRevisionRequest;
  readonly deckContextId: string;
  readonly designSystemId: string;
  readonly slideSpec: SlideSpec;
  readonly currentSlide: GeneratedSlide;
  readonly originalBackgroundArtifactId: string;
  readonly originalBackgroundRequestId: string;
}): BuildLiveSlideRegenerationRequestResult {
  const issues = [
    ...slideSpecIssues(input.revisionRequest, input.slideSpec, input.currentSlide),
    ...designSystemIssues(input.revisionRequest, input.designSystemId),
  ];
  if (issues.length > 0) return { kind: "blocked", issues };
  return {
    kind: "ready",
    request: {
      requestId: input.revisionRequest.id,
      slideNumber: input.revisionRequest.slideNumber,
      originalSlideVersion: input.revisionRequest.originalSlideVersion,
      deckContextId: input.deckContextId,
      designSystemId: input.designSystemId,
      slidePlanId: input.revisionRequest.slidePlanId,
      slideSpecHash: hashContent(JSON.stringify(input.slideSpec)),
      editInstruction: input.revisionRequest.editInstruction,
      mustKeep: input.revisionRequest.mustKeep,
      mustChange: input.revisionRequest.mustChange,
      originalBackgroundArtifactId: input.originalBackgroundArtifactId,
      originalBackgroundRequestId: input.originalBackgroundRequestId,
    },
  };
}

export function createLiveSlideRegenerationCandidate(input: {
  readonly request: LiveSlideRegenerationRequest;
  readonly originalSlide: GeneratedSlide;
  readonly candidateBackground: StoredSlideImageArtifact;
  readonly candidateDeckContextId: string;
  readonly candidateDesignSystemId: string;
  readonly candidateVersion: number;
}): LiveSlideRegenerationCandidateResult {
  const issues = candidateIssues(input);
  if (issues.length > 0) {
    return {
      kind: "failed",
      failure: {
        requestId: input.request.requestId,
        slideNumber: input.request.slideNumber,
        retryable: true,
        issues,
        userMessage: `Slide ${input.request.slideNumber} regeneration failed validation.`,
      },
      preservedSlide: input.originalSlide,
    };
  }

  const imageDescriptor = [
    "live-regeneration",
    `request=${input.request.requestId}`,
    `background=${input.candidateBackground.binary.artifactId}`,
    `deckContext=${input.request.deckContextId}`,
    `designSystem=${input.request.designSystemId}`,
  ].join("|");
  const slide = {
    ...input.originalSlide,
    version: input.candidateVersion,
    status: "ready" as const,
    imageDescriptor,
    notes: input.request.editInstruction,
  };
  return {
    kind: "ready",
    candidate: {
      requestId: input.request.requestId,
      slide,
      originalBackgroundArtifactId: input.request.originalBackgroundArtifactId,
      backgroundArtifactId: input.candidateBackground.binary.artifactId,
      backgroundArtifactHash: input.candidateBackground.binary.hash,
      deckContextId: input.request.deckContextId,
      designSystemId: input.request.designSystemId,
      mustKeep: input.request.mustKeep,
      mustChange: input.request.mustChange,
      beforeImageDescriptor: input.originalSlide.imageDescriptor,
      afterImageDescriptor: imageDescriptor,
    },
  };
}

export function approveLiveSlideRegenerationCandidate(
  slides: readonly GeneratedSlide[],
  candidate: LiveSlideRegenerationCandidate,
): readonly GeneratedSlide[] {
  return slides.map((slide) =>
    slide.number === candidate.slide.number ? { ...candidate.slide, status: "approved" } : slide,
  );
}

function slideSpecIssues(
  request: SlideRevisionRequest,
  slideSpec: SlideSpec,
  currentSlide: GeneratedSlide,
): readonly LiveSlideRegenerationIssue[] {
  return request.slideNumber === slideSpec.number && request.slideNumber === currentSlide.number
    ? []
    : [
        {
          code: "slide_spec_mismatch",
          slideNumber: request.slideNumber,
          message: "Revision request, slide spec, and current slide must target the same slide.",
        },
      ];
}

function designSystemIssues(
  request: SlideRevisionRequest,
  designSystemId: string,
): readonly LiveSlideRegenerationIssue[] {
  return request.designSystemId === designSystemId
    ? []
    : [
        {
          code: "design_system_mismatch",
          slideNumber: request.slideNumber,
          message: "Revision request must keep the approved design system id.",
        },
      ];
}
