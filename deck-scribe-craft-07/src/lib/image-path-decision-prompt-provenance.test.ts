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

describe("image path decision prompt provenance evidence", () => {
  test("blocks route locking when provider provenance names another prompt version", () => {
    // Given
    const artifact = imageDecisionRealImageArtifact();

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_prompt_provenance_mismatch",
      decidedAt: 1_789_700_014,
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
        promptVersion: "other_prompt@v1",
      },
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "provenance_prompt_version_mismatch",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});
