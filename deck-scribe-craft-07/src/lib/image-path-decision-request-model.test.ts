import { describe, expect, test } from "bun:test";
import {
  createImagePathDecisionRecord,
  getProductionImageProviderChoices,
} from "./image-path-decision";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image path decision request model evidence", () => {
  test("blocks production choices when a successful artifact omits the request model", () => {
    const artifact = realImageArtifact();
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
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual(["missing_request_model"]);
    expect(getProductionImageProviderChoices(record)).toEqual([]);
  });
});

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
