import type { StoredSlideImageArtifact } from "./image-artifact-store";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";
import type { SlideImageArtifact } from "./slide-image-provider";
import type { SlidePromptPackage } from "./slide-prompt-package";

export type LiveBackgroundBatchIssueCode =
  | "expected_five_artifacts"
  | "missing_prompt_package"
  | "mock_provider_output"
  | "deck_context_mismatch"
  | "design_system_mismatch"
  | "missing_text_overlay_rule"
  | "missing_provider_request_metadata"
  | "missing_stored_background_artifact"
  | "stored_background_artifact_mismatch"
  | "invalid_image_binary"
  | "layout_reference_mismatch"
  | "wrong_aspect_ratio"
  | "slide_id_mismatch";

export type LiveBackgroundBatchIssue = {
  readonly code: LiveBackgroundBatchIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
};

export type LiveBackgroundBatchValidation =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveBackgroundBatchIssue[] };

export type LiveBackgroundBatch = {
  readonly batchId: string;
  readonly deckContextId: string;
  readonly designSystemId: string;
  readonly artifacts: readonly SlideImageArtifact[];
  readonly storedArtifacts?: readonly StoredSlideImageArtifact[];
  readonly promptPackages: readonly SlidePromptPackage[];
};

export function buildLiveBackgroundBatch(input: LiveBackgroundBatch): LiveBackgroundBatch {
  return input;
}

