import { describe, expect, test } from "bun:test";
import { ImageProviderRequestError } from "./image-provider-errors";
import {
  createOpenAIImageProvider,
  type OpenAIImageClientRequest,
  type SlideImageProvider,
} from "./slide-image-provider";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import type { SlidePromptPackage } from "./slide-prompt-package";

describe("live image provider adapter", () => {
  test("passes prompt package and layout reference to the provider before storing bytes", async () => {
    // Given
    const requests: OpenAIImageClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate(request) {
        requests.push(request);
        return {
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 20, g: 40, b: 60, a: 255 },
          }),
          requestId: "img_req_live_001",
          size: "1600x900",
          quality: "high",
          latencyMs: 2_800,
          usage: { imageCount: 1, estimatedCostUsd: 0.08 },
        };
      },
    });

    // When
    const result = await generateAndStoreSlideImageArtifact({
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      package: promptPackage(),
      aspectRatio: "16:9",
      projectId: "project_001",
      version: 3,
      createdAt: 1_789_820_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    expect(requests).toEqual([
      {
        model: "gpt-image-2",
        prompt: "Generate a clean slide background.",
        aspectRatio: "16:9",
        layoutReference: {
          screenshot: "slide_001_layout.png",
          mode: "composition-reference",
        },
      },
    ]);
    if (result.kind !== "ready") return;
    expect(result.stored.binary.path).toBe("projects/project_001/slides/images/slide_001.v3.png");
    expect(result.stored.metadata.request).toEqual({
      requestId: "img_req_live_001",
      model: "gpt-image-2",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_800,
      usage: { imageCount: 1, estimatedCostUsd: 0.08 },
    });
    expect(result.stored.provenance.fixture).toBe(false);
    expect(result.stored.provenance.requestId).toBe("img_req_live_001");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v3.png",
      "projects/project_001/slides/images/slide_001.v3.metadata.json",
      "projects/project_001/slides/images/slide_001.v3.provenance.json",
    ]);
    expect(firstWriteBytes(writes)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  test("returns provider failures without writing artifact bytes", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate() {
        throw new ImageProviderRequestError("content_policy", "content policy blocked");
      },
    });

    // When
    const result = await generateAndStoreSlideImageArtifact({
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      package: promptPackage(),
      aspectRatio: "16:9",
      projectId: "project_001",
      version: 1,
      createdAt: 1_789_820_001,
    });

    // Then
    expect(result).toEqual({
      kind: "failed",
      failure: {
        providerId: "openaiImage",
        slideNumber: 1,
        errorKind: "content_policy",
        retryable: false,
        errorMessage: "content policy blocked",
        userMessage:
          "Slide 1 image generation failed: content policy blocked. Resolve the provider issue before retrying.",
      },
    });
    expect(writes).toEqual([]);
  });

  test("rejects provider artifact lineage mismatches before writing bytes", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const provider: SlideImageProvider = {
      id: "openaiImage",
      async generate(input) {
        return {
          providerId: "mock",
          slideNumber: input.package.slideNumber,
          aspectRatio: input.aspectRatio,
          canvas: { width: 1600, height: 900 },
          layoutReference: {
            screenshot: input.package.layoutScreenshot,
            mode: "composition-reference",
          },
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 20, g: 40, b: 60, a: 255 },
          }),
          prompt: {
            id: input.package.promptId,
            version: input.package.promptVersion,
            hash: input.package.promptHash,
          },
          request: { model: "gpt-image-2", requestId: "img_req_wrong", latencyMs: 1 },
          generatedAt: 1_789_820_002,
        };
      },
    };

    // When
    const result = await generateAndStoreSlideImageArtifact({
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      package: promptPackage(),
      aspectRatio: "16:9",
      projectId: "project_001",
      version: 1,
      createdAt: 1_789_820_002,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.errorKind).toBe("provider_contract");
    expect(result.failure.retryable).toBe(false);
    expect(result.failure.errorMessage.includes("provider id")).toBe(true);
    expect(writes).toEqual([]);
  });
});

function firstWriteBytes(writes: readonly ImageArtifactStoreWrite[]): readonly number[] {
  const first = writes[0];
  if (!first) throw new Error("Expected a binary write.");
  if (typeof first.content === "string") throw new Error("Expected binary content.");
  return [...first.content.slice(0, 8)];
}

function promptPackage(): SlidePromptPackage {
  return {
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    bundleId: "bundle_001",
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:deck",
    designSystemId: "design_001",
    slideNumber: 1,
    layoutScreenshot: "slide_001_layout.png",
    sourceMapIds: ["source_map_001"],
    textOverlayStrategy: {
      bundleId: "bundle_001",
      deckContextId: "deck_context_001",
      deckContextHash: "sha256:deck",
      slideNumber: 1,
      layoutScreenshot: "slide_001_layout.png",
      reservedOverlayLayerIds: ["title"],
      generatedBackgroundLayerIds: ["background"],
      layers: [],
      negativePromptRules: ["Do not render exact title text in the generated background."],
    },
    prompt: "Generate a clean slide background.",
  };
}
