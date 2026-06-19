import type {
  ImageAuthMode,
  ImageProviderFeasibilityDecision,
  ImageProviderId,
  ImageProviderSetup,
  OrganizationVerification,
} from "./image-provider-feasibility";
import type { SlideImageArtifact } from "./slide-image-provider";

export type ImagePathDecisionStatus = "locked" | "blocked";

export type ImagePathBlockerCode =
  | ImageProviderSetup
  | "missing_billing_owner"
  | "missing_required_permissions"
  | "missing_real_image_artifact"
  | "missing_binary_artifact"
  | "invalid_binary_artifact_path"
  | "invalid_image_binary"
  | "artifact_provider_mismatch"
  | "artifact_model_mismatch"
  | "missing_request_id";

export type ImagePathBlocker = {
  readonly code: ImagePathBlockerCode;
  readonly message: string;
};

export type ImagePathDecisionRecord = {
  readonly decisionId: string;
  readonly decidedAt: number;
  readonly status: ImagePathDecisionStatus;
  readonly providerId: ImageProviderId;
  readonly authMode: ImageAuthMode;
  readonly model: string;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly organizationVerification: OrganizationVerification;
  readonly fixtureFallbackAllowed: false;
  readonly excludedRoutes: ImageProviderFeasibilityDecision["excludedRoutes"];
  readonly blockers: readonly ImagePathBlocker[];
  readonly binaryArtifactPath?: string;
  readonly requestId?: string;
};

export function createImagePathDecisionRecord(input: {
  readonly decisionId: string;
  readonly decidedAt: number;
  readonly feasibility: ImageProviderFeasibilityDecision;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly organizationVerification: OrganizationVerification;
  readonly successfulArtifact?: SlideImageArtifact;
  readonly binaryArtifactPath?: string;
}): ImagePathDecisionRecord {
  const blockers = imagePathBlockers(input);
  const requestId = input.successfulArtifact?.request?.requestId;
  return {
    decisionId: input.decisionId,
    decidedAt: input.decidedAt,
    status: blockers.length === 0 ? "locked" : "blocked",
    providerId: input.feasibility.providerId,
    authMode: input.feasibility.authMode,
    model: input.feasibility.targetModel,
    billingOwner: input.billingOwner,
    requiredPermissions: input.requiredPermissions,
    organizationVerification: input.organizationVerification,
    fixtureFallbackAllowed: false,
    excludedRoutes: input.feasibility.excludedRoutes,
    blockers,
    ...(input.binaryArtifactPath === undefined
      ? {}
      : { binaryArtifactPath: input.binaryArtifactPath }),
    ...(requestId === undefined ? {} : { requestId }),
  };
}

export function getProductionImageProviderChoices(
  record: ImagePathDecisionRecord,
): readonly ImageProviderId[] {
  return record.status === "locked" ? [record.providerId] : [];
}

function imagePathBlockers(input: {
  readonly organizationVerification: OrganizationVerification;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly feasibility: ImageProviderFeasibilityDecision;
  readonly successfulArtifact?: SlideImageArtifact;
  readonly binaryArtifactPath?: string;
}): readonly ImagePathBlocker[] {
  return [
    ...setupBlockers(input.feasibility.setup),
    ...decisionMetadataBlockers(input),
    ...artifactBlockers(input),
  ];
}

function setupBlockers(setup: ImageProviderSetup): readonly ImagePathBlocker[] {
  if (setup === "ready") return [];
  return [
    {
      code: setup,
      message: `Image provider setup is not ready: ${setup}.`,
    },
  ];
}

function artifactBlockers(input: {
  readonly feasibility: ImageProviderFeasibilityDecision;
  readonly successfulArtifact?: SlideImageArtifact;
  readonly binaryArtifactPath?: string;
}): readonly ImagePathBlocker[] {
  const artifact = input.successfulArtifact;
  if (!artifact) {
    return [
      {
        code: "missing_real_image_artifact",
        message: "A production image path requires one successful real image artifact.",
      },
    ];
  }

  return [
    ...(artifact.providerId === input.feasibility.providerId
      ? []
      : [
          {
            code: "artifact_provider_mismatch" as const,
            message: "The stored image artifact does not match the selected provider route.",
          },
        ]),
    ...(artifact.request?.model === undefined ||
    artifact.request.model === input.feasibility.targetModel
      ? []
      : [
          {
            code: "artifact_model_mismatch" as const,
            message: "The stored image artifact request model does not match the selected route.",
          },
        ]),
    ...(hasPngSignatureDataUrl(artifact.imageDataUrl)
      ? []
      : [
          {
            code: "invalid_image_binary" as const,
            message: "The successful image artifact must contain PNG binary data.",
          },
        ]),
    ...binaryArtifactPathBlockers(input.binaryArtifactPath),
    ...(artifact.providerId === "openaiImage" && !artifact.request?.requestId
      ? [
          {
            code: "missing_request_id" as const,
            message: "OpenAI image artifacts require a provider request id.",
          },
        ]
      : []),
  ];
}

function binaryArtifactPathBlockers(
  binaryArtifactPath: string | undefined,
): readonly ImagePathBlocker[] {
  if (!binaryArtifactPath?.trim()) {
    return [
      {
        code: "missing_binary_artifact",
        message: "The successful image artifact must be written to artifact storage.",
      },
    ];
  }
  if (isVersionedProjectImagePath(binaryArtifactPath)) return [];
  return [
    {
      code: "invalid_binary_artifact_path",
      message: "The successful image artifact path must point to versioned project image storage.",
    },
  ];
}

function isVersionedProjectImagePath(path: string): boolean {
  return /^projects\/[A-Za-z0-9_-]+\/slides\/images\/slide_\d{3}\.v\d+\.png$/.test(path);
}

function decisionMetadataBlockers(input: {
  readonly organizationVerification: OrganizationVerification;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly feasibility: ImageProviderFeasibilityDecision;
}): readonly ImagePathBlocker[] {
  return [
    ...(input.feasibility.authMode === "openaiApiKey" &&
    input.feasibility.setup === "ready" &&
    input.organizationVerification !== "verified"
      ? [
          {
            code: "requiresOrganizationVerification" as const,
            message:
              "OpenAI image route evidence must retain verified organization status before locking.",
          },
        ]
      : []),
    ...(input.billingOwner.trim()
      ? []
      : [
          {
            code: "missing_billing_owner" as const,
            message: "The image path decision must record the billing owner.",
          },
        ]),
    ...(input.requiredPermissions.some((permission) => permission.trim().length > 0)
      ? []
      : [
          {
            code: "missing_required_permissions" as const,
            message: "The image path decision must record required provider permissions.",
          },
        ]),
  ];
}

function hasPngSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo");
}
