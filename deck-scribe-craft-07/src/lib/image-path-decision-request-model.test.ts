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
        codexImageCapability: "confirmed",
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
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_request_model"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });

  test("blocks production choices when a Codex artifact has a blank turn id", () => {
    const artifact = imageDecisionRealImageArtifact();
    const request = artifact.request;
    if (!request) throw new Error("Expected request metadata fixture.");
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_blank_request_id",
      decidedAt: 1_789_700_013,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: {
        ...artifact,
        request: { ...request, turnId: " " },
      },
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      providerProvenance: imageDecisionProviderProvenance(),
      billingOwner: "codex_account",
      requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_turn_id"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});
