import { describe, expect, test } from "bun:test";
import {
  createImageArtifactStore,
  storeSlideImageArtifact,
  type ImageArtifactStoreWrite,
} from "./image-artifact-store";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image artifact store request metadata", () => {
  test("rejects padded request ids and models before writing image artifacts", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const store = createImageArtifactStore({
      write: async (entry) => {
        writes.push(entry);
      },
    });

    // When
    const result = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: {
        ...realImageArtifact(),
        request: {
          model: " gpt-image-2 ",
          requestId: " img_req_001 ",
          latencyMs: 2_400,
        },
      },
      version: 1,
      createdAt: 1_789_800_011,
    });

    // Then
    expect((await rejectionMessage(result)).includes("canonical request metadata")).toBe(true);
    expect(writes.length).toBe(0);
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
      latencyMs: 2_400,
    },
    generatedAt: 1_789_800_000,
  };
}
