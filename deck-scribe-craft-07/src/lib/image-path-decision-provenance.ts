import type { ImageAuthMode, ImageProviderFeasibilityDecision } from "./image-provider-feasibility";
import type { ImagePathBlocker } from "./image-path-decision";
import type { ProviderArtifactProvenance, ProviderAuthMode } from "./provider-provenance";
import type { SlideImageArtifact } from "./slide-image-provider";

export function storedProviderProvenanceBlockers(input: {
  readonly feasibility: ImageProviderFeasibilityDecision;
  readonly successfulArtifact: SlideImageArtifact;
  readonly providerProvenance?: ProviderArtifactProvenance;
}): readonly ImagePathBlocker[] {
  const provenance = input.providerProvenance;
  if (provenance === undefined) {
    return [
      {
        code: "missing_provenance_evidence",
        message: "The successful image artifact must include provider provenance evidence.",
      },
    ];
  }

  const requestId = input.successfulArtifact.request?.requestId;
  const expectedPromptVersion = `${input.successfulArtifact.prompt.id}@${input.successfulArtifact.prompt.version}`;
  return [
    ...(provenance.executionMode === "production"
      ? []
      : [
          {
            code: "provenance_execution_mode_mismatch" as const,
            message: "Image provider provenance must come from production execution.",
          },
        ]),
    ...(provenance.providerKind === input.feasibility.providerId
      ? []
      : [
          {
            code: "provenance_provider_mismatch" as const,
            message: "Image provider provenance must match the selected provider route.",
          },
        ]),
    ...(provenance.authMode === providerAuthMode(input.feasibility.authMode)
      ? []
      : [
          {
            code: "provenance_auth_mode_mismatch" as const,
            message: "Image provider provenance must match the selected auth mode.",
          },
        ]),
    ...(provenance.modelOrRuntime === input.feasibility.targetModel
      ? []
      : [
          {
            code: "provenance_model_mismatch" as const,
            message: "Image provider provenance model must match the selected route model.",
          },
        ]),
    ...(provenance.promptVersion === expectedPromptVersion
      ? []
      : [
          {
            code: "provenance_prompt_version_mismatch" as const,
            message: "Image provider provenance prompt version must match the stored artifact.",
          },
        ]),
    ...(provenance.fixture === false
      ? []
      : [
          {
            code: "provenance_fixture_contamination" as const,
            message: "Image provider provenance must not come from fixture output.",
          },
        ]),
    ...(input.feasibility.providerId === "openaiImage" &&
    requestId !== undefined &&
    requestId.trim().length > 0 &&
    (requestId !== requestId.trim() || provenance.requestId !== requestId)
      ? [
          {
            code: "provenance_request_id_mismatch" as const,
            message: "Image provider provenance request id must match the stored artifact.",
          },
        ]
      : []),
  ];
}

function providerAuthMode(authMode: ImageAuthMode): ProviderAuthMode {
  return authMode === "openaiApiKey" ? "api_key" : "codex_session";
}
