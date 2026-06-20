import { describe, expect, test } from "bun:test";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image artifact store usage metadata", () => {
  test("rejects fractional usage counts before writing image artifacts", async () => {
    const store = createImageArtifactStore({
      write: async () => {
        throw new Error("write should not run for invalid usage metadata.");
      },
    });

    const result = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: {
        ...imageArtifact(),
        request: {
          requestId: "img_req_fractional_usage",
          model: "gpt-image-2",
          latencyMs: 2_400,
          usage: { inputTokens: 1.5, outputTokens: 2, imageCount: 1 },
        },
      },
      version: 1,
      createdAt: 1_789_800_011,
    });

    expect(await rejectionMessage(result)).toBe(
      "Image artifact request usage counts must be non-negative integers.",
    );
  });
});

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "";
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
}

function imageArtifact(): SlideImageArtifact {
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
    generatedAt: 1_789_800_000,
  };
}
