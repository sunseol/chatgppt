import { describe, expect, test } from "bun:test";
import { createImagePathDecisionRecord } from "./image-path-decision";
import {
  imageDecisionProviderProvenance,
  imageDecisionRealImageArtifact,
} from "./image-path-decision-test-fixtures";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";

describe("image path decision slide path evidence", () => {
  test("blocks binary artifact paths that point at a different slide", () => {
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_slide_mismatch",
      decidedAt: 1_789_700_009,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: imageDecisionRealImageArtifact({ slideNumber: 2 }),
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_002.v1.provenance.json",
      providerProvenance: imageDecisionProviderProvenance({ slideNumber: 2 }),
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "binary_artifact_slide_mismatch",
      "provenance_artifact_path_mismatch",
    ]);
  });

  test("blocks provenance artifact paths that do not match the stored binary version", () => {
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_provenance_mismatch",
      decidedAt: 1_789_700_010,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "confirmed",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: imageDecisionRealImageArtifact({ slideNumber: 1 }),
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v2.provenance.json",
      providerProvenance: imageDecisionProviderProvenance({ slideNumber: 1 }),
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "provenance_artifact_path_mismatch",
    ]);
  });
});
