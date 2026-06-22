import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image artifact store live provider boundary", () => {
  test("rejects mock image artifacts before writing live storage", async () => {
    // Given
    const writes: string[] = [];
    const store = createImageArtifactStore({
      write: async (entry) => {
        writes.push(entry.path);
      },
    });

    // When
    const result = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: imageArtifact({ providerId: "mock" }),
      version: 1,
      createdAt: 1_789_800_012,
    });

    // Then
    expect(await rejectionMessage(result)).toBe(
      "Mock image artifacts cannot be stored as live provider output.",
    );
    expect(writes).toEqual([]);
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

function imageArtifact(input: {
  readonly providerId: SlideImageArtifact["providerId"];
}): SlideImageArtifact {
  return {
    providerId: input.providerId,
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
      requestId: "img_req_mock",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_400,
    },
    generatedAt: 1_789_800_000,
  };
}