export function validateLiveBackgroundBatch(
  batch: LiveBackgroundBatch,
): LiveBackgroundBatchValidation {
  const issues = [
    ...batchSizeIssues(batch),
    ...batch.artifacts.flatMap((artifact, index) => artifactIssues(artifact, batch, index)),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function getRetryableBackgroundSlideNumbers(
  result: SlideGenerationQueueResult,
): readonly number[] {
  if (result.kind === "blocked") return [];
  return result.failures
    .filter((failure) => failure.retryable)
    .map((failure) => failure.slideNumber);
}

function batchSizeIssues(batch: LiveBackgroundBatch): readonly LiveBackgroundBatchIssue[] {
  return batch.artifacts.length === 5
    ? []
    : [
        {
          code: "expected_five_artifacts",
          message: "Live background generation requires exactly five artifacts.",
        },
      ];
}

function artifactIssues(
  artifact: SlideImageArtifact,
  batch: LiveBackgroundBatch,
  index: number,
): readonly LiveBackgroundBatchIssue[] {
  const pkg = batch.promptPackages[index];
  if (!pkg) {
    return [
      {
        code: "missing_prompt_package",
        slideNumber: artifact.slideNumber,
        message: `Missing prompt package for slide ${artifact.slideNumber}.`,
      },
    ];
  }
  return [
    ...providerIssues(artifact),
    ...storedArtifactIssues(artifact, batch, index),
    ...binaryIssues(artifact),
    ...requestMetadataIssues(artifact),
    ...aspectIssues(artifact),
    ...slideIdIssues(artifact, pkg),
    ...layoutReferenceIssues(artifact, pkg),
    ...contextIssues(pkg, batch),
    ...textOverlayIssues(pkg),
  ];
}

function providerIssues(artifact: SlideImageArtifact): readonly LiveBackgroundBatchIssue[] {
  return artifact.providerId === "mock"
    ? [
        {
          code: "mock_provider_output",
          slideNumber: artifact.slideNumber,
          message: "Live background artifacts must come from a real provider.",
        },
      ]
    : [];
}

function storedArtifactIssues(
  artifact: SlideImageArtifact,
  batch: LiveBackgroundBatch,
  index: number,
): readonly LiveBackgroundBatchIssue[] {
  const stored = batch.storedArtifacts?.[index];
  if (!stored) {
    return [
      {
        code: "missing_stored_background_artifact",
        slideNumber: artifact.slideNumber,
        message: "Live background artifact must be stored as a versioned binary artifact.",
      },
    ];
  }
  return storedArtifactMatches(artifact, stored)
    ? []
    : [
        {
          code: "stored_background_artifact_mismatch",
          slideNumber: artifact.slideNumber,
          message: "Stored background artifact metadata must match the live image artifact.",
        },
      ];
}

function storedArtifactMatches(
  artifact: SlideImageArtifact,
  stored: StoredSlideImageArtifact,
): boolean {
  return (
    stored.metadata.providerId === artifact.providerId &&
    stored.metadata.slideNumber === artifact.slideNumber &&
    stored.metadata.aspectRatio === artifact.aspectRatio &&
    stored.metadata.canvas.width === artifact.canvas.width &&
    stored.metadata.canvas.height === artifact.canvas.height &&
    stored.metadata.layoutReference.screenshot === artifact.layoutReference.screenshot &&
    stored.metadata.layoutReference.mode === artifact.layoutReference.mode &&
    stored.metadata.prompt.id === artifact.prompt.id &&
    stored.metadata.prompt.version === artifact.prompt.version &&
    stored.metadata.prompt.hash === artifact.prompt.hash &&
    stored.binary.path.endsWith(".png") &&
    /^sha256:[a-f0-9]{64}$/.test(stored.binary.hash) &&
    stored.provenance.fixture === false
  );
}

function binaryIssues(artifact: SlideImageArtifact): readonly LiveBackgroundBatchIssue[] {
  return hasPngSignatureDataUrl(artifact.imageDataUrl)
    ? []
    : [
        {
          code: "invalid_image_binary",
          slideNumber: artifact.slideNumber,
          message: "Live background artifact must contain PNG binary output.",
        },
      ];
}

function requestMetadataIssues(artifact: SlideImageArtifact): readonly LiveBackgroundBatchIssue[] {
  return artifact.request?.requestId
    ? []
    : [
        {
          code: "missing_provider_request_metadata",
          slideNumber: artifact.slideNumber,
          message: "Live background artifact must include provider request metadata.",
        },
      ];
}

function aspectIssues(artifact: SlideImageArtifact): readonly LiveBackgroundBatchIssue[] {
  return artifact.aspectRatio === "16:9" &&
    artifact.canvas.width === 1600 &&
    artifact.canvas.height === 900
    ? []
    : [
        {
          code: "wrong_aspect_ratio",
          slideNumber: artifact.slideNumber,
          message: "Live background artifact must be 16:9.",
        },
      ];
}

function hasPngSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo");
}

function slideIdIssues(
  artifact: SlideImageArtifact,
  pkg: SlidePromptPackage,
): readonly LiveBackgroundBatchIssue[] {
  return artifact.slideNumber === pkg.slideNumber
    ? []
    : [
        {
          code: "slide_id_mismatch",
          slideNumber: artifact.slideNumber,
          message: "Image artifact slide id must match the prompt package slide id.",
        },
      ];
}

function layoutReferenceIssues(
  artifact: SlideImageArtifact,
  pkg: SlidePromptPackage,
): readonly LiveBackgroundBatchIssue[] {
  return artifact.layoutReference.mode === "composition-reference" &&
    artifact.layoutReference.screenshot === pkg.layoutScreenshot
    ? []
    : [
        {
          code: "layout_reference_mismatch",
          slideNumber: artifact.slideNumber,
          message: "Layout screenshot must be passed as the composition reference.",
        },
      ];
}

function contextIssues(
  pkg: SlidePromptPackage,
  batch: LiveBackgroundBatch,
): readonly LiveBackgroundBatchIssue[] {
  return [
    ...(pkg.deckContextId === batch.deckContextId
      ? []
      : [
          {
            code: "deck_context_mismatch" as const,
            slideNumber: pkg.slideNumber,
            message: "All live backgrounds must share one deck context id.",
          },
        ]),
    ...(pkg.designSystemId === batch.designSystemId
      ? []
      : [
          {
            code: "design_system_mismatch" as const,
            slideNumber: pkg.slideNumber,
            message: "All live backgrounds must share one design system id.",
          },
        ]),
  ];
}

function textOverlayIssues(pkg: SlidePromptPackage): readonly LiveBackgroundBatchIssue[] {
  return pkg.prompt.includes("Do not render exact title")
    ? []
    : [
        {
          code: "missing_text_overlay_rule",
          slideNumber: pkg.slideNumber,
          message: "Prompt package must include the exact text overlay exclusion rule.",
        },
      ];
}
