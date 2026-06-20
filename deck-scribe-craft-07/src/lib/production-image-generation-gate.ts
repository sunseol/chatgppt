import { type ImagePathBlockerCode, type ImagePathDecisionRecord } from "./image-path-decision";
import {
  parseVersionedProjectImageArtifactPath,
  parseVersionedProjectImageProvenancePath,
  type VersionedProjectImageArtifactAddress,
} from "./image-artifact-path";
import type { SlideImageProviderId } from "./slide-image-provider";

export type ImageGenerationExecutionMode = "development" | "production";

type PersistedImagePathDecisionRecord = Omit<ImagePathDecisionRecord, "fixtureFallbackAllowed"> & {
  readonly fixtureFallbackAllowed: boolean;
};

export type ProductionImageGenerationIssueCode =
  | "missing_image_path_decision"
  | "image_path_not_locked"
  | "fixture_fallback_enabled"
  | ImagePathBlockerCode;

export type ProductionImageGenerationIssue = {
  readonly code: ProductionImageGenerationIssueCode;
  readonly message: string;
};

export type ProductionImageGenerationGate =
  | {
      readonly kind: "ready";
      readonly executionMode: "development";
      readonly providerId: Extract<SlideImageProviderId, "mock">;
    }
  | {
      readonly kind: "ready";
      readonly executionMode: "production";
      readonly providerId: Exclude<SlideImageProviderId, "mock">;
      readonly decisionId: string;
      readonly binaryArtifactPath: string;
      readonly provenanceArtifactPath: string;
      readonly requestId?: string;
    }
  | {
      readonly kind: "blocked";
      readonly executionMode: "production";
      readonly providerId?: Exclude<SlideImageProviderId, "mock">;
      readonly issues: readonly ProductionImageGenerationIssue[];
    };

export function createProductionImageGenerationGate(input: {
  readonly executionMode: ImageGenerationExecutionMode;
  readonly imagePathDecision?: PersistedImagePathDecisionRecord;
}): ProductionImageGenerationGate {
  if (input.executionMode === "development") {
    return {
      kind: "ready",
      executionMode: "development",
      providerId: "mock",
    };
  }

  const decision = input.imagePathDecision;
  if (decision === undefined) {
    return {
      kind: "blocked",
      executionMode: "production",
      issues: [
        {
          code: "missing_image_path_decision",
          message: "Production image generation requires a locked image path decision record.",
        },
      ],
    };
  }

  const binaryArtifactPath = decision.binaryArtifactPath;
  const provenanceArtifactPath = decision.provenanceArtifactPath;
  const persistedRequestId = decision.requestId;
  const requestId = persistedRequestId?.trim();
  const issues = decisionIssues(
    decision,
    binaryArtifactPath,
    provenanceArtifactPath,
    requestId,
    persistedRequestId,
  );
  if (issues.length > 0) {
    return {
      kind: "blocked",
      executionMode: "production",
      providerId: decision.providerId,
      issues,
    };
  }

  if (binaryArtifactPath === undefined) {
    return {
      kind: "blocked",
      executionMode: "production",
      providerId: decision.providerId,
      issues: [
        {
          code: "missing_binary_artifact",
          message: "Production image generation requires stored binary artifact evidence.",
        },
      ],
    };
  }
  if (provenanceArtifactPath === undefined) {
    return {
      kind: "blocked",
      executionMode: "production",
      providerId: decision.providerId,
      issues: [
        {
          code: "missing_provenance_artifact",
          message: "Production image generation requires provider provenance evidence.",
        },
      ],
    };
  }

  return {
    kind: "ready",
    executionMode: "production",
    providerId: decision.providerId,
    decisionId: decision.decisionId,
    binaryArtifactPath,
    provenanceArtifactPath,
    ...(requestId === undefined ? {} : { requestId }),
  };
}

function decisionIssues(
  decision: PersistedImagePathDecisionRecord,
  binaryArtifactPath: string | undefined,
  provenanceArtifactPath: string | undefined,
  requestId: string | undefined,
  persistedRequestId: string | undefined,
): readonly ProductionImageGenerationIssue[] {
  const binaryAddress =
    binaryArtifactPath === undefined
      ? undefined
      : parseVersionedProjectImageArtifactPath(binaryArtifactPath);
  const provenanceAddress =
    provenanceArtifactPath === undefined
      ? undefined
      : parseVersionedProjectImageProvenancePath(provenanceArtifactPath);
  const hasNonCanonicalRequestId =
    decision.providerId === "openaiImage" &&
    persistedRequestId !== undefined &&
    persistedRequestId.trim().length > 0 &&
    persistedRequestId !== requestId;
  return [
    ...(decision.status === "locked"
      ? []
      : [
          {
            code: "image_path_not_locked" as const,
            message: "Production image generation is blocked until the image path is locked.",
          },
        ]),
    ...decision.blockers.map((blocker) => ({
      code: blocker.code,
      message: blocker.message,
    })),
    ...(decision.fixtureFallbackAllowed === false
      ? []
      : [
          {
            code: "fixture_fallback_enabled" as const,
            message: "Production image generation cannot use a fixture fallback path.",
          },
        ]),
    ...(binaryArtifactPath === undefined || binaryArtifactPath.length === 0
      ? [
          {
            code: "missing_binary_artifact" as const,
            message: "Production image generation requires stored binary artifact evidence.",
          },
        ]
      : []),
    ...(binaryArtifactPath && binaryAddress === undefined
      ? [
          {
            code: "invalid_binary_artifact_path" as const,
            message:
              "Production image generation requires versioned project image artifact storage.",
          },
        ]
      : []),
    ...(provenanceArtifactPath === undefined || provenanceArtifactPath.length === 0
      ? [
          {
            code: "missing_provenance_artifact" as const,
            message: "Production image generation requires provider provenance evidence.",
          },
        ]
      : []),
    ...(provenanceArtifactPath && provenanceAddress === undefined
      ? [
          {
            code: "invalid_provenance_artifact_path" as const,
            message: "Production image generation requires versioned provider provenance storage.",
          },
        ]
      : []),
    ...evidencePairIssues(binaryAddress, provenanceAddress),
    ...(decision.providerId === "openaiImage" && !requestId
      ? [
          {
            code: "missing_request_id" as const,
            message: "OpenAI image production generation requires a provider request id.",
          },
        ]
      : []),
    ...(hasNonCanonicalRequestId
      ? [
          {
            code: "provenance_request_id_mismatch" as const,
            message: "OpenAI image production generation requires a canonical provider request id.",
          },
        ]
      : []),
  ];
}

function evidencePairIssues(
  binaryAddress: VersionedProjectImageArtifactAddress | undefined,
  provenanceAddress: VersionedProjectImageArtifactAddress | undefined,
): readonly ProductionImageGenerationIssue[] {
  if (binaryAddress === undefined || provenanceAddress === undefined) return [];
  if (
    binaryAddress.slideNumber === provenanceAddress.slideNumber &&
    binaryAddress.version === provenanceAddress.version
  ) {
    return [];
  }
  return [
    {
      code: "provenance_artifact_path_mismatch",
      message:
        "Production image generation requires provenance evidence for the stored binary artifact.",
    },
  ];
}
