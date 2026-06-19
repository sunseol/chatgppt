import {
  isVersionedProjectImageArtifactPath,
  type ImagePathBlockerCode,
  type ImagePathDecisionRecord,
} from "./image-path-decision";
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

  const binaryArtifactPath = decision.binaryArtifactPath?.trim();
  const requestId = decision.requestId?.trim();
  const issues = decisionIssues(decision, binaryArtifactPath, requestId);
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

  return {
    kind: "ready",
    executionMode: "production",
    providerId: decision.providerId,
    decisionId: decision.decisionId,
    binaryArtifactPath,
    ...(requestId === undefined ? {} : { requestId }),
  };
}

function decisionIssues(
  decision: PersistedImagePathDecisionRecord,
  binaryArtifactPath: string | undefined,
  requestId: string | undefined,
): readonly ProductionImageGenerationIssue[] {
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
    ...(binaryArtifactPath && !isVersionedProjectImageArtifactPath(binaryArtifactPath)
      ? [
          {
            code: "invalid_binary_artifact_path" as const,
            message:
              "Production image generation requires versioned project image artifact storage.",
          },
        ]
      : []),
    ...(decision.providerId === "openaiImage" && !requestId
      ? [
          {
            code: "missing_request_id" as const,
            message: "OpenAI image production generation requires a provider request id.",
          },
        ]
      : []),
  ];
}
