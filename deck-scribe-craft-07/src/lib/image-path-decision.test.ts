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

describe("image path decision record", () => {
  test("locks a production image path only after a real binary artifact is stored", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_df230",
      decidedAt: 1_789_700_000,
      feasibility,
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("locked");
    expect(record.providerId).toBe("codex");
    expect(record.authMode).toBe("codexOAuth");
    expect(record.model).toBe("gpt-image-2");
    expect(record.binaryArtifactPath).toBe(BINARY_ARTIFACT_PATH);
    expect(record.provenanceArtifactPath).toBe(PROVENANCE_ARTIFACT_PATH);
    expect(record.fixtureFallbackAllowed).toBe(false);
    expect(getProductionImageProviderChoices(record)).toEqual(["codex"]);
  });

  test("blocks production selection and fixture fallback without a real image artifact", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_blocked",
      decidedAt: 1_789_700_001,
      feasibility,
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_real_image_artifact"]);
    expect(record.fixtureFallbackAllowed).toBe(false);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("removes paths whose setup is incomplete from production choices", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "missing",
      organizationVerification: "unknown",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_setup_required",
      decidedAt: 1_789_700_002,
      feasibility,
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "unknown",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "requiresCodexImageCapability",
      "missing_real_image_artifact",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("rejects a stored artifact whose provider does not match the selected route", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_mismatch",
      decidedAt: 1_789_700_003,
      feasibility,
      successfulArtifact: { ...imageDecisionRealImageArtifact(), providerId: "mock" },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["artifact_provider_mismatch"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("rejects an image artifact whose data URL is not PNG binary output", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_invalid_png",
      decidedAt: 1_789_700_004,
      feasibility,
      successfulArtifact: {
        ...imageDecisionRealImageArtifact(),
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
      },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["invalid_image_binary"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("rejects binary artifact paths outside versioned project image storage", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_fixture_path",
      decidedAt: 1_789_700_008,
      feasibility,
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: "fixtures/mock-slide.png",
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "invalid_binary_artifact_path",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("rejects a successful artifact whose request model differs from the locked route", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_model_mismatch",
      decidedAt: 1_789_700_006,
      feasibility,
      successfulArtifact: {
        ...imageDecisionRealImageArtifact(),
        request: {
          ...imageDecisionRealImageArtifact().request,
          model: "gpt-image-old",
        },
      },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["artifact_model_mismatch"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("blocks route locking when required decision metadata is incomplete", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_missing_metadata",
      decidedAt: 1_789_700_005,
      feasibility,
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: " ",
      requiredPermissions: [],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "missing_billing_owner",
      "missing_required_permissions",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("keeps Codex route independent from OpenAI organization verification evidence", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_org_drift",
      decidedAt: 1_789_700_007,
      feasibility,
      successfulArtifact: imageDecisionRealImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "unknown",
    });

    // Then
    expect(record.status).toBe("locked");
    expect(record.blockers).toEqual([]);
    expect(getProductionImageProviderChoices(record)).toEqual(["codex"]);
  });
});
