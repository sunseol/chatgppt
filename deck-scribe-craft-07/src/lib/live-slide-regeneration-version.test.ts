import { describe, expect, test } from "bun:test";
import type { GeneratedSlide } from "./deck-types";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import {
  createLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationRequest,
} from "./live-slide-regeneration";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("live full-slide regeneration artifact version", () => {
  test("blocks a regenerated background whose stored version does not match the candidate slide", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const candidateBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: imageArtifact(),
      version: 1,
      createdAt: 1_789_900_010,
    });

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: requestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "background_artifact_version_mismatch",
    ]);
    expect(result.preservedSlide).toEqual(approvedSlideFixture());
  });
});

function requestFixture(): LiveSlideRegenerationRequest {
  return {
    requestId: "rev_235",
    slideNumber: 3,
    originalSlideVersion: 1,
    deckContextId: "deckctx_001",
    designSystemId: "design_001",
    slidePlanId: "plan_001",
    slideSpecHash: "sha256:slide-spec",
    editInstruction: "차트를 더 크게",
    mustKeep: ["title text"],
    mustChange: ["chart area size"],
    originalBackgroundArtifactId: "project_001_image_slide_003_v0",
  };
}

function approvedSlideFixture(): GeneratedSlide {
  return {
    number: 3,
    version: 1,
    status: "approved",
    imageDescriptor: "project_001_image_slide_003_v0",
  };
}

function imageArtifact(): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: 3,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: { screenshot: "slide_003_layout.png", mode: "composition-reference" },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
    request: {
      model: "gpt-image-2",
      requestId: "img_req_revised",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_000,
    },
    generatedAt: 1_789_900_000,
  };
}
