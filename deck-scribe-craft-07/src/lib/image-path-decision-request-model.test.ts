import { describe, expect, test } from "bun:test";
import {
  createImagePathDecisionRecord,
  getProductionImageProviderChoices,
} from "./image-path-decision";
import {
  imageDecisionProviderProvenance,
  imageDecisionRealImageArtifact,
} from "./image-path-decision-test-fixtures";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";

describe("image path decision request model evidence", () => {
  test("blocks production choices when a successful artifact omits the request model", () => {
    const artifact = imageDecisionRealImageArtifact();
    const request = artifact.request;
    if (!request) throw new Error("Expected request metadata fixture.");
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_missing_request_model",
      decidedAt: 1_789_700_009,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "unknown",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: {
        ...artifact,
        request: { ...request, model: " " },
      },
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_request_model"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("blocks production choices when an OpenAI artifact has a blank request id", () => {
    const artifact = imageDecisionRealImageArtifact();
    const request = artifact.request;
    if (!request) throw new Error("Expected request metadata fixture.");
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_blank_request_id",
      decidedAt: 1_789_700_013,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "unknown",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: {
        ...artifact,
        request: { ...request, requestId: " " },
      },
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_request_id"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});
