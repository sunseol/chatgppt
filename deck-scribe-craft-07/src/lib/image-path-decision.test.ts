import { describe, expect, test } from "bun:test";
import {
  createImagePathDecisionRecord,
  getProductionImageProviderChoices,
} from "./image-path-decision";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image path decision record", () => {
  test("locks a production image path only after a real binary artifact is stored", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_df230",
      decidedAt: 1_789_700_000,
      feasibility,
      successfulArtifact: realImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    // Then
    expect(record.status).toBe("locked");
    expect(record.providerId).toBe("openaiImage");
    expect(record.authMode).toBe("openaiApiKey");
    expect(record.model).toBe("gpt-image-2");
    expect(record.binaryArtifactPath).toBe(BINARY_ARTIFACT_PATH);
    expect(record.provenanceArtifactPath).toBe(PROVENANCE_ARTIFACT_PATH);
    expect(record.fixtureFallbackAllowed).toBe(false);
    expect(getProductionImageProviderChoices(record)).toEqual(["openaiImage"]);
  });

  test("blocks production selection and fixture fallback without a real image artifact", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "notSupported",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_blocked",
      decidedAt: 1_789_700_001,
      feasibility,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "unknown",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "requiresApiCredential",
      "missing_real_image_artifact",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("rejects a stored artifact whose provider does not match the selected route", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_mismatch",
      decidedAt: 1_789_700_003,
      feasibility,
      successfulArtifact: { ...realImageArtifact(), providerId: "codex" },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_invalid_png",
      decidedAt: 1_789_700_004,
      feasibility,
      successfulArtifact: {
        ...realImageArtifact(),
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
      },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_fixture_path",
      decidedAt: 1_789_700_008,
      feasibility,
      successfulArtifact: realImageArtifact(),
      binaryArtifactPath: "fixtures/mock-slide.png",
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_model_mismatch",
      decidedAt: 1_789_700_006,
      feasibility,
      successfulArtifact: {
        ...realImageArtifact(),
        request: {
          ...realImageArtifact().request,
          model: "gpt-image-old",
        },
      },
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
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
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_missing_metadata",
      decidedAt: 1_789_700_005,
      feasibility,
      successfulArtifact: realImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
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

  test("blocks route locking when OpenAI organization verification evidence drifts", () => {
    // Given
    const feasibility = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    // When
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_org_drift",
      decidedAt: 1_789_700_007,
      feasibility,
      successfulArtifact: realImageArtifact(),
      binaryArtifactPath: BINARY_ARTIFACT_PATH,
      provenanceArtifactPath: PROVENANCE_ARTIFACT_PATH,
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "unknown",
    });

    // Then
    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "requiresOrganizationVerification",
    ]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});

const BINARY_ARTIFACT_PATH = "projects/project_001/slides/images/slide_001.v1.png";
const PROVENANCE_ARTIFACT_PATH = "projects/project_001/slides/images/slide_001.v1.provenance.json";

function realImageArtifact(): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: 1,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: "slide_001_layout.png",
      mode: "composition-reference",
    },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: "sha256:prompt",
    },
    request: {
      model: "gpt-image-2",
      requestId: "img_req_001",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_400,
    },
    generatedAt: 1_789_700_000,
  };
}
