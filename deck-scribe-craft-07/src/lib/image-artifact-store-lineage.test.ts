import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image artifact store input lineage", () => {
  test("rejects blank prompt and layout lineage before writing image artifacts", async () => {
    // Given
    const store = createImageArtifactStore({
      write: async () => {
        throw new Error("write should not run for invalid input lineage.");
      },
    });

    // When
    const blankPromptHash = await rejectionMessage(
      storeSlideImageArtifact({
        store,
        projectId: "project_001",
        artifact: { ...imageArtifact(), prompt: { ...imageArtifact().prompt, hash: " " } },
        version: 1,
        createdAt: 1_789_800_012,
      }),
    );
    const blankLayoutReference = await rejectionMessage(
      storeSlideImageArtifact({
        store,
        projectId: "project_001",
        artifact: {
          ...imageArtifact(),
          layoutReference: { ...imageArtifact().layoutReference, screenshot: " " },
        },
        version: 1,
        createdAt: 1_789_800_013,
      }),
    );

    // Then
    expect(blankPromptHash).toBe("Image artifact prompt lineage is required.");
    expect(blankLayoutReference).toBe("Image artifact layout reference is required.");
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
    request: {
      model: "gpt-image-2",
      requestId: "img_req_001",
      latencyMs: 2_400,
    },
    generatedAt: 1_789_800_000,
  };
}
