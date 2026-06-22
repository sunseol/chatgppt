import { describe, expect, test } from "bun:test";
import {
  createImagePathDecisionRecord,
  getProductionImageProviderChoices,
} from "./image-path-decision";
import {
  IMAGE_DECISION_BINARY_ARTIFACT_PATH as BINARY_ARTIFACT_PATH,
  IMAGE_DECISION_PROVENANCE_ARTIFACT_PATH as PROVENANCE_ARTIFACT_PATH,
  imageDecisionProviderProvenance,
  imageDecisionRealImageArtifact,
} from "./image-path-decision-test-fixtures";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";

describe("image path decision provider provenance evidence", () => {
  test("blocks route locking when the artifact Codex turn id needs trimming", () => {
    // Given / When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_padded_request_id",
      decidedAt: 1_789_700_020,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      billingOwner: "workspace-billing",
      requiredPermissions: ["images.generate"],
      organizationVerification: "verified",
      successfulArtifact: {
        ...imageDecisionRealImageArtifact(),
        request: {
          model: "gpt-image-2",
          threadId: "thread_codex_image_001",
          turnId: " turn_codex_image_001 ",
          latencyMs: 2_400,
        },
      },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["provenance_turn_id_mismatch"]);
  });

  test("blocks route locking when the provider provenance sidecar is missing", () => {
    // Given
    const artifact = imageDecisionRealImageArtifact();

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_missing_provenance_sidecar",
      decidedAt: 1_789_700_011,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: artifact,
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_provenance_evidence"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("blocks route locking when the sidecar does not match the selected live route", () => {
    // Given
    const artifact = imageDecisionRealImageArtifact();

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_provenance_mismatch",
      decidedAt: 1_789_700_012,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: artifact,
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: {
        ...imageDecisionProviderProvenance(),
        executionMode: "development",
        providerKind: "openaiImage",
        authMode: "api_key",
        modelOrRuntime: "gpt-image-old",
        fixture: true,
        turnId: "turn_codex_other",
      },
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "provenance_execution_mode_mismatch",
      "provenance_provider_mismatch",
      "provenance_auth_mode_mismatch",
      "provenance_model_mismatch",
      "provenance_fixture_contamination",
      "provenance_turn_id_mismatch",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});
