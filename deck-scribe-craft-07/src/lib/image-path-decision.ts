import type {
  ImageAuthMode,
  ImageProviderFeasibilityDecision,
  ImageProviderId,
  ImageProviderSetup,
  OrganizationVerification,
} from "./image-provider-feasibility";
import { storedArtifactPathBlockers } from "./image-path-decision-artifact-paths";
import { decisionMetadataBlockers } from "./image-path-decision-metadata";
import { storedProviderProvenanceBlockers } from "./image-path-decision-provenance";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { SlideImageArtifact } from "./slide-image-provider";

export {
  isVersionedProjectImageArtifactPath,
  isVersionedProjectImageProvenancePath,
} from "./image-artifact-path";

export type ImagePathDecisionStatus = "locked" | "blocked";

export type ImagePathBlockerCode =
  | ImageProviderSetup
  | "missing_billing_owner"
  | "missing_required_permissions"
  | "missing_real_image_artifact"
  | "missing_binary_artifact"
  | "invalid_binary_artifact_path"
  | "binary_artifact_slide_mismatch"
  | "missing_provenance_artifact"
  | "invalid_provenance_artifact_path"
  | "provenance_artifact_path_mismatch"
  | "missing_provenance_evidence"
  | "provenance_execution_mode_mismatch"
  | "provenance_provider_mismatch"
  | "provenance_auth_mode_mismatch"
  | "provenance_model_mismatch"
  | "provenance_prompt_version_mismatch"
  | "provenance_fixture_contamination"
  | "provenance_request_id_mismatch"
  | "invalid_image_binary"
  | "artifact_provider_mismatch"
  | "missing_request_model"
  | "artifact_model_mismatch"
  | "missing_request_id"
  | "missing_thread_id"
  | "missing_turn_id"
  | "provenance_thread_id_mismatch"
  | "provenance_turn_id_mismatch";

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
  readonly provenanceArtifactPath?: string;
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
  readonly provenanceArtifactPath?: string;
  readonly providerProvenance?: ProviderArtifactProvenance;
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
    ...(input.provenanceArtifactPath === undefined
      ? {}
      : { provenanceArtifactPath: input.provenanceArtifactPath }),
    ...(requestId === undefined ? {} : { requestId }),
  };
}

export function getProductionImageProviderChoices(
  record: ImagePathDecisionRecord,
): readonly ImageProviderId[] {
  if (record.status !== "locked") return [];
  if (record.providerId !== "codex" || record.authMode !== "codexOAuth") return [];
  return ["codex"];
}

function imagePathBlockers(input: {
  readonly organizationVerification: OrganizationVerification;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly feasibility: ImageProviderFeasibilityDecision;
  readonly successfulArtifact?: SlideImageArtifact;
  readonly binaryArtifactPath?: string;
  readonly provenanceArtifactPath?: string;
  readonly providerProvenance?: ProviderArtifactProvenance;
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
  readonly provenanceArtifactPath?: string;
  readonly providerProvenance?: ProviderArtifactProvenance;
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
    ...requestModelBlockers(artifact.request?.model, input.feasibility.targetModel),
    ...(hasPngSignatureDataUrl(artifact.imageDataUrl)
      ? []
      : [
          {
            code: "invalid_image_binary" as const,
            message: "The successful image artifact must contain PNG binary data.",
          },
        ]),
    ...storedArtifactPathBlockers(
      input.binaryArtifactPath,
      input.provenanceArtifactPath,
      artifact.slideNumber,
    ),
    ...storedProviderProvenanceBlockers({
      feasibility: input.feasibility,
      successfulArtifact: artifact,
      providerProvenance: input.providerProvenance,
    }),
    ...(artifact.providerId === "openaiImage" && !artifact.request?.requestId?.trim()
      ? [
          {
            code: "missing_request_id" as const,
            message: "OpenAI image artifacts require a provider request id.",
          },
        ]
      : []),
    ...(artifact.providerId === "codex" && !artifact.request?.threadId?.trim()
      ? [
          {
            code: "missing_thread_id" as const,
            message: "Codex image artifacts require a thread id.",
          },
        ]
      : []),
    ...(artifact.providerId === "codex" && !artifact.request?.turnId?.trim()
      ? [
          {
            code: "missing_turn_id" as const,
            message: "Codex image artifacts require a turn id.",
          },
        ]
      : []),
  ];
}

function requestModelBlockers(
  requestModel: string | undefined,
  targetModel: string,
): readonly ImagePathBlocker[] {
  if (!requestModel?.trim()) {
    return [
      {
        code: "missing_request_model",
        message: "The stored image artifact must record the provider request model.",
      },
    ];
  }
  if (requestModel === targetModel) return [];
  return [
    {
      code: "artifact_model_mismatch",
      message: "The stored image artifact request model does not match the selected route.",
    },
  ];
}

function hasPngSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,iVBORw0KGgo");
}
