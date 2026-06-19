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
  test("blocks route locking when the provider provenance sidecar is missing", () => {
    // Given
    const artifact = imageDecisionRealImageArtifact();

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_missing_provenance_sidecar",
      decidedAt: 1_789_700_011,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "unknown",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: artifact,
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
        codexImageCapability: "unknown",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: artifact,
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: {
        ...imageDecisionProviderProvenance(),
        executionMode: "development",
        providerKind: "codex",
        authMode: "codex_session",
        modelOrRuntime: "gpt-image-old",
        fixture: true,
        requestId: "img_req_other",
      },
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      "provenance_request_id_mismatch",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});
