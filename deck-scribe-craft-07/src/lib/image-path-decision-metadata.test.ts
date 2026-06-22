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

describe("image path decision metadata evidence", () => {
  test("blocks route locking when decision metadata uses placeholder text", () => {
    // Given
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_placeholder_metadata",
      decidedAt: 1_789_700_011,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "TBD",
      requiredPermissions: ["unknown"],
      organizationVerification: "verified",
    });

    // When
    const productionChoices = getProductionImageProviderChoices(record);

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "missing_billing_owner",
      "missing_required_permissions",
    ]);
    expect(productionChoices).toEqual([]);
  });

  test("blocks route locking when required permissions mix real and placeholder text", () => {
    // Given
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_mixed_permission_metadata",
      decidedAt: 1_789_700_012,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "workspace-billing",
      requiredPermissions: ["images.generate", "TBD"],
      organizationVerification: "verified",
    });

    // When
    const productionChoices = getProductionImageProviderChoices(record);

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "missing_required_permissions",
    ]);
    expect(productionChoices).toEqual([]);
  });
});
