import { describe, expect, test } from "bun:test";
import type { ImagePathDecisionRecord } from "./image-path-decision";
import { createProductionImageGenerationGate } from "./production-image-generation-gate";
import type { ProviderStatus } from "./provider-types";

describe("production image generation gate", () => {
  test("allows mock image generation only in development mode", () => {
    // Given / When
    const gate = createProductionImageGenerationGate({ executionMode: "development" });

    // Then
    expect(gate).toEqual({
      kind: "ready",
      executionMode: "development",
      providerId: "mock",
    });
  });

  test("blocks production image generation when no locked path decision exists", () => {
    // Given / When
    const gate = createProductionImageGenerationGate({ executionMode: "production" });

    // Then
    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      issues: [
        {
          code: "missing_image_path_decision",
          message: "Production image generation requires a locked image path decision record.",
        },
      ],
    });
  });

  test("blocks production image generation when the path decision is not locked", () => {
    // Given
    const decision: ImagePathDecisionRecord = {
      ...lockedDecision(),
      status: "blocked",
      blockers: [
        {
          code: "requiresApiCredential",
          message: "OpenAI API key is required.",
        },
      ],
    };

    // When
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: decision,
    });

    // Then
    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
      issues: [
        {
          code: "production_codex_oauth_required",
          message: "Production image generation must use Codex OAuth image generation.",
        },
        {
          code: "image_path_not_locked",
          message: "Production image generation is blocked until the image path is locked.",
        },
        {
          code: "requiresApiCredential",
          message: "OpenAI API key is required.",
        },
      ],
    });
  });

  test("blocks locked OpenAI API-key routes even when binary artifact evidence exists", () => {
    // Given / When
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: lockedDecision(),
    });

    // Then
    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
      issues: [
        {
          code: "production_codex_oauth_required",
          message: "Production image generation must use Codex OAuth image generation.",
        },
      ],
    });
  });

  test("uses locked Codex OAuth image artifacts without requiring an API request id", () => {
    // Given / When
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: codexLockedDecision(),
    });

    // Then
    expect(gate).toEqual({
      kind: "ready",
      executionMode: "production",
      providerId: "codex",
      decisionId: "image_path_codex_oauth",
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
    });
  });

  test("blocks locked Codex OAuth decisions when current auth requires login", () => {
    // Given
    const providerStatuses: readonly ProviderStatus[] = [
      {
        kind: "requiresAuth",
        providerId: "codex",
        message: "Live auth disconnected. Sign in again before continuing.",
      },
    ];

    // When
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: codexLockedDecision(),
      providerStatuses,
    });

    // Then
    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "codex",
      issues: [
        {
          code: "provider_auth_required",
          message: "Live auth disconnected. Sign in again before continuing.",
        },
      ],
    });
  });

  test("revalidates persisted locked decisions before production image generation", () => {
    const decision = {
      ...codexLockedDecision(),
      fixtureFallbackAllowed: true,
      binaryArtifactPath: "fixtures/mock-slide.png",
    };

    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: decision,
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "codex",
      issues: [
        {
          code: "fixture_fallback_enabled",
          message: "Production image generation cannot use a fixture fallback path.",
        },
        {
          code: "invalid_binary_artifact_path",
          message: "Production image generation requires versioned project image artifact storage.",
        },
      ],
    });
  });

  test("blocks persisted decisions whose provenance sidecar does not match the binary artifact", () => {
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: {
        ...codexLockedDecision(),
        provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v2.provenance.json",
      },
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "codex",
      issues: [
        {
          code: "provenance_artifact_path_mismatch",
          message:
            "Production image generation requires provenance evidence for the stored binary artifact.",
        },
      ],
    });
  });

  test("blocks persisted OpenAI decisions whose request id is not canonical", () => {
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: {
        ...lockedDecision(),
        requestId: " img_req_001 ",
      },
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
      issues: [
        {
          code: "production_codex_oauth_required",
          message: "Production image generation must use Codex OAuth image generation.",
        },
        {
          code: "provenance_request_id_mismatch",
          message: "OpenAI image production generation requires a canonical provider request id.",
        },
      ],
    });
  });

  test("blocks persisted decisions whose artifact paths are only canonical after trimming", () => {
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: {
        ...codexLockedDecision(),
        binaryArtifactPath: " projects/project_001/slides/images/slide_001.v1.png ",
        provenanceArtifactPath: " projects/project_001/slides/images/slide_001.v1.provenance.json ",
      },
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "codex",
      issues: [
        {
          code: "invalid_binary_artifact_path",
          message: "Production image generation requires versioned project image artifact storage.",
        },
        {
          code: "invalid_provenance_artifact_path",
          message: "Production image generation requires versioned provider provenance storage.",
        },
      ],
    });
  });
});

function lockedDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_df230",
    decidedAt: 1_789_700_000,
    status: "locked",
    providerId: "openaiImage",
    authMode: "openaiApiKey",
    model: "gpt-image-2",
    billingOwner: "openai_api_project",
    requiredPermissions: ["images.generate", "model:gpt-image-2"],
    organizationVerification: "verified",
    fixtureFallbackAllowed: false,
    excludedRoutes: [
      {
        route: "codexOAuth",
        reason: "Codex image generation is not confirmed for this runtime.",
      },
    ],
    blockers: [],
    binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
    provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
    requestId: "img_req_001",
  };
}

function codexLockedDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_codex_oauth",
    decidedAt: 1_789_700_000,
    status: "locked",
    providerId: "codex",
    authMode: "codexOAuth",
    model: "gpt-image-2",
    billingOwner: "codex_account",
    requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
    organizationVerification: "unknown",
    fixtureFallbackAllowed: false,
    excludedRoutes: [
      {
        route: "openaiApiKey",
        reason: "OpenAI API-key image generation is not the production route.",
      },
    ],
    blockers: [],
    binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
    provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
  };
}
