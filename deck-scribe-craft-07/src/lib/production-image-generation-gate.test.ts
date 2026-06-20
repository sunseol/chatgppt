import { describe, expect, test } from "bun:test";
import type { ImagePathDecisionRecord } from "./image-path-decision";
import { createProductionImageGenerationGate } from "./production-image-generation-gate";

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

  test("uses the locked real provider route after binary artifact evidence exists", () => {
    // Given / When
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: lockedDecision(),
    });

    // Then
    expect(gate).toEqual({
      kind: "ready",
      executionMode: "production",
      providerId: "openaiImage",
      decisionId: "image_path_df230",
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      requestId: "img_req_001",
    });
  });

  test("revalidates persisted locked decisions before production image generation", () => {
    const decision = {
      ...lockedDecision(),
      fixtureFallbackAllowed: true,
      binaryArtifactPath: "fixtures/mock-slide.png",
      requestId: " ",
    };

    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: decision,
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
      issues: [
        {
          code: "fixture_fallback_enabled",
          message: "Production image generation cannot use a fixture fallback path.",
        },
        {
          code: "invalid_binary_artifact_path",
          message: "Production image generation requires versioned project image artifact storage.",
        },
        {
          code: "missing_request_id",
          message: "OpenAI image production generation requires a provider request id.",
        },
      ],
    });
  });

  test("blocks persisted decisions whose provenance sidecar does not match the binary artifact", () => {
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: {
        ...lockedDecision(),
        provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v2.provenance.json",
      },
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
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
        ...lockedDecision(),
        binaryArtifactPath: " projects/project_001/slides/images/slide_001.v1.png ",
        provenanceArtifactPath: " projects/project_001/slides/images/slide_001.v1.provenance.json ",
      },
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
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
