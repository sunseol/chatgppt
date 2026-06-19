import { describe, expect, test } from "bun:test";
import { createImagePathDecisionRecord } from "./image-path-decision";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image path decision slide path evidence", () => {
  test("blocks binary artifact paths that point at a different slide", () => {
    const record = createImagePathDecisionRecord({
      decisionId: "image_path_slide_mismatch",
      decidedAt: 1_789_700_009,
      feasibility: decideImageProviderFeasibility({
        codexImageCapability: "unknown",
        apiCredential: "available",
        organizationVerification: "verified",
      }),
      successfulArtifact: realImageArtifact({ slideNumber: 2 }),
      binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
      billingOwner: "openai_api_project",
      requiredPermissions: ["images.generate", "model:gpt-image-2"],
      organizationVerification: "verified",
    });

    expect(record.status).toBe("blocked");
    expect(record.blockers.map((blocker) => blocker.code)).toEqual([
      "binary_artifact_slide_mismatch",
    ]);
  });
});

function realImageArtifact(input: { readonly slideNumber: number }): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: input.slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: `slide_${String(input.slideNumber).padStart(3, "0")}_layout.png`,
      mode: "composition-reference",
    },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
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
