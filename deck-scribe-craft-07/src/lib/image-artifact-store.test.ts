import { describe, expect, test } from "bun:test";
import {
  createProviderArtifactProvenance,
  validateProviderArtifactProvenance,
} from "./provider-provenance";
import { encodeSolidPngDataUrl } from "./png-encoder";
import {
  createImageArtifactStore,
  storeSlideImageArtifact,
  type ImageArtifactStoreWrite,
} from "./image-artifact-store";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("image artifact store", () => {
  test("stores provider image bytes and request metadata as versioned artifacts", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const store = createImageArtifactStore({
      write: async (entry) => {
        writes.push(entry);
      },
    });
    const artifact = realImageArtifact();

    // When
    const stored = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact,
      version: 2,
      createdAt: 1_789_800_000,
    });

    // Then
    expect(stored.binary.path).toBe("projects/project_001/slides/images/slide_001.v2.png");
    expect(stored.metadata.path).toBe(
      "projects/project_001/slides/images/slide_001.v2.metadata.json",
    );
    expect(/^sha256:[a-f0-9]{64}$/.test(stored.binary.hash)).toBe(true);
    expect(stored.metadata.request).toEqual({
      requestId: "img_req_001",
      model: "gpt-image-2",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_400,
      usage: { imageCount: 1, estimatedCostUsd: 0.08 },
    });
    expect(writes.map((write) => write.path)).toEqual([stored.binary.path, stored.metadata.path]);
    expect([...(writes[0].content as Uint8Array).slice(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(typeof writes[1].content).toBe("string");
  });

  test("rejects unsafe project ids before writing image artifacts", async () => {
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
      projectId: "../outside",
      artifact: realImageArtifact(),
      version: 1,
      createdAt: 1_789_800_004,
    });

    // Then
    expect((await rejectionMessage(result)).includes("Project id")).toBe(true);
    expect(writes.length).toBe(0);
  });

  test("creates complete OpenAI image provenance from stored request metadata", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });

    // When
    const stored = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: realImageArtifact(),
      version: 1,
      createdAt: 1_789_800_001,
    });
    const provenance = createProviderArtifactProvenance(stored.provenance);

    // Then
    expect(validateProviderArtifactProvenance(provenance).kind).toBe("complete");
    expect(provenance).toEqual({
      artifactId: "project_001_image_slide_001_v1",
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_generation@v1",
      durationMs: 2_400,
      inputArtifactIds: ["sha256:prompt", "slide_001_layout.png"],
      fixture: false,
      requestId: "img_req_001",
    });
  });

  test("rejects invalid image data and missing request ids for live providers", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });

    // When
    const invalidData = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: { ...realImageArtifact(), imageDataUrl: "data:image/png;base64,ZmFrZQ==" },
      version: 1,
      createdAt: 1_789_800_002,
    });
    const missingRequest = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: { ...realImageArtifact(), request: { model: "gpt-image-2" } },
      version: 1,
      createdAt: 1_789_800_003,
    });
    const blankRequest = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: { ...realImageArtifact(), request: { model: "gpt-image-2", requestId: " " } },
      version: 1,
      createdAt: 1_789_800_008,
    });

    // Then
    expect((await rejectionMessage(invalidData)).includes("valid PNG signature")).toBe(true);
    expect((await rejectionMessage(missingRequest)).includes("request id")).toBe(true);
    expect((await rejectionMessage(blankRequest)).includes("request id")).toBe(true);
  });

  test("rejects incomplete request metadata before writing image artifacts", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const store = createImageArtifactStore({
      write: async (entry) => {
        writes.push(entry);
      },
    });
    const artifact = realImageArtifact();
    if (!artifact.request) throw new Error("Expected request metadata fixture.");

    // When
    const missingModel = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: { ...artifact, request: { ...artifact.request, model: " " } },
      version: 1,
      createdAt: 1_789_800_005,
    });
    const invalidLatency = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: {
        ...artifact,
        request: { ...artifact.request, latencyMs: Number.NaN },
      },
      version: 1,
      createdAt: 1_789_800_006,
    });
    const invalidUsage = storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: {
        ...artifact,
        request: {
          ...artifact.request,
          usage: { imageCount: -1, estimatedCostUsd: Number.NaN },
        },
      },
      version: 1,
      createdAt: 1_789_800_007,
    });

    // Then
    expect((await rejectionMessage(missingModel)).includes("request model")).toBe(true);
    expect((await rejectionMessage(invalidLatency)).includes("latency")).toBe(true);
    expect((await rejectionMessage(invalidUsage)).includes("usage")).toBe(true);
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
      size: "1600x900",
      quality: "high",
      latencyMs: 2_400,
      usage: { imageCount: 1, estimatedCostUsd: 0.08 },
    },
    generatedAt: 1_789_800_000,
  };
}
